import asyncio
from datetime import datetime, timezone
from http import HTTPStatus
import json
import logging
import os
import re
import sys
import time
import urllib.request
import uuid
import websockets
from security import authorized, sign_assertion

# Las URLs WebSocket contienen token: nunca habilitar logs de solicitudes.
logging.getLogger('websockets').setLevel(logging.CRITICAL)
TOKEN = os.environ['BRIDGE_TOKEN']
KEY = os.environ['DEVICE_SIGNING_KEY']
DEVICE_TOKEN = os.environ['DEVICE_TOKEN']
DEVICE_ID = os.environ['DEVICE_ID']
ORIGINS = os.environ['ALLOWED_ORIGINS'].split(',')
API = os.environ.get('API_URL', 'http://api:3000')
if len(TOKEN) < 24 or not all(re.fullmatch('[a-fA-F0-9]{64}', k) for k in (KEY, DEVICE_TOKEN)):
    raise RuntimeError('Configuración privada inválida')
if API != 'http://api:3000' or any(o not in ('http://localhost:5173', 'http://127.0.0.1:5173') for o in ORIGINS):
    raise RuntimeError('Destino u origen no permitido')
clients = set()
lock = asyncio.Lock()
status = {'type': 'device-status', 'mode': 'hardware', 'state': 'checking', 'available': False}

def backend(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(API + path, data=data, headers={'X-Device-Token': DEVICE_TOKEN, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read(20000000))

async def device(operation, timeout=8, **kwargs):
    # Sin shell, argumentos ni ficheros con plantillas; memoria aislada en un hijo efímero.
    process = await asyncio.create_subprocess_exec(sys.executable, '/app/device.py', stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    try:
        output, _ = await asyncio.wait_for(process.communicate(json.dumps({'operation': operation, **kwargs}).encode()), timeout)
        result = json.loads(output)
        if operation != 'status' and 'state' in result:
            raise RuntimeError('DEVICE_NOT_READY')
        return result
    finally:
        if process.returncode is None:
            process.kill()
        await process.wait()

async def send(ws, value):
    try:
        await ws.send(json.dumps(value))
    except websockets.ConnectionClosed:
        pass

async def monitor():
    global status
    while True:
        if not lock.locked():
            async with lock:
                try:
                    state = await device('status')
                    current = {k: state[k] for k in ('state', 'available')}
                except Exception:
                    current = {'state': 'error', 'available': False}
                updated = {'type': 'device-status', 'mode': 'hardware', **current}
                if updated != status:
                    status = updated
                    await asyncio.gather(*(send(ws, status) for ws in tuple(clients)))
        await asyncio.sleep(2)

async def handshake(path, headers):
    # Zero Trust: rechaza antes del upgrade. El token público del navegador NO autoriza
    # enrolamientos: cada alta exige además un ticket administrativo de un solo uso.
    try:
        valid = authorized(path, headers.get('Origin'), TOKEN, ORIGINS)
    except Exception:
        valid = False
    if not valid:
        return HTTPStatus.UNAUTHORIZED, [('Content-Type', 'text/plain')], b'Unauthorized\n'

async def operation(ws, command):
    kind = command.get('type')
    if kind == 'status':
        return await send(ws, status)
    if kind not in ('scan', 'enroll'):
        return await send(ws, {'type': 'error', 'code': 'INVALID_COMMAND'})
    if lock.locked():
        return await send(ws, {'type': 'error', 'code': 'BUSY'})
    async with lock:
        if not status['available']:
            return await send(ws, {'type': 'error', 'code': 'DEVICE_NOT_READY'})
        if kind == 'enroll':
            ticket = command.get('ticket')
            if not isinstance(ticket, str) or not 1 <= len(ticket) <= 2048:
                return await send(ws, {'type': 'error', 'code': 'INVALID_COMMAND'})
            # Verifica consentimiento, firma, administrador y caducidad ANTES de tocar USB.
            # El token público del WebSocket por sí solo jamás autoriza recolección biométrica.
            authorization = await asyncio.to_thread(backend, '/device/enrollments/authorize', {'ticket': ticket})
            employee = authorization['employeeId']
            templates = await asyncio.to_thread(backend, '/device/templates')
            await send(ws, {'type': 'capturing', 'operation': kind})
            result = await device('enroll', timeout=100, templates=[t for t in templates if t['employeeId'] != employee])
            if 'error' in result:
                return await send(ws, {'type': 'error', 'code': result['error']})
            response = await asyncio.to_thread(backend, '/device/enrollments', {'ticket': ticket, 'fmd': result['fmd'], 'mode': 'hardware'})
            await send(ws, {'type': 'enrolled', 'employeeId': response['employeeId']})
        else:
            await send(ws, {'type': 'capturing', 'operation': kind})
            templates = await asyncio.to_thread(backend, '/device/templates')
            result = await device('identify', timeout=30, templates=templates)
            if 'error' in result:
                return await send(ws, {'type': 'error', 'code': result['error']})
            employee = result.get('employeeId')
            if not employee:
                return await send(ws, {'type': 'error', 'code': 'NO_MATCH'})
            if not any(t['employeeId'] == employee and t['mode'] == 'hardware' for t in templates):
                raise RuntimeError('Invalid identity')
            assertion = {'deviceId': DEVICE_ID, 'employeeId': employee, 'captureId': str(uuid.uuid4()), 'capturedAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'), 'mode': 'hardware'}
            assertion['signature'] = sign_assertion(assertion, KEY)
            await send(ws, {'type': 'matched', 'assertion': assertion})

async def handler(ws, path):
    clients.add(ws)
    await send(ws, {'type': 'ready', 'mode': 'hardware'})
    await send(ws, status)
    last = 0
    try:
        async for message in ws:
            if not isinstance(message, str):
                await ws.close(code=1003)
                break
            now = time.monotonic()
            if now - last < .2:
                await send(ws, {'type': 'error', 'code': 'RATE_LIMIT'})
                continue
            last = now
            job = closed = None
            try:
                command = json.loads(message)
                if not isinstance(command, dict):
                    raise ValueError()
                job = asyncio.create_task(operation(ws, command))
                closed = asyncio.create_task(ws.wait_closed())
                done, _ = await asyncio.wait((job, closed), return_when=asyncio.FIRST_COMPLETED)
                if closed in done:
                    job.cancel()
                    await asyncio.gather(job, return_exceptions=True)
                    break
                await job
            except asyncio.TimeoutError:
                await send(ws, {'type': 'error', 'code': 'CAPTURE_TIMEOUT'})
            except Exception:
                await send(ws, {'type': 'error', 'code': 'CAPTURE_FAILED'})
            finally:
                if closed:
                    closed.cancel()
                    await asyncio.gather(closed, return_exceptions=True)
    except websockets.ConnectionClosed:
        pass
    finally:
        clients.discard(ws)

async def main():
    async with websockets.serve(handler, '0.0.0.0', 8080, process_request=handshake, max_size=4096, max_queue=4):
        print('Puente Linux libfprint activo; disponibilidad sujeta a apertura del USB real.', flush=True)
        await monitor()

if __name__ == '__main__':
    asyncio.run(main())

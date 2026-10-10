"""Prueba real de transporte; NO captura huellas ni usa simulación."""
import asyncio
import json
import os
from urllib.parse import urlencode
import websockets

async def main():
    for token, origin in [('incorrect', 'http://localhost:5173'), (os.environ['BRIDGE_TOKEN'], 'https://evil.example')]:
        try:
            async with websockets.connect('ws://127.0.0.1:8080/?' + urlencode({'token': token}), origin=origin):
                raise AssertionError('Unauthorized client accepted')
        except websockets.InvalidStatusCode as error:
            assert error.status_code == 401
    async with websockets.connect('ws://127.0.0.1:8080/?' + urlencode({'token': os.environ['BRIDGE_TOKEN']}), origin='http://localhost:5173') as socket:
        ready = json.loads(await socket.recv())
        assert ready == {'type': 'ready', 'mode': 'hardware'}
        state = json.loads(await socket.recv())
        assert state['type'] == 'device-status'
        assert state['available'] == (state['state'] == 'available')
        # Sin dispositivo, scan debe rechazarse y nunca producir una identidad.
        if not state['available'] and state['state'] != 'checking':
            await socket.send(json.dumps({'type': 'scan'}))
            result = json.loads(await socket.recv())
            assert result == {'type': 'error', 'code': 'DEVICE_NOT_READY'}
        print(json.dumps({'unauthorizedTokenRejected': True, 'unauthorizedOriginRejected': True, 'mode': ready['mode'], 'device': state['state'], 'available': state['available']}))

asyncio.run(main())

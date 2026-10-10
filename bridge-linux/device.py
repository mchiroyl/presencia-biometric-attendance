"""Un proceso por operación: libfprint recibe el USB real, no datos simulados.
La salida privada viaja por pipe hacia el puente; nunca al navegador ni a logs.
Al terminar se libera el lector y el SO recupera la memoria nativa del proceso.
"""
import base64
import json
import sys
import gi
gi.require_version('FPrint', '2.0')
from gi.repository import FPrint, Gio
from matcher import matching_employees

PREFIX = 'LIBFPRINT-v1:'

def main(request):
    context = FPrint.Context.new()
    context.enumerate()
    devices = context.get_devices()
    if len(devices) != 1:
        return {'state': 'disconnected' if not devices else 'ambiguous', 'available': False}
    device = devices[0]
    # Este sistema se valida con U.are.U 4500 (driver uru4000), no con un lector arbitrario.
    if device.get_driver() != 'uru4000' or not device.has_feature(FPrint.DeviceFeature.IDENTIFY):
        return {'state': 'not-ready', 'available': False}
    cancel = Gio.Cancellable.new()
    device.open_sync(cancel)
    try:
        if request['operation'] == 'status':
            return {'state': 'available', 'available': True}
        if request['operation'] == 'enroll':
            template = device.enroll_sync(FPrint.Print.new(device), cancel, None, None)
            data = bytes(template.serialize())
            if not 32 <= len(data) <= 40000:
                raise ValueError('Template size')
            records = decode_templates(request.get('templates', []), device)
            if matching_employees(data, [(employee, raw) for employee, raw, _ in records]):
                return {'error': 'DUPLICATE_FINGERPRINT'}
            return {'fmd': PREFIX + base64.b64encode(data).decode('ascii')}
        if request['operation'] == 'identify':
            records = decode_templates(request['templates'], device)
            prints = [template for _, _, template in records]
            if not prints:
                return {'employeeId': None}
            match, scanned = device.identify_sync(prints, cancel, None, None)
            if scanned is None:
                raise ValueError('Reader must provide NBIS minutiae')
            # Serialización efímera SIN imagen. Se destruye al salir, jamás se persiste.
            matched = matching_employees(bytes(scanned.serialize()), [(employee, raw) for employee, raw, _ in records])
            if len(matched) > 1:
                return {'error': 'AMBIGUOUS_MATCH'}
            return {'employeeId': matched[0] if matched else None}
        raise ValueError('Operation')
    finally:
        device.close_sync(None)

def decode_templates(records, device):
    result = []
    for record in records:
        value = record['fmd']
        if record['mode'] != 'hardware' or not value.startswith(PREFIX):
            continue
        raw = base64.b64decode(value[len(PREFIX):], validate=True)
        if not 32 <= len(raw) <= 40000:
            raise ValueError('Template size')
        template = FPrint.Print.deserialize(raw)
        if template.compatible(device):
            result.append((record['employeeId'], raw, template))
    return result

if __name__ == '__main__':
    try:
        request = json.loads(sys.stdin.readline(20000000))
        result = main(request)
    except Exception:
        result = {'state': 'not-ready', 'available': False, 'error': 'DEVICE_NOT_READY'}
    print(json.dumps(result), flush=True)

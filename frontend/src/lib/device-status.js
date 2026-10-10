export function deviceStatusLabel(device) {
  if (device.status !== 'connected') return 'Puente local sin conexión';
  if (device.available) return device.mode === 'simulation' ? 'Lector simulado · Solo pruebas' : 'Lector conectado y disponible';
  return {
    checking: 'Verificando lector…', disconnected: 'Lector no conectado',
    'driver-required': 'Lector detectado · Revisar controlador',
    'sdk-required': 'Lector detectado · SDK de captura pendiente',
    'not-ready': 'Lector detectado · No disponible para capturar',
    ambiguous: 'Varios lectores detectados · Conecte solo uno',
    error: 'No se pudo verificar el lector',
  }[device.deviceState] || 'Lector no disponible';
}

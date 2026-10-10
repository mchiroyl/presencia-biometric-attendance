const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function isBridgeMessage(value) {
  if (!value || typeof value !== 'object' || 'fmd' in value) return false;
  if (value.type === 'ready') return ['hardware', 'simulation'].includes(value.mode);
  if (value.type === 'device-status') return ['hardware', 'simulation'].includes(value.mode) && ['checking', 'disconnected', 'driver-required', 'sdk-required', 'not-ready', 'available', 'ambiguous', 'error'].includes(value.state) && value.available === (value.state === 'available');
  if (value.type === 'error') return typeof value.code === 'string';
  if (value.type === 'capturing') return ['scan', 'enroll'].includes(value.operation);
  if (value.type === 'enrolled') return uuid.test(value.employeeId);
  if (value.type === 'matched') {
    const a = value.assertion;
    return !!a && typeof a.deviceId === 'string' && uuid.test(a.employeeId) && uuid.test(a.captureId) && typeof a.capturedAt === 'string' && Number.isFinite(Date.parse(a.capturedAt)) && /^[a-f0-9]{64}$/.test(a.signature) && ['hardware', 'simulation'].includes(a.mode);
  }
  return false;
}

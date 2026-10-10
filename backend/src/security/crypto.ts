import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export function encryptTemplate(value: string, key: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const clear = Buffer.from(value, 'utf8');
  try { const encrypted = Buffer.concat([cipher.update(clear), cipher.final()]); return [iv, cipher.getAuthTag(), encrypted].map(v => v.toString('base64')).join('.'); }
  finally { clear.fill(0); }
}
export function decryptTemplate(value: string, key: string): string {
  const [iv, tag, data] = value.split('.').map(v => Buffer.from(v, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv); cipher.setAuthTag(tag);
  const clear = Buffer.concat([cipher.update(data), cipher.final()]);
  try { return clear.toString('utf8'); } finally { clear.fill(0); }
}
export function constantTimeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y);
}
export function signAssertion(value: Assertion, key: string): string {
  return createHmac('sha256', Buffer.from(key, 'hex')).update([value.deviceId, value.employeeId, value.captureId, value.capturedAt, value.mode].join('\n')).digest('hex');
}
export function verifyAssertion(value: Assertion & { signature: string }, key: string, now: Date): boolean {
  const age = now.getTime() - Date.parse(value.capturedAt);
  return Number.isFinite(age) && age >= -5000 && age <= 60000 && /^[a-f0-9]{64}$/.test(value.signature) && constantTimeEqual(signAssertion(value, key), value.signature);
}
export interface Assertion { deviceId: string; employeeId: string; captureId: string; capturedAt: string; mode: 'hardware' | 'simulation'; }

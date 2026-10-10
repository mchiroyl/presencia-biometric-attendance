import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { encryptTemplate, decryptTemplate, signAssertion, verifyAssertion } from '../../src/security/crypto';
const key = 'a'.repeat(64);
const assertion = { deviceId: 'local-reader-01', employeeId: 'employee', captureId: 'capture', capturedAt: '2026-10-10T12:00:00.000Z', mode: 'hardware' as const };
const independentSignature = createHmac('sha256', Buffer.from(key, 'hex')).update('local-reader-01\nemployee\ncapture\n2026-10-10T12:00:00.000Z\nhardware').digest('hex');
describe('Privacidad y evidencia', () => {
  it('cifra con nonce distinto sin revelar FMD', () => { const a = encryptTemplate('<Fmd>private</Fmd>', key); const b = encryptTemplate('<Fmd>private</Fmd>', key); expect(a).not.toContain('private'); expect(a).not.toBe(b); expect(decryptTemplate(a, key)).toBe('<Fmd>private</Fmd>'); });
  it('rechaza una clave de descifrado incorrecta', () => expect(() => decryptTemplate(encryptTemplate('private', key), 'b'.repeat(64))).toThrow());
  it('firma el contrato interoperable', () => expect(signAssertion(assertion, key)).toBe(independentSignature));
  it('acepta evidencia vigente', () => expect(verifyAssertion({ ...assertion, signature: independentSignature }, key, new Date('2026-10-10T12:00:10Z'))).toBe(true));
  it('rechaza cambio de empleado', () => expect(verifyAssertion({ ...assertion, employeeId: 'other', signature: independentSignature }, key, new Date(assertion.capturedAt))).toBe(false));
  it('rechaza evidencia caducada', () => expect(verifyAssertion({ ...assertion, signature: independentSignature }, key, new Date('2026-10-10T12:02:00Z'))).toBe(false));
  it('rechaza evidencia del futuro', () => expect(verifyAssertion({ ...assertion, signature: independentSignature }, key, new Date('2026-10-10T11:59:40Z'))).toBe(false));
  it('rechaza firma malformada', () => expect(verifyAssertion({ ...assertion, signature: 'xx' }, key, new Date(assertion.capturedAt))).toBe(false));
});

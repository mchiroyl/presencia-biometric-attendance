import { describe, it, expect } from 'vitest';
import { isBridgeMessage } from '../lib/bridge-protocol';
describe('Contrato del puente', () => {
  it('acepta ready y error sin plantilla', () => { expect(isBridgeMessage({ type: 'ready', mode: 'hardware' })).toBe(true); expect(isBridgeMessage({ type: 'error', code: 'NO_MATCH' })).toBe(true); });
  it('rechaza valores ajenos al protocolo', () => { expect(isBridgeMessage(null)).toBe(false); expect(isBridgeMessage({ type: 'unknown' })).toBe(false); expect(isBridgeMessage({ type: 'matched', assertion: {} })).toBe(false); });
});

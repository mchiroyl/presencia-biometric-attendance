import { describe, it, expect } from 'vitest';
import { schoolDate, nextDirection } from '../../src/attendance/attendance-policy';
describe('Política de asistencia', () => {
  it.each([[null, 'IN'], ['IN', 'OUT'], ['OUT', 'IN']] as const)('último %s produce %s', (last, expected) => expect(nextDirection(last)).toBe(expected));
  it('usa fecha de Guatemala antes de medianoche UTC', () => expect(schoolDate(new Date('2026-10-11T02:00:00Z'), 'America/Guatemala')).toBe('2026-10-10'));
  it('cambia el día a medianoche escolar', () => expect(schoolDate(new Date('2026-10-11T06:00:00Z'), 'America/Guatemala')).toBe('2026-10-11'));
});

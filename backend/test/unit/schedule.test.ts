import { expect, it } from 'vitest';
import { classifyAttendance } from '../../src/attendance/schedule-policy';
it.each([
  ['06:44:59','green',0], ['06:45:59','green',0], ['06:46:00','yellow',1],
  ['07:10:59','yellow',25], ['07:11:00','red',26],
])('clasifica entrada %s en zona Guatemala', (time, light, minutes) => {
  expect(classifyAttendance(new Date(`2026-10-10T${time}-06:00`), 'America/Guatemala', 'IN', '12:45')).toEqual({ trafficLight: light, deviationMinutes: minutes });
});
it('evalúa salida según asignación y conserva diferencia', () => {
  const date = new Date('2026-10-10T12:45:00-06:00');
  expect(classifyAttendance(date,'America/Guatemala','OUT','12:45')).toEqual({ trafficLight:'green',deviationMinutes:0 });
  expect(classifyAttendance(date,'America/Guatemala','OUT','13:00')).toEqual({ trafficLight:'yellow',deviationMinutes:15 });
});
it('no aplica reglas a empleados sin asignación', () => {
  expect(classifyAttendance(new Date(),'America/Guatemala','IN',null)).toEqual({ trafficLight:null,deviationMinutes:null });
});

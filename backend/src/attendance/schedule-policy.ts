// Se usa la hora del servidor en la zona escolar, nunca el reloj del navegador.
// Resolución de un minuto: 06:45:59 sigue perteneciendo al minuto 06:45.
export function classifyAttendance(now: Date, timeZone: string, direction: 'IN' | 'OUT', exit?: string | null) {
  if (!exit) return { trafficLight: null, deviationMinutes: null };
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const minute = Number(parts.find(p => p.type === 'hour')!.value) * 60 + Number(parts.find(p => p.type === 'minute')!.value);
  if (direction === 'IN') return { trafficLight: minute <= 405 ? 'green' : minute <= 430 ? 'yellow' : 'red', deviationMinutes: Math.max(0, minute - 405) };
  const [h, m] = exit.split(':').map(Number);
  return { trafficLight: minute < h * 60 + m ? 'yellow' : 'green', deviationMinutes: Math.max(0, h * 60 + m - minute) };
}

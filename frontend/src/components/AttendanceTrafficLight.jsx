export function AttendanceTrafficLight({ mark }) {
  const color = ['green', 'yellow', 'red'].includes(mark.trafficLight) ? mark.trafficLight : 'neutral';
  const label = color === 'neutral' ? 'Sin evaluación' : color === 'green' ? 'A tiempo' : mark.direction === 'OUT' ? 'Salida anticipada' : color === 'red' ? 'Llegada muy tarde' : 'Llegada tarde';
  const detail = color === 'neutral' ? 'Sin horario aplicado a este marcaje' : mark.deviationMinutes > 0 ? `${mark.deviationMinutes} min ${mark.direction === 'OUT' ? 'antes de la salida' : 'después de la entrada'}` : mark.direction === 'OUT' ? `Salida prevista: ${mark.scheduledExit}` : 'Entrada prevista: 06:45';
  return <div className="attendance-signal"><span className={`attendance-signal-badge signal-${color}`}><span className="attendance-signal-dot" aria-hidden="true"/>{label}</span><small>{detail}</small></div>;
}

import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceTrafficLight } from '../components/AttendanceTrafficLight';
it('presenta un marcaje sin evaluación con estilo neutral', () => {
  render(<AttendanceTrafficLight mark={{ direction:'IN', trafficLight:null }}/>);
  expect(screen.getByText('Sin evaluación')).toHaveClass('signal-neutral');
});
it('distingue salida anticipada de llegada tarde', () => {
  render(<AttendanceTrafficLight mark={{ direction:'OUT', trafficLight:'yellow', deviationMinutes:17 }}/>);
  expect(screen.getByText('Salida anticipada')).toHaveClass('signal-yellow');
  expect(screen.getByText('17 min antes de la salida')).toBeVisible();
});
it('muestra rojo con texto que identifica la incidencia', () => {
  render(<AttendanceTrafficLight mark={{ direction:'IN', trafficLight:'red', deviationMinutes:30 }}/>);
  expect(screen.getByText('Llegada muy tarde')).toHaveClass('signal-red');
});

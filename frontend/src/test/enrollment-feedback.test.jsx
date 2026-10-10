import { it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AdminPanel } from '../features/admin/AdminPanel';
const bridge = vi.hoisted(() => ({ callback: null, send: vi.fn(() => true) }));
vi.mock('../hooks/useBiometricDevice', () => ({ useBiometricDevice: options => { bridge.callback = options.onMessage; return { status: 'connected', available: true, send: bridge.send }; } }));
afterEach(() => vi.unstubAllGlobals());
async function begin() {
  vi.stubGlobal('fetch', async url => ({ ok: true, json: async () => String(url).endsWith('/auth/login') ? { accessToken: 'test', expiresIn: 900, email: 'test@example.local' } : String(url).endsWith('/enrollment-ticket') ? { ticket: 'test-ticket' } : String(url).includes('/employees') ? { items: [{ id: 'employee', fullName: 'Ana', code: 'EMP-1', active: true, consentSignedAt: '2026-10-10', hasBiometric: false }], total: 1 } : { employees: 1, enrolled: 0, marks: 0, presentToday: 0 } }));
  render(<AdminPanel school={{ name: 'Centro', timeZone: 'America/Guatemala' }} onSchoolChange={() => {}}/>);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'test@example.local' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Enrolar' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Registro de huella en curso');
}
it('mantiene confirmación visible después de guardar y actualizar la tabla', async () => {
  await begin();
  act(() => bridge.callback({ type: 'capturing', operation: 'enroll' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('retírelo entre lecturas');
  await act(async () => bridge.callback({ type: 'enrolled', employeeId: 'employee' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('guardó correctamente');
  fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('muestra error de captura sin anunciar éxito', async () => {
  await begin();
  act(() => bridge.callback({ type: 'error', code: 'CAPTURE_TIMEOUT' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('El tiempo de captura terminó');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('guardó correctamente');
});

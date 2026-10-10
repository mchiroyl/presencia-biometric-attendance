import { it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminPanel } from '../features/admin/AdminPanel';
afterEach(() => vi.unstubAllGlobals());
it('navega entre empleados, asistencia y configuración con filas no vacías', async () => {
  vi.stubGlobal('WebSocket', class { close() {} });
  vi.stubGlobal('fetch', async url => {
    const employee = { id: 'e1', code: 'DOC-1', fullName: 'Ana López', position: 'Docente', active: true, consentSignedAt: '2026-10-10T12:00:00Z', hasBiometric: false };
    const admin = { id: 'a1', email: 'admin@test.local', active: true };
    const data = String(url).endsWith('/auth/login') ? { accessToken: 'test-session', expiresIn: 900, email: admin.email } : String(url).includes('/employees') ? { items: [employee], total: 1 } : String(url).includes('/attendance') ? { items: [{ id: 'mark', employee, schoolDate: '2026-10-10', createdAt: '2026-10-10T12:00:00Z', direction: 'IN', mode: 'hardware' }], total: 1 } : String(url).endsWith('/users') ? [admin] : { employees: 1, enrolled: 0, marks: 1, presentToday: 1 };
    return { ok: true, json: async () => data };
  });
  render(<AdminPanel school={{ name: 'Centro', timeZone: 'America/Guatemala' }} onSchoolChange={() => {}}/>);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'admin@test.local' } }); fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } }); fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  await screen.findByText('Ana López');
  fireEvent.click(screen.getByRole('tab', { name: 'Asistencia' }));
  await screen.findByText('Entrada'); expect(screen.getByText('Ana López')).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Configuración' })); await waitFor(() => expect(screen.getByText('Administradores')).toBeVisible());
  await waitFor(() => expect(screen.getAllByText('admin@test.local')).toHaveLength(2));
  fireEvent.click(screen.getByRole('tab', { name: 'Empleados' })); await screen.findByText('Ana López');
});

import { it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmployeeForm } from '../features/admin/EmployeeForm';
it('permite desactivar explícitamente y mantiene controles dentro del diálogo', () => {
  const deactivate = vi.fn(); render(<EmployeeForm employee={{ code: 'A', fullName: 'Ana López', active: true }} onSave={() => {}} onClose={() => {}} onDeactivate={deactivate}/>);
  expect(screen.getByLabelText('Empleado activo')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Desactivar empleado y eliminar su huella' })); expect(deactivate).toHaveBeenCalledTimes(1);
});
it('genera el código en el servidor y no lo envía desde el formulario de alta', async () => {
  const save = vi.fn().mockResolvedValue(undefined); render(<EmployeeForm onSave={save} onClose={() => {}}/>);
  expect(screen.queryByLabelText('Código de empleado')).toBeNull();
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana López' } });
  fireEvent.change(screen.getByLabelText(/Foto de medio cuerpo/), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } });
  await screen.findByAltText('Vista previa de la foto del empleado');
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar empleado' }).closest('form'));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).not.toHaveProperty('code');
});
it('oculta el código también al editar', () => {
  render(<EmployeeForm employee={{ code: 'EMP-000123', fullName: 'Ana López', active: true }} onSave={() => {}} onClose={() => {}}/>);
  expect(screen.queryByLabelText('Código de empleado')).toBeNull();
});

it('rechaza alta sin foto', async () => {
 const save=vi.fn();render(<EmployeeForm onSave={save} onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Nombre completo'),{target:{value:'Ana López'}});
 fireEvent.submit(screen.getByRole('button',{name:'Guardar empleado'}).closest('form'));
 expect(await screen.findByRole('alert')).toHaveTextContent('obligatoria');expect(save).not.toHaveBeenCalled();
});
it('conserva la foto sin reenviarla al modificar otro dato',async()=>{
 const save=vi.fn().mockResolvedValue(undefined);render(<EmployeeForm employee={{fullName:'Ana López',active:true,photoDataUrl:'data:image/jpeg;base64,YWJj'}} onSave={save} onClose={()=>{}}/>);
 fireEvent.submit(screen.getByRole('button',{name:'Guardar empleado'}).closest('form'));await waitFor(()=>expect(save).toHaveBeenCalled());expect(save.mock.calls[0][0]).not.toHaveProperty('photoDataUrl');
});

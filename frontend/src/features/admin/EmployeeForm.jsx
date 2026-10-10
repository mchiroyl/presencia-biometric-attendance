import { useEffect, useRef, useState } from 'react';
import { X, Save, ShieldCheck } from 'lucide-react';
export function EmployeeForm({ employee, onSave, onClose, onDeactivate }) {
  const dialog = useRef(null);
  const [photo, setPhoto] = useState(employee?.photoDataUrl || '');
  const [photoChanged, setPhotoChanged] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  async function loadPhoto(e) {
    const file = e.target.files?.[0]; if (!file) return; setError('');
    if (!['image/jpeg','image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) { setError('Seleccione un JPG o PNG de hasta 2 MB.'); e.target.value = ''; return; }
    setReadingPhoto(true);
    try { setPhoto(await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); })); setPhotoChanged(true); }
    catch { setError('No se pudo leer la foto.'); } finally { setReadingPhoto(false); }
  }
  const [signed, setSigned] = useState(!!employee?.consentSignedAt); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    const handler = e => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Tab') {
        const elements = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
        const first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handler); return () => { document.removeEventListener('keydown', handler); previous?.focus?.(); };
  }, [busy, onClose]);
  async function submit(e) {
    e.preventDefault(); if (readingPhoto) return; if (!employee && !photo) { setError('La foto de medio cuerpo es obligatoria.'); return; } const value = Object.fromEntries(new FormData(e.currentTarget)); const payload = { ...(photo && (!employee || photoChanged) ? { photoDataUrl: photo } : {}), fullName: value.fullName.trim(), position: value.position.trim(), scheduledExit: value.scheduledExit || null, consentSignature: signed ? value.consentSignature.trim() : null, ...(employee ? { active: value.active === 'on' } : {}) };
    setBusy(true); setError(''); try { await onSave(payload); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop">
    <section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby="employee-title">
      <div className="modal-header"><div><span className="eyebrow green">COMUNIDAD EDUCATIVA</span><h2 id="employee-title">{employee ? 'Editar empleado' : 'Nuevo empleado'}</h2></div><button className="icon-button" aria-label="Cerrar formulario" onClick={onClose} disabled={busy}><X size={20}/></button></div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="full-width">Foto de medio cuerpo{!employee && ' *'}<input type="file" accept="image/jpeg,image/png" onChange={loadPhoto} disabled={busy || readingPhoto} aria-describedby="photo-help"/><small id="photo-help">{!employee && 'Obligatoria al registrar. '}JPG o PNG, máximo 2 MB. Fotografía desde la cabeza hasta la cintura.</small></label>
          {photo && <img className="employee-photo-preview" src={photo} alt="Vista previa de la foto del empleado"/>}
          <label>Nombre completo<input name="fullName" autoFocus defaultValue={employee?.fullName || ''} required minLength={2} maxLength={120} placeholder="Nombre y apellidos"/></label>
          <label className="full-width">Puesto<input name="position" defaultValue={employee?.position || ''} maxLength={100} placeholder="Docente, dirección, personal…"/></label>
          <label className="full-width">Horario docente<select name="scheduledExit" defaultValue={employee?.scheduledExit || ''}><option value="">Sin horario asignado</option><option value="12:45">Entrada 06:45 · Salida 12:45</option><option value="13:00">Entrada 06:45 · Salida 13:00</option></select><small>Verde hasta 06:45; amarillo hasta 07:10; rojo después. Aplica a nuevos marcajes.</small></label>
          {employee && <label className="checkbox-label full-width"><input name="active" type="checkbox" defaultChecked={employee.active}/>Empleado activo</label>}
        </div>
        <div className="consent-box"><ShieldCheck size={20}/><div><strong>Consentimiento biométrico</strong><p>El empleado autoriza el uso de su plantilla de huella exclusivamente para registrar asistencia. Puede retirar su consentimiento; la plantilla se eliminará y el historial se conservará.</p><label className="checkbox-label"><input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)}/>El empleado ha leído y firmado el consentimiento.</label>{signed && <label>Firma: nombre completo del firmante<input name="consentSignature" defaultValue={employee?.consentSignature || ''} required minLength={2} maxLength={200} placeholder="Nombre del empleado que autoriza"/></label>}</div></div>
        {error && <div className="inline-error" role="alert">{error}</div>}
        {employee?.active && <div className="deactivation-warning"><p>La desactivación elimina la huella y conserva el historial de asistencia.</p><button type="button" className="danger-button small-button" onClick={onDeactivate} disabled={busy}>Desactivar empleado y eliminar su huella</button></div>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary-button" disabled={busy || readingPhoto}><Save size={16}/>{busy ? 'Guardando…' : 'Guardar empleado'}</button></div>
      </form>
    </section>
  </div>;
}

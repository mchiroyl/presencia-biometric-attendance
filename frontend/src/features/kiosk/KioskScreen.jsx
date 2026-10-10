import { useEffect, useRef, useState } from 'react';
import { Fingerprint, ArrowRight, Check, Clock3, ShieldCheck, CircleHelp, LoaderCircle, Monitor, Radio, Pause } from 'lucide-react';
import { useBiometricDevice } from '../../hooks/useBiometricDevice';
import { api, bridgeErrors } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { deviceStatusLabel } from '../../lib/device-status';
export function KioskScreen({ school }) {
  const [now, setNow] = useState(new Date()); const [apiStatus, setApiStatus] = useState('checking');
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(false); const [automatic, setAutomatic] = useState(false);
  const busyRef = useRef(false); const seen = useRef(new Set()); const mounted = useRef(true); const scanTimer = useRef(); const timeout = useRef();
  useEffect(() => { mounted.current = true; const timer = setInterval(() => setNow(new Date()), 1000); return () => { mounted.current = false; clearInterval(timer); clearTimeout(scanTimer.current); clearTimeout(timeout.current); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    const check = () => api('/health', { signal: controller.signal }).then(() => setApiStatus('ok')).catch(e => { if (e.name !== 'AbortError') setApiStatus('error'); });
    check(); const timer = setInterval(check, 15000); return () => { clearInterval(timer); controller.abort(); };
  }, []);
  function finish() { busyRef.current = false; clearTimeout(timeout.current); if (mounted.current) setBusy(false); }
  const device = useBiometricDevice({ onMessage: async message => {
    if (message.type === 'capturing') { busyRef.current = true; setBusy(true); }
    if (message.type === 'error') { finish(); setResult({ error: bridgeErrors[message.code] || 'No se pudo completar la lectura.' }); }
    if (message.type === 'matched') {
      const capture = message.assertion;
      if (seen.current.has(capture.captureId)) return;
      seen.current.add(capture.captureId); if (seen.current.size > 100) seen.current.delete(seen.current.values().next().value);
      try { const value = await api('/attendance/mark', { method: 'POST', body: capture }); if (mounted.current) { setResult(value); setApiStatus('ok'); } }
      catch (e) { if (mounted.current) setResult({ error: e.message }); }
      finally { finish(); }
    }
  } });
  useEffect(() => { if (device.status !== 'connected' || !device.available) { finish(); setAutomatic(false); } }, [device.status, device.available]);
  function scan() {
    if (busyRef.current || !device.available || device.status !== 'connected' || apiStatus !== 'ok') return;
    if (device.send({ type: 'scan' })) { busyRef.current = true; setBusy(true); setResult(null); timeout.current = setTimeout(() => { finish(); setResult({ error: 'La lectura tardó demasiado. Intente nuevamente.' }); }, 90000); }
  }
  useEffect(() => { if (automatic && !busy && device.status === 'connected' && apiStatus === 'ok') scanTimer.current = setTimeout(scan, result ? 5000 : 500); return () => clearTimeout(scanTimer.current); }, [automatic, busy, result, device.status, apiStatus]);
  const time = new Intl.DateTimeFormat('es-GT', { timeZone: school.timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const seconds = new Intl.DateTimeFormat('es-GT', { timeZone: school.timeZone, second: '2-digit' }).format(now);
  const date = new Intl.DateTimeFormat('es-GT', { timeZone: school.timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const connected = device.status === 'connected' && device.available;
  const readerLabel = deviceStatusLabel(device);
  return <div className="page kiosk-page">
    <div className="page-heading"><div><span className="eyebrow green">CADA DÍA CUENTA</span><h1>Control de asistencia</h1><p>Un toque para empezar. Un registro en el que confiar.</p></div><StatusBadge status={connected ? 'ok' : 'error'} label={readerLabel}/></div>
    {device.mode === 'simulation' && <div role="status" className="simulation-banner">Modo de prueba · Las lecturas son simuladas y se identifican en el historial.</div>}
    <section className="clock-card" aria-label="Hora escolar"><div><span className="clock-label"><Clock3 size={15}/>HORA DEL CENTRO EDUCATIVO</span><div className="clock-time">{time}<span>:{seconds.padStart(2, '0')}</span></div><p className="clock-date">{date}</p></div><div className="clock-aside"><span className="clock-orbit"><GraduationSymbol/></span><span>Tu presencia<br/><strong>hace la diferencia.</strong></span></div></section>
    <div className="kiosk-grid"><section className="scan-card"><div className="scan-card-heading"><span className="eyebrow">REGISTRO BIOMÉTRICO</span><span className="soft-tag">Entrada / Salida</span></div>
      <div className={`fingerprint-orbit ${busy ? 'scanning' : ''}`}><div className="fingerprint-inner"><Fingerprint size={80} strokeWidth={1.2}/></div><span className="orbit-corner top-left"/><span className="orbit-corner bottom-right"/></div>
      <h2>{busy ? 'Leyendo huella…' : 'Registra tu asistencia'}</h2><p className="scan-description">Coloca tu dedo sobre el lector.<br/>Identificaremos automáticamente tu entrada o salida.</p>
      <button className="primary-button scan-button" onClick={scan} disabled={busy || !connected || apiStatus !== 'ok'}>{busy ? <LoaderCircle size={18} className="spin"/> : <Fingerprint size={19}/>} {busy ? 'Captura en curso' : device.mode === 'simulation' ? 'Simular lectura' : 'Iniciar lectura'}<ArrowRight size={18}/></button>
      <button className="text-button auto-button" disabled={!connected || apiStatus !== 'ok'} onClick={() => setAutomatic(a => !a)}>{automatic ? <Pause size={15}/> : <Radio size={15}/>} {automatic ? 'Pausar lectura continua' : 'Activar lectura continua'}</button>
      <div aria-live="polite" aria-atomic="true" className={`capture-result ${result?.error ? 'result-error' : result ? 'result-ok' : ''}`}>{result ? result.error ? <><CircleHelp size={20}/><span>{result.error}</span></> : <><Check size={22}/><div><strong>{result.direction === 'IN' ? 'Entrada registrada' : 'Salida registrada'}</strong><span>{result.employeeName} · {new Date(result.createdAt).toLocaleTimeString('es-GT', { timeZone: school.timeZone })}{result.mode === 'simulation' ? ' · Simulación' : ''}</span></div></> : <><ShieldCheck size={15}/><span>Solo guardamos tu plantilla biométrica cifrada.</span></>}</div>
    </section><div className="kiosk-right"><section className="instructions-card"><span className="eyebrow">ASÍ DE SENCILLO</span><h2>Tu registro, en tres pasos</h2><ol className="steps"><li><span>01</span><div><strong>Acércate al lector</strong><p>Asegúrate de tener el dedo limpio y seco.</p></div></li><li><span>02</span><div><strong>Coloca tu huella</strong><p>Apoya el dedo sin moverlo durante la lectura.</p></div></li><li><span>03</span><div><strong>Confirma el registro</strong><p>Espera el mensaje de entrada o salida antes de retirarte.</p></div></li></ol></section>
      <section className="system-card"><h3><Monitor size={17}/>Estado del sistema</h3><div><span>Servidor local</span><StatusBadge status={apiStatus} label={apiStatus === 'ok' ? 'En línea' : apiStatus === 'checking' ? 'Verificando' : 'Sin conexión'}/></div><div><span>Lector biométrico</span><StatusBadge status={connected ? 'ok' : 'error'} label={readerLabel}/></div><p>{device.deviceState === 'sdk-required' ? 'El equipo reconoce el dispositivo. Un técnico debe instalar el SDK HID y compilar el puente antes de capturar.' : device.deviceState === 'driver-required' ? 'Solicite al técnico el controlador oficial HID compatible con su lector y SDK.' : 'Detección automática por USB. No necesita un puerto fijo.'}</p></section></div></div>
    <footer className="page-footer"><span><ShieldCheck size={15}/>Datos protegidos · Consentimiento requerido</span><a href="#admin">¿Necesitas registrar una huella? <ArrowUpRightSmall/></a></footer>
  </div>;
}
function GraduationSymbol() { return <Fingerprint size={40} strokeWidth={1.3}/>; }
function ArrowUpRightSmall() { return <ArrowRight size={14}/>; }

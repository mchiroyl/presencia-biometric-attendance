import { useEffect, useState } from 'react';
import { Fingerprint, LayoutDashboard, ShieldCheck, ArrowUpRight, GraduationCap } from 'lucide-react';
import { KioskScreen } from './features/kiosk/KioskScreen';
import { AdminPanel } from './features/admin/AdminPanel';
import { api } from './lib/api';
export default function App() {
  const [page, setPage] = useState(location.hash === '#admin' ? 'admin' : 'kiosk');
  const [school, setSchool] = useState({ name: 'Centro Educativo', timeZone: 'America/Guatemala' });
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  useEffect(() => { const listener = () => setPage(location.hash === '#admin' ? 'admin' : 'kiosk'); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  useEffect(() => { const controller = new AbortController(); api('/school', { signal: controller.signal }).then(setSchool).catch(() => {}); return () => controller.abort(); }, []);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <aside className="sidebar">
      <a href="#kiosk" className="brand"><span className="brand-symbol"><Fingerprint size={23}/></span><span>presencia<span className="brand-period">.</span></span></a>
      <div className="school-card"><GraduationCap size={23}/><div><span className="eyebrow">COMUNIDAD EDUCATIVA</span><strong>{school.name}</strong></div></div>
      <span className="nav-label">ESPACIO DE TRABAJO</span>
      <nav aria-label="Navegación principal"><a href="#kiosk" className={page === 'kiosk' ? 'active' : ''} aria-current={page === 'kiosk' ? 'page' : undefined}><LayoutDashboard size={19}/>Kiosco de asistencia<span className="nav-indicator"/></a><a href="#admin" className={page === 'admin' ? 'active' : ''} aria-current={page === 'admin' ? 'page' : undefined}><ShieldCheck size={19}/>Administración<ArrowUpRight size={15}/></a></nav>
      <div className="sidebar-bottom"><ShieldCheck size={22}/><strong>Privacidad desde el inicio</strong><p>La huella se transforma en una plantilla cifrada. No almacenamos imágenes.</p><span className="local-label"><span/>ENTORNO LOCAL</span></div>
    </aside>
    <main id="main-content" className="main-content"><header className="topbar"><span>Sistema de asistencia <span className="breadcrumb">/ {page === 'admin' ? 'Administración' : 'Kiosco'}</span></span><span className="topbar-local"><span/>Localhost</span></header>{page === 'kiosk' ? <KioskScreen school={school}/> : <AdminPanel school={school} onSchoolChange={setSchool}/>}</main>
  </div>;
}

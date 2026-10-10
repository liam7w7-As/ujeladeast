import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenText, HouseHeart, MessagesSquare, Music4, NotebookPen, PanelsTopLeft, Library, Users, MessageCircle, LogIn, LogOut, PlusSquare, HeartHandshake, Shield } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import ProfileAvatar from '../ui/ProfileAvatar';
import NotificationBell from '../ui/NotificationBell';
import AppDialog from '../ui/AppDialog';
import './mobile-navigation.css';

const tabs = [
  { to: '/', label: 'Inicio', kind: 'home', Icon: HouseHeart },
  { to: '/feed', label: 'Comunidad', kind: 'community', Icon: MessagesSquare },
  { to: '/himnario', label: 'Himnario', kind: 'music', Icon: Music4 },
  { to: '/biblia', label: 'Biblia', kind: 'bible', Icon: BookOpenText },
  { to: '/estudios', label: 'Estudios', kind: 'study', Icon: NotebookPen },
];
const extraLinks = [
  { to: '/sociedades', label: 'Sociedades', Icon: Users },
  { to: '/recursos', label: 'Recursos', Icon: Library },
  { to: '/chat', label: 'UJELADITO', Icon: MessageCircle },
  { to: '/estudios', label: 'Apoyo espiritual', Icon: HeartHandshake, state: { openSOS: true } },
];

export default function MobileNavigation({ onCreate }) {
  const { pathname } = useLocation();
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  const moreActive = !tabs.some(tab => tab.to === pathname);
  const signOut = async () => {
    setBusy(true); setError('');
    try { await logout(); setOpen(false); }
    catch { setError('No se pudo cerrar la sesión. Intenta otra vez.'); }
    finally { setBusy(false); }
  };
  return <div className="mobile-navigation">
    <header className="mobile-app-header">
      <Link to="/" aria-label="UJELADEA inicio" className="mobile-app-brand"><img src="/logo-ujeladea.png" alt="" /><span>UJELADEA<span>.</span></span></Link>
      <div className="mobile-app-actions">
        {onCreate && <motion.button type="button" className="mobile-icon" title="Crear publicación" aria-label="Crear publicación" onClick={onCreate} whileTap={reduced ? undefined : { scale: 0.9 }}><PlusSquare size={23} /></motion.button>}
        {user ? <NotificationBell /> : <Link to="/login" className="mobile-signin" aria-current={pathname === '/login' ? 'page' : undefined}>Entrar<LogIn size={17} /></Link>}
      </div>
    </header>
    <nav className="mobile-tab-bar" aria-label="Navegación móvil">
      {tabs.map(({ to, label, kind, Icon }) => <Link key={to} to={to} title={label} className="mobile-tab" data-kind={kind} data-active={pathname === to && !open} aria-current={pathname === to ? 'page' : undefined}>
        {pathname === to && !open && <motion.span aria-hidden="true" className="mobile-tab-active" layoutId="mobile-tab-active" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }} />}
        <span className="mobile-tab-icon"><Icon size={28} strokeWidth={1.65} aria-hidden="true" /></span><span className="mobile-tab-label">{label}</span>
      </Link>)}
      <button type="button" className="mobile-tab" data-kind="more" data-active={moreActive || open} title="Más opciones" aria-label="Más opciones" aria-haspopup="dialog" aria-expanded={open} aria-pressed={moreActive || open} onClick={() => setOpen(true)}>{(moreActive || open) && <motion.span aria-hidden="true" className="mobile-tab-active" layoutId="mobile-tab-active" transition={{ duration: reduced ? 0 : 0.2 }} />}<span className="mobile-tab-icon"><PanelsTopLeft size={28} strokeWidth={1.65} aria-hidden="true" /></span><span className="mobile-tab-label">Más</span></button>
    </nav>
    <AppDialog open={open} onClose={() => setOpen(false)} title="Tu comunidad" busy={busy}>
      <div className="mobile-more-content">
        {user ? <div className="mobile-more-profile"><ProfileAvatar profile={profile} metadata={user.user_metadata} /><div><strong>{profile?.full_name || 'Tu cuenta'}</strong><p>{profile?.church_name || user.email}</p></div></div> : <div className="mobile-guest-actions"><Link to="/login" onClick={() => setOpen(false)}>Iniciar sesión<LogIn size={18} /></Link><Link to="/register" onClick={() => setOpen(false)}>Crear cuenta<PlusSquare size={18} /></Link></div>}
        <div className="mobile-more-links">{extraLinks.map(({ to, label, Icon, state }) => <Link key={label} to={to} state={state} onClick={() => setOpen(false)}><Icon size={23} /><span>{label}</span></Link>)}</div>
        {profile?.role === 'admin' && <Link className="mobile-account-action" to="/admin" onClick={() => setOpen(false)}><Shield size={19} />Administración</Link>}
        {user && <button type="button" className="mobile-account-action" disabled={busy} onClick={signOut}><LogOut size={19} />{busy ? 'Cerrando sesión...' : 'Cerrar sesión'}</button>}
        {error && <p role="alert" className="text-sm text-red-300 mt-3">{error}</p>}
      </div>
    </AppDialog>
  </div>;
}

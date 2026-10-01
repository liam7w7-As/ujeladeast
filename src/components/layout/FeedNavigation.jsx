import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, Home, Library, LogIn, LogOut, Menu, MessageCircle, Music2, PlusSquare, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../ui/NotificationBell';
import ProfileAvatar from '../ui/ProfileAvatar';
import AppDialog from '../ui/AppDialog';

const links = [
  { to: '/', label: 'Inicio', Icon: Home },
  { to: '/feed', label: 'Comunidad', Icon: Compass },
  { to: '/estudios', label: 'Estudios', Icon: BookOpen },
  { to: '/himnario', label: 'Himnario', Icon: Music2 },
  { to: '/sociedades', label: 'Sociedades', Icon: Users },
  { to: '/recursos', label: 'Recursos', Icon: Library },
  { to: '/chat', label: 'UJELADITO', Icon: MessageCircle },
];

export default function FeedNavigation({ onCreate }) {
  const { user, profile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const reduced = useReducedMotion();
  const signOut = async () => {
    try { await logout(); setMenuOpen(false); }
    catch { setError('No se pudo cerrar la sesión. Intenta nuevamente.'); }
  };
  const brand = <Link to="/" className="feed-brand" aria-label="UJELADEA inicio"><img src="/logo-ujeladea.png" alt="" /><span>UJELADEA<span className="feed-brand-dot">.</span></span></Link>;
  const createButton = className => <motion.button type="button" title="Crear publicación" aria-label="Crear publicación" className={className} onClick={onCreate} whileTap={reduced ? undefined : { scale: 0.92 }}><PlusSquare size={25} /><span>Crear</span></motion.button>;

  return <>
    <nav className="feed-rail" aria-label="Navegación principal">
      {brand}
      <div className="feed-rail-links">
        {links.map(({ to, label, Icon }) => <Link key={to} to={to} title={label} aria-label={label} aria-current={to === '/feed' ? 'page' : undefined} className="feed-nav-link"><Icon size={24} strokeWidth={to === '/feed' ? 2.4 : 1.7} /><span>{label}</span></Link>)}
        {createButton('feed-nav-link feed-nav-create')}
      </div>
      <div className="feed-rail-account">
        {user ? <>
          <div className="feed-nav-notifications"><NotificationBell /><span>Notificaciones</span></div>
          <button className="feed-nav-link" type="button" title="Tu cuenta" aria-label="Tu cuenta" onClick={() => setMenuOpen(true)}><ProfileAvatar profile={profile} metadata={user.user_metadata} className="h-8 w-8" /><span className="truncate">{profile?.full_name || 'Tu cuenta'}</span></button>
        </> : <Link className="feed-nav-link" to="/login" title="Iniciar sesión"><LogIn size={24} /><span>Iniciar sesión</span></Link>}
      </div>
    </nav>
    <header className="feed-mobile-top">
      {brand}
      <div className="flex items-center gap-1">{user ? <NotificationBell /> : <Link to="/login" className="feed-login">Entrar</Link>}<Link to="/chat" className="feed-icon" title="Abrir UJELADITO" aria-label="Abrir UJELADITO"><MessageCircle size={23} /></Link></div>
    </header>
    <nav className="feed-mobile-bottom" aria-label="Navegación móvil">
      <Link to="/" className="feed-icon" title="Inicio" aria-label="Inicio"><Home size={24} /></Link>
      <Link to="/feed" className="feed-icon" title="Comunidad" aria-label="Comunidad" aria-current="page"><Compass size={25} /></Link>
      {createButton('feed-icon feed-mobile-create')}
      <Link to="/estudios" className="feed-icon" title="Estudios" aria-label="Estudios"><BookOpen size={24} /></Link>
      <button type="button" className="feed-icon" title="Más opciones" aria-label="Más opciones" onClick={() => setMenuOpen(true)}>{user ? <ProfileAvatar profile={profile} metadata={user.user_metadata} className="h-7 w-7" /> : <Menu size={24} />}</button>
    </nav>
    <AppDialog open={menuOpen} onClose={() => setMenuOpen(false)} title={user ? 'Tu comunidad' : 'Explorar'}>
      <div className="overflow-y-auto p-4">
        {user && <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-2"><ProfileAvatar profile={profile} metadata={user.user_metadata} /><div className="min-w-0"><p className="text-sm font-semibold break-words">{profile?.full_name || 'Tu cuenta'}</p><p className="text-xs text-white/50 break-words">{profile?.church_name}</p></div></div>}
        {links.map(({ to, label, Icon }) => <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm hover:bg-white/5"><Icon size={21} />{label}</Link>)}
        {user ? <button type="button" onClick={signOut} className="flex items-center gap-4 px-3 py-3 text-sm text-rose-300"><LogOut size={21} />Cerrar sesión</button> : <Link to="/login" className="flex items-center gap-4 px-3 py-3 text-sm text-rose-300"><LogIn size={21} />Iniciar sesión</Link>}
        {error && <p role="alert" className="p-3 text-sm text-red-300">{error}</p>}
      </div>
    </AppDialog>
  </>;
}

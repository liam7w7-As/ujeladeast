import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import MobileNavigation from './MobileNavigation';
import '../../pages/auth.css';

export default function AuthLayout({ title, subtitle, active, children }) {
  const reduced = useReducedMotion();
  return <div className="auth-page">
    <MobileNavigation />
    <header className="auth-desktop-header"><Link to="/" className="auth-brand"><img src="/logo-ujeladea.png" alt="" />UJELADEA<span>.</span></Link><Link to="/feed"><ArrowLeft size={17} />Volver a la comunidad</Link></header>
    <main className="auth-main">
      <motion.div className="auth-content" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <img src="/logo-ujeladea.png" alt="UJELADEA" className="auth-mark" />
        <header className="auth-heading"><h1>{title}</h1><p>{subtitle}</p></header>
        {active && <nav aria-label="Acceso a tu cuenta" className="auth-tabs">{[{ to: '/login', label: 'Iniciar sesión', id: 'login' }, { to: '/register', label: 'Crear cuenta', id: 'register' }].map(item => <Link key={item.id} to={item.to} aria-current={active === item.id ? 'page' : undefined}>{item.label}{active === item.id && <motion.span layoutId="auth-tab" transition={{ duration: reduced ? 0 : 0.2 }} />}</Link>)}</nav>}
        {children}
        <Link to="/feed" className="auth-guest">Seguir como invitado<ArrowLeft size={16} /></Link>
      </motion.div>
    </main>
  </div>;
}

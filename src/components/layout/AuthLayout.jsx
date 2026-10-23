import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import MobileNavigation from './MobileNavigation';
import { coverPhoto, photoSrc, photoSrcSet } from '../../lib/communityPhotos';
import { AVATAR_CHOICES } from '../../lib/avatars';
import { AppearanceToggle } from '../ui/AppearanceControl';
import '../../pages/auth.css';

export default function AuthLayout({ title, subtitle, active, children, showGuest = true }) {
  const reduced = useReducedMotion();
  return <div className="auth-page" data-scene={Boolean(active)}>
    <MobileNavigation />
    <header className="auth-desktop-header"><Link to="/" className="auth-brand"><img src="/logo-ujeladea.png" alt="" />UJELADEA<span>.</span></Link><div className="auth-desktop-actions"><AppearanceToggle /><Link to="/feed"><ArrowLeft size={17} />Volver a la comunidad</Link></div></header>
    <main className="auth-main">
      {active && <motion.aside className="auth-story" aria-label="Nuestra comunidad" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <div className="auth-story-copy">
          <motion.p className="auth-story-kicker" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>Distintas historias. Una misma fe.</motion.p>
          <motion.h2 initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: reduced ? 0 : 0.06 }}>Somos uno<br /> <span>en Cristo.</span></motion.h2>
          <p>Siempre hay un lugar para ti.</p>
        </div>
        <motion.figure className="auth-story-media" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: reduced ? 0 : 0.12 }}>
          <img src={photoSrc(coverPhoto, 960)} srcSet={photoSrcSet(coverPhoto)} sizes="(min-width: 1280px) 44vw, 44vw" width="1600" height="900" alt={coverPhoto.alt} decoding="async" />
          <figcaption><HeartHandshake size={17} aria-hidden="true" />El Alto, Bolivia</figcaption>
        </motion.figure>
        <div className="auth-story-footer">
          <div className="auth-story-avatars" aria-hidden="true">{AVATAR_CHOICES.slice(2, 6).map(avatar => <img key={avatar.id} src={avatar.src} width="44" height="44" alt="" />)}</div>
          <p>Tu historia también<br /><strong>es parte de UJELADEA.</strong></p>
        </div>
      </motion.aside>}
      <section className="auth-form-panel" aria-labelledby="auth-title">
      <motion.div className="auth-content" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <img src="/logo-ujeladea.png" alt="UJELADEA" className="auth-mark" />
        <header className="auth-heading"><h1 id="auth-title">{title}</h1><p>{subtitle}</p></header>
        {active && <nav aria-label="Acceso a tu cuenta" className="auth-tabs">{[{ to: '/login', label: 'Iniciar sesión', id: 'login' }, { to: '/register', label: 'Crear cuenta', id: 'register' }].map(item => <Link key={item.id} to={item.to} aria-current={active === item.id ? 'page' : undefined}>{item.label}{active === item.id && <motion.span layoutId="auth-tab" transition={{ duration: reduced ? 0 : 0.2 }} />}</Link>)}</nav>}
        {children}
        {showGuest && <Link to="/feed" className="auth-guest">Seguir como invitado<ArrowLeft size={16} /></Link>}
        <p className="auth-privacy"><Link to="/privacidad">Política de privacidad</Link></p>
      </motion.div>
      </section>
    </main>
  </div>;
}

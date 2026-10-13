import { lazy, Suspense, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Globe, LogIn, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { MIGRATION_ARRIVAL_PATH, MIGRATION_REVIEW_PATH, NEW_APP_ORIGIN, migrationNoticeAvailable } from '../../lib/domainMigration';
import './domain-migration.css';

const Review = lazy(() => import('./DomainMigrationReview'));

export default function DomainMigrationNotice() {
  const { user, profile, loading } = useAuth();
  const { search, key } = useLocation();
  const requestKey = `${key}:${user?.id || 'guest'}`;
  const [dismissed, setDismissed] = useState(null);
  const [reviewOwner, setReviewOwner] = useState(null);
  const reduced = useReducedMotion();
  const outgoing = migrationNoticeAvailable({ origin: window.location.origin, search, development: import.meta.env.DEV });
  const arrival = window.location.origin === NEW_APP_ORIGIN && new URLSearchParams(search).get('traslado') === 'llegada';
  const manual = ['revisar', 'piloto'].includes(new URLSearchParams(search).get('traslado'));
  const dismissalKey = `ujeladea:domain-notice:v1:${user?.id || 'guest'}`;
  let postponed = false;
  try { postponed = outgoing && !manual && sessionStorage.getItem(dismissalKey) === 'later'; }
  catch { /* The current visit can still dismiss the notice without storage. */ }
  const dismiss = () => {
    if (outgoing) {
      try { sessionStorage.setItem(dismissalKey, 'later'); } catch { /* Optional preference only. */ }
    }
    setDismissed(requestKey);
    setReviewOwner(null);
  };
  if (loading || (!outgoing && !arrival)) return null;
  if (dismissed === requestKey || postponed) return outgoing
    ? <Link className="domain-migration-text-action domain-migration-reopen" to={MIGRATION_REVIEW_PATH}><Globe size={18} />Ver aviso de ujeladea.org<ArrowRight size={16} /></Link>
    : null;

  return <>
    <motion.section className="domain-migration-notice" aria-label={outgoing ? 'Cambio de dominio' : 'Bienvenida al nuevo dominio'} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="domain-migration-brand"><img src="/logo-ujeladea.png" alt="" /><div><span>Tu comunidad, en su nueva dirección</span><h2>{outgoing ? 'Ahora también en ujeladea.org' : 'Ya estás en ujeladea.org'}</h2></div></div>
      <p>{outgoing ? 'Tu app actual seguirá funcionando. Cambiar de dirección e instalar la nueva app es opcional. Antes de cambiar, revisemos lo que tienes guardado aquí.' : 'Usa tu misma cuenta. Conserva la app anterior hasta comprobar tus datos y las descargas del nuevo sitio.'}</p>
      {arrival && <>
        {user && <p className="domain-migration-account"><CheckCircle2 size={18} aria-hidden="true" />Sesión: {profile?.full_name || user.email}</p>}
        <ol className="domain-migration-arrival-steps"><li>Comprueba tus estudios, racha y favoritos.</li><li>Instalar esta dirección es opcional. Puedes usar el botón Instalar o el menú del navegador. En iPhone, abre Compartir en Safari.</li><li>Si quieres usar el nuevo sitio sin conexión, descarga tus versiones de la Biblia y abre el himnario con conexión primero.</li></ol>
        <p>La instalación y los datos locales de la app anterior no se trasladan automáticamente.</p>
      </>}
      <div className="domain-migration-actions">
        {outgoing ? user
          ? <button type="button" className="domain-migration-primary" onClick={() => setReviewOwner(user.id)}>Revisar mis datos<ArrowRight size={18} /></button>
          : <Link className="domain-migration-primary" to="/login" state={{ from: MIGRATION_REVIEW_PATH }}>Entrar y revisar mis datos<LogIn size={18} /></Link>
          : user ? <Link className="domain-migration-primary" to="/estudios">Ver mis estudios<BookOpen size={18} /></Link>
            : <Link className="domain-migration-primary" to="/login" state={{ from: MIGRATION_ARRIVAL_PATH }}>Iniciar sesión<LogIn size={18} /></Link>}
        <button type="button" className="domain-migration-secondary" onClick={dismiss}><X size={17} />{outgoing ? 'Más tarde' : 'Cerrar aviso'}</button>
      </div>
    </motion.section>
    {outgoing && user && reviewOwner === user.id && <Suspense fallback={<p role="status" className="domain-migration-loading">Abriendo revisión…</p>}><Review key={user.id} owner={user.id} onClose={() => setReviewOwner(null)} /></Suspense>}
  </>;
}

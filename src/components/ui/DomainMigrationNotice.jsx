import { lazy, Suspense, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, LogIn, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { MIGRATION_ARRIVAL_PATH, NEW_APP_ORIGIN, migrationPilotAllowed } from '../../lib/domainMigration';
import './domain-migration.css';

const Review = lazy(() => import('./DomainMigrationReview'));

export default function DomainMigrationNotice() {
  const { user, profile, loading } = useAuth();
  const { search, key } = useLocation();
  const requestKey = `${key}:${user?.id || 'guest'}`;
  const [dismissed, setDismissed] = useState(null);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const pilot = migrationPilotAllowed({ origin: window.location.origin, search, userId: user?.id, profile, development: import.meta.env.DEV });
  const arrival = window.location.origin === NEW_APP_ORIGIN && new URLSearchParams(search).get('traslado') === 'llegada';
  if (loading || dismissed === requestKey || (!pilot && !arrival)) return null;

  return <>
    <motion.section className="domain-migration-notice" aria-label={pilot ? 'Prueba de cambio de dominio' : 'Bienvenida al nuevo dominio'} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="domain-migration-brand"><img src="/logo-ujeladea.png" alt="" /><div><span>{pilot ? 'Prueba piloto' : 'Tu comunidad, en su nueva dirección'}</span><h2>{pilot ? 'Nos encontramos en ujeladea.org' : 'Ya estás en ujeladea.org'}</h2></div></div>
      <p>{pilot ? 'Tu app actual seguirá funcionando. Antes de cambiar, revisemos lo que tienes guardado aquí.' : 'Usa tu misma cuenta. Conserva la app anterior hasta comprobar tus datos y las descargas del nuevo sitio.'}</p>
      {arrival && <>
        {user && <p className="domain-migration-account"><CheckCircle2 size={18} aria-hidden="true" />Sesión: {profile?.full_name || user.email}</p>}
        <ol className="domain-migration-arrival-steps"><li>Comprueba tus estudios, racha y favoritos.</li><li>Instala desde el menú del navegador: Instalar aplicación o Añadir a pantalla de inicio. En iPhone, abre Compartir en Safari.</li><li>Descarga tus versiones de la Biblia y abre el himnario con conexión antes de usarlos offline.</li></ol>
        <p>La instalación y los datos locales de la app anterior no se trasladan automáticamente.</p>
      </>}
      <div className="domain-migration-actions">
        {pilot ? <button type="button" className="domain-migration-primary" onClick={() => setOpen(true)}>Revisar mis datos<ArrowRight size={18} /></button>
          : user ? <Link className="domain-migration-primary" to="/estudios">Ver mis estudios<BookOpen size={18} /></Link>
            : <Link className="domain-migration-primary" to="/login" state={{ from: MIGRATION_ARRIVAL_PATH }}>Iniciar sesión<LogIn size={18} /></Link>}
        <button type="button" className="domain-migration-secondary" onClick={() => setDismissed(requestKey)}><X size={17} />{pilot ? 'Más tarde' : 'Cerrar aviso'}</button>
      </div>
    </motion.section>
    {pilot && open && <Suspense fallback={<p role="status" className="domain-migration-loading">Abriendo revisión…</p>}><Review key={user.id} owner={user.id} onClose={() => setOpen(false)} /></Suspense>}
  </>;
}

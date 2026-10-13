import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Bookmark, CheckCircle2, CircleAlert, CloudCheck, Download, ExternalLink, FilePenLine, Heart, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useBibleFavorites } from '../../hooks/useBibleFavorites';
import { inspectMigrationData, MIGRATION_DESTINATION, migrationReadiness } from '../../lib/domainMigration';
import { listDownloads } from '../../lib/bibleStorage';
import { appUpdateBlocker } from '../../lib/appUpdate';
import AppDialog from './AppDialog';

function inspect(owner) {
  try { return inspectMigrationData(window.localStorage, owner); }
  catch { return inspectMigrationData({ get length() { throw new Error('Storage unavailable'); } }, owner); }
}

function ReviewRow({ Icon, title, children, tone = '' }) {
  return <li className="domain-migration-row" data-tone={tone}><Icon size={21} aria-hidden="true" /><div><h3>{title}</h3>{children}</div></li>;
}

export default function DomainMigrationReview({ owner, onClose }) {
  const [inventory, setInventory] = useState(() => inspect(owner));
  const validateLocalData = useCallback(() => !inspect(owner).error, [owner]);
  const favorites = useBibleFavorites({ timeoutMs: 15000, enabled: !inventory.error, validateLocalData });
  const [online, setOnline] = useState(navigator.onLine);
  const [downloads, setDownloads] = useState({ status: 'loading', versions: [] });
  const [scan, setScan] = useState(0);
  const [acknowledged, setAcknowledged] = useState('');
  const [guestConsent, setGuestConsent] = useState(false);
  const [message, setMessage] = useState('');
  const { ready, guestMissing } = migrationReadiness(inventory, favorites, online, downloads);
  const synced = !inventory.error && favorites.status === 'synced' && favorites.pending === 0 && inventory.pendingFavorites === 0 && !favorites.error;
  const consent = Boolean(acknowledged && acknowledged === inventory.signature);

  useEffect(() => {
    const refresh = () => {
      const next = inspect(owner);
      setInventory(previous => previous.signature === next.signature && previous.error === next.error ? previous : next);
      setOnline(navigator.onLine);
    };
    const timer = window.setInterval(refresh, 2000);
    window.addEventListener('storage', refresh); window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    return () => {
      clearInterval(timer); window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh);
    };
  }, [owner]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => { if (active) { active = false; setDownloads({ status: 'error', versions: [] }); } }, 8000);
    listDownloads().then(versions => {
      if (active) setDownloads({ status: 'ready', versions });
    }).catch(() => { if (active) setDownloads({ status: 'error', versions: [] }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); };
  }, [scan]);

  const recheck = () => {
    const next = inspect(owner);
    setMessage(''); setAcknowledged(''); setInventory(next);
    setDownloads({ status: 'loading', versions: [] }); setScan(value => value + 1);
    if (!next.error) void favorites.retry();
  };
  const depart = event => {
    const latest = inspect(owner);
    const state = migrationReadiness(latest, favorites, navigator.onLine, downloads);
    const blocker = appUpdateBlocker();
    if (favorites.owner !== owner || !state.ready || acknowledged !== latest.signature || blocker) {
      event.preventDefault(); setInventory(latest); setAcknowledged('');
      setMessage(blocker || 'Hay cambios pendientes o cambió la conexión. Revisa los datos nuevamente antes de continuar.');
      return;
    }
    // A new tab preserves the old app and its local data. No tokens or answers travel in the URL.
    setMessage('El nuevo sitio se abre aparte. Conserva esta app hasta comprobar tus datos con la misma cuenta.');
  };

  return <AppDialog open onClose={onClose} title="Antes de cambiar de dirección">
    <div className="domain-migration-review">
      <p className="domain-migration-intro">Revisión de esta cuenta y este navegador. No borra datos ni cambia tu racha.</p>
      <p className="domain-migration-status" role="status" data-ready={ready}>{ready ? <ShieldCheck size={22} /> : <CircleAlert size={22} />}{ready ? 'Sin pendientes en esta revisión' : 'Revisemos antes de continuar'}</p>
      {!online && <p role="alert" className="domain-migration-warning">Sin conexión. Conéctate para confirmar la sincronización.</p>}
      {inventory.error && <p role="alert" className="domain-migration-warning">{inventory.error}</p>}
      <ul className="domain-migration-list">
        <ReviewRow Icon={synced ? CloudCheck : Heart} title="Versículos favoritos de tu cuenta" tone={synced ? 'good' : 'warning'}>
          <p>{inventory.error ? 'La sincronización está detenida hasta poder revisar los datos locales.' : synced ? `${favorites.favorites.length} ${favorites.favorites.length === 1 ? 'favorito confirmado' : 'favoritos confirmados'} en tu cuenta.` : favorites.status === 'syncing' ? 'Confirmando con el servidor…' : `${Math.max(favorites.pending, inventory.pendingFavorites)} cambios locales pendientes de confirmar.`}</p>
          {favorites.error && <p role="alert">{favorites.error}</p>}
          <button type="button" className="domain-migration-text-action" disabled={!online || Boolean(inventory.error) || favorites.status === 'syncing'} onClick={() => { setAcknowledged(''); void favorites.retry(); }}>{favorites.status === 'syncing' ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}Sincronizar favoritos</button>
        </ReviewRow>
        {inventory.guestFavorites.length > 0 && <ReviewRow Icon={Heart} title="Favoritos guardados sin iniciar sesión" tone={guestMissing ? 'warning' : 'good'}>
          <p>{guestMissing ? `${guestMissing} favoritos de este dispositivo aún no están en tu cuenta. Añádelos solo si son tuyos.` : 'Estos favoritos también están en la lista de tu cuenta. Su confirmación depende de la sincronización anterior.'}</p>
          {guestMissing > 0 && <><label className="domain-migration-checkbox"><input type="checkbox" checked={guestConsent} onChange={event => setGuestConsent(event.target.checked)} />Estos favoritos locales son míos.</label><button type="button" className="domain-migration-text-action" disabled={!guestConsent || !online || Boolean(inventory.error) || favorites.status === 'syncing'} onClick={() => { setAcknowledged(''); favorites.importGuest(); setInventory(inspect(owner)); }}><CloudCheck size={16} />Añadir a mi cuenta</button></>}
        </ReviewRow>}
        <ReviewRow Icon={FilePenLine} title="Borradores de estudio y recuperación" tone={inventory.error || inventory.studyDrafts || inventory.recoveryDrafts ? 'warning' : 'good'}>
          <p>{inventory.error ? 'No pudimos completar la revisión de borradores.' : inventory.studyDrafts || inventory.recoveryDrafts ? `${inventory.studyDrafts} de estudio y ${inventory.recoveryDrafts} de recuperación guardados solo aquí. Termínalos y confirma su envío en esta app antes de cambiar.` : 'No encontramos borradores locales de esta cuenta.'}</p>
          {(inventory.studyDrafts > 0 || inventory.recoveryDrafts > 0) && <Link to="/estudios" onClick={onClose} className="domain-migration-text-action"><BookOpen size={16} />Volver a mis estudios</Link>}
        </ReviewRow>
        <ReviewRow Icon={Download} title="Contenido sin conexión">
          <p>{downloads.status === 'loading' ? 'Revisando descargas…' : downloads.status === 'error' ? 'No pudimos revisar las descargas. Vuelve a comprobar.' : downloads.versions.length ? `Versiones guardadas aquí: ${downloads.versions.map(version => version.id).join(', ')}.` : 'No encontramos versiones completas descargadas aquí.'}</p>
          <p>En el nuevo sitio tendrás que descargar tus versiones y abrir el himnario con conexión. Lo guardado aquí no se elimina.</p>
        </ReviewRow>
        <ReviewRow Icon={Bookmark} title="Marcadores y ajustes del lector">
          <p>{inventory.error ? 'No pudimos completar el recuento de marcadores.' : `${inventory.chapters} ${inventory.chapters === 1 ? 'capítulo guardado' : 'capítulos guardados'} solo aquí.`} Los marcadores de capítulos, ajustes y posición de lectura no se trasladan automáticamente.</p>
        </ReviewRow>
        <ReviewRow Icon={CheckCircle2} title="Tu cuenta sigue siendo la misma" tone="good"><p>Los estudios completados, rachas y XP ya guardados en tu cuenta no cambian por el dominio. Inicia sesión con la misma cuenta.</p></ReviewRow>
      </ul>
      <button type="button" className="domain-migration-text-action" onClick={recheck}><RefreshCw size={17} />Volver a comprobar</button>
      <label className="domain-migration-checkbox domain-migration-consent"><input type="checkbox" checked={consent} disabled={!ready} onChange={event => setAcknowledged(event.target.checked ? inventory.signature : '')} />Entiendo qué datos no se trasladan y conservaré la app anterior hasta comprobar el nuevo sitio.</label>
      {message && <p role="status" className="domain-migration-warning">{message}</p>}
      <div className="domain-migration-actions">
        {ready && consent ? <a className="domain-migration-primary" href={MIGRATION_DESTINATION} target="_blank" rel="noopener noreferrer" onClick={depart} onAuxClick={depart}>Ir al nuevo sitio<ExternalLink size={18} /></a> : <button type="button" disabled className="domain-migration-primary">Ir al nuevo sitio<ExternalLink size={18} /></button>}
        <button type="button" className="domain-migration-secondary" onClick={onClose}>Seguir aquí</button>
      </div>
      <p className="domain-migration-footnote">Revisa la app instalada y cada navegador que uses: no comparten necesariamente los mismos datos locales.</p>
    </div>
  </AppDialog>;
}

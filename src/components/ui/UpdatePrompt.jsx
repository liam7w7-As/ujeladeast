import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, LoaderCircle } from 'lucide-react';
import { appUpdateBlocker } from '../../lib/appUpdate';
import AppDialog from './AppDialog';

export default function UpdatePrompt() {
  const [registration, setRegistration] = useState(null);
  const [activated, setActivated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const requested = useRef(false);
  const dismissedAt = useRef(0);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, workerRegistration) { setRegistration(workerRegistration); },
    // Each open tab asks before reloading, even when another tab activates the worker.
    onNeedReload() {},
    onRegisterError(err) { console.warn('No se pudo registrar la actualización de la PWA:', err); },
  });

  useEffect(() => {
    document.documentElement.dataset.appBuild = import.meta.env.APP_BUILD_ID;
    if (!('serviceWorker' in navigator)) return;
    let controlled = Boolean(navigator.serviceWorker.controller);
    const changed = () => {
      if (!controlled) { controlled = true; return; }
      setActivated(true);
      setDismissed(false);
      if (!requested.current) return;
      const reason = appUpdateBlocker();
      if (!reason) { window.location.reload(); return; }
      requested.current = false;
      setUpdating(false);
      setError(reason);
    };
    navigator.serviceWorker.addEventListener('controllerchange', changed);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', changed);
  }, []);

  useEffect(() => {
    if (!registration) return;
    let checking = false;
    const check = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine || checking) return;
      if (Date.now() - dismissedAt.current >= 5 * 60_000) setDismissed(false);
      checking = true;
      try { await registration.update(); }
      catch { /* A connection failure must not interrupt reading or discard a waiting update. */ }
      finally { checking = false; }
    };
    const timer = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [registration]);

  useEffect(() => {
    if (!updating) return;
    const timer = window.setTimeout(() => {
      requested.current = false;
      setUpdating(false);
      setError('La actualización está tardando. Puedes volver a intentarlo.');
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [updating]);

  const later = () => {
    dismissedAt.current = Date.now();
    setDismissed(true);
    setError('');
  };
  const update = async () => {
    if (requested.current) return;
    const reason = appUpdateBlocker();
    if (reason) { setError(reason); return; }
    setError('');
    requested.current = true;
    setUpdating(true);
    if (activated) { window.location.reload(); return; }
    try {
      if (!registration?.waiting) throw new Error('No waiting worker');
      await updateServiceWorker(true);
    } catch {
      requested.current = false;
      setUpdating(false);
      setError('No se pudo activar la nueva versión. Inténtalo nuevamente.');
    }
  };

  return <AppDialog open={(needRefresh || activated) && !dismissed} onClose={later} busy={updating} title="Nueva versión disponible">
    <div className="overflow-y-auto p-5 sm:p-6">
      <Download size={32} className="mb-4 text-rose-300" aria-hidden="true" />
      <p className="text-sm leading-6 text-white/80">Las mejoras ya están listas. Actualiza para abrir la nueva versión de UJELADEA.</p>
      <p className="mt-3 text-sm leading-6 text-white/60">La app se recargará. Termina lo que estés escribiendo antes de continuar.</p>
      {error && <p role="alert" className="mt-4 text-sm leading-6 text-amber-200">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={later} disabled={updating} className="min-h-11 rounded-lg px-4 text-sm font-medium hover:bg-white/10 disabled:opacity-50">Más tarde</button>
        <button type="button" onClick={update} disabled={updating} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#8f1937] px-5 text-sm font-semibold text-white hover:bg-[#a61c3f] disabled:opacity-60">{updating ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}{updating ? 'Actualizando...' : 'Actualizar'}</button>
      </div>
    </div>
  </AppDialog>;
}

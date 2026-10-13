const PENDING_KEY = 'ujeladea-install-pending';
const PENDING_LIMIT = 2 * 60 * 1000;

export function createPwaInstallStore(target) {
  let state = { status: 'available', canPrompt: false, promotion: false, help: false, error: '' };
  let deferredPrompt = null;
  let muted = false;
  let pendingAt = 0;
  let timer;
  let stop;
  let checkId = 0;
  const listeners = new Set();
  const display = target.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)');
  const standalone = () => display.matches || target.navigator.standalone === true;
  const publish = changes => {
    state = { ...state, ...changes };
    listeners.forEach(listener => listener());
  };
  const savePending = value => {
    try {
      if (value) target.sessionStorage.setItem(PENDING_KEY, String(value));
      else target.sessionStorage.removeItem(PENDING_KEY);
    } catch { /* Installation remains available when storage is blocked. */ }
  };
  const clearTimer = () => { target.clearInterval(timer); timer = undefined; };
  const confirm = () => {
    pendingAt = 0;
    deferredPrompt = null;
    clearTimer();
    savePending(0);
    publish({ status: 'installed', canPrompt: false, promotion: false, help: false, error: '' });
  };
  const checkInstalled = async () => {
    const request = ++checkId;
    if (standalone()) { confirm(); return; }
    if (!target.navigator.getInstalledRelatedApps) return;
    try {
      const apps = await target.navigator.getInstalledRelatedApps();
      if (request !== checkId || !listeners.size) return;
      const manifest = new URL('/manifest.webmanifest', target.location.origin).href;
      const installed = apps.some(app => {
        if (app.platform !== 'webapp' || !app.url) return false;
        try { return new URL(app.url, target.location.origin).href === manifest; }
        catch { return false; }
      });
      if (installed) confirm();
      else if (state.status === 'installed') publish({ status: 'available' });
    } catch { /* Unsupported browsers still offer manual installation. */ }
  };
  const watchPending = () => {
    clearTimer();
    const tick = () => {
      if (Date.now() - pendingAt >= PENDING_LIMIT) {
        clearTimer();
        publish({ status: 'unconfirmed' });
      }
      if (target.document.visibilityState === 'visible') void checkInstalled();
    };
    timer = target.setInterval(tick, 3000);
    tick();
  };
  const markPending = () => {
    if (state.status === 'installed') return;
    deferredPrompt = null;
    pendingAt ||= Date.now();
    savePending(pendingAt);
    publish({ status: 'pending', canPrompt: false, error: '' });
    watchPending();
  };
  const start = () => {
    const beforeInstall = event => {
      event.preventDefault();
      if (standalone()) { confirm(); return; }
      // Each browser prompt is single-use; only a new event enables a retry.
      deferredPrompt = event;
      pendingAt = 0;
      savePending(0);
      clearTimer();
      publish({ status: 'available', canPrompt: typeof event.prompt === 'function', promotion: !muted, error: '' });
    };
    const refresh = () => {
      if (target.document.visibilityState === 'visible') void checkInstalled();
    };
    target.addEventListener('beforeinstallprompt', beforeInstall);
    // On Android this can fire before the WebAPK has finished installing.
    target.addEventListener('appinstalled', markPending);
    target.addEventListener('focus', refresh);
    target.document.addEventListener('visibilitychange', refresh);
    display.addEventListener('change', refresh);
    try { pendingAt = Number(target.sessionStorage.getItem(PENDING_KEY)) || 0; } catch { /* Optional state. */ }
    if (pendingAt > 0 && pendingAt <= Date.now()) {
      publish({ status: 'pending' });
      watchPending();
    }
    void checkInstalled();
    return () => {
      checkId++;
      clearTimer();
      target.removeEventListener('beforeinstallprompt', beforeInstall);
      target.removeEventListener('appinstalled', markPending);
      target.removeEventListener('focus', refresh);
      target.document.removeEventListener('visibilitychange', refresh);
      display.removeEventListener('change', refresh);
    };
  };
  const install = async () => {
    if (state.status === 'installed' || state.status === 'prompting') return;
    if (!deferredPrompt || !state.canPrompt) {
      publish({ help: true, promotion: false });
      void checkInstalled();
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    publish({ status: 'prompting', canPrompt: false, error: '' });
    try {
      const result = await prompt.prompt();
      const choice = await (prompt.userChoice || result);
      if (state.status === 'installed') return;
      if (choice?.outcome === 'accepted') markPending();
      else if (state.status === 'prompting') publish({ status: 'available' });
    } catch {
      if (state.status !== 'prompting') return;
      publish({ status: 'available', help: true, promotion: false, error: 'No se pudo abrir el instalador. Puedes usar el menú del navegador.' });
    }
  };
  return {
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) stop = start();
      return () => { listeners.delete(listener); if (!listeners.size) stop?.(); };
    },
    install,
    checkInstalled,
    closeHelp: () => publish({ help: false }),
    dismissPromotion: () => { muted = true; publish({ promotion: false }); },
  };
}

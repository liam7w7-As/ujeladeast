export const APPEARANCE_KEY = 'ujeladea:appearance:v1';
export const appearancePreference = value => ['light', 'dark', 'system'].includes(value) ? value : 'dark';
export const resolveAppearance = (preference, lightDevice = false) => preference === 'system' ? (lightDevice ? 'light' : 'dark') : appearancePreference(preference);

export function createAppearanceStore({ storage, media, root, events } = {}) {
  let storageAvailable = Boolean(storage);
  const read = () => { try { return appearancePreference(storage?.getItem(APPEARANCE_KEY)); } catch { storageAvailable = false; return 'dark'; } };
  let preference = read();
  let snapshot = { preference, theme: resolveAppearance(preference, media?.matches) };
  const listeners = new Set();
  const apply = () => {
    const theme = resolveAppearance(preference, media?.matches);
    if (root) { root.dataset.theme = theme; root.dataset.appearance = preference; root.style.colorScheme = theme; }
    if (snapshot.preference === preference && snapshot.theme === theme) return;
    snapshot = { preference, theme };
    listeners.forEach(listener => listener());
  };
  const deviceChanged = () => apply();
  const storageChanged = event => { if (event.storageArea && event.storageArea !== storage) return; if (event.key === APPEARANCE_KEY || event.key === null) { preference = read(); apply(); } };
  apply();
  return {
    getSnapshot: () => snapshot,
    setPreference(value) {
      preference = appearancePreference(value);
      try { storage?.setItem(APPEARANCE_KEY, preference); } catch { storageAvailable = false; }
      apply();
    },
    subscribe(listener) {
      if (!listeners.size) {
        media?.addEventListener?.('change', deviceChanged);
        events?.addEventListener?.('storage', storageChanged);
        // Another tab or the operating system may have changed while no controls were mounted.
        if (storageAvailable) preference = read();
        apply();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { media?.removeEventListener?.('change', deviceChanged); events?.removeEventListener?.('storage', storageChanged); }
      };
    },
  };
}

let storage;
try { storage = globalThis.localStorage; } catch { /* Private browsing can block access to storage itself. */ }
export const appearance = createAppearanceStore({ storage, media: globalThis.matchMedia?.('(prefers-color-scheme: light)'), root: globalThis.document?.documentElement, events: globalThis.window });

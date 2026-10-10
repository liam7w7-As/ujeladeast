import { favoriteKey, verseLabel } from './bibleVerses.js';

export const guestFavoritesKey = 'bible:verseFavorites';
export function cleanFavorite(entry) {
  if (!entry || !['RVR1960', 'NVI', 'NTV', 'TLA'].includes(entry.version)
    || !/^[A-Z0-9]{3}$/.test(entry.book) || !Number.isInteger(entry.chapter) || entry.chapter < 1 || entry.chapter > 150
    || typeof entry.reference !== 'string' || entry.reference.length > 8192
    || typeof entry.text !== 'string' || !entry.text.trim() || entry.text.length > 100000
    || typeof entry.title !== 'string' || !entry.title.trim() || entry.title.length > 120) return null;
  const parts = entry.reference.split('+');
  if (!parts.length || parts.some(part => !part.startsWith(`${entry.book}.${entry.chapter}.`) || !/^[A-Z0-9]{3}\.[1-9]\d{0,2}\.[1-9]\d{0,2}$/.test(part))) return null;
  const numbers = parts.map(part => Number(part.split('.').at(-1)));
  if (numbers.some((n, index) => index > 0 && n <= numbers[index - 1])) return null;
  return { version: entry.version, book: entry.book, chapter: entry.chapter, reference: entry.reference, label: verseLabel(entry.reference), title: entry.title, text: entry.text };
}
const cleanList = value => Array.isArray(value) ? [...new Map(value.map(cleanFavorite).filter(Boolean).map(entry => [favoriteKey(entry), entry])).values()].slice(0, 500) : [];

// Immutable operation keys keep another tab's edits out of read/modify/write races.
export function createFavoriteStore({ owner, storage, remote, online = () => true, makeId = () => crypto.randomUUID(), lock = run => run() }) {
  const cacheKey = owner ? `bible:favorites:${owner}` : guestFavoritesKey;
  const prefix = `${cacheKey}:op:`;
  const listeners = new Set();
  let active = false, generation = 0, running = null, controller;
  let snapshot = { favorites: [], pending: 0, guestCount: 0, status: owner ? 'pending' : 'device', error: '' };
  const emit = patch => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const read = (key, fallback) => { const raw = storage.getItem(key); return raw === null ? fallback : JSON.parse(raw); };
  function pending() {
    const ops = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const op = read(key, null);
      if (!op || key !== `${prefix}${op.id}` || typeof op.key !== 'string' || !Number.isFinite(op.queuedAt)
        || (op.entry !== null && (!cleanFavorite(op.entry) || favoriteKey(op.entry) !== op.key))) throw new Error('invalid queue');
      ops.push(op);
    }
    return ops.sort((a, b) => a.queuedAt - b.queuedAt || a.id.localeCompare(b.id));
  }
  function refresh(patch = {}) {
    try {
      const cached = read(cacheKey, owner ? {} : []);
      const ops = owner ? pending() : [];
      const entries = new Map(cleanList(owner ? cached.favorites : cached).map(entry => [favoriteKey(entry), entry]));
      for (const op of ops) { entries.delete(op.key); if (op.entry) entries.set(op.key, cleanFavorite(op.entry)); }
      emit({ favorites: owner ? [...entries.values()].reverse() : [...entries.values()], pending: ops.length, guestCount: owner ? cleanList(read(guestFavoritesKey, [])).length : 0, ...patch });
      return true;
    } catch { emit({ status: 'error', error: 'No se pudo acceder a tus favoritos en este dispositivo.' }); return false; }
  }
  function mutate(value, remove = false) {
    const entry = cleanFavorite(value);
    if (!entry || !active || !refresh()) return false;
    const key = favoriteKey(entry);
    if (!remove && !snapshot.favorites.some(item => favoriteKey(item) === key) && snapshot.favorites.length >= 500) {
      emit({ error: 'Ya tienes 500 favoritos. Elimina alguno para guardar otro.' }); return false;
    }
    try {
      if (owner) {
        const ops = pending(), id = makeId();
        const op = { id, key, entry: remove ? null : entry, queuedAt: Math.max(Date.now(), (ops.at(-1)?.queuedAt || 0) + 1) };
        storage.setItem(`${prefix}${id}`, JSON.stringify(op));
      } else {
        const entries = snapshot.favorites.filter(item => favoriteKey(item) !== key);
        storage.setItem(cacheKey, JSON.stringify(remove ? entries : [entry, ...entries]));
      }
      refresh({ error: '', status: owner ? online() ? 'pending' : 'offline' : 'device' });
      void sync(); return true;
    } catch { emit({ error: 'No se pudo guardar en este dispositivo. Libera espacio e inténtalo de nuevo.' }); return false; }
  }
  async function runSync(token) {
    if (!active || token !== generation || !online()) return;
    controller = new AbortController();
    emit({ status: 'syncing', error: '' });
    try {
      do {
        const ops = pending().slice(0, 50);
        const response = await remote(ops.map(({ id, key, entry }) => ({ id, key, entry })), controller.signal);
        if (!active || token !== generation) return;
        if (!Array.isArray(response?.favorites) || !Array.isArray(response.applied) || !Number.isSafeInteger(response.revision)) throw new Error('Invalid response');
        const cached = read(cacheKey, {});
        // A slow tab must not replace a newer server snapshot.
        if ((cached.revision || 0) <= response.revision) storage.setItem(cacheKey, JSON.stringify({ favorites: cleanList(response.favorites), revision: response.revision }));
        const acknowledged = new Set(response.applied);
        if (ops.some(op => !acknowledged.has(op.id))) throw new Error('Incomplete acknowledgement');
        for (const op of ops) storage.removeItem(`${prefix}${op.id}`);
        refresh({ status: 'syncing' });
      } while (pending().length && online());
      refresh({ status: online() ? 'synced' : 'offline', error: '' });
    } catch (error) {
      if (!active || token !== generation) return;
      const missing = ['PGRST202', '42883', '42P01'].includes(error.code);
      refresh({ status: online() ? 'error' : 'offline', error: missing
        ? 'Guardados en este dispositivo. La sincronización todavía no está habilitada.'
        : 'No pudimos sincronizar. Tus cambios locales siguen guardados; puedes reintentar.' });
    }
  }
  function sync() {
    if (!owner || !active) return Promise.resolve();
    if (!online()) { refresh({ status: 'offline' }); return Promise.resolve(); }
    if (running) return running;
    emit({ status: 'syncing', error: '' });
    const token = generation;
    const task = Promise.resolve().then(() => lock(() => runSync(token))).catch(() => {
      if (active && token === generation) emit({ status: 'error', error: 'No pudimos sincronizar. Puedes reintentar.' });
    });
    running = task;
    task.finally(() => { if (running === task) running = null; });
    return task;
  }
  refresh();
  return {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    start() { active = true; generation++; refresh(); void sync(); },
    stop() { active = false; generation++; controller?.abort(); running = null; },
    refresh, sync,
    save: entry => mutate(entry), remove: entry => mutate(entry, true),
    importGuest() {
      if (!owner || !active) return 0;
      let count = 0;
      try {
        for (const entry of cleanList(read(guestFavoritesKey, []))) {
          if (snapshot.favorites.some(item => favoriteKey(item) === favoriteKey(entry))) continue;
          if (!mutate(entry)) break;
          count++;
        }
      } catch { emit({ error: 'No pudimos importar los favoritos de este dispositivo.' }); }
      return count;
    },
    acceptsStorageKey: key => key === null || key === cacheKey || key === guestFavoritesKey || key.startsWith(prefix),
  };
}

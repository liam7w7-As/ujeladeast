import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanFavorite, createFavoriteStore, guestFavoritesKey } from '../src/lib/bibleFavorites.js';
import { chapterVerses, favoriteKey, passageBetween, referencesOverlap, verseClipboard } from '../src/lib/bibleVerses.js';
const entry = n => ({ version: 'RVR1960', book: 'PSA', chapter: 23, reference: `PSA.23.${n}`, label: String(n), title: 'Salmos', text: `Texto ${n}` });
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), key: index => [...data.keys()][index], get length() { return data.size; } };
};
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function server() {
  const entries = new Map(), receipts = new Set();
  let revision = 0;
  return async ops => {
    for (const op of ops) {
      if (receipts.has(op.id)) continue;
      receipts.add(op.id); revision++;
      if (op.entry) entries.set(op.key, op.entry); else entries.delete(op.key);
    }
    return { favorites: [...entries.values()], revision, applied: ops.map(op => op.id) };
  };
}
test('inclusive ranges preserve grouped source verses, reversed endpoints and full text', () => {
  const nodes = [
    ['span', 'verse', 'GEN.2.1+GEN.2.2+GEN.2.3', ['primer grupo']],
    ['span', 'verse', 'GEN.2.1+GEN.2.2+GEN.2.3', ['continuación']],
    ['span', 'verse', 'GEN.2.4', ['cuarto']],
  ];
  const verses = [...chapterVerses(nodes).values()];
  const result = passageBetween(verses, 'GEN.2.4', verses[0].reference);
  assert.equal(result.reference, 'GEN.2.1+GEN.2.2+GEN.2.3+GEN.2.4');
  assert.equal(result.label, '1–4'); assert.equal(result.text, 'primer grupo continuación cuarto');
  assert.ok(referencesOverlap(result.reference, 'GEN.2.3')); assert.ok(!referencesOverlap(result.reference, 'GEN.3.1'));
  assert.equal(passageBetween(verses, 'missing'), null);
  assert.equal(verseClipboard({ ...entry(1), ...result }), 'Salmos 23:1–4 (RVR1960)\n\n«primer grupo continuación cuarto»');
  assert.equal(cleanFavorite({ ...entry(1), reference: 'PSA.23.1+MAT.23.2' }), null);
  assert.equal(cleanFavorite({ ...entry(1), reference: 'PSA.23.2+PSA.23.1' }), null);
});
test('guest favorites keep their existing key and fail honestly when storage is full', () => {
  const storage = memory();
  storage.setItem(guestFavoritesKey, JSON.stringify([entry(1)]));
  const store = createFavoriteStore({ storage }); store.start();
  assert.equal(store.getSnapshot().favorites.length, 1);
  assert.equal(store.save(entry(2)), true);
  assert.deepEqual(store.getSnapshot().favorites.map(e => e.label), ['2', '1']);
  storage.setItem = () => { throw new Error('quota'); };
  assert.equal(store.remove(entry(1)), false);
  assert.equal(store.getSnapshot().favorites.length, 2); assert.ok(store.getSnapshot().error);
  store.stop();
});
test('offline writes survive reload, import is explicit, accounts stay isolated', async () => {
  const storage = memory(); let online = false;
  storage.setItem(guestFavoritesKey, JSON.stringify([entry(1)]));
  const remote = server();
  const options = { owner: 'alice', storage, remote, online: () => online };
  const a = createFavoriteStore(options); a.start();
  assert.equal(a.getSnapshot().favorites.length, 0, 'no automatic guest upload');
  assert.equal(a.importGuest(), 1); assert.equal(a.importGuest(), 0);
  assert.equal(a.save(entry(2)), true); assert.equal(a.getSnapshot().pending, 2); a.stop();
  const b = createFavoriteStore({ ...options, owner: 'bob' }); b.start();
  assert.equal(b.getSnapshot().favorites.length, 0); b.stop();
  const restored = createFavoriteStore(options); restored.start();
  assert.equal(restored.getSnapshot().favorites.length, 2);
  online = true; await restored.sync();
  assert.equal(restored.getSnapshot().pending, 0); assert.equal(restored.getSnapshot().status, 'synced');
  assert.equal(JSON.parse(storage.getItem(guestFavoritesKey)).length, 1);
  restored.stop();
});
test('in-flight edits remain queued, missing migration and lost responses never discard them', async () => {
  const storage = memory(), remote = server(), gate = deferred(); let first = true, online = false;
  const store = createFavoriteStore({ owner: 'a', storage, online: () => online, remote: async ops => {
    const response = await remote(ops);
    if (first) { first = false; await gate.promise; }
    return response;
  } }); store.start(); store.save(entry(1)); online = true;
  const sync = store.sync(); await new Promise(resolve => setTimeout(resolve, 0));
  store.remove(entry(1)); store.save(entry(2)); gate.resolve(); await sync;
  assert.deepEqual(store.getSnapshot().favorites.map(e => e.label), ['2']); assert.equal(store.getSnapshot().pending, 0); store.stop();
  let fail = true;
  const other = createFavoriteStore({ owner: 'b', storage, online: () => online, remote: async ops => {
    const response = await remote(ops); if (fail) throw Object.assign(new Error('missing'), { code: 'PGRST202' }); return response;
  } }); other.start(); other.save(entry(3)); await other.sync();
  assert.equal(other.getSnapshot().pending, 1); assert.match(other.getSnapshot().error, /todavía/);
  fail = false; await other.sync(); assert.equal(other.getSnapshot().pending, 0); other.stop();
});
test('two tabs retain immutable edits and a late response cannot roll back a newer cache', async () => {
  const storage = memory(); let online = false;
  const old = deferred(), remote = server();
  const a = createFavoriteStore({ owner: 'same', storage, online: () => online, remote: () => old.promise });
  const b = createFavoriteStore({ owner: 'same', storage, online: () => online, remote });
  a.start(); b.start(); a.save(entry(1)); b.save(entry(2)); a.refresh();
  assert.equal(a.getSnapshot().pending, 2);
  online = true; const slow = a.sync(); await new Promise(resolve => setTimeout(resolve, 0));
  await b.sync(); b.remove(entry(1)); await b.sync();
  old.resolve({ favorites: [entry(1)], revision: 1, applied: [] }); await slow;
  a.refresh(); assert.deepEqual(a.getSnapshot().favorites.map(favoriteKey), [favoriteKey(entry(2))]);
  a.stop(); b.stop();
});
test('stopped account ignores its response and retains operations for idempotent retry', async () => {
  const storage = memory(), gate = deferred(); let online = false;
  const store = createFavoriteStore({ owner: 'a', storage, online: () => online, remote: () => gate.promise });
  store.start(); store.save(entry(1)); online = true;
  const sync = store.sync(); await new Promise(resolve => setTimeout(resolve, 0)); store.stop();
  gate.resolve({ favorites: [entry(1)], revision: 1, applied: [] }); await sync;
  assert.equal(storage.getItem('bible:favorites:a'), null);
  assert.equal(store.getSnapshot().pending, 1);
});

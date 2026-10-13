import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectMigrationData, migrationPilotAllowed, migrationReadiness as readiness, MIGRATION_DESTINATION, OLD_APP_ORIGIN } from '../src/lib/domainMigration.js';
import { compareStudyDrafts } from '../src/lib/domainStudyReview.js';

const owner = 'alice';
const favorite = { version: 'RVR1960', book: 'PSA', chapter: 23, reference: 'PSA.23.1', title: 'Salmos', text: 'El Señor es mi pastor.' };
function memory(entries = {}) {
  const values = new Map(Object.entries(entries));
  const reads = [];
  return { reads, values, get length() { return values.size; }, key: index => [...values.keys()][index], getItem(key) { reads.push(key); return values.get(key) ?? null; } };
}
const synced = { ready: true, status: 'synced', favorites: [], pending: 0, error: '' };
const downloads = { status: 'ready' };
const reviewed = state => ({ ...compareStudyDrafts(state, { completedCount: 0 }), status: 'ready' });
const migrationReadiness = (state, favorites, online, downloads) => readiness(state, favorites, online, downloads, reviewed(state));

test('pilot requires explicit opt-in, old origin and the current admin profile', () => {
  const base = { origin: OLD_APP_ORIGIN, search: '?traslado=piloto', userId: owner, profile: { id: owner, role: 'admin' } };
  assert.equal(migrationPilotAllowed(base), true);
  for (const change of [{ search: '' }, { userId: null }, { profile: { id: owner, role: 'user' } }, { profile: { id: 'bob', role: 'admin' } }, { origin: 'https://www.ujeladea.org' }, { origin: 'https://ujeladeast.vercel.app.evil.test' }]) assert.equal(migrationPilotAllowed({ ...base, ...change }), false);
  assert.equal(migrationPilotAllowed({ ...base, origin: 'http://127.0.0.1:5177' }), false);
  assert.equal(migrationPilotAllowed({ ...base, origin: 'http://127.0.0.1:5177', development: true }), true);
  assert.equal(MIGRATION_DESTINATION, 'https://www.ujeladea.org/?traslado=llegada');
});

test('inventory is account-scoped, reads no credentials and never modifies storage', () => {
  const storage = memory({
    'sb-private-auth-token': 'secret',
    'ujeladea:study-draft:v1:bob:1': 'invalid-other-user-data',
    'ujeladea:recovery:v1:bob:1': 'secret',
    'bible:favorites:bob': 'secret',
    'bible:favorites:bob:op:1': 'secret',
    'ujeladea:study-draft:v1:alice:1': JSON.stringify({ version: 1, answers: { 0: 'Personal answer' } }),
    'ujeladea:recovery:v1:alice:2': JSON.stringify({ answers: ['', '', ''] }),
    'bible:favorites:alice:op:3': '{}',
    'bible:verseFavorites': JSON.stringify([favorite]),
    'bible:bookmarks': JSON.stringify([{ version: 'RVR1960', book: 'PSA', chapter: 23 }]),
    'bible:fontSize': '19',
  });
  const before = [...storage.values];
  const state = inspectMigrationData(storage, owner);
  assert.equal(state.error, ''); assert.equal(state.studyDrafts, 1); assert.equal(state.recoveryDrafts, 1);
  assert.equal(state.pendingFavorites, 1); assert.equal(state.guestFavorites.length, 1); assert.equal(state.chapters, 1);
  assert.equal(state.readingSettings, true);
  assert.ok(storage.reads.every(key => !key.includes('bob') && !key.includes('auth-token')));
  assert.deepEqual([...storage.values], before);
  assert.equal(migrationReadiness(state, synced, true, downloads).ready, false);
});

test('corrupt or blocked storage is unknown, never all-clear', () => {
  for (const entries of [{ 'bible:verseFavorites': '{' }, { 'bible:verseFavorites': '[{}]' }, { 'bible:favorites:alice': '{"favorites":[{}]}' }, { 'ujeladea:study-draft:v1:alice:1': 'null' }, { 'bible:bookmarks': '{}' }]) {
    const state = inspectMigrationData(memory(entries), owner);
    assert.ok(state.error); assert.equal(migrationReadiness(state, synced, true, downloads).ready, false);
  }
  assert.ok(inspectMigrationData({ get length() { throw new Error('SecurityError'); } }, owner).error);
  assert.ok(inspectMigrationData(memory(), null).error);
});

test('only confirmed favorites and a current server study review permit informed departure', () => {
  const state = inspectMigrationData(memory(), owner);
  assert.equal(migrationReadiness(state, synced, true, downloads).ready, true);
  for (const status of ['syncing', 'pending', 'offline', 'error']) assert.equal(migrationReadiness(state, { ...synced, status }, true, downloads).ready, false);
  for (const patch of [{ pending: 1 }, { error: 'failure' }, { ready: false }]) assert.equal(migrationReadiness(state, { ...synced, ...patch }, true, downloads).ready, false);
  assert.equal(migrationReadiness(state, synced, false, downloads).ready, false);
  for (const status of ['loading', 'error']) assert.equal(migrationReadiness(state, synced, true, { status }).ready, false);
  assert.equal(migrationReadiness({ ...state, pendingFavorites: 1 }, synced, true, downloads).ready, false);
  for (const patch of [{ status: 'error' }, { status: 'loading' }, { owner: 'bob' }, { signature: 'stale' }]) {
    assert.equal(readiness(state, synced, true, downloads, { ...reviewed(state), ...patch }).ready, false);
  }
  assert.equal(readiness(state, synced, true, downloads).ready, false);
});

test('guest copies already confirmed in this account do not create a permanent blocker', () => {
  const state = inspectMigrationData(memory({ 'bible:verseFavorites': JSON.stringify([favorite, favorite]) }), owner);
  assert.equal(state.guestFavorites.length, 1);
  assert.equal(migrationReadiness(state, synced, true, downloads).guestMissing, 1);
  const confirmed = { ...synced, favorites: [favorite] };
  assert.equal(migrationReadiness(state, confirmed, true, downloads).ready, true);
  assert.equal(migrationReadiness(state, { ...confirmed, status: 'syncing' }, true, downloads).ready, false);
});

test('fresh inventory signature detects new drafts and changed local-only preferences', () => {
  const storage = memory(), first = inspectMigrationData(storage, owner);
  storage.values.set('bible:fontSize', '21');
  const second = inspectMigrationData(storage, owner);
  assert.notEqual(second.signature, first.signature);
  storage.values.set('ujeladea:study-draft:v1:alice:new', '{"version":1}');
  const third = inspectMigrationData(storage, owner);
  assert.notEqual(third.signature, second.signature);
  assert.equal(readiness(third, synced, true, downloads, reviewed(second)).ready, false);
  assert.equal(migrationReadiness(third, synced, true, downloads).ready, true, 'a navigation-only draft is not a blocker after review');
});

test('real pending answers require distinct informed consent, never a false all-clear', () => {
  const state = inspectMigrationData(memory({ 'ujeladea:study-draft:v1:alice:1': '{"version":1,"answers":{"0":"Reflexion pendiente"}}' }), owner);
  const pending = migrationReadiness(state, synced, true, downloads);
  assert.equal(pending.ready, true); assert.equal(pending.pending, 1); assert.ok(pending.consentKey);
  const confirmed = readiness(state, synced, true, downloads, { ...reviewed(state), pending: [], confirmed: 1 });
  assert.notEqual(pending.consentKey, confirmed.consentKey);
  assert.equal(readiness(state, synced, false, downloads, reviewed(state)).consentKey, '');
});

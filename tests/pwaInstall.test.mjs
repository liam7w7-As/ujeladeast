import test from 'node:test';
import assert from 'node:assert/strict';
import { createPwaInstallStore } from '../src/lib/pwaInstall.js';

function fixture(options = {}) {
  const target = new EventTarget();
  const display = Object.assign(new EventTarget(), { matches: Boolean(options.standalone) });
  const storage = new Map(Object.entries(options.storage || {}));
  const timers = new Set();
  Object.assign(target, {
    location: { origin: options.origin || 'https://www.ujeladea.org' },
    navigator: {},
    document: Object.assign(new EventTarget(), { visibilityState: 'visible' }),
    matchMedia: () => display,
    sessionStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    setInterval: callback => { timers.add(callback); return callback; },
    clearInterval: callback => timers.delete(callback),
  });
  if (options.apps) target.navigator.getInstalledRelatedApps = options.apps;
  const store = createPwaInstallStore(target);
  const unsubscribe = store.subscribe(() => {});
  const emit = (outcome = 'accepted', prompt) => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = prompt || (() => Promise.resolve({ outcome }));
    target.dispatchEvent(event);
    assert.ok(event.defaultPrevented);
  };
  return { target, display, storage, timers, store, emit, unsubscribe };
}

test('manual installation remains available without an install event', async () => {
  const { store, unsubscribe } = fixture();
  await store.install();
  assert.equal(store.snapshot().help, true);
  store.closeHelp();
  assert.equal(store.snapshot().status, 'available');
  assert.equal(store.snapshot().help, false);
  unsubscribe();
});

test('dismissing the banner does not remove the install action or reuse a consumed prompt', async () => {
  const { store, emit, unsubscribe } = fixture();
  let calls = 0;
  emit('dismissed', async () => { calls++; return { outcome: 'dismissed' }; });
  store.dismissPromotion();
  await store.install();
  assert.equal(store.snapshot().status, 'available');
  await store.install();
  assert.equal(store.snapshot().help, true);
  assert.equal(calls, 1);
  emit();
  assert.equal(store.snapshot().canPrompt, true);
  assert.equal(store.snapshot().promotion, false);
  unsubscribe();
});

test('double clicks cannot launch two native prompts', async () => {
  const { store, emit, unsubscribe } = fixture();
  let finish, calls = 0;
  emit('accepted', () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = store.install();
  await store.install();
  assert.equal(calls, 1);
  assert.equal(store.snapshot().status, 'prompting');
  finish({ outcome: 'accepted' });
  await first;
  assert.equal(store.snapshot().status, 'pending');
  unsubscribe();
});

test('acceptance and appinstalled keep access visible until the current origin is confirmed', async () => {
  let apps = [{ platform: 'webapp', url: 'https://ujeladeast.vercel.app/manifest.webmanifest' }];
  const { store, emit, target, storage, unsubscribe } = fixture({ apps: async () => apps });
  emit();
  await store.install();
  target.dispatchEvent(new Event('appinstalled'));
  await store.checkInstalled();
  assert.equal(store.snapshot().status, 'pending');
  assert.ok(storage.has('ujeladea-install-pending'));
  apps = [{ platform: 'webapp', url: 'https://www.ujeladea.org/manifest.webmanifest' }];
  await store.checkInstalled();
  assert.equal(store.snapshot().status, 'installed');
  assert.equal(storage.has('ujeladea-install-pending'), false);
  apps = [];
  await store.checkInstalled();
  assert.equal(store.snapshot().status, 'available', 'an uninstall is not cached forever');
  unsubscribe();
});

test('the old origin confirms only its own installation', async () => {
  const { store, unsubscribe } = fixture({ origin: 'https://ujeladeast.vercel.app', apps: async () => [{ platform: 'webapp', url: 'https://ujeladeast.vercel.app/manifest.webmanifest' }] });
  await store.checkInstalled();
  assert.equal(store.snapshot().status, 'installed');
  unsubscribe();
});

test('standalone and iOS standalone are confirmed without waiting for native events', async () => {
  const first = fixture({ standalone: true });
  assert.equal(first.store.snapshot().status, 'installed');
  first.unsubscribe();
  const second = fixture();
  second.target.navigator.standalone = true;
  await second.store.checkInstalled();
  assert.equal(second.store.snapshot().status, 'installed');
  second.unsubscribe();
});

test('a slow installation survives reload and eventually offers a check instead of an endless spinner', () => {
  const { store, timers, unsubscribe } = fixture({ storage: { 'ujeladea-install-pending': String(Date.now() - 121000), 'study-draft': 'untouched' } });
  assert.equal(store.snapshot().status, 'unconfirmed');
  assert.equal(timers.size, 0);
  unsubscribe();
});

test('prompt errors and blocked browser APIs leave manual help accessible', async () => {
  const { target, store, emit, unsubscribe } = fixture({ apps: async () => { throw new Error('unsupported'); } });
  target.sessionStorage.setItem = () => { throw new Error('blocked'); };
  emit('accepted', () => { throw new Error('not allowed'); });
  await store.install();
  assert.equal(store.snapshot().help, true);
  assert.match(store.snapshot().error, /instalador/);
  assert.equal(store.snapshot().status, 'available');
  emit();
  await store.install();
  assert.equal(store.snapshot().status, 'pending');
  unsubscribe();
});

test('stale detection results cannot hide a button after a newer check found no installation', async () => {
  const checks = [];
  const { store, unsubscribe } = fixture({ apps: () => new Promise(resolve => checks.push(resolve)) });
  const latest = store.checkInstalled();
  checks[1]([]);
  await latest;
  checks[0]([{ platform: 'webapp', url: '/manifest.webmanifest' }]);
  await Promise.resolve();
  assert.equal(store.snapshot().status, 'available');
  unsubscribe();
});

test('subscriptions and pending timers are cleaned up without deleting unrelated data', async () => {
  const { store, emit, target, timers, storage, unsubscribe } = fixture({ storage: { 'study-draft': 'untouched' } });
  emit();
  await store.install();
  assert.equal(timers.size, 1);
  unsubscribe();
  assert.equal(timers.size, 0);
  assert.equal(storage.get('study-draft'), 'untouched');
  const snapshot = store.snapshot();
  target.dispatchEvent(new Event('appinstalled'));
  assert.equal(store.snapshot(), snapshot);
});

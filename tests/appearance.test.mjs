import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { APPEARANCE_KEY, appearancePreference, resolveAppearance, createAppearanceStore } from '../src/lib/appearance.js';

function fixture(value) {
  const values = new Map(value ? [[APPEARANCE_KEY, value]] : []);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, next) => values.set(key, next) };
  const media = new EventTarget(); media.matches = true;
  const events = new EventTarget(), root = { dataset: {}, style: {} };
  return { values, storage, media, events, root, store: createAppearanceStore({ storage, media, events, root }) };
}
test('existing users remain dark; invalid values cannot become CSS or a theme', () => {
  for (const value of [null, '', 'LIGHT', '<script>', {}, 1]) assert.equal(appearancePreference(value), 'dark');
  assert.equal(resolveAppearance('system', true), 'light');
  assert.equal(resolveAppearance('system', false), 'dark');
  const { store, root } = fixture();
  assert.deepEqual(store.getSnapshot(), { preference: 'dark', theme: 'dark' });
  assert.equal(root.style.colorScheme, 'dark');
});
test('the selected theme persists without modifying Bible, auth or study storage', () => {
  const { store, storage, root, values } = fixture();
  values.set('bible:theme', '"dark"'); values.set('study-draft', 'unchanged');
  store.setPreference('light');
  assert.equal(storage.getItem(APPEARANCE_KEY), 'light');
  assert.equal(root.dataset.theme, 'light');
  assert.equal(values.get('bible:theme'), '"dark"');
  assert.equal(values.get('study-draft'), 'unchanged');
  assert.equal(createAppearanceStore({ storage }).getSnapshot().theme, 'light');
});
test('device changes affect only system mode and subscriptions clean up', () => {
  const { store, media, root } = fixture('system');
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  media.matches = false; media.dispatchEvent(new Event('change'));
  assert.equal(root.dataset.theme, 'dark');
  store.setPreference('light');
  media.matches = true; media.dispatchEvent(new Event('change'));
  assert.equal(root.dataset.theme, 'light');
  assert.equal(notifications, 2);
  unsubscribe(); media.matches = false; media.dispatchEvent(new Event('change'));
  assert.equal(notifications, 2);
});
test('cross-tab changes and clearing settings refresh the app without reload', () => {
  const { store, storage, events } = fixture();
  const unsubscribe = store.subscribe(() => {});
  storage.setItem(APPEARANCE_KEY, 'light');
  events.dispatchEvent(Object.assign(new Event('storage'), { key: APPEARANCE_KEY, storageArea: storage }));
  assert.equal(store.getSnapshot().theme, 'light');
  storage.setItem(APPEARANCE_KEY, 'dark');
  events.dispatchEvent(Object.assign(new Event('storage'), { key: APPEARANCE_KEY, storageArea: {} }));
  assert.equal(store.getSnapshot().theme, 'light', 'session storage must not change appearance');
  events.dispatchEvent(Object.assign(new Event('storage'), { key: null, storageArea: storage }));
  assert.equal(store.getSnapshot().theme, 'dark');
  unsubscribe();
});
test('blocked storage preserves an in-memory selection, including remounts', () => {
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } };
  const store = createAppearanceStore({ storage });
  store.setPreference('light');
  const unsubscribe = store.subscribe(() => {}); unsubscribe();
  assert.equal(store.getSnapshot().theme, 'light');
  assert.equal(createAppearanceStore().getSnapshot().theme, 'dark');
});
test('the early bootstrap agrees with the runtime, before content or scripts load', async () => {
  const html = await readFile('index.html', 'utf8');
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(html.indexOf(bootstrap) < html.indexOf('<div id="root">'));
  for (const preference of [undefined, 'light', 'dark', 'system', 'bad']) {
    for (const matches of [true, false]) {
      const document = { documentElement: { dataset: {}, style: {} } };
      runInNewContext(bootstrap, { localStorage: { getItem: () => preference }, document, window: { matchMedia: () => ({ matches }) } });
      assert.equal(document.documentElement.dataset.theme, resolveAppearance(appearancePreference(preference), matches));
    }
  }
  const document = { documentElement: { dataset: {}, style: {} } };
  runInNewContext(bootstrap, { localStorage: { getItem() { throw Error('blocked'); } }, document, window: {} });
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.match(html, /name="theme-color" content="#8f1937"/);
});

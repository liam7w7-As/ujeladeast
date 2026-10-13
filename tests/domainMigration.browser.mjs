import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.MIGRATION_TEST_URL || 'http://127.0.0.1:5177';
const old = 'https://ujeladeast.vercel.app', destination = 'https://www.ujeladea.org';
const output = 'test-results/domain-migration';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const alice = '10000000-0000-0000-0000-000000000001';
const bob = '10000000-0000-0000-0000-000000000002';
const session = id => ({ access_token: `test-${id}`, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, aud: 'authenticated', role: 'authenticated', email: 'pilot@example.invalid', user_metadata: {} } });
const entry = n => ({ version: 'RVR1960', book: 'PSA', chapter: 23, reference: `PSA.23.${n}`, title: 'Salmos', text: `Texto de prueba ${n}` });
const key = n => `RVR1960:PSA.23.${n}`;
const errors = [], forbidden = [];
async function setup({ role = 'admin', loggedIn = true, seeds = {}, brokenDownloads = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.routeWebSocket('**', socket => socket.close());
  const state = { calls: 0, missing: false, hung: false, entries: new Map(), revision: 0, receipts: new Set() };
  await context.addInitScript(({ token, old, seeds, brokenDownloads }) => {
    if (location.origin === old && !sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', 'true');
      if (token) localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(token));
      for (const [key, value] of Object.entries(seeds)) localStorage.setItem(key, value);
    }
    if (brokenDownloads) indexedDB.open = () => { throw new DOMException('Blocked', 'SecurityError'); };
  }, { token: loggedIn ? session(alice) : null, old, seeds, brokenDownloads });
  await context.route('https://**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if ([old, destination].includes(url.origin)) {
      if (request.method() !== 'GET' && request.method() !== 'HEAD') { forbidden.push(url.pathname); return route.abort(); }
      try {
        const response = await route.fetch({ url: `${base}${url.pathname}${url.search}`, maxRetries: 2 });
        return await route.fulfill({ response });
      } catch {
        // A navigation or context closing can cancel a pending dev-module request.
        return route.abort().catch(() => {});
      }
    }
    if (url.hostname !== 'placeholder.supabase.co') return route.abort();
    const name = url.pathname.split('/').at(-1);
    let body = [], status = 200;
    if (name === 'profiles') body = { id: alice, full_name: 'Cuenta piloto', role, avatar_url: '/avatars/hombre.webp' };
    else if (name === 'user') body = session(alice).user;
    else if (name === 'token') body = session(alice);
    else if (name === 'sync_bible_favorites') {
      state.calls++;
      assert.equal(request.headers().authorization, `Bearer test-${alice}`);
      if (state.hold) await new Promise(resolve => { state.release = resolve; });
      if (state.hung) { await new Promise(resolve => setTimeout(resolve, 16000)); return route.abort().catch(() => {}); }
      if (state.missing) { status = 404; body = { code: 'PGRST202', message: 'Missing RPC' }; }
      else {
        const operations = request.postDataJSON().p_operations;
        for (const op of operations) {
          if (state.receipts.has(op.id)) continue;
          state.receipts.add(op.id); state.revision++;
          if (op.entry) state.entries.set(op.key, op.entry); else state.entries.delete(op.key);
        }
        body = { favorites: [...state.entries.values()], applied: operations.map(op => op.id), revision: state.revision };
      }
    } else if (request.method() !== 'GET' && request.method() !== 'HEAD' && request.method() !== 'OPTIONS') forbidden.push(name);
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, state };
}
const openReview = async page => {
  await page.getByRole('button', { name: 'Revisar mis datos', exact: true }).click();
  await page.getByRole('dialog', { name: 'Antes de cambiar de dirección' }).waitFor();
};
const agree = page => page.getByLabel('Entiendo qué datos no se trasladan y conservaré la app anterior hasta comprobar el nuevo sitio.');
const recheck = page => page.getByRole('button', { name: 'Volver a comprobar', exact: true });
try {
  for (const options of [{}, { role: 'user' }, { loggedIn: false }]) {
    const { context, page, state } = await setup(options);
    await page.goto(`${old}/${Object.keys(options).length ? '?traslado=piloto' : ''}`);
    await page.getByRole('link', { name: 'UJELADEA inicio', exact: true }).last().waitFor();
    await page.waitForFunction(() => !document.querySelector('.auth-loading'));
    assert.equal(await page.getByRole('region', { name: 'Prueba de cambio de dominio' }).count(), 0);
    assert.equal(state.calls, 0, 'ordinary visits do not sync or audit');
    await context.close();
  }

  const studyKey = `ujeladea:study-draft:v1:${alice}:lesson-test`, recoveryKey = `ujeladea:recovery:v1:${alice}:request-test`;
  const queueKey = `bible:favorites:${alice}:op:test-op`;
  const { context, page, state } = await setup({ seeds: {
    [studyKey]: JSON.stringify({ version: 1, answers: { 0: 'Borrador privado de prueba' } }),
    [recoveryKey]: JSON.stringify({ answers: ['Repaso de prueba', '', ''], read: true }),
    [`ujeladea:study-draft:v1:${bob}:other`]: 'another-account-private-draft',
    [queueKey]: JSON.stringify({ id: 'test-op', key: key(2), entry: entry(2), queuedAt: 1 }),
    'bible:verseFavorites': JSON.stringify([entry(1)]),
    'bible:bookmarks': JSON.stringify([{ version: 'RVR1960', book: 'PSA', chapter: 23 }]),
    'bible:position': JSON.stringify({ version: 'RVR1960', book: 'PSA', chapter: 23, verse: 2, fraction: .5 }),
  } });
  await page.goto(`${old}/`);
  await page.getByLabel('Más opciones', { exact: true }).click();
  await page.getByRole('link', { name: 'Probar cambio de dominio', exact: true }).click();
  await page.waitForURL(`${old}/?traslado=piloto`);
  await page.getByRole('region', { name: 'Prueba de cambio de dominio' }).waitFor();
  assert.equal(state.calls, 0, 'opening the pilot banner alone does not modify favorites');
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('ujeladea-bible', 1);
      request.onupgradeneeded = () => { request.result.createObjectStore('books'); request.result.createObjectStore('versions', { keyPath: 'id' }); };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => { const tx = db.transaction('versions', 'readwrite'); tx.objectStore('versions').put({ id: 'RVR1960', sha256: 'test', bytes: 100 }); tx.oncomplete = resolve; tx.onerror = reject; });
    db.close();
    await (await caches.open('hymnal-data-cache')).put('/data/test-hymn.json', new Response('{"preserved":true}'));
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `${output}/notice-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width < 1280) assert.ok(await page.locator('.domain-migration-notice').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.mobile-app-header').getBoundingClientRect().bottom));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await openReview(page);
  await page.getByText('1 favorito confirmado en tu cuenta.', { exact: true }).waitFor();
  await page.getByText(/1 de estudio y 1 de recuperación/).waitFor();
  await page.getByText('Versiones guardadas aquí: RVR1960.', { exact: true }).waitFor();
  assert.equal(state.entries.size, 1, 'guest favorite not imported without permission');
  assert.equal(await page.getByRole('button', { name: 'Ir al nuevo sitio', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Añadir a mi cuenta', exact: true }).isDisabled(), true);
  await page.getByLabel('Estos favoritos locales son míos.').check();
  await page.getByRole('button', { name: 'Añadir a mi cuenta', exact: true }).click();
  await page.getByText('2 favoritos confirmados en tu cuenta.', { exact: true }).waitFor();
  assert.equal(state.entries.size, 2);
  assert.ok(await page.evaluate(() => localStorage.getItem('bible:verseFavorites')), 'guest originals retained');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), queueKey), null, 'only acknowledged queue operation removed');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.screenshot({ path: `${output}/review-pending-${width}.png` });
  }
  await page.getByRole('button', { name: 'Seguir aquí', exact: true }).click();
  assert.ok(await page.evaluate(key => localStorage.getItem(key), studyKey));
  await page.reload(); await openReview(page);
  await page.getByText(/1 de estudio y 1 de recuperación/).waitFor();
  // Simulate the existing study/recovery flows clearing their own saved drafts in this mocked account.
  await page.evaluate(keys => keys.forEach(key => localStorage.removeItem(key)), [studyKey, recoveryKey]);
  await recheck(page).click();
  await page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await context.setOffline(true);
  await page.getByRole('alert').filter({ hasText: 'Sin conexión. Conéctate' }).waitFor();
  assert.equal(await agree(page).isDisabled(), true);
  await context.setOffline(false);
  await page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();

  state.missing = true; await recheck(page).click();
  await page.getByRole('alert').filter({ hasText: 'todavía no está habilitada' }).waitFor();
  assert.equal(await agree(page).isDisabled(), true);
  state.missing = false; await recheck(page).click();
  await page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await agree(page).check();
  await page.evaluate(key => localStorage.setItem(key, '{"version":1,"answers":{"0":"New draft"}}'), studyKey);
  const departure = page.getByRole('link', { name: 'Ir al nuevo sitio', exact: true });
  if (await departure.count()) await departure.click();
  await page.waitForFunction(() => document.querySelector('.domain-migration-consent input')?.disabled);
  assert.equal(context.pages().length, 1, 'a fresh draft blocks even a previously enabled departure');
  await page.evaluate(key => localStorage.removeItem(key), studyKey);
  await recheck(page).click(); await page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await agree(page).check();
  await page.evaluate(() => {
    window.testGuard = event => { event.preventDefault(); event.detail.reason = 'Guardado de prueba en curso'; };
    window.addEventListener('ujeladea:before-update', window.testGuard);
  });
  await page.getByRole('link', { name: 'Ir al nuevo sitio', exact: true }).click();
  await page.getByText('Guardado de prueba en curso', { exact: true }).waitFor();
  assert.equal(context.pages().length, 1);
  await page.evaluate(() => window.removeEventListener('ujeladea:before-update', window.testGuard));
  await agree(page).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Ir al nuevo sitio', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/review-ready-mobile.png` });
  const popupEvent = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Ir al nuevo sitio', exact: true }).click();
  const arrival = await popupEvent; arrival.on('pageerror', error => errors.push(error.message));
  await arrival.waitForURL(`${destination}/?traslado=llegada`);
  await arrival.getByRole('region', { name: 'Bienvenida al nuevo dominio' }).waitFor();
  assert.equal(page.url(), `${old}/?traslado=piloto`, 'old app remains on its original origin');
  assert.equal(await arrival.evaluate(() => window.opener), null);
  assert.equal(await arrival.evaluate(() => localStorage.getItem('sb-placeholder-auth-token')), null, 'credentials not copied');
  await arrival.getByRole('region', { name: 'Bienvenida al nuevo dominio' }).getByRole('link', { name: 'Iniciar sesión' }).click();
  await arrival.getByLabel('Correo electrónico').fill('pilot@example.invalid');
  await arrival.getByLabel('Contraseña', { exact: true }).fill('test-password-only');
  await arrival.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await arrival.waitForURL(`${destination}/?traslado=llegada`);
  await arrival.getByText('Sesión: Cuenta piloto', { exact: true }).waitFor();
  await arrival.screenshot({ path: `${output}/arrival-mobile.png` });
  assert.ok(await page.evaluate(() => localStorage.getItem('bible:bookmarks')));
  assert.ok(await page.evaluate(() => localStorage.getItem('bible:position')));
  assert.ok(await page.evaluate(async () => (await caches.match('/data/test-hymn.json')).json()));
  assert.equal(await page.evaluate(id => localStorage.getItem(`ujeladea:study-draft:v1:${id}:other`), bob), 'another-account-private-draft');
  await page.getByRole('button', { name: 'Seguir aquí', exact: true }).click();
  await page.getByRole('button', { name: 'Más tarde', exact: true }).click();
  assert.equal(await page.getByRole('region', { name: 'Prueba de cambio de dominio' }).count(), 0);
  await page.getByLabel('Más opciones', { exact: true }).click();
  await page.getByRole('link', { name: 'Probar cambio de dominio', exact: true }).click();
  await page.getByRole('region', { name: 'Prueba de cambio de dominio' }).waitFor();
  await context.close();

  for (const options of [{ seeds: { 'bible:bookmarks': '{corrupt' } }, { seeds: { [`bible:favorites:${alice}`]: '{"favorites":[{}]}' } }, { brokenDownloads: true }]) {
    const { context, page, state } = await setup(options);
    await page.goto(`${old}/?traslado=piloto`); await openReview(page);
    if (options.brokenDownloads) await page.getByText('No pudimos revisar las descargas. Vuelve a comprobar.', { exact: true }).waitFor();
    else await page.getByRole('alert').filter({ hasText: 'No pudimos revisar todos los datos locales' }).waitFor();
    assert.equal(await agree(page).isDisabled(), true);
    if (options.seeds) {
      assert.equal(state.calls, 0, 'corrupt inventory is never silently overwritten by sync');
      for (const [key, value] of Object.entries(options.seeds)) assert.equal(await page.evaluate(key => localStorage.getItem(key), key), value);
    }
    await context.close();
  }
  const timeoutCase = await setup(); timeoutCase.state.hung = true;
  await timeoutCase.page.goto(`${old}/?traslado=piloto`); await openReview(timeoutCase.page);
  await timeoutCase.page.getByRole('alert').filter({ hasText: 'No pudimos sincronizar' }).waitFor({ timeout: 22000 });
  assert.equal(await agree(timeoutCase.page).isDisabled(), true);
  timeoutCase.state.hung = false; await recheck(timeoutCase.page).click();
  await timeoutCase.page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await timeoutCase.context.close();

  const changedDuringSync = await setup(); changedDuringSync.state.hold = true;
  await changedDuringSync.page.goto(`${old}/?traslado=piloto`); await openReview(changedDuringSync.page);
  for (let attempt = 0; attempt < 100 && !changedDuringSync.state.release; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(changedDuringSync.state.release, 'sync request is held');
  await changedDuringSync.page.evaluate(id => localStorage.setItem(`bible:favorites:${id}`, '{"favorites":[{}]}'), alice);
  changedDuringSync.state.hold = false; changedDuringSync.state.release();
  await changedDuringSync.page.getByRole('alert').filter({ hasText: 'No pudimos revisar todos los datos locales' }).waitFor();
  assert.equal(await changedDuringSync.page.evaluate(id => localStorage.getItem(`bible:favorites:${id}`), alice), '{"favorites":[{}]}', 'late response never overwrites data that became unreadable');
  await changedDuringSync.context.close();
  assert.deepEqual(errors, []); assert.deepEqual(forbidden, []);
  console.log('PASS: opt-in admin pilot, no regular-user banner or requests, scoped inventory, explicit guest import, offline/errors/timeouts, fresh-departure and save guards, preserved old app/storage, separate-origin login/arrival, responsive 320/390/1440 layouts. Mock accounts only.');
} finally { await browser.close(); }

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
const lessonId = '20000000-0000-0000-0000-000000000001';
const recoveryId = '30000000-0000-0000-0000-000000000001';
const session = id => ({ access_token: `test-${id}`, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, aud: 'authenticated', role: 'authenticated', email: 'pilot@example.invalid', user_metadata: {} } });
const entry = n => ({ version: 'RVR1960', book: 'PSA', chapter: 23, reference: `PSA.23.${n}`, title: 'Salmos', text: `Texto de prueba ${n}` });
const key = n => `RVR1960:PSA.23.${n}`;
const errors = [], forbidden = [];
async function setup({ role = 'user', loggedIn = true, seeds = {}, brokenDownloads = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.routeWebSocket('**', socket => socket.close());
  const state = { calls: 0, missing: false, hung: false, entries: new Map(), revision: 0, receipts: new Set(),
    studyCalls: [], completedCount: 12, progress: [], journals: [], recoveries: [], lessons: [{ id: lessonId, title: 'Aprender a escuchar' }] };
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
    else if (['user_progress', 'journal_entries', 'study_streak_recoveries', 'study_lessons'].includes(name)) {
      assert.ok(['GET', 'HEAD'].includes(request.method()), 'migration never writes studies or recoveries');
      assert.equal(request.headers().authorization, `Bearer test-${alice}`);
      if (name !== 'study_lessons') assert.equal(url.searchParams.get('user_id'), `eq.${alice}`);
      state.studyCalls.push({ name, method: request.method(), url: request.url() });
      if (state.holdStudy) {
        state.holdStudy = false;
        await new Promise(resolve => { state.releaseStudy = resolve; });
      }
      if (state.studyHung) { await new Promise(resolve => setTimeout(resolve, 16000)); return route.abort().catch(() => {}); }
      if (state.studyError) { status = 503; body = { message: 'Unavailable' }; }
      else if (request.method() === 'HEAD') {
        assert.equal(url.searchParams.get('completed'), 'eq.true');
        return route.fulfill({ status: 200, headers: { 'content-range': `*/${state.completedCount}`, 'access-control-expose-headers': 'content-range' }, body: '' });
      } else {
        const table = { user_progress: 'progress', journal_entries: 'journals', study_streak_recoveries: 'recoveries', study_lessons: 'lessons' }[name];
        const field = ['study_lessons', 'study_streak_recoveries'].includes(name) ? 'id' : 'lesson_id';
        const filter = url.searchParams.get(field);
        assert.ok(filter?.startsWith('in.('));
        const ids = filter.slice(4, -1).split(',');
        const start = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 50);
        body = state[table].filter(row => ids.includes(row[field])).slice(start, start + limit);
      }
    }
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
const agree = page => page.locator('.domain-migration-consent input');
const recheck = page => page.getByRole('button', { name: 'Volver a comprobar', exact: true });
try {
  for (const options of [{}, { role: 'admin' }, { loggedIn: false }]) {
    const { context, page, state } = await setup(options);
    await page.goto(`${old}/`);
    await page.getByRole('link', { name: 'UJELADEA inicio', exact: true }).last().waitFor();
    await page.waitForFunction(() => !document.querySelector('.auth-loading'));
    await page.getByRole('region', { name: 'Cambio de dominio', exact: true }).waitFor();
    assert.equal(state.calls, 0, 'public notice does not automatically sync or audit');
    assert.equal(state.studyCalls.length, 0);
    assert.equal(page.url(), `${old}/`, 'ordinary visits never redirect');
    await page.getByRole('button', { name: 'Más tarde', exact: true }).click();
    await page.reload();
    await page.getByRole('link', { name: 'Ver aviso de ujeladea.org', exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Cambio de dominio', exact: true }).count(), 0, 'dismissal survives reload for this session');
    await page.getByRole('link', { name: 'Ver aviso de ujeladea.org', exact: true }).click();
    await page.getByRole('region', { name: 'Cambio de dominio', exact: true }).waitFor();
    if (options.loggedIn === false) {
      assert.equal(await page.getByRole('button', { name: 'Revisar mis datos', exact: true }).count(), 0);
      await page.getByRole('link', { name: 'Entrar y revisar mis datos', exact: true }).click();
      await page.getByLabel('Correo electrónico').fill('pilot@example.invalid');
      await page.getByLabel('Contraseña', { exact: true }).fill('test-password-only');
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
      await page.waitForURL(`${old}/?traslado=revisar`);
      await page.getByRole('button', { name: 'Revisar mis datos', exact: true }).waitFor();
      assert.equal(state.calls, 0, 'sign-in alone does not start the review');
    }
    await context.close();
  }

  const alreadyThere = await setup();
  await alreadyThere.page.goto(`${destination}/`);
  await alreadyThere.page.getByRole('link', { name: 'UJELADEA inicio', exact: true }).last().waitFor();
  assert.equal(await alreadyThere.page.locator('.domain-migration-notice').count(), 0, 'no move-away notice on the new domain');
  await alreadyThere.page.getByRole('button', { name: 'Más opciones', exact: true }).click();
  assert.equal(await alreadyThere.page.getByRole('link', { name: 'Nuevo dominio: ujeladea.org', exact: true }).count(), 0);
  await alreadyThere.context.close();

  const studyKey = `ujeladea:study-draft:v1:${alice}:${lessonId}`, recoveryKey = `ujeladea:recovery:v1:${alice}:${recoveryId}`;
  const originalStudy = JSON.stringify({ version: 1, answers: { 0: 'Borrador privado de prueba' } });
  const originalRecovery = JSON.stringify({ answers: ['Repaso de prueba', '', ''], read: true });
  const queueKey = `bible:favorites:${alice}:op:test-op`;
  const { context, page, state } = await setup({ seeds: {
    [studyKey]: originalStudy,
    [recoveryKey]: originalRecovery,
    [`ujeladea:study-draft:v1:${bob}:other`]: 'another-account-private-draft',
    [queueKey]: JSON.stringify({ id: 'test-op', key: key(2), entry: entry(2), queuedAt: 1 }),
    'bible:verseFavorites': JSON.stringify([entry(1)]),
    'bible:bookmarks': JSON.stringify([{ version: 'RVR1960', book: 'PSA', chapter: 23 }]),
    'bible:position': JSON.stringify({ version: 'RVR1960', book: 'PSA', chapter: 23, verse: 2, fraction: .5 }),
  } });
  await page.goto(`${old}/`);
  await page.getByLabel('Más opciones', { exact: true }).click();
  await page.getByRole('link', { name: 'Nuevo dominio: ujeladea.org', exact: true }).click();
  await page.waitForURL(`${old}/?traslado=revisar`);
  await page.getByRole('region', { name: 'Cambio de dominio', exact: true }).waitFor();
  assert.equal(state.calls, 0, 'opening the public banner alone does not modify favorites');
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
  await page.getByText('12 estudios completados confirmados en Supabase.', { exact: true }).waitFor();
  await page.getByText('Aprender a escuchar', { exact: true }).waitFor();
  await page.getByText('Versiones guardadas aquí: RVR1960.', { exact: true }).waitFor();
  assert.equal(state.entries.size, 1, 'guest favorite not imported without permission');
  assert.equal(await page.getByRole('button', { name: 'Ir al nuevo sitio', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Añadir a mi cuenta', exact: true }).isDisabled(), true);
  await page.getByLabel('Estos favoritos locales son míos.').check();
  await page.getByRole('button', { name: 'Añadir a mi cuenta', exact: true }).click();
  await page.getByText('2 favoritos confirmados en tu cuenta.', { exact: true }).waitFor();
  await page.getByText('Hay borradores que seguirán en esta app', { exact: true }).waitFor();
  await agree(page).check();
  await page.getByRole('link', { name: 'Ir al nuevo sitio', exact: true }).waitFor();
  assert.ok((await page.locator('.domain-migration-consent').textContent()).includes('2 borradores con respuestas sin confirmar'));
  await agree(page).uncheck();
  assert.equal(state.entries.size, 2);
  assert.ok(await page.evaluate(() => localStorage.getItem('bible:verseFavorites')), 'guest originals retained');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), queueKey), null, 'only acknowledged queue operation removed');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.locator('.domain-migration-review').evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: `${output}/review-pending-${width}.png` });
  }
  await page.getByRole('button', { name: 'Seguir aquí', exact: true }).click();
  assert.ok(await page.evaluate(key => localStorage.getItem(key), studyKey));
  await page.reload(); await openReview(page);
  await page.getByText('Hay borradores que seguirán en esta app', { exact: true }).waitFor();
  // Server confirmation reconciles stale copies without deleting a single local draft.
  state.progress = [{ user_id: alice, lesson_id: lessonId, completed: true, answers: { 0: 'Borrador privado de prueba' } }];
  state.recoveries = [{ user_id: alice, id: recoveryId, status: 'pending', answers: ['Repaso de prueba', '', ''] }];
  await recheck(page).click();
  await page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await page.getByText('2 copias locales ya confirmadas en tu cuenta. Se conservan sin bloquear el cambio.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), studyKey), originalStudy);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), recoveryKey), originalRecovery);
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
  await page.waitForFunction(() => !document.querySelector('.domain-migration-consent input')?.checked);
  await page.getByText('Hay borradores que seguirán en esta app', { exact: true }).waitFor();
  assert.equal(context.pages().length, 1, 'a fresh draft blocks even a previously enabled departure');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: studyKey, value: originalStudy });
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
  assert.equal(page.url(), `${old}/?traslado=revisar`, 'old app remains on its original origin');
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
  assert.equal(await page.evaluate(key => localStorage.getItem(key), studyKey), originalStudy);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), recoveryKey), originalRecovery);
  assert.ok(await page.evaluate(async () => (await caches.match('/data/test-hymn.json')).json()));
  assert.equal(await page.evaluate(id => localStorage.getItem(`ujeladea:study-draft:v1:${id}:other`), bob), 'another-account-private-draft');
  await page.getByRole('button', { name: 'Seguir aquí', exact: true }).click();
  await page.getByRole('button', { name: 'Más tarde', exact: true }).click();
  assert.equal(await page.getByRole('region', { name: 'Cambio de dominio', exact: true }).count(), 0);
  await page.getByLabel('Más opciones', { exact: true }).click();
  await page.getByRole('link', { name: 'Nuevo dominio: ujeladea.org', exact: true }).click();
  await page.getByRole('region', { name: 'Cambio de dominio', exact: true }).waitFor();
  await context.close();

  const empty = await setup({ seeds: { [studyKey]: JSON.stringify({ version: 1, step: 3, answers: { 0: '  ' }, journalContent: '' }), [recoveryKey]: JSON.stringify({ answers: ['', '', ''], read: true }) } });
  await empty.page.goto(`${old}/?traslado=piloto`); await openReview(empty.page);
  await empty.page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await empty.page.getByText('2 borradores sin respuestas ni notas. No impiden continuar y no se eliminan.', { exact: true }).waitFor();
  assert.ok(empty.state.studyCalls.every(call => call.method === 'HEAD'), 'empty drafts need no private answer queries');
  await agree(empty.page).check();
  assert.ok(await empty.page.evaluate(key => localStorage.getItem(key), studyKey));
  await empty.context.close();

  const journalDraft = JSON.stringify({ version: 1, answers: { 0: 'Guardada' }, journalContent: 'Nota privada pendiente', verseInput: 'Jn 1:1' });
  const journal = await setup({ seeds: { [studyKey]: journalDraft } });
  journal.state.progress = [{ user_id: alice, lesson_id: lessonId, completed: true, answers: { 0: 'Guardada' } }];
  await journal.page.goto(`${old}/?traslado=piloto`); await openReview(journal.page);
  await journal.page.getByText('La lección está completada, pero hay respuestas o notas locales diferentes.', { exact: true }).waitFor();
  assert.equal(await journal.page.getByText('Nota privada pendiente', { exact: true }).count(), 0);
  await agree(journal.page).check();
  const retainedPopup = journal.context.waitForEvent('page');
  await journal.page.getByRole('link', { name: 'Ir al nuevo sitio', exact: true }).click();
  const retainedArrival = await retainedPopup; await retainedArrival.waitForURL(`${destination}/?traslado=llegada`);
  assert.equal(await journal.page.evaluate(key => localStorage.getItem(key), studyKey), journalDraft);
  assert.equal(journal.page.url(), `${old}/?traslado=piloto`);
  await retainedArrival.close();
  journal.state.journals = [{ user_id: alice, lesson_id: lessonId, content: 'Nota privada pendiente', favorite_verses: ['Jn 1:1'] }];
  await recheck(journal.page).click();
  await journal.page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  assert.equal(await journal.page.evaluate(key => localStorage.getItem(key), studyKey), journalDraft);
  journal.state.studyError = true; await recheck(journal.page).click();
  await journal.page.getByRole('alert').filter({ hasText: 'No pudimos comprobar tus estudios en Supabase' }).waitFor();
  assert.equal(await agree(journal.page).isDisabled(), true);
  journal.state.studyError = false; await recheck(journal.page).click();
  await journal.page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await journal.context.close();

  const studyTimeout = await setup(); studyTimeout.state.studyHung = true;
  await studyTimeout.page.goto(`${old}/?traslado=piloto`); await openReview(studyTimeout.page);
  await studyTimeout.page.getByRole('alert').filter({ hasText: 'No pudimos comprobar tus estudios en Supabase' }).waitFor({ timeout: 22000 });
  assert.equal(await agree(studyTimeout.page).isDisabled(), true);
  studyTimeout.state.studyHung = false; await recheck(studyTimeout.page).click();
  await studyTimeout.page.getByText('Sin pendientes en esta revisión', { exact: true }).waitFor();
  await studyTimeout.context.close();

  const stale = await setup({ seeds: { [studyKey]: originalStudy } }); stale.state.holdStudy = true;
  stale.state.progress = [{ user_id: alice, lesson_id: lessonId, completed: true, answers: { 0: 'Borrador privado de prueba' } }];
  await stale.page.goto(`${old}/?traslado=piloto`); await openReview(stale.page);
  for (let attempt = 0; attempt < 100 && !stale.state.releaseStudy; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(stale.state.releaseStudy);
  await stale.page.evaluate(key => { localStorage.setItem(key, '{"version":1,"answers":{"0":"Cambió durante la consulta"}}'); window.dispatchEvent(new StorageEvent('storage', { key })); }, studyKey);
  stale.state.releaseStudy();
  await stale.page.getByText('Hay borradores que seguirán en esta app', { exact: true }).waitFor();
  assert.equal(await agree(stale.page).isChecked(), false);
  assert.equal(await stale.page.getByText('Sin pendientes en esta revisión', { exact: true }).count(), 0);
  assert.ok((await stale.page.evaluate(key => localStorage.getItem(key), studyKey)).includes('Cambió durante la consulta'));
  await stale.context.close();

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
  console.log('PASS: public notice for members/admins/guests, session dismissal and reopening, guest login before review, no notice on new domain, scoped read-only Supabase comparison for ordinary members, empty/confirmed drafts retained, journal and recovery checks, explicit pending-draft departure, offline/errors/timeouts, stale-response and save guards, preserved old app/storage, separate-origin login/arrival, responsive 320/390/1440 layouts. Mock accounts only.');
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    console.error((await page.locator('body').innerText().catch(() => '')).slice(-7000));
    await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  }
  throw error;
} finally { await browser.close(); }

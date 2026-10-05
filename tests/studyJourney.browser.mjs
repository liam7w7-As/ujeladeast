import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { studyDay } from '../src/lib/studyTracking.js';
import { dailyBibleFact } from '../src/lib/dailyBibleFact.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.STUDY_TEST_URL || 'http://127.0.0.1:5177';
const output = process.env.STUDY_TEST_OUTPUT || 'test-results/study';
const atomic = process.env.STUDY_ATOMIC_TEST === '1';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const id = '00000000-0000-0000-0000-000000000001';
const user = { id, role: 'authenticated', aud: 'authenticated', email: 'test@example.invalid', user_metadata: {} };
const session = { access_token: 'test-token', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
const lessons = Array.from({ length: 365 }, (_, index) => ({ id: `lesson-${index + 1}`, week_id: `week-${Math.floor(index / 7) + 1}`,
  day_number: index % 7 + 1, title: index === 1 ? 'Escuchar antes de responder' : `Estudio ${index + 1}`,
  scripture_ref: 'Santiago 1:19-20', scripture_text: '<p>Lectura bíblica de prueba.</p><p>Texto original conservado.</p>',
  teaching: '<p>Enseñanza de prueba <strong>con su formato original</strong>.</p>',
  questions: [{ text: '¿Qué enseñanza encuentras en el pasaje?', type: 'open' }, { text: '' }, { text: '¿Cómo la aplicarías en una conversación?', type: 'open' }],
  study_weeks: { plan_id: 'plan-a', week_number: Math.floor(index / 7) + 1 } }));
lessons[3] = { ...lessons[3], scripture_text: null, teaching: '', questions: [] };
const progress = new Map([['lesson-1', { user_id: id, completed: true, answers: { 0: 'Respuesta anterior conservada' } }], ['lesson-3', { user_id: id, completed: true, answers: {} }]]);
const writes = [], journalWrites = [], streakWrites = [], errors = [];
let failJourney = false, emptyPlan = false, failProgress = false, failJournal = false, failStreak = false;
let streak = { user_id: id, current_streak: 2, max_streak: 2, total_xp: 20, last_study_date: new Date().toISOString() };
let loseResponse = false;
let holdSave = false, releaseSave;
const statusSnapshot = () => ({ ...streak, atomic: true, today_completed: true, recent_days: Array.from({ length: 7 }, (_, index) => ({ date: new Date((studyDay(new Date()) - 6 + index) * 86400000).toISOString().slice(0, 10), completed: index > 4 })) });
const withProgress = lesson => ({ ...lesson, user_progress: progress.has(lesson.id) ? [progress.get(lesson.id)] : [] });
async function mock(context) {
  await context.route('**/api/daily-bible-fact', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...dailyBibleFact(), ai: true, question: '¿A quién puedes escuchar hoy con atención?' }) }));
  await context.addInitScript(session => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(session)), session);
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  await context.route('https://placeholder.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), table = url.pathname.split('/').at(-1);
    const method = request.method();
    if (holdSave && method !== 'GET' && ['complete_study_lesson', 'user_progress'].includes(table)) {
      await new Promise(resolve => { releaseSave = resolve; });
    }
    let body = [], status = 200;
    if (['get_study_status', 'complete_study_lesson'].includes(table)) {
      if (!atomic) { status = 404; body = { code: 'PGRST202', message: 'Migration not installed' }; }
      else if (failStreak || (table === 'complete_study_lesson' && failProgress)) { status = 503; body = { message: 'Unavailable' }; }
      else if (table === 'get_study_status') body = statusSnapshot();
      else {
        const input = request.postDataJSON();
        const already = progress.has(input.p_lesson_id);
        if (!already) {
          const data = { user_id: id, lesson_id: input.p_lesson_id, completed: true, answers: input.p_answers, completed_at: new Date().toISOString() };
          progress.set(data.lesson_id, data); writes.push(data);
          streak = { ...streak, total_xp: streak.total_xp + 10 }; streakWrites.push(streak);
        }
        body = { completed: true, already_completed: already, added_xp: already ? 0 : 10, status: statusSnapshot() };
        if (loseResponse) { loseResponse = false; await route.abort('failed'); return; }
      }
    }
    else if (table === 'profiles') body = { id, full_name: 'Ana Prueba', church_name: 'Central', role: 'user', avatar_url: '/avatars/mujer.webp' };
    else if (table === 'user') body = user;
    else if (table === 'study_plans') body = { id: 'plan-a', title: 'Estudio de 365 días' };
    else if (table === 'study_weeks') body = emptyPlan ? [] : Array.from({ length: 53 }, (_, index) => ({ id: `week-${index + 1}`, week_number: index + 1, title: `Semana de estudio ${index + 1}`, study_lessons: lessons.filter(lesson => lesson.week_id === `week-${index + 1}`).map(withProgress) }));
    else if (table === 'study_lessons') {
      if (url.searchParams.has('id')) body = withProgress(lessons.find(lesson => `eq.${lesson.id}` === url.searchParams.get('id')));
      else if (url.searchParams.has('week_id')) body = lessons.filter(lesson => `eq.${lesson.week_id}` === url.searchParams.get('week_id')).map(withProgress);
      else if (failJourney) { status = 503; body = { message: 'Unavailable' }; }
      else { const offset = Number(url.searchParams.get('offset') || 0); body = emptyPlan ? [] : lessons.slice(offset, offset + 80).map(withProgress); }
    } else if (table === 'user_progress' && method !== 'GET') {
      assert.equal(atomic, false, 'Atomic mode must never write progress directly');
      const data = request.postDataJSON();
      if (failProgress) { status = 503; body = { message: 'Unavailable' }; }
      else if (!progress.has(data.lesson_id)) { progress.set(data.lesson_id, data); writes.push(data); body = [data]; }
    } else if (table === 'journal_entries' && method !== 'GET') {
      if (failJournal) { status = 503; body = { message: 'Unavailable' }; }
      else { const data = request.postDataJSON(); journalWrites.push(data); body = { ...data, id: 'journal-one' }; }
    } else if (table === 'user_streaks') {
      if (method === 'PATCH') {
        assert.equal(atomic, false, 'Atomic mode must never write streaks directly');
        if (failStreak) { status = 503; body = { message: 'Unavailable' }; }
        else { const data = request.postDataJSON(); streakWrites.push(data); streak = { ...streak, ...data }; body = streak; }
      } else body = streak;
    } else if (request.headers().accept?.includes('object+json')) body = null;
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
async function settled(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.public-page-content, .study-step')].every(el => Number(getComputedStyle(el).opacity) > .99));
}
async function start(page, day) {
  await page.getByRole('button', { name: `Continuar: día ${day} de 365`, exact: true }).click();
  await page.getByRole('region', { name: 'Estudio por pasos' }).waitFor();
  await settled(page);
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mock(context);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/estudios', { waitUntil: 'domcontentloaded' });
  await page.getByText('2 de 365 estudios completados', { exact: true }).waitFor();
  if (atomic) {
    await page.getByText('Hoy completado', { exact: true }).waitFor();
    failStreak = true;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.getByText('No pudimos confirmar tu racha. Tu avance no se ha borrado.').waitFor();
    assert.equal(await page.getByRole('region', { name: 'Tu racha' }).locator('strong').count(), 0);
    failStreak = false;
    await page.getByRole('button', { name: 'Reintentar racha' }).click();
    await page.getByText('Hoy completado', { exact: true }).waitFor();
  }
  await settled(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  assert.equal(await page.locator('footer').isVisible(), false, 'No footer in the mobile app');
  await page.getByRole('region', { name: 'Dato bíblico del día' }).waitFor();
  await page.getByText('Pregunta de Ujeladito · IA', { exact: true }).waitFor();
  await page.screenshot({ path: `${output}/dashboard-mobile.png`, fullPage: true });
  if (atomic) {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.getByRole('region', { name: 'Tu racha' }).evaluate(element => element.scrollWidth <= element.clientWidth));
      assert.equal(await page.locator('footer').isVisible(), width >= 1280);
      if (width >= 1280) assert.equal(await page.locator('footer img').evaluate(img => img.complete && img.naturalWidth > 0), true, 'Footer shows the real logo');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `${output}/home-viewport-${width}.png` });
      await page.screenshot({ path: `${output}/streak-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await start(page, 2);
  assert.match(await page.locator('.study-reading').innerText(), /Texto original conservado/);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await settled(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no overflow ${width}`);
    await page.screenshot({ path: `${output}/reading-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('heading', { name: 'La enseñanza', exact: true }).waitFor();
  assert.equal(await page.locator('.study-reading strong').innerText(), 'con su formato original');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const firstQuestion = page.getByLabel('¿Qué enseñanza encuentras en el pasaje?', { exact: true });
  await firstQuestion.waitFor();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'vacía' }).waitFor();
  assert.equal(writes.length, 0);
  await firstQuestion.fill('   ');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  assert.equal(await firstQuestion.count(), 1);
  await firstQuestion.fill('Escuchar con atención antes de reaccionar.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const secondQuestion = page.getByLabel('¿Cómo la aplicarías en una conversación?', { exact: true });
  await secondQuestion.fill('Dejaría terminar a la otra persona.');
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 500 }]) {
    await page.setViewportSize(viewport);
    const actions = await page.locator('.study-session-actions-mobile').boundingBox();
    const nav = await page.getByRole('navigation', { name: 'Navegación móvil' }).boundingBox();
    assert.ok(actions.y + actions.height <= nav.y + 1, 'step actions remain above navigation');
    assert.ok(actions.x >= 0 && actions.x + actions.width <= viewport.width);
    await secondQuestion.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mi estudio', exact: true }).click();
  await start(page, 2);
  assert.equal(await secondQuestion.inputValue(), 'Dejaría terminar a la otra persona.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await start(page, 2);
  assert.equal(await secondQuestion.inputValue(), 'Dejaría terminar a la otra persona.');
  await settled(page);
  await page.screenshot({ path: `${output}/question-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Mi diario (opcional)', { exact: true }).fill('Reflexión de prueba, sin puntos adicionales.');
  await page.getByLabel('Versículo para recordar (opcional)', { exact: true }).fill('Santiago 1:19');
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  assert.equal(await secondQuestion.inputValue(), 'Dejaría terminar a la otra persona.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  assert.equal(await page.getByLabel('Mi diario (opcional)', { exact: true }).inputValue(), 'Reflexión de prueba, sin puntos adicionales.');
  await settled(page);
  await page.screenshot({ path: `${output}/close-mobile.png`, fullPage: true });
  const verseInput = page.getByLabel('Versículo para recordar (opcional)', { exact: true });
  await verseInput.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const verseBounds = await verseInput.boundingBox();
  const actionBounds = await page.locator('.study-session-actions-mobile').boundingBox();
  assert.ok(verseBounds.y >= 60 && verseBounds.y + verseBounds.height <= actionBounds.y, 'last input remains reachable above fixed actions');
  await page.screenshot({ path: `${output}/close-scrolled-mobile.png` });
  lessons[1].teaching += '<p>Actualización de prueba.</p>';
  await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'La lección cambió' }).waitFor();
  assert.equal(writes.length, 0);
  lessons[1].teaching = lessons[1].teaching.replace('<p>Actualización de prueba.</p>', '');
  failJournal = true;
  await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'No pudimos guardar' }).waitFor();
  assert.equal(writes.length, 0);
  failJournal = false; failProgress = true;
  holdSave = true;
  await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
  await page.getByRole('button', { name: 'Guardando...', exact: true }).waitFor();
  const savingGuard = await page.evaluate(() => {
    const event = new CustomEvent('ujeladea:before-update', { cancelable: true, detail: { reason: '' } });
    window.dispatchEvent(event);
    return { blocked: event.defaultPrevented, reason: event.detail.reason };
  });
  assert.equal(savingGuard.blocked, true, 'A pending save must block PWA activation');
  assert.match(savingGuard.reason, /está guardando/);
  while (!releaseSave) await new Promise(resolve => setTimeout(resolve, 20));
  holdSave = false;
  releaseSave();
  await page.getByRole('button', { name: 'Guardar estudio', exact: true }).waitFor();
  assert.equal(writes.length, 0);
  failProgress = false;
  await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
  await page.getByRole('heading', { name: 'Estudio guardado', exact: true }).waitFor();
  assert.deepEqual(writes[0].answers, { 0: 'Escuchar con atención antes de reaccionar.', 2: 'Dejaría terminar a la otra persona.' });
  assert.equal(streakWrites.at(-1).total_xp, 30, 'journal does not award XP');
  assert.deepEqual(journalWrites.at(-1).favorite_verses, ['Santiago 1:19']);
  assert.equal(await page.evaluate(id => localStorage.getItem(`ujeladea:study-draft:v1:${id}:lesson-2`), id), null);
  await page.getByRole('button', { name: 'Volver a mi estudio', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar: día 4 de 365', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Plan Anual', exact: true }).click();
  await page.getByRole('button', { name: /Semana 2\b.*Semana de estudio 2\b/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Semana 2\b.*Semana de estudio 2\b/ }).isDisabled(), true);
  await page.screenshot({ path: `${output}/plan-mobile.png` });
  await page.getByRole('button', { name: /Semana 1\b.*Semana de estudio 1\b/ }).click();
  await page.getByRole('button', { name: /Estudio 1 Santiago/ }).click();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByText('Respuesta anterior conservada', { exact: true }).waitFor();
  assert.equal(await page.getByRole('textbox').count(), 0, 'completed lesson is read only');
  await page.getByRole('button', { name: 'Volver al estudio', exact: true }).click();
  assert.equal(writes.length, 1);
  await start(page, 4);
  await page.getByText('Lee Santiago 1:19-20 en tu Biblia.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  failStreak = true;
  await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
  if (atomic) {
    await page.getByRole('alert').filter({ hasText: 'No pudimos guardar' }).waitFor();
    assert.equal(progress.has('lesson-4'), false, 'A failed atomic call cannot confirm a lesson');
    failStreak = false; loseResponse = true;
    await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'No pudimos guardar' }).waitFor();
    assert.equal(progress.has('lesson-4'), true, 'Simulated committed save with lost response');
    const xp = streak.total_xp;
    await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
    await page.getByRole('heading', { name: 'Estudio guardado', exact: true }).waitFor();
    assert.equal(streak.total_xp, xp, 'Recovering the response must not award XP again');
  } else {
  await page.getByRole('heading', { name: 'Estudio guardado', exact: true }).waitFor();
  await page.getByText('El estudio está guardado, pero no se pudo actualizar la racha y el XP.', { exact: true }).waitFor();
  }
  assert.equal(progress.has('lesson-4'), true);
  failStreak = false;
  progress.set('lesson-10', { user_id: id, completed: true, answers: { 0: 'Historica' } });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Continuar: día 5 de 365', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Plan Anual', exact: true }).click();
  await page.getByRole('button', { name: /Semana 2\b.*Semana de estudio 2\b/ }).click();
  assert.equal(await page.getByRole('button', { name: /Estudio 8 Santiago/ }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: /Estudio 10 Santiago/ }).isDisabled(), false);
  for (const lesson of lessons.slice(4, 6)) progress.set(lesson.id, { user_id: id, completed: true, answers: {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await start(page, 7);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('¿Qué enseñanza encuentras en el pasaje?', { exact: true }).fill('Una respuesta para cerrar la semana.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('¿Cómo la aplicarías en una conversación?', { exact: true }).fill('Escuchando con paciencia.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar estudio', exact: true }).click();
  await page.getByText('¡Semana 2 desbloqueada! Completaste la semana 1.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Volver a mi estudio', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar: día 8 de 365', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Plan Anual', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: /Semana 2\b.*Semana de estudio 2\b/ }).isDisabled(), false);
  assert.equal(await page.getByRole('button', { name: /Semana 3\b.*Semana de estudio 3\b/ }).isDisabled(), true);
  for (const lesson of lessons.slice(0, 364)) progress.set(lesson.id, { user_id: id, completed: true, answers: {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Continuar: día 365 de 365', exact: true }).waitFor();
  progress.set('lesson-365', { user_id: id, completed: true, answers: {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Completaste tu recorrido' }).waitFor();
  failJourney = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('alert').filter({ hasText: 'No pudimos cargar tu recorrido' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Completaste tu recorrido' }).count(), 0);
  failJourney = false;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.getByRole('heading', { name: 'Completaste tu recorrido' }).waitFor();
  emptyPlan = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Este plan todavía no tiene lecciones publicadas.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Plan Anual', exact: true }).click();
  await page.getByText('Este plan todavía no tiene lecciones publicadas.', { exact: true }).waitFor();
  await context.close();
  emptyPlan = false;
  progress.delete('lesson-5');
  const blockedStorage = await browser.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  await mock(blockedStorage);
  await blockedStorage.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('ujeladea:study-draft:')) throw new DOMException('Test quota failure', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const reduced = await blockedStorage.newPage();
  reduced.setDefaultTimeout(15000);
  reduced.on('pageerror', error => errors.push(error.message));
  await reduced.goto(base + '/estudios', { waitUntil: 'domcontentloaded' });
  await start(reduced, 5);
  await reduced.getByRole('button', { name: 'Continuar', exact: true }).click();
  await reduced.getByRole('heading', { name: 'La enseñanza', exact: true }).waitFor();
  await reduced.getByRole('button', { name: 'Continuar', exact: true }).click();
  await reduced.getByLabel('¿Qué enseñanza encuentras en el pasaje?', { exact: true }).fill('La respuesta sigue disponible.');
  await reduced.getByRole('alert').filter({ hasText: 'No se pudo guardar el borrador' }).waitFor();
  const updateGuard = await reduced.evaluate(() => {
    const event = new CustomEvent('ujeladea:before-update', { cancelable: true, detail: { reason: '' } });
    window.dispatchEvent(event);
    return { blocked: event.defaultPrevented, reason: event.detail.reason };
  });
  assert.equal(updateGuard.blocked, true, 'An unsaved draft must block PWA updates');
  assert.match(updateGuard.reason, /Guarda el estudio/);
  await reduced.getByRole('button', { name: 'Mi estudio', exact: true }).click();
  await reduced.getByRole('dialog').getByRole('heading', { name: 'El borrador no está guardado' }).waitFor();
  await reduced.getByRole('button', { name: 'Seguir estudiando', exact: true }).click();
  assert.equal(await reduced.getByLabel('¿Qué enseñanza encuentras en el pasaje?', { exact: true }).inputValue(), 'La respuesta sigue disponible.');
  await blockedStorage.close();
  assert.deepEqual(errors, []);
  console.log('PASS: 365-day pagination/order, 5 viewports, required questions, draft resume/reload, completion and journal retry, original answers preserved, no diary XP, empty content, final day, empty plan and network errors. Supabase mocked.');
} finally { await browser.close(); }

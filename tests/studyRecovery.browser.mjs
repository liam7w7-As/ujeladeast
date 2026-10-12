import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.STUDY_TEST_URL || 'http://127.0.0.1:5177';
const output = 'test-results/study-recovery';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const student = '10000000-0000-0000-0000-000000000001', admin = '10000000-0000-0000-0000-000000000002';
const date = days => new Date(Date.now() - days * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
const lesson = { id: 'lesson-1', week_id: 'week-1', day_number: 1, title: 'Escuchar antes de responder', scripture_ref: 'Santiago 1:19',
  scripture_text: '<p>Todo hombre sea pronto para oír, tardo para hablar.</p><script>window.recoveryUnsafe=true</script>', teaching: '<p>Escucha con paciencia a tu prójimo.</p>', questions: [], study_weeks: { plan_id: 'plan-1', week_number: 1 }, user_progress: [] };
const snapshot = { ...lesson, questions: ['Explica con tus palabras la idea central de este pasaje.', '¿Qué parte sostiene esa idea y por qué?', '¿Cómo aplicarías esta enseñanza a tu vida?'] };
let request = null, installed = true, failSubmit = false, failStatus = false, loseResponse = false, holdSave = false, releaseSave;
const submitted = [], errors = [], forbidden = [];
const summary = () => ({ user_id: student, atomic: true, current_streak: 0, max_streak: 4, total_xp: 40, today_completed: false, server_now: new Date().toISOString(), last_study_date: date(2),
  recent_days: Array.from({ length: 7 }, (_, n) => ({ date: date(6 - n), completed: n < 5 })),
  ...(installed ? { recovery: { version: 1, current_streak: request?.status === 'approved' ? 5 : 0, max_streak: 5, eligible: !request || request.status === 'draft', reason: request?.status,
    missed_day: date(1), expires_at: new Date(Date.now() + 86400000).toISOString(), request,
    recovered_days: request?.status === 'approved' ? [date(1)] : [] } } : {}) });
async function setup(uid, role, size = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
  await context.addInitScript(({ uid }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid' } })), { uid });
  await context.route('https://**/*', async route => {
    if (!route.request().url().startsWith('https://placeholder.supabase.co/')) { await route.abort(); return; }
    const r = route.request(), url = new URL(r.url()), name = url.pathname.split('/').at(-1);
    let body = [], status = 200;
    if (['user_progress', 'user_streaks'].includes(name) && r.method() !== 'GET') forbidden.push(name);
    if (name === 'profiles') body = { id: uid, full_name: role === 'admin' ? 'Administrador' : 'Ana Prueba', role, church_name: 'Central' };
    else if (name === 'user') body = { id: uid };
    else if (name === 'study_plans') body = r.headers().accept?.includes('object+json') ? { id: 'plan-1', title: 'Plan anual' } : [{ id: 'plan-1', title: 'Plan anual' }];
    else if (name === 'study_weeks') body = [{ id: 'week-1', plan_id: 'plan-1', week_number: 1, title: 'Escuchar' }];
    else if (name === 'study_lessons') body = [lesson];
    else if (name === 'get_study_status') { if (failStatus) { status = 503; body = { message: 'Network failure' }; } else body = summary(); }
    else if (name === 'begin_study_recovery') {
      request ||= { id: 'recovery-1', user_id: student, status: 'draft', missed_day: date(1), expires_at: new Date(Date.now() + 86400000).toISOString(), snapshot };
      body = request;
    } else if (name === 'study_streak_recoveries') body = request;
    else if (name === 'submit_study_recovery') {
      if (holdSave) await new Promise(resolve => { releaseSave = resolve; });
      if (failSubmit) { status = 503; body = { message: 'Network failure' }; }
      else {
        if (request.status === 'draft') { submitted.push(r.postDataJSON()); request = { ...request, status: 'pending', answers: r.postDataJSON().p_answers }; }
        if (loseResponse) { loseResponse = false; await route.abort('failed'); return; }
        body = { request, status: summary() };
      }
    } else if (name === 'admin_study_tracking') body = [];
    else if (name === 'admin_study_recoveries') {
      if (!installed) { status = 404; body = { code: 'PGRST202' }; }
      else { const items = request?.status === r.postDataJSON().p_status ? [{ ...request, full_name: 'Ana Prueba', church_name: 'Central' }] : []; body = { total: items.length, items }; }
    } else if (name === 'review_study_recovery') {
      const input = r.postDataJSON(); request = { ...request, status: input.p_approve ? 'approved' : 'rejected', decision_note: input.p_note, reviewed_at: new Date().toISOString() }; body = request;
    } else if (r.headers().accept?.includes('object+json')) body = null;
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await context.route('**/api/daily-bible-fact', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}
try {
  const { page } = await setup(student, 'user');
  await page.goto(`${base}/estudios`);
  await page.getByRole('button', { name: 'Recuperar un día', exact: true }).click();
  await page.getByRole('dialog', { name: 'Repaso de recuperación' }).waitFor();
  assert.ok(await page.getByRole('region', { name: 'Lectura para recuperar' }).getByText('Todo hombre sea pronto para oír, tardo para hablar.', { exact: true }).isVisible());
  assert.equal(await page.evaluate(() => window.recoveryUnsafe), undefined);
  assert.equal(await page.getByRole('dialog').getByText('window.recoveryUnsafe=true').count(), 0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.screenshot({ path: `${output}/reading-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Ir al repaso', exact: true }).click();
  await page.getByLabel('Respuesta 1', { exact: true }).fill('Aprendo a escuchar con paciencia antes de contestar a alguien con quien no estoy de acuerdo.');
  await page.getByLabel('Cerrar ventana').click();
  await page.reload(); await page.getByRole('button', { name: 'Continuar repaso', exact: true }).click();
  await page.getByRole('button', { name: 'Tres preguntas', exact: true }).click();
  assert.match(await page.getByLabel('Respuesta 1', { exact: true }).inputValue(), /Aprendo a escuchar/);
  failStatus = true; await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.getByText('No pudimos confirmar tu racha. Tu avance no se ha borrado.').waitFor({ state: 'attached' });
  assert.equal(await page.getByRole('dialog').isVisible(), true, 'background refresh failure must not close the draft');
  failStatus = false; await page.evaluate(() => window.dispatchEvent(new Event('online')));
  assert.equal(await page.getByRole('button', { name: 'Enviar a revisión', exact: true }).isDisabled(), true);
  for (const i of [2, 3]) await page.getByLabel(`Respuesta ${i}`, { exact: true }).fill('El pasaje me invita a actuar con amor y paciencia; hoy escuchare a mi hermano antes de responder.');
  await page.getByLabel('He vuelto a leer el pasaje y respondí con mis palabras.').check();
  failSubmit = true;
  await page.getByRole('button', { name: 'Enviar a revisión', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Tus respuestas se conservan' }).waitFor();
  assert.match(await page.getByLabel('Respuesta 1', { exact: true }).inputValue(), /Aprendo a escuchar/);
  failSubmit = false; holdSave = true; loseResponse = true;
  await page.getByRole('button', { name: 'Enviar a revisión', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('dialog button[aria-label="Cerrar ventana"]')?.disabled);
  assert.equal(await page.evaluate(() => { const e = new CustomEvent('ujeladea:before-update', { cancelable: true, detail: { reason: '' } }); window.dispatchEvent(e); return e.defaultPrevented; }), true);
  while (!releaseSave) await new Promise(resolve => setTimeout(resolve, 20));
  holdSave = false; releaseSave();
  await page.getByRole('button', { name: 'Enviar a revisión', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('dialog button[aria-label="Cerrar ventana"]')?.disabled);
  await page.getByRole('button', { name: 'Enviar a revisión', exact: true }).click();
  await page.getByText('Repaso recibido. Un administrador revisará tus respuestas.', { exact: true }).waitFor();
  assert.equal(submitted.length, 1); assert.equal(await page.getByLabel('Respuesta 1', { exact: true }).getAttribute('readonly'), '');
  await page.screenshot({ path: `${output}/submitted-mobile.png` });
  await page.getByLabel('Cerrar ventana').click();
  const { page: adminPage } = await setup(admin, 'admin', { width: 1440, height: 1000 });
  await adminPage.goto(`${base}/admin/seguimiento`);
  await adminPage.getByRole('button', { name: 'Recuperaciones', exact: true }).click();
  await adminPage.getByRole('button', { name: /Ana Prueba/ }).click();
  await adminPage.getByRole('dialog', { name: 'Revisar recuperación' }).waitFor();
  assert.equal(await adminPage.getByRole('button', { name: 'Aprobar recuperación', exact: true }).isDisabled(), true);
  await adminPage.getByLabel('Observación para el joven').fill('Relacionaste la enseñanza con una acción concreta. Sigue adelante con tu estudio diario.');
  await adminPage.getByLabel('Revisé la comprensión del pasaje y la aplicación personal.').check();
  await adminPage.screenshot({ path: `${output}/admin-review-desktop.png` });
  await adminPage.setViewportSize({ width: 390, height: 844 });
  assert.ok(await adminPage.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
  await adminPage.screenshot({ path: `${output}/admin-review-mobile.png` });
  await adminPage.getByRole('button', { name: 'Aprobar recuperación', exact: true }).click();
  await adminPage.getByText('No hay solicitudes en este estado.', { exact: true }).waitFor();
  await adminPage.getByLabel('Estado de recuperación').selectOption('approved');
  await adminPage.getByRole('button', { name: /Ana Prueba/ }).waitFor();
  await page.reload();
  await page.getByText('Incluye recuperación aprobada', { exact: true }).waitFor();
  assert.equal(await page.getByRole('region', { name: 'Tu racha' }).locator('strong').innerText(), '5');
  assert.match(await page.getByRole('region', { name: 'Tu racha' }).innerText(), /Racha real · campamento: 0 días/);
  await page.getByRole('region', { name: 'Tu racha' }).screenshot({ path: `${output}/streak-approved.png` });
  await page.getByRole('button', { name: 'Ver repaso', exact: true }).click();
  await page.getByText(request.decision_note, { exact: true }).waitFor();
  await page.getByLabel('Cerrar ventana').click();
  installed = false; await page.reload();
  await page.getByText('Hoy pendiente', { exact: true }).waitFor();
  assert.equal(await page.getByRole('region', { name: 'Recuperación de racha' }).count(), 0, 'pre-migration dashboard still works');
  await adminPage.getByLabel('Actualizar recuperaciones').click();
  await adminPage.getByRole('alert').filter({ hasText: 'activar la migración' }).waitFor();
  assert.deepEqual(forbidden, []); assert.deepEqual(errors, []);
  console.log('PASS: responsive student/admin recovery, safe lesson text, local draft after reload, validation, network failure and lost-response retry, PWA update guard, manual review, personal/real streak distinction, and pre-migration compatibility. Mock Supabase only.');
} finally { await browser.close(); }

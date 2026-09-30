import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Run with NODE_PATH pointing to an installed Playwright runtime.
const { chromium } = createRequire(import.meta.url)('playwright');
const baseURL = process.env.TRACKING_TEST_URL || 'http://127.0.0.1:5173';
const output = process.env.TRACKING_TEST_OUTPUT || 'test-results';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.TRACKING_TEST_BROWSER || 'chrome' });
const id = '00000000-0000-0000-0000-000000000001';
const now = new Date().toISOString();
const plans = [{ id: 'plan-a', title: 'Evangelio de Juan' }, { id: 'plan-b', title: 'Plan sin lecciones' }];
const profiles = Array.from({ length: 25 }, (_, index) => ({
  id: `user-${index}`, full_name: index === 0 ? 'Ana Maria Fernandez de la Comunidad Central' : `Joven ${String(index).padStart(2, '0')}`,
  church_name: index < 12 ? 'Iglesia Central' : 'Iglesia Norte', avatar_url: null,
  current_streak: index === 0 ? 6 : 0, max_streak: index === 0 ? 12 : 0,
  last_study_date: index === 0 ? now : null,
  progress: index === 0 ? [{ lesson_id: 'lesson-b', completed_at: now }] : [],
}));
const weeks = [{ id: 'week-a', title: 'El comienzo', week_number: 1 }, { id: 'week-b', title: 'La luz', week_number: 2 }];
const lessons = [
  { id: 'lesson-a', title: 'El principio', day_number: 1, week_id: 'week-a', study_weeks: { plan_id: 'plan-a', week_number: 1 } },
  { id: 'lesson-b', title: 'Luz para el mundo', day_number: 1, week_id: 'week-b', study_weeks: { plan_id: 'plan-a', week_number: 2 } },
];
let mode = 'ok';
let role = 'admin';
let savedProgress = null;
let overwriteAttempts = 0;
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(({ id }) => {
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
      access_token: 'test-access-token', refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
      token_type: 'bearer', user: { id, aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid' },
    }));
  }, { id });
  await context.route('https://placeholder.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    let body = [];
    let status = 200;
    if (url.pathname.includes('/profiles')) body = { id, full_name: 'Administrador', role, church_name: 'Central' };
    else if (url.pathname.includes('/study_plans')) body = url.searchParams.get('offset') === '0' ? plans : [];
    else if (url.pathname.includes('/study_weeks')) body = url.searchParams.get('plan_id') === 'eq.plan-a' && url.searchParams.get('offset') === '0' ? weeks : [];
    else if (url.pathname.includes('/study_lessons')) body = url.searchParams.get('study_weeks.plan_id') === 'eq.plan-a' && url.searchParams.get('offset') === '0' ? lessons : [];
    else if (url.pathname.includes('/user_progress')) {
      if (route.request().method() === 'POST') {
        assert.match(route.request().headers().prefer, /resolution=ignore-duplicates/);
        if (!savedProgress) {
          savedProgress = route.request().postDataJSON();
          body = [savedProgress];
        }
      } else if (route.request().method() === 'PATCH') {
        assert.equal(url.searchParams.get('completed'), 'eq.false');
        overwriteAttempts += 1;
      }
    }
    else if (url.pathname.includes('/rpc/admin_study_tracking')) {
      if (mode !== 'ok') { body = { code: mode, message: 'Test failure' }; status = mode === '42501' ? 403 : 404; }
      else body = url.searchParams.get('offset') === '0' ? profiles.map(profile => ({ ...profile, progress: route.request().postDataJSON().p_plan_id === 'plan-a' ? profile.progress : [] })) : [];
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/admin/seguimiento`);
  await page.getByRole('button', { name: profiles[0].full_name, exact: true }).waitFor();
  assert.match(await page.locator('tbody').innerText(), /1\/2 · 50%/);
  assert.match(await page.locator('tbody').innerText(), /6 días/);
  assert.match(await page.locator('footer').first().innerText(), /25 jóvenes/);
  await page.screenshot({ path: `${output}/tracking-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).click();
  assert.equal(await page.locator('tbody tr').count(), 5);
  await page.getByRole('button', { name: 'Página anterior', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar joven o iglesia' }).fill('Ana');
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.getByRole('button', { name: profiles[0].full_name, exact: true }).click();
  await page.getByRole('heading', { name: 'Semana 2: La luz', exact: true }).waitFor();
  assert.match(await page.locator('main').innerText(), /Pendiente/);
  assert.match(await page.locator('main').innerText(), /Completada/);
  await page.screenshot({ path: `${output}/tracking-detail.png`, fullPage: true });
  await page.getByRole('button', { name: 'Volver al listado' }).click();
  await page.getByRole('textbox', { name: 'Buscar joven o iglesia' }).fill('');
  await page.getByRole('combobox', { name: 'Filtrar por iglesia' }).selectOption('Iglesia Norte');
  assert.equal(await page.locator('tbody tr').count(), 13);
  await page.getByRole('combobox', { name: 'Filtrar por iglesia' }).selectOption('');
  await page.getByRole('combobox', { name: 'Filtrar por actividad' }).selectOption('active');
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.getByRole('combobox', { name: 'Filtrar por actividad' }).selectOption('');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await page.getByRole('link', { name: 'Seguimiento', exact: false }).click();
  assert.equal(await page.getByRole('button', { name: 'Abrir menú', exact: true }).getAttribute('aria-expanded'), 'false');
  await page.screenshot({ path: `${output}/tracking-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: profiles[0].full_name, exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: `${output}/tracking-detail-mobile.png`, fullPage: true });
  await page.getByRole('combobox', { name: 'Plan de estudio' }).selectOption('plan-b');
  await page.getByText('Este plan todavía no tiene lecciones.', { exact: true }).waitFor();
  assert.match(await page.locator('tbody').innerText(), /0\/0 · 0%/);
  mode = 'PGRST202';
  await page.getByRole('button', { name: 'Actualizar seguimiento' }).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /aún no está habilitado/);
  assert.equal(await page.locator('table').count(), 0);
  mode = '42501';
  await page.getByRole('button', { name: 'Actualizar seguimiento' }).click();
  await page.getByText('Tu cuenta no tiene permiso para consultar el seguimiento.').waitFor();
  role = 'user';
  await page.reload();
  await page.getByRole('heading', { name: 'Acceso Denegado' }).waitFor();
  // Exercise the real study hook against the mocked PostgREST boundary.
  const completion = await page.evaluate(async ({ id }) => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { AuthContext } = await import('/src/context/AuthContext.jsx');
    const { useStudy } = await import('/src/hooks/useStudy.js');
    let complete;
    function Harness() {
      complete = useStudy().completeLesson;
      return null;
    }
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    root.render(React.createElement(AuthContext.Provider, { value: { user: { id } } }, React.createElement(Harness)));
    while (!complete) await new Promise(resolve => setTimeout(resolve, 10));
    const first = await complete('lesson-a', { answer: 'Primera respuesta' });
    const repeat = await complete('lesson-a', { answer: 'Repetida' });
    root.unmount();
    host.remove();
    return { first, repeat };
  }, { id });
  assert.equal(completion.first.answers.answer, 'Primera respuesta');
  assert.equal(completion.repeat, null);
  assert.equal(savedProgress.answers.answer, 'Primera respuesta');
  assert.equal(overwriteAttempts, 1);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: list, filters, pagination, detail, desktop/mobile, empty plan, RPC errors, non-admin route, duplicate lesson completion.');
} finally {
  await browser.close();
}

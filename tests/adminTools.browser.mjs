import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const baseURL = process.env.TRACKING_TEST_URL || 'http://127.0.0.1:5174';
const output = process.env.TRACKING_TEST_OUTPUT || 'test-results';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.TRACKING_TEST_BROWSER || 'chrome' });
const adminId = '00000000-0000-0000-0000-000000000001';
const now = new Date().toISOString();
const profiles = [
  { id: adminId, full_name: 'Administrador', church_name: 'Central', role: 'admin', created_at: now },
  { id: '00000000-0000-0000-0000-000000000002', full_name: 'Ana Fernandez', church_name: 'Central', role: 'user', created_at: now },
  { id: '00000000-0000-0000-0000-000000000003', full_name: 'Pedro Perez', church_name: 'Norte', role: 'user', created_at: now },
];
const tables = {
  profiles,
  posts: [{ id: 'post-1', content: 'Anuncio de Ana', category: 'Anuncio', created_at: now, profiles: { full_name: 'Ana Fernandez' } }],
  resources: [{ id: 'resource-1', title: 'Guia de Ana', category: 'DOCUMENTO', file_type: 'PDF' }],
  societies: [{ id: 'society-1', name: 'Sociedad Ana', zone: 'Norte' }],
  study_plans: [{ id: 'plan-1', title: 'Plan Ana', created_at: now }],
  study_weeks: [], study_lessons: [],
};
const notifications = [
  { id: 'notice-1', title: 'Aviso uno', message: 'Primera reunion', type: 'anuncio', read: false, action_url: null, created_at: now },
  { id: 'notice-2', title: 'Aviso dos', message: 'Segunda reunion', type: 'anuncio', read: false, action_url: '/estudios', created_at: now },
];
const batches = [];
const sentIds = [];
let failRead = false;
let loseResponse = true;
let failResources = false;
let missingRPC = false;
let role = 'admin';
const pageErrors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(({ adminId }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
    user: { id: adminId, role: 'authenticated', aud: 'authenticated', email: 'test@example.invalid' },
  })), { adminId });
  await context.route('https://placeholder.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').at(-1);
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || 1000);
    let status = 200;
    let body = [];
    let total = 0;
    if (table === 'profiles' && url.searchParams.has('id')) body = { ...profiles[0], role };
    else if (table === 'notifications') {
      assert.equal(url.searchParams.get('user_id'), `eq.${adminId}`);
      if (request.method() === 'PATCH') {
        assert.equal(url.searchParams.get('read'), 'eq.false');
        if (failRead) { status = 403; body = { code: '42501', message: 'Denied' }; }
        else notifications.forEach(item => { if (!url.searchParams.has('id') || url.searchParams.get('id') === `eq.${item.id}`) item.read = true; });
      } else { total = notifications.length; body = notifications.slice(offset, offset + limit); }
    } else if (table === 'admin_notification_history') {
      if (missingRPC) { status = 404; body = { code: 'PGRST202' }; }
      else body = batches.slice(offset, offset + limit);
    } else if (table === 'admin_send_notification') {
      const payload = request.postDataJSON();
      sentIds.push(payload.p_request_id);
      let batch = batches.find(item => item.id === payload.p_request_id);
      if (!batch) {
        const recipients = profiles.filter(profile => (!payload.p_user_id || profile.id === payload.p_user_id) && (!payload.p_church_name || profile.church_name === payload.p_church_name));
        batch = { id: payload.p_request_id, title: payload.p_title, message: payload.p_message,
          audience_label: payload.p_church_name || (payload.p_user_id ? recipients[0].full_name : 'Todos los usuarios'),
          recipient_count: recipients.length, created_at: now };
        batches.unshift(batch);
      }
      if (loseResponse) { loseResponse = false; status = 503; body = { code: 'NETWORK', message: 'Lost response' }; }
      else body = batch;
    } else if (tables[table]) {
      let items = [...tables[table]];
      for (const [column, filter] of url.searchParams) if (filter.startsWith('ilike.')) {
        const term = filter.slice(7, -1).toLowerCase();
        items = items.filter(item => String(item[column] || '').toLowerCase().includes(term));
      }
      total = items.length;
      body = items.slice(offset, offset + limit);
      if (table === 'resources' && failResources) { status = 403; body = { code: '42501' }; }
    }
    await route.fulfill({ status, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(total - 1, 0)}/${total}` }, body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`${baseURL}/admin/notificaciones`);
  await page.getByLabel('2 sin leer', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
  const inbox = page.getByRole('region', { name: 'Notificaciones recibidas' });
  await inbox.getByRole('button', { name: /Aviso uno/ }).click();
  await page.getByLabel('1 sin leer', { exact: true }).waitFor();
  await inbox.getByRole('button', { name: /Aviso uno/ }).click();
  assert.equal(await page.getByLabel('1 sin leer', { exact: true }).count(), 1);
  failRead = true;
  await page.getByRole('button', { name: 'Marcar todas como leídas' }).click();
  await inbox.getByRole('alert').waitFor();
  assert.equal(notifications[1].read, false);
  failRead = false;
  await page.getByRole('button', { name: 'Marcar todas como leídas' }).click();
  await page.getByLabel('1 sin leer', { exact: true }).waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Notificaciones', exact: true }).getAttribute('aria-expanded'), 'false');

  await page.getByRole('combobox', { name: 'Joven', exact: true }).selectOption(profiles[1].id);
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Reunion de jovenes');
  await page.getByRole('textbox', { name: 'Mensaje', exact: true }).fill('Nos encontramos el sabado a las 16:00.');
  await page.getByRole('combobox', { name: 'Destino al abrir' }).selectOption('/estudios');
  await page.getByRole('button', { name: 'Enviar aviso', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'No se pudo confirmar' }).waitFor();
  await page.getByRole('button', { name: 'Enviar aviso', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Aviso enviado a 1 destinatario.' }).waitFor();
  assert.equal(sentIds[0], sentIds[1]);
  assert.equal(batches.length, 1);
  await page.getByRole('heading', { name: 'Reunion de jovenes' }).waitFor();
  await page.screenshot({ path: `${output}/admin-notifications-desktop.png`, fullPage: true });

  await page.getByRole('combobox', { name: 'Destinatarios', exact: true }).selectOption('church');
  await page.getByRole('combobox', { name: 'Iglesia', exact: true }).selectOption('Central');
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Aviso Central');
  await page.getByRole('textbox', { name: 'Mensaje', exact: true }).fill('Mensaje para la iglesia.');
  await page.getByRole('button', { name: 'Enviar aviso', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Aviso enviado a 2 destinatarios.' }).waitFor();
  await page.getByRole('combobox', { name: 'Destinatarios', exact: true }).selectOption('all');
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Aviso general');
  await page.getByRole('textbox', { name: 'Mensaje', exact: true }).fill('Mensaje para todos.');
  await page.getByRole('button', { name: 'Enviar aviso', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Aviso enviado a 3 destinatarios.' }).waitFor();

  await page.getByRole('searchbox', { name: 'Buscar en administración' }).fill('Ana');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByRole('link', { name: /Ana Fernandez/ }).waitFor();
  await page.getByRole('link', { name: /Plan Ana/ }).waitFor();
  await page.screenshot({ path: `${output}/admin-search-desktop.png`, fullPage: true });
  await page.getByRole('link', { name: /Ana Fernandez/ }).click();
  assert.match(page.url(), /usuarios\?q=Ana/);
  await page.locator('tbody').getByText('Ana Fernandez').waitFor();
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.goBack();
  await page.getByRole('link', { name: /Plan Ana/ }).click();
  await page.getByRole('heading', { name: 'Plan Ana', exact: true }).waitFor();
  await page.goBack();
  failResources = true;
  await page.getByRole('button', { name: 'Actualizar resultados' }).click();
  await page.getByRole('alert').filter({ hasText: 'No se pudo consultar recursos.' }).waitFor();
  await page.getByRole('link', { name: /Ana Fernandez/ }).waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir buscador' }).click();
  await page.getByRole('searchbox', { name: 'Buscar en administración' }).fill('nadie-encontrado');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByText('Sin resultados en esta página.').first().waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
  await inbox.getByRole('button', { name: /Aviso uno/ }).waitFor();
  const bounds = await inbox.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await page.screenshot({ path: `${output}/admin-notifications-mobile.png`, fullPage: true });
  await inbox.getByRole('link', { name: 'Administrar avisos' }).click();
  await page.screenshot({ path: `${output}/admin-notifications-form-mobile.png`, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  missingRPC = true;
  await page.getByRole('button', { name: 'Actualizar avisos' }).click();
  await page.getByRole('alert').filter({ hasText: 'aún no está habilitado' }).waitFor();
  role = 'user';
  await page.reload();
  await page.getByRole('heading', { name: 'Acceso Denegado' }).waitFor();
  assert.deepEqual(pageErrors, []);
  console.log('Passed: notification reads/errors/counts, individual/church/all sends, idempotent retry, history, search navigation/partial errors/empty results, mobile, admin guard. All Supabase responses mocked.');
} finally { await browser.close(); }

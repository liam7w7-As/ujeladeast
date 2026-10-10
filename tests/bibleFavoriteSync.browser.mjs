import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BIBLE_TEST_URL || 'http://127.0.0.1:5177';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const alice = '10000000-0000-0000-0000-000000000001', bob = '10000000-0000-0000-0000-000000000002';
const session = id => ({ access_token: `test-${id}`, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, role: 'authenticated', aud: 'authenticated', email: 'test@example.invalid', user_metadata: { full_name: 'Prueba' } } });
const servers = new Map(); let missing = false, calls = 0;
async function setup() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.route('https://**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname !== 'placeholder.supabase.co') return route.abort();
    const id = request.headers().authorization?.replace('Bearer test-', '');
    let body = [], status = 200;
    if (url.pathname.endsWith('/profiles')) body = { id, full_name: 'Prueba', avatar_url: '/avatars/hombre.webp', role: 'user' };
    if (url.pathname.endsWith('/sync_bible_favorites')) {
      calls++;
      if (missing) { status = 404; body = { code: 'PGRST202', message: 'Missing RPC' }; }
      else {
        assert.ok([alice, bob].includes(id), 'request uses the captured account JWT');
        if (!servers.has(id)) servers.set(id, { entries: new Map(), receipts: new Set(), revision: 0 });
        const server = servers.get(id), operations = request.postDataJSON().p_operations;
        for (const op of operations) {
          if (server.receipts.has(op.id)) continue;
          server.receipts.add(op.id); server.revision++;
          if (op.entry) server.entries.set(op.key, op.entry); else server.entries.delete(op.key);
        }
        body = { favorites: [...server.entries.values()], revision: server.revision, applied: operations.map(op => op.id) };
      }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return context;
}
try {
  const context = await setup(), page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const url = `${base}/biblia?version=RVR1960&book=PSA&chapter=23`;
  await page.goto(url);
  await page.getByLabel('Opciones del versículo PSA.23.1', { exact: true }).click();
  await page.getByLabel('Guardar favorito', { exact: true }).click();
  assert.equal(calls, 0, 'guest never uploads');
  await page.evaluate(value => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(value)), session(alice));
  await page.reload(); await page.getByLabel('Marcadores', { exact: true }).click();
  await page.getByText('Favoritos sincronizados con tu cuenta', { exact: true }).waitFor();
  assert.equal(await page.locator('.bible-favorite-row').count(), 0, 'guest favorites do not leak into account');
  await page.getByRole('button', { name: 'Importar favoritos de este dispositivo' }).click();
  await page.getByText('Favoritos sincronizados con tu cuenta', { exact: true }).waitFor();
  assert.equal(servers.get(alice).entries.size, 1);
  await page.getByLabel('Cerrar ventana').click();
  await context.setOffline(true);
  await page.getByLabel('Opciones del versículo PSA.23.2', { exact: true }).click();
  await page.getByLabel('Guardar favorito', { exact: true }).click();
  await page.getByLabel('Marcadores', { exact: true }).click();
  await page.getByText(/1 cambios pendientes/).waitFor();
  assert.equal(await page.locator('.bible-favorite-row').count(), 2); assert.equal(servers.get(alice).entries.size, 1);
  await context.setOffline(false);
  await page.getByText('Favoritos sincronizados con tu cuenta', { exact: true }).waitFor();
  assert.equal(servers.get(alice).entries.size, 2);
  const second = await setup(), secondPage = await second.newPage();
  await second.addInitScript(value => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(value)), session(alice));
  await secondPage.goto(url); await secondPage.getByLabel('Marcadores', { exact: true }).click();
  await secondPage.getByText('Favoritos sincronizados con tu cuenta', { exact: true }).waitFor();
  assert.equal(await secondPage.locator('.bible-favorite-row').count(), 2, 'second device retrieves saved account favorites');
  await secondPage.getByRole('button', { name: /^Eliminar favorito .*23:1 / }).click();
  await secondPage.getByText('Favoritos sincronizados con tu cuenta', { exact: true }).waitFor();
  assert.equal(servers.get(alice).entries.size, 1, 'delete acknowledged by server');
  await page.getByLabel('Sincronizar favoritos', { exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.bible-favorite-row').length === 1);
  assert.equal(await page.locator('.bible-favorite-row').count(), 1);
  await page.evaluate(value => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(value)), session(bob));
  await page.reload(); await page.getByLabel('Marcadores', { exact: true }).click();
  await page.getByText('Favoritos sincronizados con tu cuenta', { exact: true }).waitFor();
  assert.equal(await page.locator('.bible-favorite-row').count(), 0, 'other account sees no prior user favorites');
  missing = true;
  await page.getByLabel('Cerrar ventana').click();
  await page.getByLabel('Opciones del versículo PSA.23.3', { exact: true }).click();
  await page.getByLabel('Guardar favorito', { exact: true }).click();
  await page.getByLabel('Marcadores', { exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'todavía no está habilitada' }).waitFor();
  assert.equal(await page.locator('.bible-favorite-row').count(), 1);
  missing = false; await page.getByLabel('Sincronizar favoritos', { exact: true }).click();
  await page.getByText('Favoritos sincronizados con tu cuenta', { exact: true }).waitFor();
  assert.equal(servers.get(bob).entries.size, 1); assert.equal(servers.get(alice).entries.size, 1);
  assert.deepEqual(errors, []);
  console.log('PASS: guest privacy, explicit import, offline queue/reconnect, two-device sync/delete, captured JWT, account isolation, missing migration and retry.');
} finally { await browser.close(); }

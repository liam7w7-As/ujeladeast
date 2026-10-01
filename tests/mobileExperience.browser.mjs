import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.MOBILE_TEST_URL || 'http://127.0.0.1:5177';
const output = process.env.MOBILE_TEST_OUTPUT || 'test-results/mobile';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const id = '00000000-0000-0000-0000-000000000001';
const user = { id, role: 'authenticated', aud: 'authenticated', email: 'test@example.invalid', user_metadata: { full_name: 'Ana Prueba', gender: 'mujer' } };
const profile = { id, full_name: 'Ana Prueba', church_name: 'Central', avatar_url: '/avatars/mujer.webp', role: 'user' };
const session = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
const errors = [], signups = [], recoveries = [], passwords = [];
let failLogin = true, failSignup = true, failRecovery = false;
async function setup(context, authenticated = false) {
  if (authenticated) await context.addInitScript(session => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(session)), session);
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  await context.route('https://placeholder.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), table = url.pathname.split('/').at(-1);
    let body = [], status = 200;
    if (table === 'profiles') body = profile;
    else if (table === 'token') { body = failLogin ? { code: 'invalid_credentials', message: 'Invalid login credentials' } : session; status = failLogin ? 400 : 200; }
    else if (table === 'signup') { signups.push(request.postDataJSON()); body = failSignup ? { code: 'unexpected_failure', message: 'Temporary failure' } : user; status = failSignup ? 503 : 200; }
    else if (table === 'recover') { recoveries.push({ data: request.postDataJSON(), redirect: url.searchParams.get('redirect_to') }); body = failRecovery ? { message: 'Unavailable' } : {}; status = failRecovery ? 503 : 200; }
    else if (table === 'user') { if (request.method() === 'PUT') passwords.push(request.postDataJSON()); body = user; }
    else if (request.headers().accept?.includes('object+json')) body = null;
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
async function settled(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.auth-content, .auth-form, .public-page-content, .home-hero h1, .home-hero > p, .home-hero > div, dialog > div')].every(el => Number(getComputedStyle(el).opacity) > 0.99));
}
try {
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await setup(guest);
  const page = await guest.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/feed', '/himnario', '/estudios', '/sociedades', '/recursos', '/login', '/register', '/recuperar']) {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      const nav = page.getByRole('navigation', { name: 'Navegación móvil' });
      await nav.waitFor();
      assert.equal(await nav.count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Abrir menú', exact: true }).count(), 0);
      const bounds = await nav.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 845, `${path} nav at ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} overflow at ${width}`);
      if (width === 390) { await settled(page); await page.screenshot({ path: `${output}/${path.slice(1) || 'home'}-mobile.png` }); }
    }
  }
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 500 }]) {
    await page.setViewportSize(viewport);
    for (const path of ['/login', '/register']) {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await settled(page);
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
      const guestLink = await page.getByRole('link', { name: 'Seguir como invitado' }).boundingBox();
      const nav = await page.getByRole('navigation', { name: 'Navegación móvil' }).boundingBox();
      assert.ok(guestLink.y >= 60 && guestLink.y + guestLink.height <= nav.y, `${path} remains reachable at ${viewport.height}px height`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/himnario', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
  await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('link', { name: 'Inicio', exact: true }).click();
  await page.waitForURL(base + '/');
  await page.waitForFunction(() => scrollY === 0);
  await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
  const dismiss = page.getByRole('button', { name: 'Ahora no', exact: true });
  await dismiss.waitFor();
  await page.waitForFunction(() => document.querySelector('.pwa-install-prompt > div').getBoundingClientRect().bottom <= document.querySelector('.mobile-tab-bar').getBoundingClientRect().top);
  const installBounds = await dismiss.boundingBox();
  const navBounds = await page.getByRole('navigation', { name: 'Navegación móvil' }).boundingBox();
  assert.ok(installBounds.y + installBounds.height <= navBounds.y, 'installation prompt does not cover tabs');
  await dismiss.click();
  await page.goto(base + '/feed', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('link', { name: 'Himnario' }).click();
  await page.waitForURL('**/himnario');
  await page.locator('.mobile-tab-bar a[aria-current="page"]').filter({ hasText: 'Himnario' }).waitFor();
  assert.equal(await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('link', { name: 'Himnario' }).getAttribute('aria-current'), 'page');
  await page.getByRole('button', { name: /^Abrir himno 1:/ }).click();
  const hymnClose = page.getByTitle('Cerrar (o botón atrás del cel)', { exact: true });
  await hymnClose.waitFor();
  assert.equal(await hymnClose.evaluate(el => document.elementFromPoint(el.getBoundingClientRect().x + 10, el.getBoundingClientRect().y + 10)?.closest('button') === el), true, 'hymn modal is above navigation');
  await hymnClose.click();
  await hymnClose.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Recursos', exact: true }).click();
  await page.waitForURL('**/recursos');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  await page.goto(base + '/register', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Mujer', { exact: true }).check();
  await page.getByLabel('Nombre completo').fill('Ana Prueba');
  await page.getByLabel('Iglesia', { exact: true }).fill('Central');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password-123');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('different-password');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'no coinciden' }).waitFor();
  assert.equal(signups.length, 0);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('test-password-123');
  await page.getByRole('button', { name: 'Volver a tu perfil' }).click();
  assert.equal(await page.getByLabel('Nombre completo').inputValue(), 'Ana Prueba');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  assert.equal(await page.getByLabel('Correo electrónico').inputValue(), user.email);
  await settled(page);
  await page.screenshot({ path: `${output}/register-access-mobile.png` });
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByLabel('Contraseña', { exact: true }).inputValue(), 'test-password-123');
  failSignup = false;
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Revisa tu correo' }).waitFor();
  assert.equal(signups.at(-1).data.avatar_url, '/avatars/mujer.webp');

  await page.goto(base + '/estudios', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password-123');
  await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
  assert.equal(await page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'no son correctos' }).waitFor();
  await page.screenshot({ path: `${output}/login-error-mobile.png` });
  failLogin = false;
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForURL('**/estudios');
  await guest.close();

  const recovery = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await setup(recovery);
  const reset = await recovery.newPage();
  reset.setDefaultTimeout(15000);
  reset.on('pageerror', error => errors.push(error.message));
  await reset.goto(base + '/recuperar?actualizar=1', { waitUntil: 'domcontentloaded' });
  await reset.getByRole('heading', { name: 'El enlace ya no es válido' }).waitFor();
  assert.equal(passwords.length, 0);
  await reset.getByRole('link', { name: 'Solicitar otro enlace' }).click();
  await reset.getByLabel('Correo electrónico').fill(user.email);
  failRecovery = true;
  await reset.getByRole('button', { name: 'Enviar enlace' }).click();
  await reset.getByRole('alert').waitFor();
  failRecovery = false;
  await reset.getByRole('button', { name: 'Enviar enlace' }).click();
  await reset.getByRole('status').waitFor();
  assert.equal(recoveries.at(-1).redirect, base + '/recuperar?actualizar=1');
  await recovery.close();

  const authenticated = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await setup(authenticated, true);
  const member = await authenticated.newPage();
  member.setDefaultTimeout(15000);
  member.on('pageerror', error => errors.push(error.message));
  await member.goto(base + '/recuperar?actualizar=1', { waitUntil: 'domcontentloaded' });
  await member.getByLabel('Nueva contraseña', { exact: true }).fill('new-test-password-123');
  await member.getByLabel('Confirmar contraseña', { exact: true }).fill('new-test-password-123');
  await member.getByRole('button', { name: 'Guardar contraseña' }).click();
  await member.getByRole('status').filter({ hasText: 'Contraseña actualizada' }).waitFor();
  assert.equal(passwords.at(-1).password, 'new-test-password-123');
  await member.goto(base + '/feed', { waitUntil: 'domcontentloaded' });
  await member.getByRole('button', { name: 'Más opciones' }).click();
  await member.getByRole('dialog').getByText('Ana Prueba', { exact: true }).waitFor();
  await settled(member);
  await member.screenshot({ path: `${output}/member-menu-mobile.png` });
  await member.keyboard.press('Escape');
  await member.goto(base + '/chat', { waitUntil: 'domcontentloaded' });
  const frame = await member.locator('.chat-page-frame').boundingBox();
  assert.ok(frame.y >= 60 && frame.y + frame.height <= 777, 'chat leaves room for both navigation bars');
  await member.setViewportSize({ width: 1440, height: 1000 });
  await member.goto(base + '/login', { waitUntil: 'domcontentloaded' });
  await member.screenshot({ path: `${output}/login-desktop.png` });
  assert.equal(await member.getByRole('navigation', { name: 'Navegación móvil' }).count(), 0);
  await authenticated.close();
  assert.deepEqual(errors, []);
  console.log('PASS: guest navigation on 9 routes at 4 widths, tab routing, account menu, two-step signup, preserved drafts, login retry/return, reset request/update/expired links, chat clearance and desktop auth.');
} finally { await browser.close(); }

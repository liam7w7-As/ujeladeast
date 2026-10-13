import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.PWA_INSTALL_TEST_URL || 'http://127.0.0.1:5177';
const output = 'test-results/pwa-install';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [];
async function setup({ authenticated = false, ...options } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...options });
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  const id = '00000000-0000-0000-0000-000000000001';
  const user = { id, email: 'test@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { full_name: 'Ana Prueba' } };
  if (authenticated) await context.addInitScript(user => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, user })), user);
  await context.route('https://placeholder.supabase.co/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    const body = table === 'profiles' ? { id, full_name: 'Ana Prueba', role: 'user' } : table === 'user' ? user : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await context.addInitScript(() => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    localStorage.setItem('install-test-draft', 'preserved');
    window.installCalls = 0;
    window.relatedApps = [];
    Object.defineProperty(navigator, 'getInstalledRelatedApps', { configurable: true, value: async () => window.relatedApps });
    window.offerInstall = outcome => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = async () => { window.installCalls++; return { outcome }; };
      window.dispatchEvent(event);
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(15000);
  return { context, page };
}
const headerInstall = page => page.locator('.mobile-app-header').getByRole('button', { name: 'Instalar UJELADEA', exact: true });
try {
  const { context, page } = await setup();
  await page.goto(base + '/feed');
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    if (width >= 1280) {
      await page.locator('.feed-rail').getByRole('button', { name: 'Instalar UJELADEA', exact: true }).waitFor();
      await page.goto(base);
    }
    const header = page.locator(width < 1280 ? '.mobile-app-header' : '.desktop-navbar');
    await header.getByRole('button', { name: 'Instalar UJELADEA', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no horizontal overflow at ${width}`);
    assert.equal(await header.evaluate(el => {
      const brand = el.querySelector('a[aria-label="UJELADEA inicio"]').getBoundingClientRect();
      const install = el.querySelector('.pwa-install-entry').getBoundingClientRect();
      return brand.right <= install.left && install.right <= innerWidth;
    }), true, `header controls fit at ${width}`);
    await page.screenshot({ path: `${output}/navigation-${width}.png` });
    if (width >= 1280) await page.goto(base + '/feed');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await headerInstall(page).click();
  await page.getByRole('dialog', { name: 'Instalar UJELADEA' }).waitFor();
  await page.getByText('Instalar aplicación o Añadir a pantalla de inicio', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await headerInstall(page).waitFor();

  await page.evaluate(() => window.offerInstall('dismissed'));
  await page.getByRole('button', { name: 'Ahora no', exact: true }).click();
  await headerInstall(page).click();
  await headerInstall(page).waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.installCalls), 1);
  await headerInstall(page).click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.evaluate(() => window.installCalls), 1, 'consumed prompt not called again');
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();

  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Instalar UJELADEA', exact: true }).click();
  await page.getByRole('dialog', { name: 'Instalar UJELADEA' }).waitFor();
  assert.equal(await page.locator('dialog[open]').count(), 1);
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'menu-to-help restores scroll');

  await page.evaluate(() => window.offerInstall('accepted'));
  await headerInstall(page).click();
  await page.locator('.mobile-app-header').getByRole('button', { name: 'Instalación en curso' }).waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await page.locator('.mobile-app-header').getByRole('button', { name: 'Instalación en curso' }).click();
  await page.getByRole('dialog', { name: 'Tu instalación' }).waitFor();
  await page.screenshot({ path: `${output}/pending-mobile.png` });
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.reload();
  await page.locator('.mobile-app-header').getByRole('button', { name: 'Instalación en curso' }).waitFor();
  await page.evaluate(() => {
    window.relatedApps = [{ platform: 'webapp', url: `${location.origin}/manifest.webmanifest` }];
    window.dispatchEvent(new Event('focus'));
  });
  await page.locator('.mobile-app-header .pwa-install-entry').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => localStorage.getItem('install-test-draft')), 'preserved');
  await context.close();

  const bible = await setup();
  await bible.page.goto(base + '/biblia');
  await bible.page.getByRole('button', { name: 'Ajustes de lectura', exact: true }).click();
  await bible.page.getByRole('dialog').getByRole('button', { name: 'Instalar UJELADEA', exact: true }).click();
  await bible.page.getByRole('dialog', { name: 'Instalar UJELADEA' }).waitFor();
  assert.equal(await bible.page.locator('dialog[open]').count(), 1);
  await bible.page.getByRole('button', { name: 'Cerrar ventana' }).click();
  assert.equal(await bible.page.evaluate(() => document.body.style.overflow), '');
  await bible.page.evaluate(() => window.offerInstall('accepted'));
  assert.equal(await bible.page.locator('.pwa-install-prompt').count(), 0, 'reading stays fullscreen');
  await bible.context.close();

  const standalone = await setup();
  await standalone.context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await standalone.page.goto(base);
  await standalone.page.locator('.mobile-app-header').waitFor();
  assert.equal(await standalone.page.locator('.pwa-install-entry').count(), 0);
  await standalone.context.close();

  const ios = await setup({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });
  await ios.page.goto(base);
  await headerInstall(ios.page).click();
  await ios.page.getByText('Abre esta página en Safari.', { exact: true }).waitFor();
  await ios.page.screenshot({ path: `${output}/ios-help.png` });
  await ios.context.close();

  const slow = await setup();
  await slow.context.addInitScript(() => sessionStorage.setItem('ujeladea-install-pending', String(Date.now() - 121000)));
  await slow.page.goto(base);
  await slow.page.locator('.mobile-app-header').getByRole('button', { name: 'Comprobar instalación' }).click();
  await slow.page.getByText('Si todavía no aparece, vuelve al menú del navegador', { exact: false }).waitFor();
  await slow.page.getByRole('button', { name: 'Comprobar de nuevo' }).click();
  await slow.page.getByText('No recibimos una confirmación del navegador.', { exact: false }).waitFor();
  await slow.context.close();

  const member = await setup({ authenticated: true });
  for (const width of [320, 1280]) {
    await member.page.setViewportSize({ width, height: 844 });
    await member.page.goto(base);
    const header = member.page.locator(width === 320 ? '.mobile-app-header' : '.desktop-navbar');
    await header.getByRole('button', { name: 'Instalar UJELADEA' }).waitFor();
    assert.equal(await header.evaluate(el => [...el.querySelectorAll('button, a')].filter(node => node.getClientRects().length).every(node => { const b = node.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; })), true, `authenticated controls fit at ${width}`);
    await member.page.screenshot({ path: `${output}/member-${width}.png` });
  }
  await member.context.close();
  assert.deepEqual(errors, []);
  console.log('PWA install: persistent entries, dismissal, retry, pending/reload, confirmation, fullscreen Bible, iOS, mobile/desktop passed.');
} finally { await browser.close(); }

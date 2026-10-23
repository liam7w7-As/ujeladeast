import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.APPEARANCE_TEST_URL || 'http://127.0.0.1:5178';
const output = 'test-results/appearance';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const id = '00000000-0000-0000-0000-000000000001';
const user = { id, email: 'test@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { full_name: 'Ana Prueba' } };
const profile = { id, role: 'admin', full_name: 'Ana Prueba', church_name: 'JM Central', avatar_url: '/avatars/personaje-2-v1.webp' };
const resource = { id, title: 'Guía de bienvenida', category: 'DOCUMENTO', file_type: 'PDF', file_size: '1 MB', is_featured: true, file_url: '/data/test.pdf', created_at: '2026-10-23T12:00:00Z' };
async function setup(authenticated = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.addInitScript(({ authenticated, user }) => {
    if (!localStorage.getItem('appearance-test-initialized')) {
      localStorage.setItem('appearance-test-initialized', 'true');
      localStorage.setItem('pwa-prompt-dismissed', 'true');
      localStorage.setItem('appearance-test-draft', 'preserved');
      if (authenticated) localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
    }
  }, { authenticated, user });
  await context.route('https://**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'placeholder.supabase.co') return route.abort();
    const table = url.pathname.split('/').at(-1);
    let body = [];
    if (table === 'settings') body = { external: { google: true } };
    if (table === 'user') body = user;
    if (table === 'profiles') body = profile;
    if (table === 'resources') body = url.searchParams.has('is_featured') ? resource : [resource];
    if (table === 'societies') body = [{ id, name: 'Sociedad Central', zone: 'El Alto', president_name: 'Ana Prueba', photo_url: '/images/community/comunidad-640.webp' }];
    return route.fulfill({ contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: JSON.stringify(body) });
  });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}
const theme = page => page.locator('html').getAttribute('data-theme');
const toggle = page => page.getByRole('button', { name: /Activar modo (?:claro|oscuro)/ });
async function readable(locator, description) {
  const ratio = await locator.evaluate(element => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].map((v,i) => i === 3 ? v/255 : v); };
    const blend = (front,back) => front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3])).concat(1);
    const parents = []; for (let current=element; current; current=current.parentElement) parents.unshift(current);
    const background = parents.reduce((result,current)=>blend(rgba(getComputedStyle(current).backgroundColor),result),[255,255,255,1]);
    const foreground = blend(rgba(getComputedStyle(element).color),background);
    const luminance = color => color.slice(0,3).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
    const a=luminance(foreground), b=luminance(background);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  assert.ok(ratio >= 4.5, `${description}: contrast ${ratio.toFixed(2)}:1`);
}
async function snapshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.auth-content, .auth-story')].every(element => Number(getComputedStyle(element).opacity) === 1));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ': horizontal fit');
  await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
}
try {
  const { context, page } = await setup();
  await page.goto(base + '/login');
  await page.locator('.auth-content').waitFor();
  assert.equal(await theme(page), 'dark', 'existing users keep dark despite a light device');
  await toggle(page).click(); assert.equal(await theme(page), 'light');
  assert.equal(await page.evaluate(() => localStorage.getItem('ujeladea:appearance:v1')), 'light');
  await page.reload(); await page.locator('.auth-content').waitFor(); assert.equal(await theme(page), 'light');
  const other = await context.newPage(); await other.goto(base + '/feed'); await other.locator('.feed-heading').waitFor();
  await toggle(other).click(); await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.getByRole('button', { name: 'Más opciones' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tu comunidad' });
  await dialog.getByRole('radio', { name: 'Dispositivo', exact: true }).check();
  assert.equal(await theme(page), 'light');
  await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.emulateMedia({ colorScheme: 'light' }); await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await snapshot(page, 'appearance-menu-light');
  await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();
  await other.close();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ['dark', 'light']) {
      if (await theme(page) !== mode) await toggle(page).click();
      for (const path of ['/login', '/register', '/', '/feed', '/himnario', '/sociedades', '/recursos', '/nosotros', '/privacidad']) {
        await page.goto(base + path);
        await toggle(page).waitFor();
        await page.locator('h1').first().waitFor();
        assert.equal(await theme(page), mode);
        if (width === 1440) {
          if (path !== '/feed') await readable(page.locator('h1').first(), `${path} ${mode}: heading`);
          if (await page.locator('.desktop-navbar a[aria-current=page]').count()) await readable(page.locator('.desktop-navbar a[aria-current=page]'), `${path} ${mode}: navigation`);
          if (path === '/recursos') await readable(page.getByRole('button', { name: 'Descargar', exact: true }).last(), `${mode}: secondary download`);
        }
        if (width === 390 || width === 1440 || path === '/login') await snapshot(page, `${path === '/' ? 'home' : path.slice(1)}-${mode}-${width}`);
        if (width < 1280) assert.equal(await page.locator('.mobile-app-header').evaluate(header => {
          const brand = header.querySelector('.mobile-app-brand').getBoundingClientRect();
          const actions = header.querySelector('.mobile-app-actions').getBoundingClientRect();
          return brand.right <= actions.left && actions.right <= innerWidth;
        }), true, `${path} ${width}: header controls do not overlap`);
      }
    }
  }
  for (const mode of ['light', 'dark']) {
    await page.goto(base + '/himnario');
    if (await theme(page) !== mode) await toggle(page).click();
    await page.getByRole('button', { name: /^Abrir himno 1:/ }).click();
    await page.getByTitle('Cerrar (o botón atrás del cel)').waitFor();
    await readable(page.locator('p.italic.whitespace-pre-wrap').last(), mode + ': hymn chorus');
    await snapshot(page, 'hymn-modal-' + mode);
    await page.getByTitle('Cerrar (o botón atrás del cel)').click();
    await page.goto(base + '/sociedades');
    await page.getByRole('button', { name: 'Ver más', exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar sociedad', exact: true }).waitFor();
    await snapshot(page, 'society-modal-' + mode);
    await page.getByRole('button', { name: 'Cerrar sociedad', exact: true }).click();
  }
  await page.goto(base + '/login'); if (await theme(page) !== 'light') await toggle(page).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/biblia'); await page.locator('.bible-page').waitFor();
  assert.ok(await page.locator('.bible-theme-light').count());
  await page.getByRole('button', { name: 'Ajustes de lectura', exact: true }).click();
  await page.getByRole('button', { name: 'Tema oscuro', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.goto(base + '/login'); await toggle(page).click(); await toggle(page).click();
  await page.goto(base + '/biblia'); await page.locator('.bible-theme-dark').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('bible:theme')), '"dark"');
  assert.equal(await page.evaluate(() => localStorage.getItem('appearance-test-draft')), 'preserved');
  await snapshot(page, 'bible-explicit-dark-app-light');
  await context.close();
  const admin = await setup(true);
  for (const mode of ['dark', 'light']) {
    await admin.page.goto(base + '/admin/seguimiento'); await admin.page.locator('aside[aria-label="Administración"]').waitFor({ state: 'attached' });
    if (await theme(admin.page) !== mode) await toggle(admin.page).click();
    for (const width of [390, 1440]) { await admin.page.setViewportSize({ width, height: 900 }); await snapshot(admin.page, `admin-${mode}-${width}`); }
    await admin.page.goto(base + '/estudios'); await admin.page.locator('.study-main').waitFor(); await snapshot(admin.page, `study-${mode}`);
    await admin.page.goto(base + '/chat'); await admin.page.locator('.chat-page-frame').waitFor(); await snapshot(admin.page, `chat-${mode}`);
  }
  await admin.context.close();
  assert.deepEqual(errors, []);
  console.log('PASS: global themes, header fit, two-way cross-tab sync, system changes, reload persistence, public modules, admin, studies, chat and preserved Bible settings. Mock data only.');
} finally { await browser.close(); }

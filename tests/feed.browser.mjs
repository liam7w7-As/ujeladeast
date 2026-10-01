import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const baseURL = process.env.FEED_TEST_URL || 'http://127.0.0.1:5177';
const output = process.env.FEED_TEST_OUTPUT || 'test-results';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const userId = '00000000-0000-0000-0000-000000000001';
const now = new Date().toISOString();
const profile = { id: userId, full_name: 'Gabriel Fernandez', church_name: 'Iglesia Central', avatar_url: '/avatars/hombre.webp', role: 'user' };
const author = { full_name: 'Valentina Alejandra Fernandez de la comunidad de El Alto', church_name: 'Sociedad de Jovenes de la Iglesia Central', avatar_url: '/avatars/mujer.webp' };
const posts = [
  { id: 'post-1', user_id: 'member-2', profiles: author, created_at: now, category: 'reflexion', content: 'Hoy compartimos un tiempo de gratitud. Que nuestra fe se vea en las pequenas cosas: escuchar, acompanar y servir.\n\nQue motivo de gratitud tienes hoy?', image_url: '/logo-ujeladea.png', likes_count: 12, comments_count: 0 },
  { id: 'post-2', user_id: userId, profiles: profile, created_at: now, category: 'devocional', content: 'Una nueva oportunidad para crecer juntos. '.repeat(30), likes_count: 2, comments_count: 0 },
];
let failPublish = true, failLike = false, failFeed = false;
const comments = [];
const likes = new Set();
const signups = [];
const profileWrites = [];
const pageErrors = [];
async function mock(context) {
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  await context.route('https://lh3.googleusercontent.com/**', route => route.abort());
  await context.route('https://placeholder.supabase.co/**', async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').at(-1);
    let body = [], status = 200;
    if (table === 'profiles') {
      if (req.method() !== 'GET') { profileWrites.push(req.postDataJSON()); Object.assign(profile, req.postDataJSON()); }
      body = profile;
    } else if (table === 'posts') {
      if (req.method() === 'POST') {
        if (failPublish) { status = 503; body = { message: 'No se pudo publicar. Intenta nuevamente.' }; }
        else { const post = req.postDataJSON(); posts.unshift({ ...post, id: 'post-new', profiles: profile, created_at: now, likes_count: 0, comments_count: 0 }); }
      } else if (failFeed) { status = 503; body = { message: 'No connection' }; }
      else body = posts.filter(post => !url.searchParams.has('category') || url.searchParams.get('category') === `eq.${post.category}`);
    } else if (table === 'post_likes') {
      if (req.method() === 'POST' || req.method() === 'DELETE') {
        if (failLike) { status = 403; body = { message: 'Denied' }; }
        else if (req.method() === 'POST') likes.add(req.postDataJSON().post_id);
        else likes.delete(url.searchParams.get('post_id').slice(3));
      } else body = [...likes].map(post_id => ({ post_id }));
    } else if (table === 'post_comments') {
      if (req.method() === 'POST') { body = { ...req.postDataJSON(), id: 'comment-1', created_at: now, profiles: profile }; comments.push(body); }
      else if (req.method() === 'DELETE') comments.splice(0);
      else body = comments;
    } else if (table === 'signup') {
      signups.push(req.postDataJSON());
      body = { id: userId, email: 'test@example.invalid', user_metadata: req.postDataJSON().data, identities: [] };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(({ userId }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, role: 'authenticated', aud: 'authenticated', email: 'test@example.invalid', user_metadata: { gender: 'hombre' } },
  })), { userId });
  await mock(context);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`${baseURL}/feed`, { waitUntil: 'domcontentloaded' });
  const first = page.getByRole('article').filter({ hasText: author.full_name });
  await first.waitFor();
  await first.getByRole('img', { name: `Avatar de ${author.full_name}`, exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('600 14px "Plus Jakarta Sans"')), true);
  assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), /Plus Jakarta Sans/);
  for (const width of [320, 390, 768, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('article').last().scrollIntoViewIfNeeded();
    await page.getByRole('article').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.feed-post')].every(el => Number(getComputedStyle(el).opacity) === 1));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${output}/feed-${width}.png`, fullPage: true });
    if (width === 390 || width === 1440) await page.screenshot({ path: `${output}/feed-viewport-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    const overflow = await page.locator('.feed-post, .feed-post-actions, .feed-compose').evaluateAll(nodes => nodes.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className));
    assert.deepEqual(overflow, [], `content overflow at ${width}`);
    assert.equal(await page.getByRole('button', { name: 'Crear publicación', exact: true }).count(), 1, `one visible create action at ${width}`);
  }
  await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
  const notifications = page.getByRole('region', { name: 'Notificaciones recibidas' });
  await notifications.waitFor();
  const notificationBounds = await notifications.boundingBox();
  assert.ok(notificationBounds.x >= 220 && notificationBounds.x + notificationBounds.width <= 1440);
  await page.keyboard.press('Escape');
  assert.equal(await first.locator('.feed-post-media img').evaluate(el => el.naturalWidth > 0 && getComputedStyle(el).objectFit === 'contain'), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await first.getByRole('button', { name: 'Ampliar imagen de la publicación' }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await first.getByRole('button', { name: 'Me gusta', exact: true }).click();
  await first.getByRole('button', { name: 'Quitar me gusta' }).waitFor();
  assert.equal(await first.locator('.feed-like-count').innerText(), '13 me gusta');
  await first.getByRole('button', { name: 'Quitar me gusta' }).click();
  await first.getByRole('button', { name: 'Me gusta', exact: true }).waitFor();
  await first.locator('.feed-post-media').dblclick();
  await first.getByRole('button', { name: 'Quitar me gusta' }).waitFor();
  assert.equal(await first.locator('.feed-like-count').innerText(), '13 me gusta');
  await first.locator('.feed-post-media').dblclick();
  assert.equal(await first.locator('.feed-like-count').innerText(), '13 me gusta', 'double tap never unlikes');
  await first.getByRole('button', { name: 'Quitar me gusta' }).click();
  await first.getByRole('button', { name: 'Me gusta', exact: true }).waitFor();
  failLike = true;
  await first.getByRole('button', { name: 'Me gusta', exact: true }).click();
  await first.getByRole('alert').waitFor();
  assert.equal(await first.getByRole('button', { name: 'Me gusta', exact: true }).getAttribute('aria-pressed'), 'false');
  failLike = false;
  await first.getByRole('button', { name: 'Comentar', exact: true }).click();
  await first.getByLabel('Escribe un comentario').fill('Gracias por compartir!');
  await first.getByRole('button', { name: 'Enviar comentario' }).click();
  await first.getByText('Gracias por compartir!', { exact: true }).waitFor();
  await first.getByRole('button', { name: '1 comentario' }).waitFor();
  await page.screenshot({ path: `${output}/feed-comments-mobile.png`, fullPage: true });
  page.once('dialog', dialog => dialog.accept());
  await first.getByRole('button', { name: 'Eliminar comentario' }).click();
  await first.getByText('Gracias por compartir!', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: `Ver publicaciones de ${author.full_name}` }).click();
  assert.equal(await page.getByRole('article').count(), 1);
  await page.getByRole('button', { name: 'Ver todas las personas' }).click();
  assert.equal(await page.getByRole('article').count(), 2);
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Recursos' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Crear publicación', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Contenido de la publicación').fill('Mi reflexion de hoy');
  await dialog.getByLabel('Categoría').selectOption('Devocionales');
  await dialog.getByRole('button', { name: 'Publicar', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByLabel('Contenido de la publicación').inputValue(), 'Mi reflexion de hoy');
  await page.screenshot({ path: `${output}/feed-compose-mobile.png` });
  const bounds = await dialog.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 390 && bounds.y + bounds.height <= 844);
  failPublish = false;
  console.log('Checking publish retry and filters');
  await dialog.getByRole('button', { name: 'Publicar', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const toast = page.getByRole('status').filter({ hasText: 'Publicación compartida' });
  await toast.waitFor();
  const toastBounds = await toast.boundingBox();
  assert.ok(toastBounds.x >= 0 && toastBounds.x + toastBounds.width <= 390);
  await page.getByText('Mi reflexion de hoy', { exact: true }).waitFor();
  assert.equal(posts[0].category, 'devocional');
  await page.getByRole('button', { name: 'Anuncios', exact: true }).click();
  await page.getByText('Todavía no hay publicaciones en esta categoría.').waitFor();
  await page.getByRole('button', { name: 'Devocionales', exact: true }).click();
  await page.getByText('Mi reflexion de hoy', { exact: true }).waitFor();
  assert.equal(await page.getByRole('article').count(), 2);
  failFeed = true;
  await page.getByRole('button', { name: 'Actualizar publicaciones' }).click();
  await page.getByRole('alert').waitFor();
  failFeed = false;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.getByText('Mi reflexion de hoy', { exact: true }).waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  profile.avatar_url = null;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForResponse(response => response.url().includes('/profiles?') && response.request().method() === 'PATCH');
  assert.equal(profile.avatar_url, '/avatars/hombre.webp', 'first authenticated visit synchronizes selected avatar');
  await page.getByRole('article').first().waitFor();
  assert.equal(await page.getByRole('article').first().evaluate(el => getComputedStyle(el).transform), 'none');
  await context.close();
  console.log('Checking registration');

  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mock(guest);
  const register = await guest.newPage();
  register.setDefaultTimeout(15000);
  register.on('pageerror', error => pageErrors.push(error.message));
  await register.goto(`${baseURL}/register`, { waitUntil: 'domcontentloaded' });
  await register.getByLabel('Mujer', { exact: true }).check();
  await register.getByLabel('Nombre completo').fill('Ana Test');
  await register.getByLabel('Iglesia', { exact: true }).fill('Central');
  await register.getByRole('button', { name: 'Continuar', exact: true }).click();
  await register.getByLabel('Correo electrónico').fill('test@example.invalid');
  await register.getByLabel('Contraseña', { exact: true }).fill('test-password-123');
  await register.getByLabel('Confirmar contraseña', { exact: true }).fill('test-password-123');
  await register.screenshot({ path: `${output}/register-avatar-mobile.png`, fullPage: true });
  const priorWrites = profileWrites.length;
  await register.getByRole('button', { name: 'Crear cuenta' }).click();
  await register.getByRole('status').filter({ hasText: 'Revisa tu correo' }).waitFor();
  assert.equal(signups[0].data.gender, 'mujer');
  assert.equal(signups[0].data.avatar_url, '/avatars/mujer.webp');
  assert.equal(profileWrites.length, priorWrites, 'no anonymous profile write before email confirmation');
  await register.goto(`${baseURL}/feed`, { waitUntil: 'domcontentloaded' });
  await register.getByRole('article').first().waitFor();
  await register.getByRole('article').first().getByRole('button', { name: 'Me gusta', exact: true }).click();
  await register.waitForURL('**/login');
  await guest.close();
  assert.deepEqual(pageErrors, []);
  console.log('PASS: 7 responsive layouts, local Jakarta font, reduced motion, double-tap reactions, author/category filters, notifications, comments, draft retry, signup and guest login.');
} finally { await browser.close(); }

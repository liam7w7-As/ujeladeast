import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.GOOGLE_AUTH_TEST_URL || 'http://127.0.0.1:5178';
const output = 'test-results/google-auth';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const id = '00000000-0000-0000-0000-000000000001';
const original = { id, full_name: 'Ana Test', church_name: 'JM Central', avatar_url: '/avatars/mujer.webp', role: 'admin' };
const makeUser = google => ({ id, aud: 'authenticated', role: 'authenticated', email: 'ana@example.invalid', email_confirmed_at: new Date().toISOString(),
  user_metadata: { full_name: 'Ana Google', avatar_url: 'https://lh3.googleusercontent.com/test' }, app_metadata: { provider: google ? 'google' : 'email', providers: google ? ['email', 'google'] : ['email'] },
  identities: google ? [{ id: 'google-identity', provider: 'google', user_id: id }] : [{ id: 'email-identity', provider: 'email', user_id: id }],
});
const session = user => ({ access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user });
const errors = [];
const contexts = [];

async function setup({ authenticated = false, google = false, profile = original, provider = true, failProfile = false, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
  contexts.push(context);
  const state = { user: makeUser(google), profile: profile && { ...profile }, provider, failProfile, writes: [], oauth: [], signup: [], failSave: false, linkError: false, cancel: false, autoConfirm: false };
  if (authenticated) await context.addInitScript(session => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(session)), session(state.user));
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  await context.route('https://lh3.googleusercontent.com/**', route => route.abort());
  await context.route('https://placeholder.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    let body = [], status = 200;
    if (path.endsWith('/settings')) body = { external: { google: state.provider } };
    else if (path.endsWith('/user/identities/authorize')) {
      state.oauth.push({ type: 'link', url: url.href });
      if (state.linkError) { status = 422; body = { code: 'identity_already_exists', msg: 'Already linked' }; }
      else body = { url: `https://placeholder.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${base}/auth/callback`)}` };
    } else if (path.endsWith('/authorize')) {
      state.oauth.push({ type: 'signin', url: url.href });
      if (!state.cancel) state.user = makeUser(true);
      const hash = state.cancel ? 'error=access_denied' : `access_token=test-access-token&refresh_token=test-refresh-token&expires_in=3600&token_type=bearer`;
      await route.fulfill({ status: 302, headers: { location: `${base}/auth/callback#${hash}` }, body: '' });
      return;
    } else if (path.endsWith('/user')) body = state.user;
    else if (path.endsWith('/token')) {
      if (request.postDataJSON()?.password === 'wrong-password') { status = 400; body = { code: 'invalid_credentials', msg: 'Invalid login credentials' }; }
      else body = session(state.user);
    } else if (path.endsWith('/signup')) {
      state.signup.push(request.postDataJSON());
      state.user = { ...state.user, user_metadata: request.postDataJSON().data };
      body = state.autoConfirm ? session(state.user) : { ...state.user, identities: [] };
    } else if (path.endsWith('/profiles')) {
      if (state.failProfile) { status = 503; body = { message: 'Offline profile' }; }
      else if (request.method() === 'POST') {
        state.writes.push({ method: 'POST', values: request.postDataJSON() });
        if (!state.profile) state.profile = { role: 'user', ...request.postDataJSON() };
        body = state.profile;
      } else if (request.method() === 'PATCH') {
        if (state.failSave) { status = 503; body = { message: 'Save failed' }; }
        else {
          state.writes.push({ method: 'PATCH', values: request.postDataJSON() });
          Object.assign(state.profile, request.postDataJSON()); body = state.profile;
        }
      } else body = state.profile;
    }
    await route.fulfill({ status, contentType: 'application/json', headers: { 'X-Supabase-Api-Version': '2024-01-01', 'Access-Control-Expose-Headers': 'X-Supabase-Api-Version' }, body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  return { page, state, context };
}

async function layout(page, name, selector = '.auth-content') {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('.auth-main').scrollTop = 0; });
    await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} img`)].every(image => image.complete && image.naturalWidth > 0), selector);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: overflow ${width}`);
    assert.equal(await page.locator(`${selector} img`).evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true, `${name}: assets render ${width}`);
    if (await page.locator('.auth-story').count()) {
      await page.waitForFunction(() => [...document.querySelectorAll('.auth-story img')].every(image => image.complete && image.naturalWidth > 0));
      assert.equal(await page.locator('.auth-story').count(), 1);
    }
    if (width < 1280) assert.equal((await page.locator('.mobile-app-header').boundingBox()).y, 0, `${name}: header stays at viewport top`);
    await page.waitForFunction(() => [...document.querySelectorAll('.auth-content, .auth-story, .auth-story h2, .auth-story-kicker, .auth-story-media')].every(element => Number(getComputedStyle(element).opacity) === 1));
    if (name === 'login-clean' && width === 390) {
      const submit = await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).boundingBox();
      const main = await page.locator('.auth-main').boundingBox();
      assert.ok(submit.y + submit.height <= main.y + main.height - 4, 'the login button is completely visible on a typical phone without scrolling');
    }
    await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

try {
  const startup = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  contexts.push(startup);
  const bootPage = await startup.newPage();
  await bootPage.goto(`${base}/login`);
  assert.equal(await bootPage.locator('meta[name="theme-color"]').getAttribute('content'), '#8f1937');
  assert.equal(await bootPage.locator('#root').evaluate(root => getComputedStyle(root).backgroundColor), 'rgb(143, 25, 55)');
  const startupImage = await bootPage.screenshot({ path: `${output}/startup-guinda.png` });
  const { data: startupPixels, info: startupInfo } = await sharp(startupImage).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([...startupPixels.subarray(0, 3)], [143, 25, 55], 'the first frame is burgundy, including its edges');
  assert.equal(startupInfo.width, 390);
  let logoPixels = 0;
  for (let i = 0; i < startupPixels.length; i += 3) if (startupPixels[i] > 220 && startupPixels[i + 1] > 220 && startupPixels[i + 2] > 220) logoPixels++;
  assert.ok(logoPixels > 200, 'the real startup logo is visible');

  const quiet = await setup({ reducedMotion: 'reduce' });
  await quiet.page.goto(`${base}/register`);
  await quiet.page.getByRole('radio', { name: 'Personaje 2', exact: true }).check();
  assert.equal(await quiet.page.locator('.auth-field').first().evaluate(field => getComputedStyle(field).animationName), 'none');
  assert.equal(await quiet.page.locator('.auth-story h2 span').evaluate(span => getComputedStyle(span, '::after').animationName), 'none');
  await quiet.page.locator('.auth-avatar-portrait img').waitFor();
  assert.match(await quiet.page.locator('.auth-avatar-portrait img').getAttribute('src'), /personaje-2/);
  await quiet.page.screenshot({ path: `${output}/register-reduced-motion.png`, fullPage: true });

  const compact = await setup();
  await compact.page.setViewportSize({ width: 320, height: 568 });
  await compact.page.goto(`${base}/login`);
  await compact.page.getByLabel('Correo electrónico').fill('ana@example.invalid');
  await compact.page.getByLabel('Contraseña', { exact: true }).fill('valid-password');
  await compact.page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
  assert.equal(await compact.page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'text');
  await compact.page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
  assert.equal(await compact.page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'password');
  await compact.page.getByRole('button', { name: 'Iniciar sesión', exact: true }).scrollIntoViewIfNeeded();
  const compactButton = await compact.page.getByRole('button', { name: 'Iniciar sesión', exact: true }).boundingBox();
  const compactNavigation = await compact.page.getByRole('navigation', { name: 'Navegación móvil' }).boundingBox();
  const compactHeader = await compact.page.locator('.mobile-app-header').boundingBox();
  assert.ok(compactButton.y >= compactHeader.y + compactHeader.height && compactButton.y + compactButton.height <= compactNavigation.y, 'short-phone login controls remain reachable between the fixed bars');
  await compact.page.screenshot({ path: `${output}/login-compact.png`, fullPage: true });

  const privacy = await setup({ authenticated: true, google: true, profile: { ...original, church_name: '' } });
  await privacy.page.goto(`${base}/privacidad`);
  await privacy.page.getByRole('heading', { name: 'Política de privacidad', exact: true }).waitFor();
  assert.ok(privacy.page.url().endsWith('/privacidad'), 'an incomplete Google profile can still read privacy');
  assert.deepEqual(privacy.state.writes, []);

  const disabled = await setup({ provider: false });
  await disabled.page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await disabled.page.getByRole('button', { name: 'Continuar con Google' }).click();
  await disabled.page.getByRole('alert').filter({ hasText: 'todavía no está habilitado' }).waitFor();
  assert.equal(disabled.state.oauth.length, 0);
  await layout(disabled.page, 'login');
  await disabled.page.getByLabel('Correo electrónico').fill('ana@example.invalid');
  await disabled.page.getByLabel('Contraseña', { exact: true }).fill('wrong-password');
  await disabled.page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await disabled.page.getByRole('alert').filter({ hasText: 'no son correctos' }).waitFor();
  await disabled.page.getByLabel('Contraseña', { exact: true }).fill('valid-password');
  await disabled.page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await disabled.page.waitForURL('**/feed');
  assert.deepEqual(disabled.state.writes, []);

  const existing = await setup();
  await existing.page.goto(`${base}/login`);
  await layout(existing.page, 'login-clean');
  await existing.page.getByRole('button', { name: 'Continuar con Google' }).click();
  await existing.page.waitForURL('**/feed');
  assert.deepEqual(existing.state.writes, [], 'same-email existing account is not rewritten');
  const authorize = new URL(existing.state.oauth[0].url);
  assert.equal(authorize.searchParams.get('redirect_to'), `${base}/auth/callback`);
  assert.equal(authorize.searchParams.get('prompt'), 'select_account');
  await existing.page.goto(`${base}/cuenta`);
  await existing.page.getByText('Google vinculado', { exact: true }).waitFor();
  assert.equal(await existing.page.getByLabel('Nombre completo').inputValue(), original.full_name);

  const fresh = await setup({ profile: null });
  await fresh.page.goto(`${base}/register`);
  await fresh.page.getByRole('button', { name: 'Continuar con Google' }).click();
  await fresh.page.waitForURL('**/completar-perfil');
  await fresh.page.getByRole('radio', { name: 'Personaje 1', exact: true }).check();
  await fresh.page.getByLabel('Iglesia', { exact: true }).fill('JM El Tabernaculo');
  assert.equal(await fresh.page.getByLabel('Nombre completo').inputValue(), 'Ana Google');
  await layout(fresh.page, 'onboarding');
  await fresh.page.getByRole('button', { name: 'Entrar a la comunidad' }).click();
  await fresh.page.waitForURL('**/feed');
  assert.equal(fresh.state.profile.role, 'user');
  assert.equal(fresh.state.profile.id, id);
  assert.equal(fresh.state.profile.avatar_url, '/avatars/personaje-1-v1.webp');
  assert.deepEqual(Object.keys(fresh.state.writes.find(write => write.method === 'PATCH').values).sort(), ['avatar_url', 'church_name', 'full_name']);
  await fresh.page.reload();
  await fresh.page.getByRole('heading', { name: 'Comunidad.' }).waitFor();
  assert.ok(fresh.page.url().endsWith('/feed'));
  await fresh.page.getByRole('button', { name: 'Más opciones' }).click();
  await fresh.page.getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  await fresh.page.waitForURL('**/cuenta');
  assert.equal(await fresh.page.getByRole('radio', { name: 'Personaje 1', exact: true }).isChecked(), true);

  const account = await setup({ authenticated: true });
  await account.page.goto(`${base}/cuenta`);
  await account.page.getByRole('button', { name: 'Vincular Google' }).waitFor();
  await layout(account.page, 'account');
  assert.equal(await account.page.getByRole('button', { name: 'Guardar cambios' }).isDisabled(), true);
  await account.page.getByRole('radio', { name: 'Personaje 4', exact: true }).check();
  assert.equal(await account.page.getByRole('button', { name: 'Vincular Google' }).isDisabled(), true, 'save before leaving to link');
  account.state.failSave = true;
  await account.page.getByRole('button', { name: 'Guardar cambios' }).click();
  await account.page.getByRole('button', { name: 'Guardar cambios' }).scrollIntoViewIfNeeded();
  const saveBounds = await account.page.getByRole('button', { name: 'Guardar cambios' }).boundingBox();
  const navigationBounds = await account.page.getByRole('navigation', { name: 'Navegación móvil' }).boundingBox();
  assert.ok(saveBounds.y + saveBounds.height <= navigationBounds.y, 'focused account controls stay above the bottom navigation');
  await account.page.getByRole('alert').filter({ hasText: 'Tus cambios siguen aquí' }).waitFor();
  assert.equal(await account.page.getByRole('radio', { name: 'Personaje 4', exact: true }).isChecked(), true);
  account.state.failSave = false;
  await account.page.getByRole('button', { name: 'Guardar cambios' }).click();
  await account.page.getByRole('status').filter({ hasText: 'Perfil actualizado' }).waitFor();
  assert.equal(account.state.profile.role, 'admin');
  assert.equal(account.state.profile.id, id);
  account.state.linkError = true;
  await account.page.getByRole('button', { name: 'Vincular Google' }).click();
  await account.page.getByRole('alert').waitFor();
  assert.match(await account.page.getByRole('alert').innerText(), /ya está vinculada a otra cuenta/);
  account.state.linkError = false;
  await account.page.getByRole('button', { name: 'Vincular Google' }).click();
  await account.page.waitForURL('**/cuenta');
  await account.page.getByText('Google vinculado', { exact: true }).waitFor();
  assert.equal(account.state.profile.role, 'admin');
  assert.equal(account.state.oauth[0].type, 'link');

  const cancel = await setup();
  cancel.state.cancel = true;
  await cancel.page.goto(`${base}/login`);
  await cancel.page.getByRole('button', { name: 'Continuar con Google' }).click();
  await cancel.page.getByRole('alert').filter({ hasText: 'Cancelaste el acceso' }).waitFor();
  assert.ok(cancel.page.url().endsWith('/login'));
  await cancel.context.setOffline(true);
  await cancel.page.getByRole('button', { name: 'Continuar con Google' }).click();
  await cancel.page.getByRole('alert').filter({ hasText: 'Necesitas conexión a internet' }).waitFor();
  await cancel.context.setOffline(false);

  const cancelLink = await setup({ authenticated: true });
  cancelLink.state.cancel = true;
  await cancelLink.page.goto(`${base}/cuenta`);
  await cancelLink.page.getByRole('button', { name: 'Vincular Google' }).click();
  await cancelLink.page.getByRole('alert').filter({ hasText: 'Cancelaste el acceso' }).waitFor();
  await cancelLink.page.getByRole('button', { name: 'Vincular Google' }).waitFor();
  assert.equal(await cancelLink.page.evaluate(() => JSON.parse(localStorage.getItem('sb-placeholder-auth-token')).user.id), id);
  assert.deepEqual(cancelLink.state.writes, [], 'cancelled linking leaves the original account and profile intact');

  const failed = await setup({ authenticated: true, google: true, failProfile: true });
  await failed.page.goto(`${base}/cuenta`);
  await failed.page.getByRole('alert').filter({ hasText: 'No pudimos cargar tu perfil' }).waitFor();
  assert.equal(await failed.page.getByLabel('Nombre completo').count(), 0);
  assert.deepEqual(failed.state.writes, []);
  failed.state.failProfile = false;
  await failed.page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await failed.page.getByLabel('Nombre completo').waitFor();

  const signup = await setup();
  await signup.page.goto(`${base}/register`);
  await signup.page.getByRole('radio', { name: 'Personaje 7', exact: true }).check();
  await signup.page.getByLabel('Nombre completo').fill('Joven Nuevo');
  await signup.page.getByLabel('Iglesia', { exact: true }).fill('JM Central');
  await layout(signup.page, 'register');
  await signup.page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await signup.page.getByLabel('Correo electrónico').fill('nuevo@example.invalid');
  await signup.page.getByLabel('Contraseña', { exact: true }).fill('valid-password');
  await signup.page.getByLabel('Confirmar contraseña', { exact: true }).fill('valid-password');
  await signup.page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await signup.page.getByRole('status').filter({ hasText: 'Revisa tu correo' }).waitFor();
  assert.equal(signup.state.signup[0].data.avatar_id, 'personaje-7');
  assert.equal(signup.state.signup[0].data.avatar_url, '/avatars/personaje-7-v1.webp');
  assert.equal(signup.state.signup[0].data.gender, undefined);
  assert.deepEqual(signup.state.writes, []);

  const immediate = await setup({ profile: null, failProfile: true });
  immediate.state.autoConfirm = true;
  await immediate.page.goto(`${base}/register`);
  await immediate.page.getByRole('radio', { name: 'Mujer', exact: true }).check();
  await immediate.page.getByLabel('Nombre completo').fill('Nueva Cuenta');
  await immediate.page.getByLabel('Iglesia', { exact: true }).fill('JM Central');
  await immediate.page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await immediate.page.getByLabel('Correo electrónico').fill('nuevo@example.invalid');
  await immediate.page.getByLabel('Contraseña', { exact: true }).fill('valid-password');
  await immediate.page.getByLabel('Confirmar contraseña', { exact: true }).fill('valid-password');
  await immediate.page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await immediate.page.waitForURL('**/cuenta');
  await immediate.page.getByRole('alert').filter({ hasText: 'No pudimos cargar tu perfil' }).waitFor();
  assert.equal(immediate.state.signup.length, 1, 'a profile outage does not ask the user to create the same account again');
  immediate.state.failProfile = false;
  await immediate.page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await immediate.page.getByLabel('Nombre completo').waitFor();
  assert.equal(await immediate.page.getByLabel('Nombre completo').inputValue(), 'Nueva Cuenta');
  assert.equal(immediate.state.profile.avatar_url, '/avatars/mujer.webp');
  assert.deepEqual(errors, []);
  console.log('PASS: burgundy startup pixels and logo, reduced motion, compact-phone controls, password visibility, password login, OAuth callbacks and cancellation, existing account preservation, Google onboarding, avatar selection/save/retry, identity linking/conflict, profile failures and responsive screenshots. No production writes.');
} catch (error) {
  for (const context of contexts) for (const page of context.pages()) console.log('Failure context:', page.url(), await page.getByRole('alert').allTextContents());
  throw error;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}

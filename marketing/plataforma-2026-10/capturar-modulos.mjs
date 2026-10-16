import { createRequire } from 'node:module';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const output = resolve('marketing/plataforma-2026-10/fuentes');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const options = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce', serviceWorkers: 'block' };
let server;
try {
  const publicContext = await browser.newContext(options);
  const hymn = await publicContext.newPage();
  await hymn.goto('https://www.ujeladea.org/himnario', { waitUntil: 'domcontentloaded' });
  await hymn.getByRole('button', { name: /^Abrir himno/ }).first().waitFor();
  await hymn.evaluate(() => document.fonts.ready);
  await hymn.waitForFunction(() => [...document.querySelectorAll('article')].slice(0, 3).every(el => Number(getComputedStyle(el).opacity) > .99));
  await hymn.screenshot({ path: resolve(output, 'himnario-movil-real.png') });
  await publicContext.close();

  // Render the real local app with an isolated demo session. No database calls leave the browser.
  const root = resolve('dist');
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
      catch { if (extname(pathname)) { response.writeHead(404).end(); return; } file = resolve(root, 'index.html'); }
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(await readFile(file));
    } catch { response.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const demo = await browser.newContext(options);
  const id = '00000000-0000-0000-0000-000000000001';
  const user = { id, role: 'authenticated', aud: 'authenticated', email: 'demostracion@example.invalid', user_metadata: {} };
  const session = { access_token: 'demo-token', refresh_token: 'demo-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
  const lessons = Array.from({ length: 365 }, (_, index) => ({
    id: `lesson-${index + 1}`, week_id: `week-${Math.floor(index / 7) + 1}`, day_number: index % 7 + 1,
    title: index === 0 ? 'En el principio' : `Estudio ${index + 1}`, scripture_ref: 'G\u00e9nesis 1:1-3',
    scripture_text: '<p>En el principio cre\u00f3 Dios los cielos y la tierra.</p><p>Y la tierra estaba desordenada y vac\u00eda, y las tinieblas estaban sobre la faz del abismo, y el Esp\u00edritu de Dios se mov\u00eda sobre la faz de las aguas.</p><p>Y dijo Dios: Sea la luz; y fue la luz.</p>',
    teaching: '<p>Reconoce la obra de Dios y reflexiona sobre su Palabra.</p>',
    questions: [{ text: '\u00bfQu\u00e9 aprendes de Dios en este pasaje?', type: 'open' }, { text: '\u00bfC\u00f3mo lo aplicar\u00edas hoy?', type: 'open' }],
    study_weeks: { plan_id: 'demo-plan', week_number: Math.floor(index / 7) + 1 }, user_progress: [],
  }));
  await demo.addInitScript(value => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(value)), session);
  await demo.route('**/api/daily-bible-fact', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ title: 'La Palabra en tu vida', fact: 'Un momento para leer y reflexionar.', reference: 'G\u00e9nesis 1:1', question: '\u00bfQu\u00e9 aprendes hoy?' }) }));
  await demo.route('https://**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== 'placeholder.supabase.co') return route.abort();
    const table = url.pathname.split('/').at(-1);
    let body = [];
    if (table === 'user') body = user;
    else if (table === 'profiles') body = { id, full_name: 'Joven UJELADEA', church_name: 'Sociedad de demostraci\u00f3n', role: 'user', avatar_url: '/avatars/hombre.webp' };
    else if (table === 'get_study_status') body = { user_id: id, atomic: true, current_streak: 0, max_streak: 0, total_xp: 0, today_completed: false, last_study_date: null, recent_days: [] };
    else if (table === 'study_plans') body = { id: 'demo-plan', title: 'Estudio b\u00edblico de 365 d\u00edas' };
    else if (table === 'study_weeks') body = Array.from({ length: 53 }, (_, index) => ({ id: `week-${index + 1}`, week_number: index + 1, title: `Semana ${index + 1}` }));
    else if (table === 'study_lessons') {
      if (url.searchParams.has('id')) body = lessons.find(lesson => 'eq.' + lesson.id === url.searchParams.get('id'));
      else if (url.searchParams.has('week_id')) body = lessons.filter(lesson => 'eq.' + lesson.week_id === url.searchParams.get('week_id'));
      else { const from = Number(url.searchParams.get('offset') || 0); body = lessons.slice(from, from + 200); }
    } else if (request.headers().accept?.includes('object+json')) body = null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const study = await demo.newPage();
  await study.goto(`http://127.0.0.1:${server.address().port}/estudios`, { waitUntil: 'domcontentloaded' });
  await study.getByRole('button', { name: 'Continuar: d\u00eda 1 de 365', exact: true }).click({ timeout: 20000 });
  await study.getByRole('region', { name: 'Estudio por pasos' }).waitFor();
  await study.evaluate(() => document.fonts.ready);
  await study.waitForFunction(() => [...document.querySelectorAll('.study-step')].every(el => Number(getComputedStyle(el).opacity) > .99));
  await study.screenshot({ path: resolve(output, 'estudio-movil-demostracion.png') });
  console.log('Saved: real public hymnal; actual study interface with fictional isolated demo data. No production reads or writes for the study.');
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}

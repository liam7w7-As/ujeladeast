import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { createPublicSeoHandler } from '../server/publicSeo.js';
import { publicPages } from '../src/lib/siteContent.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const dist = resolve('dist');
const output = resolve('test-results/seo');
await mkdir(output, { recursive: true });
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const id = '00000000-0000-0000-0000-000000000001';
const post = { id, content: 'Compartimos la fe, la esperanza y el servicio.\n\nEsta publicaci\u00f3n de prueba no modifica Supabase.', created_at: '2026-10-13T15:00:00Z', profiles: { full_name: 'Comunidad de prueba' }, image_url: null, category: 'reflexion' };
let fail = false;
const handler = createPublicSeoHandler({
  env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_fixture' },
  getTemplate: () => readFile(resolve(dist, 'seo-template.html'), 'utf8'),
  fetcher: async url => {
    if (fail) throw new Error('Simulated outage');
    if (Number(url.searchParams.get('offset')) > 0) return new Response('[]');
    return new Response(JSON.stringify(url.searchParams.has('id') && url.searchParams.get('id') !== `eq.${id}` ? [] : [post]));
  },
});
const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.xml': 'application/xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.txt': 'text/plain', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/publicaciones/')) { req.query = { kind: 'post', id: url.pathname.split('/').pop() }; return await handler(req, res); }
    if (url.pathname === '/sitemap-publicaciones.xml') { req.query = { kind: 'sitemap' }; return await handler(req, res); }
    if (url.pathname === '/api/public-seo') { req.query = Object.fromEntries(url.searchParams); return await handler(req, res); }
    const destination = config.rewrites.find(rule => rule.source === url.pathname)?.destination || (url.pathname === '/' ? '/index.html' : url.pathname);
    const file = resolve(dist, '.' + destination);
    if (!file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const crawler = await browser.newContext({ javaScriptEnabled: false });
  const page = await crawler.newPage();
  for (const path of ['/', '/nosotros', '/estudio-biblico', `/publicaciones/${id}`]) {
    const response = await page.goto(base + path);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
    assert.equal(await page.locator('meta[name="description"]').count(), 1);
    assert.ok((await page.locator('main').innerText()).length > 100);
  }
  assert.ok((await page.locator('.publication-text').innerText()).includes('esperanza'));
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('https://**/*', route => route.abort());
  const app = await context.newPage();
  const errors = [];
  app.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 1440]) {
    await app.setViewportSize({ width, height: 900 });
    await app.goto(base + '/nosotros');
    await app.waitForSelector('.public-page');
    await app.getByRole('heading', { name: 'Qui\u00e9nes somos', exact: true }).waitFor();
    assert.equal(await app.title(), publicPages['/nosotros'].title);
    assert.equal(await app.locator('link[rel="canonical"]').count(), 1);
    assert.ok(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await app.locator('.institution-logo').evaluate(img => img.complete && img.naturalWidth > 0));
    await app.screenshot({ path: `${output}/nosotros-${width}.png`, fullPage: true });
    await app.goto(base + `/publicaciones/${id}`);
    await app.waitForSelector('.publication-actions');
    assert.ok((await app.locator('.publication-text').innerText()).includes('esperanza'));
    assert.equal(await app.locator('link[rel="canonical"]').count(), 1);
    assert.ok(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await app.screenshot({ path: `${output}/publicacion-${width}.png`, fullPage: true });
  }
  // Client navigation replaces metadata and obtains only the public record.
  await app.goto(base + '/nosotros');
  await app.waitForSelector('.public-page');
  await app.evaluate(id => { history.pushState(null, '', `/publicaciones/${id}`); dispatchEvent(new PopStateEvent('popstate')); }, id);
  await app.waitForSelector('.publication-actions');
  assert.equal(await app.locator('link[rel="canonical"]').getAttribute('href'), `https://www.ujeladea.org/publicaciones/${id}`);
  await app.evaluate(() => { history.pushState(null, '', '/login'); dispatchEvent(new PopStateEvent('popstate')); });
  await app.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
  assert.equal(await app.locator('link[rel="canonical"]').count(), 0);
  assert.equal(await app.locator('meta[property="og:title"]').count(), 0);
  const missing = await page.goto(base + '/publicaciones/00000000-0000-0000-0000-000000000000');
  assert.equal(missing.status(), 404);
  fail = true;
  const outage = await page.goto(base + `/publicaciones/${id}`);
  assert.equal(outage.status(), 503);
  assert.equal(outage.headers()['retry-after'], '60');
  assert.deepEqual(errors, []);
  console.log('PASS: no-JS institutional and post HTML; mobile/desktop screenshots; SPA metadata cleanup; anonymous post navigation; 404/503; no runtime errors.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }

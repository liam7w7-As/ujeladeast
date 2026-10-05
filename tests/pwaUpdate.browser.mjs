import { createRequire } from 'node:module';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const output = resolve('test-results/pwa-update');
await mkdir(output, { recursive: true });
for (const version of ['A', 'B']) {
  const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', `${output}/${version}`], {
    env: { ...process.env, VERCEL_GIT_COMMIT_SHA: `pwa-test-${version}` }, encoding: 'utf8',
  });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  console.log(`Built ${version}`);
}
let active = 'A';
const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const root = resolve(output, active);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
    catch {
      if (extname(pathname)) { response.writeHead(404).end(); return; }
      file = resolve(root, 'index.html');
    }
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/biblia');
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  assert.equal(await page.getByRole('dialog', { name: 'Nueva versión disponible' }).count(), 0, 'No update popup on first installation');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.appBuild), 'pwa-test-A');
  await page.evaluate(async () => {
    localStorage.setItem('ujeladea:study-draft:v1:test:lesson', 'draft stays');
    localStorage.setItem('pwa-test-favorite', 'Juan 3:16');
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('pwa-test-downloads', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('books');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').put('offline chapter', 'GEN');
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    });
    const cache = await caches.open('hymnal-data-cache');
    await cache.put('/data/test-hymn.json', new Response('{"preserved":true}'));
  });
  const other = await context.newPage();
  await other.goto(base + '/');
  await other.waitForFunction(() => document.documentElement.dataset.appBuild === 'pwa-test-A');
  active = 'B';
  await page.bringToFront();
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  const popup = page.getByRole('dialog', { name: 'Nueva versión disponible' });
  await popup.waitFor({ timeout: 30_000 });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    const box = await popup.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width, `Popup fits ${width}`);
    assert.ok(await popup.evaluate(el => el.scrollWidth <= el.clientWidth), `No internal overflow ${width}`);
    await page.screenshot({ path: `${output}/popup-${width}.png` });
  }
  await popup.getByRole('button', { name: 'Más tarde', exact: true }).click();
  assert.equal(await popup.count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.appBuild), 'pwa-test-A', 'Later does not reload');
  await page.reload();
  await popup.waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.appBuild), 'pwa-test-A', 'Old worker remains active until accepted');
  await page.evaluate(() => {
    window.testBlockUpdate = event => { event.preventDefault(); event.detail.reason = 'Guardando estudio de prueba.'; };
    window.addEventListener('ujeladea:before-update', window.testBlockUpdate);
  });
  await popup.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await popup.getByRole('alert').filter({ hasText: 'Guardando estudio de prueba.' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.appBuild), 'pwa-test-A');
  await page.evaluate(() => window.removeEventListener('ujeladea:before-update', window.testBlockUpdate));
  await context.setOffline(true);
  await popup.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.appBuild === 'pwa-test-B', { timeout: 30_000 });
  assert.equal(await popup.count(), 0);
  assert.equal(await other.evaluate(() => document.documentElement.dataset.appBuild), 'pwa-test-A', 'Another tab must not reload without consent');
  const otherPopup = other.getByRole('dialog', { name: 'Nueva versión disponible' });
  await otherPopup.waitFor();
  await otherPopup.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await other.waitForFunction(() => document.documentElement.dataset.appBuild === 'pwa-test-B');
  const stored = await page.evaluate(async () => {
    const book = await new Promise(resolve => {
      const request = indexedDB.open('pwa-test-downloads', 1);
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction('books').objectStore('books').get('GEN');
        read.onsuccess = () => { db.close(); resolve(read.result); };
      };
    });
    return [localStorage.getItem('ujeladea:study-draft:v1:test:lesson'), localStorage.getItem('pwa-test-favorite'), book, await (await caches.match('/data/test-hymn.json')).json()];
  });
  assert.deepEqual(stored, ['draft stays', 'Juan 3:16', 'offline chapter', { preserved: true }]);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.appBuild === 'pwa-test-B');
  assert.equal(await popup.count(), 0, 'No false update prompt offline');
  await context.close();
  assert.deepEqual(errors, []);
  console.log('PASS: real A -> B worker update, responsive popup above Bible, later, save guard, multi-tab consent, localStorage/IndexedDB/hymn cache preserved, offline activation and reload.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

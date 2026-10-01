import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BIBLE_TEST_URL || 'http://127.0.0.1:5181';
const output = process.env.BIBLE_TEST_OUTPUT || 'test-results/bible';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [], requested = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  context.on('request', request => { if (request.url().includes('/bibles/')) requested.push(request.url()); });
  await page.goto(`${base}/biblia`);
  await page.locator('.bible-verse').first().waitFor();
  assert.ok(!requested.some(url => /\/RVR1960-[a-f0-9]+\.json/.test(url)), 'Must not download whole Bible on first visit');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    if (width < 1280) {
      const nav = page.getByRole('navigation', { name: 'Navegación móvil' });
      assert.equal(await nav.getByRole('link', { name: 'Biblia', exact: true }).count(), 1);
      const sizes = await nav.locator('a, button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
      assert.ok(sizes.every(size => size >= 44));
    }
    await page.screenshot({ path: `${output}/reader-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Versión de la Biblia').selectOption('NTV');
  await page.locator('.bible-chapter').getByText('El relato de la creación', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ver nota', exact: true }).first().click();
  const note = page.getByRole('dialog');
  assert.match(await note.innerText(), /cuando Dios/);
  await note.getByLabel('Cerrar ventana').click();
  await page.getByLabel('Ajustes de lectura').click();
  await page.getByLabel('Aumentar texto').click();
  await page.getByLabel('Tema claro').click();
  await page.getByRole('dialog').getByLabel('Cerrar ventana').click();
  assert.equal(await page.locator('.bible-chapter').evaluate(element => getComputedStyle(element).fontSize), '20px');
  await page.screenshot({ path: `${output}/reader-light.png` });
  await page.getByLabel('Elegir libro y capítulo').click();
  const picker = page.getByRole('dialog');
  await picker.getByLabel('Filtrar libros').fill('juan');
  await picker.locator('.bible-book-list button').filter({ has: page.getByText('Juan', { exact: true }) }).click();
  await picker.getByRole('button', { name: 'Juan 3', exact: true }).click();
  await page.locator('.bible-verse').first().waitFor();
  await page.getByLabel('Guardar capítulo').click();
  await page.getByLabel('Marcadores', { exact: true }).click();
  await page.getByRole('tab', { name: /Capítulos/ }).click();
  assert.match(await page.getByRole('dialog').innerText(), /Juan 3/);
  await page.getByRole('dialog').getByLabel('Cerrar ventana').click();
  await page.getByLabel('Descargas', { exact: true }).click();
  await page.getByLabel('Descargar NTV', { exact: true }).click();
  const ntv = page.locator('.bible-download-row').filter({ has: page.getByText('NTV', { exact: true }) });
  await ntv.getByText('Disponible sin conexión').waitFor({ timeout: 60000 });
  await page.screenshot({ path: `${output}/downloads.png` });
  await page.getByRole('dialog').getByLabel('Cerrar ventana').click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.locator('.bible-verse').first().waitFor();
  assert.equal(await page.locator('.bible-theme-light').count(), 1);
  await context.setOffline(true);
  await page.goto(`${base}/biblia?version=NTV&book=REV&chapter=22`);
  await page.locator('.bible-verse').first().waitFor();
  assert.match(await page.locator('.bible-chapter').innerText(), /Apocalipsis 22/);
  assert.equal(await page.getByRole('button', { name: 'Siguiente', exact: true }).isDisabled(), true);
  await page.screenshot({ path: `${output}/offline.png` });
  await page.getByLabel('Versión de la Biblia').selectOption('TLA');
  await page.getByRole('heading', { name: 'No pudimos abrir este capítulo' }).waitFor();
  await page.getByLabel('Versión de la Biblia').selectOption('NTV');
  await page.locator('.bible-verse').first().waitFor();
  await page.getByLabel('Descargas', { exact: true }).click();
  await page.getByLabel('Eliminar descarga de NTV').click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByLabel('Descargar NTV', { exact: true }).waitFor();
  await page.getByRole('dialog').getByLabel('Cerrar ventana').click();
  await page.reload();
  await page.getByRole('heading', { name: 'No pudimos abrir este capítulo' }).waitFor();
  await page.getByLabel('Marcadores', { exact: true }).click();
  await page.getByRole('tab', { name: /Capítulos/ }).click();
  assert.match(await page.getByRole('dialog').innerText(), /Juan 3/);
  await page.getByRole('dialog').getByLabel('Cerrar ventana').click();
  await context.setOffline(false);
  await page.locator('.bible-verse').first().waitFor();
  // Reject a corrupt but valid JSON response before making it available offline.
  await context.route(/\/bibles\/NVI-[a-f0-9]+\.json\.gz$/, route => route.fulfill({ status: 200, body: '{}', contentType: 'application/json' }));
  await page.getByLabel('Descargas', { exact: true }).click();
  await page.getByLabel('Descargar NVI', { exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'incompleta o dañada' }).waitFor();
  assert.equal(await page.getByLabel('Eliminar descarga de NVI').count(), 0);
  // Cancel before completion, then retry with an intact package.
  const delayed = /\/bibles\/RVR1960-[a-f0-9]+\.json\.gz$/;
  await context.route(delayed, async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.abort().catch(() => {}); });
  await page.getByLabel('Descargar RVR1960', { exact: true }).click();
  await page.getByLabel('Cancelar descarga de RVR1960').click();
  await page.getByLabel('Descargar RVR1960', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Eliminar descarga de RVR1960').count(), 0);
  await context.unroute(delayed);
  await page.getByLabel('Descargar RVR1960', { exact: true }).click();
  await page.getByLabel('Eliminar descarga de RVR1960').waitFor({ timeout: 60000 });
  await page.getByRole('dialog').getByLabel('Cerrar ventana').click();
  for (const [version, book, chapter] of [['NTV', 'NUM', 1], ['NVI', 'PSA', 119], ['TLA', 'NEH', 12]]) {
    await page.goto(`${base}/biblia?version=${version}&book=${book}&chapter=${chapter}`);
    await page.locator('.bible-verse').first().waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${version} formatted chapter overflow`);
    if (book !== 'PSA') assert.ok(await page.locator('.bible-table-scroll').count() > 0);
    await page.screenshot({ path: `${output}/${version}-${book}-${chapter}.png` });
  }
  const quotaContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await quotaContext.route('https://**/*', route => route.abort());
  await quotaContext.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    let writes = 0;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'books' && ++writes === 3) throw new DOMException('Test quota', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  const quotaPage = await quotaContext.newPage();
  await quotaPage.goto(`${base}/biblia`);
  await quotaPage.locator('.bible-verse').first().waitFor();
  await quotaPage.getByLabel('Descargas', { exact: true }).click();
  await quotaPage.getByLabel('Descargar TLA', { exact: true }).click();
  await quotaPage.getByRole('alert').filter({ hasText: 'No hay espacio suficiente' }).waitFor();
  const counts = await quotaPage.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('ujeladea-bible'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const tx = db.transaction(['books', 'versions']);
    return Promise.all(['books', 'versions'].map(name => new Promise(resolve => { const r = tx.objectStore(name).count(); r.onsuccess = () => resolve(r.result); })));
  });
  assert.deepEqual(counts, [0, 0], 'Failed transaction must roll back partial books and availability marker');
  await quotaContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS: responsive reader, versions, notes, settings, bookmarks, verified download, offline cold reload, removal, corrupted download, cancellation, retry, formatted tables/poetry and atomic quota rollback.');
  await context.close();
} finally { await browser.close(); }

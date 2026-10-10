import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BIBLE_TEST_URL || 'http://127.0.0.1:5177';
const output = 'test-results/bible-sharing';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/biblia?version=RVR1960&book=PSA&chapter=23`);
  const verse = page.getByLabel('Opciones del versículo PSA.23.1', { exact: true });
  await verse.waitFor();
  await page.getByLabel('Ajustes de lectura').click();
  await page.getByLabel('Fuente de lectura', { exact: true }).selectOption('classic');
  await page.getByLabel('Tamaño del texto', { exact: true }).fill('24');
  await page.screenshot({ path: `${output}/settings-mobile.png` });
  await page.getByLabel('Cerrar ventana').click();
  assert.ok((await page.locator('article').evaluate(el => getComputedStyle(el).fontFamily)).includes('Georgia'));
  assert.equal(await page.locator('article').evaluate(el => getComputedStyle(el).fontSize), '24px');
  await page.reload();
  await verse.waitFor();
  assert.ok((await page.locator('article').evaluate(el => getComputedStyle(el).fontFamily)).includes('Georgia'));
  assert.equal(await page.locator('article').evaluate(el => getComputedStyle(el).fontSize), '24px');
  await page.getByLabel('Comparar versiones', { exact: true }).click();
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await page.getByRole('region', { name: 'Lectura NVI', exact: true }).locator('.bible-verse-start').first().waitFor();
  assert.ok((await page.locator('.bible-compare-scroll').evaluateAll(els => els.map(el => getComputedStyle(el).fontFamily))).every(font => font.includes('Georgia')));
  await page.locator('.bible-compare-scroll').first().evaluate(el => {
    const anchor = el.querySelector('[data-reference="PSA.23.4"].bible-verse-start');
    el.scrollTop += anchor.getBoundingClientRect().top - el.getBoundingClientRect().top + 6;
  });
  const assertVerseAligned = () => page.waitForFunction(() => [...document.querySelectorAll('.bible-compare-scroll')].every(el => {
    const anchors = [...el.querySelectorAll('.bible-verse-start')];
    return anchors.filter(a => a.getBoundingClientRect().top <= el.getBoundingClientRect().top + 1).at(-1)?.dataset.reference === 'PSA.23.4';
  }));
  await assertVerseAligned();
  await page.getByLabel('Ajustes de lectura').click();
  await page.getByLabel('Fuente de lectura', { exact: true }).selectOption('system');
  await page.getByLabel('Tamaño del texto', { exact: true }).fill('32');
  assert.equal(await page.getByLabel('Aumentar texto', { exact: true }).isDisabled(), true);
  await page.getByLabel('Cerrar ventana').click();
  assert.ok((await page.locator('.bible-compare-scroll').evaluateAll(els => els.map(el => getComputedStyle(el).fontSize))).every(size => size === '32px'));
  await assertVerseAligned();
  await page.setViewportSize({ width: 1440, height: 900 });
  await assertVerseAligned();
  await page.setViewportSize({ width: 390, height: 844 });
  await assertVerseAligned();
  await page.getByRole('region', { name: 'Lectura NVI', exact: true }).getByLabel('Opciones del versículo PSA.23.1', { exact: true }).click();
  await page.getByLabel('Compartir imagen', { exact: true }).click();
  await page.locator('.bible-share-preview img').waitFor();
  assert.ok((await page.locator('.bible-share-preview img').getAttribute('alt')).includes('(NVI)'));
  await page.getByLabel('Cerrar ventana').click();
  await page.getByLabel('Cerrar comparación', { exact: true }).click();
  await verse.click();
  await page.getByLabel('Guardar favorito', { exact: true }).click();
  await page.getByLabel('Compartir imagen', { exact: true }).click();
  const preview = page.locator('.bible-share-preview img');
  await preview.waitFor();
  await page.getByLabel('Fuente de la imagen').selectOption('classic');
  await preview.waitFor();
  await page.screenshot({ path: `${output}/share-mobile.png` });
  for (const [label, height, theme] of [['4:5', 1350, 'Granate'], ['1:1', 1080, 'Papel'], ['9:16', 1920, 'Noche']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByLabel(`Diseño ${theme}`).click();
    await preview.waitFor();
    await page.waitForFunction(height => document.querySelector('.bible-share-preview img')?.naturalHeight === height, height);
    const pixels = await preview.evaluate(img => {
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const bg = [...ctx.getImageData(0, 0, 1, 1).data];
      const area = ctx.getImageData(104, 310, 872, img.naturalHeight - 565).data;
      let changed = 0;
      for (let i = 0; i < area.length; i += 4) if (area[i] !== bg[0] || area[i + 1] !== bg[1] || area[i + 2] !== bg[2]) changed++;
      return { bg, changed };
    });
    assert.ok(pixels.changed > 1000, `${label}: text renders nonblank`);
    assert.deepEqual(pixels.bg, theme === 'Granate' ? [120, 29, 57, 255] : theme === 'Papel' ? [242, 245, 241, 255] : [23, 25, 30, 255]);
    const promise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar imagen', exact: true }).click();
    const download = await promise;
    assert.ok(download.suggestedFilename().includes('PSA-23-1-RVR1960'));
    const path = `${output}/${download.suggestedFilename()}`;
    await download.saveAs(path);
    const png = await readFile(path);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1080); assert.equal(png.readUInt32BE(20), height);
  }
  for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Descargar imagen', exact: true }).scrollIntoViewIfNeeded();
    const bounds = await page.getByRole('dialog').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.screenshot({ path: `${output}/share-${viewport.width}.png` });
  }
  await page.getByLabel('Diseño Granate').click();
  await page.getByLabel('Diseño Papel').click();
  await page.getByLabel('Diseño Granate').click();
  await preview.waitFor();
  await page.waitForFunction(() => document.querySelector('.bible-share-preview img')?.naturalWidth === 1080);
  await page.getByLabel('Cerrar ventana').click();
  await page.getByLabel('Cerrar selección', { exact: true }).click();
  await page.getByLabel('Marcadores', { exact: true }).click();
  await page.getByRole('button', { name: /^Compartir imagen .*23:1/ }).click();
  await preview.waitFor();
  await page.getByLabel('Cerrar ventana').click();
  await page.getByRole('dialog', { name: 'Marcadores', exact: true }).waitFor();
  await page.getByLabel('Cerrar ventana').click();
  await verse.click();
  // Prepared files keep native share within the user's click activation.
  await page.evaluate(() => {
    window.sharedFiles = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }) => files[0] instanceof File });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files, title }) => {
      window.sharedFiles.push({ name: files[0].name, type: files[0].type, size: files[0].size, title });
      if (window.cancelShare) throw new DOMException('Canceled', 'AbortError');
    } });
  });
  await page.getByLabel('Compartir imagen', { exact: true }).click();
  await preview.waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Compartir imagen', exact: true }).click();
  const shared = await page.evaluate(() => window.sharedFiles);
  assert.equal(shared[0].type, 'image/png'); assert.ok(shared[0].size > 10000); assert.ok(shared[0].title.includes('23:1'));
  await page.evaluate(() => { window.cancelShare = true; });
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.getByRole('dialog').getByRole('button', { name: 'Compartir imagen', exact: true }).click();
  assert.equal(await page.locator('.bible-share-notice').textContent(), '');
  assert.equal(downloads, 0, 'Cancel does not start an unsolicited download');
  await page.getByLabel('Cerrar ventana').click();
  if (process.env.BIBLE_PWA_TEST === '1') {
    await page.getByLabel('Descargas', { exact: true }).click();
    await page.getByLabel('Descargar RVR1960', { exact: true }).click();
    await page.getByLabel('Eliminar descarga de RVR1960', { exact: true }).waitFor({ timeout: 60000 });
    await page.getByLabel('Cerrar ventana').click();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await verse.waitFor();
  }
  await context.setOffline(true);
  if (process.env.BIBLE_PWA_TEST === '1') {
    await page.reload();
    await verse.waitFor();
    await verse.click();
    assert.equal(await page.getByLabel('Quitar de favoritos', { exact: true }).isVisible(), true);
    assert.ok((await page.locator('article').evaluate(el => getComputedStyle(el).fontFamily)).includes('system-ui'));
  }
  await page.getByLabel('Compartir imagen', { exact: true }).click();
  await preview.waitFor();
  await page.getByRole('button', { name: '1:1', exact: true }).click();
  await preview.waitFor();
  assert.equal(await preview.getAttribute('height'), '1080');
  assert.deepEqual(errors, []);
  console.log('PASS: persistent typography, comparison inheritance, mobile/desktop layouts, PNG dimensions/pixels, three designs, favorites, native share/cancel, offline rendering.');
} finally { await browser.close(); }

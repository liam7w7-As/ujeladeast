import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BIBLE_TEST_URL || 'http://127.0.0.1:5177';
const output = 'test-results/bible-photos';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/biblia?version=RVR1960&book=PSA&chapter=23`);
  await page.getByLabel('Opciones del versículo PSA.23.1', { exact: true }).click();
  await page.getByLabel('Compartir imagen', { exact: true }).click();
  const preview = page.locator('.bible-share-preview img');
  const ready = () => page.waitForFunction(() => document.querySelector('.bible-share-preview img')?.naturalWidth === 1080);
  await ready();
  assert.equal(await preview.getAttribute('height'), '1920');
  assert.equal(await page.getByLabel('Fondo Montañas').getAttribute('aria-pressed'), 'true');
  await page.getByLabel('Fuente de la imagen').selectOption('classic');
  await ready();
  await page.screenshot({ path: `${output}/photo-mobile.png` });
  for (const [name, id] of [['Montañas', 'mountains'], ['Bosque', 'forest'], ['Mar', 'sea']]) {
    await page.getByLabel(`Fondo ${name}`).click();
    await ready();
    for (const [format, height] of [['9:16', 1920], ['4:5', 1350], ['1:1', 1080]]) {
      await page.getByRole('button', { name: format, exact: true }).click();
      await ready();
      const pixels = await preview.evaluate(img => {
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        const colors = new Set();
        // Sample a text-free strip: a flat color fallback cannot pass this check.
        for (let y = 5; y < canvas.height; y += 8) {
          const data = ctx.getImageData(10, y, 1, 1).data;
          colors.add(`${data[0]},${data[1]},${data[2]}`);
          if (data[3] !== 255) throw new Error('Transparent export');
        }
        return { count: colors.size, width: canvas.width, height: canvas.height };
      });
      assert.ok(pixels.count > 60, `${id} ${format} includes a real photo`);
      assert.equal(pixels.height, height);
      if (format === '9:16') {
        const downloaded = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Descargar imagen', exact: true }).click();
        await (await downloaded).saveAs(`${output}/${id}-story.png`);
      }
    }
  }
  for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.getByLabel('Fondo Mar').scrollIntoViewIfNeeded();
    const bounds = await page.getByRole('dialog').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
    assert.ok(await page.locator('.bible-photo-options img').evaluateAll(images => images.every(img => img.naturalWidth > 0)));
    await page.screenshot({ path: `${output}/photos-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Descargar imagen', exact: true }).click();
  }
  if (process.env.BIBLE_PWA_TEST === '1') {
    await page.getByLabel('Cerrar ventana').click();
    await page.getByLabel('Descargas', { exact: true }).click();
    await page.getByLabel('Descargar RVR1960', { exact: true }).click();
    await page.getByLabel('Eliminar descarga de RVR1960', { exact: true }).waitFor({ timeout: 60000 });
    await page.getByLabel('Cerrar ventana').click();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.getByLabel('Opciones del versículo PSA.23.1', { exact: true }).waitFor();
    await context.setOffline(true);
    await page.reload();
    await page.getByLabel('Opciones del versículo PSA.23.1', { exact: true }).click();
    await page.getByLabel('Compartir imagen', { exact: true }).click();
    for (const name of ['Montañas', 'Bosque', 'Mar']) {
      await page.getByLabel(`Fondo ${name}`).click();
      await ready();
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Descargar imagen', exact: true }).click();
      await (await downloaded).saveAs(`${output}/offline-${name}.png`);
    }
  }
  const failureContext = await browser.newContext({ serviceWorkers: 'block' });
  let fail = true;
  await failureContext.route('https://**/*', route => route.abort());
  await failureContext.route('**/verse-backgrounds/mountains-v1.webp', route => fail ? route.abort() : route.continue());
  const failurePage = await failureContext.newPage();
  await failurePage.goto(`${base}/biblia?version=RVR1960&book=PSA&chapter=23`);
  await failurePage.getByLabel('Opciones del versículo PSA.23.1', { exact: true }).click();
  await failurePage.getByLabel('Compartir imagen', { exact: true }).click();
  await failurePage.getByRole('alert').waitFor();
  assert.equal(await failurePage.getByRole('button', { name: 'Descargar imagen', exact: true }).isDisabled(), true);
  fail = false;
  await failurePage.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await failurePage.locator('.bible-share-preview img').waitFor();
  assert.equal(await failurePage.getByRole('button', { name: 'Descargar imagen', exact: true }).isEnabled(), true);
  await failurePage.getByLabel('Diseño Papel').click();
  await failurePage.locator('.bible-share-preview img').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: three photographic backgrounds, nine crops, photo pixel checks, local thumbnails, mobile/desktop exports, recoverable background failure and optional cold offline PWA.');
} finally { await browser.close(); }

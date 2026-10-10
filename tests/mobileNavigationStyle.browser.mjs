import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.MOBILE_TEST_URL || 'http://127.0.0.1:5177';
const output = 'test-results/mobile-navigation-svg';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await context.route('https://**/*', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/feed');
  const bar = page.getByRole('navigation', { name: 'Navegación móvil' });
  await bar.waitFor();
  assert.equal(await bar.locator('.mobile-tab-icon > svg').count(), 6);
  const colors = await bar.locator('.mobile-tab-icon').evaluateAll(els => els.map(el => getComputedStyle(el).color));
  assert.equal(new Set(colors).size, 6);
  assert.equal(await bar.locator('[data-kind=community] svg path').first().evaluate(el => getComputedStyle(el).fill === 'none'), false);
  for (const [label, kind] of [['Inicio', 'home'], ['Himnario', 'music'], ['Estudios', 'study'], ['Comunidad', 'community']]) {
    await bar.getByRole('link', { name: label, exact: true }).click();
    const tab = bar.locator(`[data-kind=${kind}]`);
    await page.waitForFunction(kind => document.querySelector(`.mobile-tab[data-kind=${kind}]`)?.dataset.active === 'true', kind);
    assert.notEqual(await tab.locator('.mobile-tab-icon').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.waitForFunction(kind => !document.querySelector(`.mobile-tab[data-kind=${kind}] .mobile-tab-icon`).getAnimations().some(animation => animation.playState === 'running'), kind);
    assert.equal(await bar.locator('.mobile-tab-active').count(), 1);
    assert.equal(await tab.getAttribute('aria-current'), 'page');
  }
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const bounds = await bar.locator('.mobile-tab').evaluateAll(tabs => tabs.map(tab => {
      const rect = tab.getBoundingClientRect(); return { width: rect.width, height: rect.height, right: rect.right };
    }));
    assert.ok(bounds.every(rect => rect.width >= 44 && rect.height >= 44 && rect.right <= width));
    assert.ok(await bar.locator('.mobile-tab-label').evaluateAll(labels => labels.every(label => label.getBoundingClientRect().width <= label.parentElement.getBoundingClientRect().width)), `Labels fit at ${width}`);
    await page.screenshot({ path: `${output}/feed-${width}.png` });
    await bar.screenshot({ path: `${output}/bar-${width}.png` });
  }
  await bar.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await bar.locator('.mobile-tab-active').count(), 1);
  await page.getByLabel('Cerrar ventana').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await bar.getByRole('link', { name: 'Inicio', exact: true }).click();
  await page.waitForURL(base + '/');
  await page.waitForFunction(() => document.querySelector('.mobile-tab[data-kind=home]')?.dataset.active === 'true');
  assert.equal(await bar.locator('[data-kind=home] .mobile-tab-icon').evaluate(el => getComputedStyle(el).animationName), 'none');
  await bar.getByRole('link', { name: 'Biblia', exact: true }).click();
  await page.locator('.bible-immersive').waitFor();
  assert.equal(await bar.count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: six distinct duotone SVGs, animated active states, stable touch targets, reduced motion and fullscreen Bible.');
} finally { await browser.close(); }

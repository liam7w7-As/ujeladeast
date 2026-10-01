import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import process from 'node:process';
import { nodeText, versions } from '../src/lib/bibleModel.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BIBLE_TEST_URL || 'http://127.0.0.1:5181';
const output = 'test-results/bible-references';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [id, bookId, number] of [['RVR1960', 'MAT', 6], ['NVI', 'MAT', 6], ['TLA', 'MAT', 6], ['RVR1960', 'MAT', 26], ['NVI', 'MAT', 27]]) {
    const book = versions.find(version => version.id === id).books.find(book => book.id === bookId);
    const chapter = JSON.parse(gunzipSync(await readFile(new URL(`../public${book.url}`, import.meta.url)))).chapters[number - 1];
    const expected = [];
    function visit(node) {
      if (typeof node === 'string') return;
      if (node[1].split(/\s+/).some(value => ['r', 'sr', 'mr'].includes(value))) expected.push(nodeText(node).replace(/\s+/g, ' ').trim());
      else node[3].forEach(visit);
    }
    chapter.nodes.forEach(visit);
    await page.goto(`${base}/biblia?version=${id}&book=${bookId}&chapter=${number}`);
    await page.locator('.bible-verse-start').first().waitFor();
    assert.deepEqual(await page.locator('.bible-cross-references').allTextContents(), expected);
    assert.equal(await page.locator('.bible-chapter .bible-heading').count(), 0);
    assert.equal(await page.locator('.bible-cross-references .bible-verse-action').count(), 0);
    const target = page.locator('.bible-cross-references').last();
    await target.scrollIntoViewIfNeeded();
    const geometry = await target.evaluate(element => {
      const style = getComputedStyle(element);
      return { height: element.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight), border: style.borderBottomWidth, children: element.childElementCount };
    });
    if (number === 6) assert.ok(geometry.height <= geometry.lineHeight * 2 + 1, 'Reference should take at most two compact lines');
    assert.equal(geometry.children, 0, 'Source fragments should form one continuous text');
    assert.equal(geometry.border, '0px');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/${id}-${number}.png` });
  }
  await page.goto(`${base}/biblia?version=RVR1960&book=MAT&chapter=6`);
  await page.locator('.bible-verse-start').first().waitFor();
  await page.getByLabel('Comparar versiones', { exact: true }).click();
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  const nvi = page.getByRole('region', { name: 'Lectura NVI', exact: true });
  await nvi.locator('.bible-cross-references').first().waitFor();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await nvi.locator('.bible-cross-references').last().scrollIntoViewIfNeeded();
    assert.ok((await nvi.locator('.bible-cross-references').last().boundingBox()).height < 50);
    assert.equal(await page.locator('.bible-compare-scroll .bible-heading').count(), 0);
    await page.screenshot({ path: `${output}/comparison-${width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: source references preserved, compact unbroken rendering, no header style collision, long references wrap, mobile/desktop comparison.');
} finally { await browser.close(); }

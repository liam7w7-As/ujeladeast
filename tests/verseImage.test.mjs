import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { bibleFonts, readingFont, readingSize } from '../src/lib/bibleTypography.js';
import { coverSource, fitImageText, wrapImageText, verseImageFormats, verseImageName, verseImageThemes } from '../src/lib/verseImage.js';

test('Reading preferences use supported fonts and bounded sizes', () => {
  assert.equal(readingFont('unknown'), bibleFonts[0]);
  assert.equal(readingFont('classic').id, 'classic');
  assert.equal(readingSize(null), 19);
  assert.equal(readingSize('bad'), 19);
  assert.equal(readingSize(100), 32);
  assert.equal(readingSize(-1), 16);
  assert.equal(readingSize(20.8), 21);
});
test('Wrapping keeps every word, including accents and long unbroken words', () => {
  const text = 'Una lámpara para mis pies: extraordinariamente';
  const measure = value => Array.from(value).length;
  const lines = wrapImageText(text, measure, 10);
  assert.ok(lines.every(line => measure(line) <= 10));
  assert.equal(lines.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
  assert.deepEqual(wrapImageText('uno   dos\ntres', measure, 7), ['uno dos', 'tres']);
});
test('Text fitting shrinks complete passages and refuses to silently truncate', () => {
  const measure = (text, size) => text.length * size * .5;
  const text = 'Un texto largo con palabras completas. '.repeat(12).trim();
  const fit = fitImageText(text, measure, { width: 872, height: 515 });
  assert.ok(fit.size < 64 && fit.size >= 24);
  assert.ok(fit.lines.length * fit.lineHeight <= 515);
  assert.equal(fit.lines.join(' '), text);
  assert.throws(() => fitImageText(text.repeat(60), measure, { width: 872, height: 515 }), /muy largo/);
});
test('Exports use fixed social formats and safe names with version and reference', () => {
  assert.deepEqual(verseImageFormats.map(({ width, height }) => [width, height]), [[1080, 1350], [1080, 1080], [1080, 1920]]);
  assert.equal(verseImageName({ book: 'PSA', chapter: 23, label: '1', version: 'NVI' }, 'square'), 'ujeladea-PSA-23-1-NVI-square.png');
  assert.ok(!verseImageName({ book: 'PSA', chapter: 23, label: '1/2', version: 'NVI' }, 'square').includes('/'));
});
test('Photographs fill every social format without stretching or leaving the image bounds', () => {
  for (const { width, height } of verseImageFormats) {
    const [x, y, cropWidth, cropHeight] = coverSource(941, 1672, width, height);
    assert.ok(x >= 0 && y >= 0 && x + cropWidth <= 941.001 && y + cropHeight <= 1672.001);
    assert.ok(Math.abs(cropWidth / cropHeight - width / height) < .001);
  }
});
test('All photographic backgrounds and thumbnails are small, local WebP assets', async () => {
  const photos = verseImageThemes.filter(theme => theme.image);
  assert.equal(photos.length, 3);
  let total = 0;
  for (const photo of photos) for (const asset of [photo.image, photo.thumbnail]) {
    assert.ok(asset.startsWith('/verse-backgrounds/') && asset.endsWith('.webp'));
    const path = new URL(`../public${asset}`, import.meta.url);
    const data = await readFile(path);
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    total += (await stat(path)).size;
  }
  assert.ok(total < 1100000, `Total local photo assets: ${total} bytes`);
});

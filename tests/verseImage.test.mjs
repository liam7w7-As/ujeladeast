import assert from 'node:assert/strict';
import test from 'node:test';
import { bibleFonts, readingFont, readingSize } from '../src/lib/bibleTypography.js';
import { fitImageText, wrapImageText, verseImageFormats, verseImageName } from '../src/lib/verseImage.js';

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

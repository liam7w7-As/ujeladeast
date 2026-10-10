import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderVerseImage, prepareVersePhoto } from '../src/lib/verseImage.js';

test('every alignment and position keeps the complete image text above the footer', async () => {
  const previousDocument = globalThis.document, previousImage = globalThis.Image;
  const drawn = [];
  const context = {
    font: '', textAlign: '', fillRect() {}, strokeRect() {}, drawImage() {},
    measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1]) || 24; return { width: text.length * size * .5 }; },
    fillText(text, x, y) { drawn.push({ text, x, y, alignment: this.textAlign }); },
  };
  globalThis.document = { fonts: { ready: Promise.resolve(), load: async () => {} }, createElement: () => ({ getContext: () => context, toBlob: callback => callback(new Blob(['png'])) }) };
  globalThis.Image = class { naturalWidth = 50; naturalHeight = 50; set src(value) { if (value) queueMicrotask(() => this.onload?.()); } };
  const verse = { book: 'PSA', chapter: 23, label: '1', version: 'RVR1960', title: 'Salmos', text: 'Jehová es mi pastor; nada me faltará.' };
  try {
    for (const format of ['story', 'square', 'portrait']) {
      for (const align of ['left', 'center', 'right']) {
        const tops = [];
        for (const position of ['top', 'center', 'bottom']) {
          drawn.length = 0;
          const result = await renderVerseImage(verse, { theme: 'paper', format, align, position });
          assert.ok(result.layout.top >= 290);
          assert.ok(result.layout.bottom <= result.height - 159);
          assert.ok(result.layout.citationTop >= result.layout.top + result.layout.lines.length * result.layout.lineHeight + 55);
          assert.equal(result.layout.alignment, align);
          assert.equal(drawn.find(call => call.text === 'UNA PALABRA PARA HOY').x, align === 'left' ? 104 : align === 'right' ? 976 : 540);
          tops.push(result.layout.top);
        }
        assert.ok(tops[0] < tops[1] && tops[1] < tops[2]);
      }
    }
    await assert.rejects(renderVerseImage({ ...verse, text: 'Palabra '.repeat(5000) }, { theme: 'paper' }), /muy largo/);
    await assert.rejects(prepareVersePhoto({ type: 'image/svg+xml', size: 1 }), /JPG, PNG o WebP/);
    await assert.rejects(prepareVersePhoto({ type: 'image/png', size: 13 * 1024 * 1024 }), /12 MB/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousImage === undefined) delete globalThis.Image; else globalThis.Image = previousImage;
  }
});

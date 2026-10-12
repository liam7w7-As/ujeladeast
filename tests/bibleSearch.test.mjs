import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { versions } from '../src/lib/bibleModel.js';
import { createBibleIndex, highlightedText, searchDocuments, searchIndex } from '../src/lib/bibleSearch.js';
import { parseBibleReference, resolveBibleReference } from '../src/lib/bibleReferences.js';
import { readReadingPoint, rememberReadingPoint, validReadingPoint } from '../src/lib/bibleReadingResume.js';

test('Spanish citation parser accepts accents, abbreviations, numbered books and ranges, without silently changing invalid chapters', () => {
  for (const [query, book, chapter, from, to] of [['Jn 3:16', 'JHN', 3, 16, 16], ['Salmo 23', 'PSA', 23, 0, 0], ['Génesis 2:1-3', 'GEN', 2, 1, 3], ['1 Juan 1:9', '1JN', 1, 9, 9], ['Filipenses 4:6-7', 'PHP', 4, 6, 7]]) {
    const parsed = parseBibleReference(query, 'RVR1960');
    assert.deepEqual([parsed.book, parsed.chapter, parsed.from, parsed.to], [book, chapter, from, to]);
  }
  assert.ok(parseBibleReference('Juan 99:2', 'NVI').error);
  assert.ok(parseBibleReference('Juan 3:16,18', 'NVI').error);
  assert.ok(parseBibleReference('Juan 3:16-4:5', 'NVI').error);
  assert.equal(parseBibleReference('dijo Jesús', 'NVI'), null);
  assert.equal(parseBibleReference('Jesús dijo en Juan 3:16', 'NVI'), null);
});
test('search handles accents, phrases, book filters, pagination and safe highlights', () => {
  const index = createBibleIndex();
  index.addAll([{ id: '1', book: 'PSA', text: 'Jesús, mi pastor; nada me faltará.' }, { id: '2', book: 'JHN', text: 'Jesús dijo: el pastor me ama, nada temo.' }]);
  assert.equal(searchIndex(index, 'jesus').total, 2);
  assert.equal(searchIndex(index, 'pastor nada', { phrase: true }).total, 1);
  assert.equal(searchIndex(index, 'jesus', { book: 'PSA' }).total, 1);
  assert.equal(searchIndex(index, 'jesus', { offset: 1, limit: 1 }).results.length, 1);
  assert.equal(searchIndex(index, 'x').total, 0);
  const parts = highlightedText('<b>Jesús</b> ama.', 'jesus');
  assert.equal(parts.map(p => p.text).join(''), '<b>Jesús</b> ama.');
  assert.deepEqual(parts.filter(p => p.match).map(p => p.text), ['Jesús']);
});
test('all four downloaded versions index without duplicate references and resolve against actual grouped text', async () => {
  for (const version of versions) {
    const data = JSON.parse(gunzipSync(await readFile(new URL(`../public${version.archive.url}`, import.meta.url))).toString());
    const index = createBibleIndex();
    for (let i = 0; i < data.books.length; i++) index.addAll(searchDocuments(data.books[i], version.books[i].title));
    assert.ok(index.documentCount > 20000, `${version.id} complete index`);
    assert.ok(searchIndex(index, 'amor').total > 20);
    const john = data.books.find(book => book.id === 'JHN');
    const target = parseBibleReference('Juan 3:16', version.id);
    assert.ok(resolveBibleReference(target, john).reference.split('+').includes('JHN.3.16'));
    assert.throws(() => resolveBibleReference({ ...target, from: 999, to: 999 }, john), /no está disponible/);
    if (version.id === 'TLA') {
      const result = resolveBibleReference(parseBibleReference('Génesis 2:2', version.id), data.books[0]);
      assert.equal(result.reference, 'GEN.2.1+GEN.2.2+GEN.2.3');
    }
  }
});
test('resume storage validates anchors, remains bounded and preserves location without a network', () => {
  const original = globalThis.localStorage, entries = new Map();
  globalThis.localStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  try {
    const location = { version: 'RVR1960', book: 'PSA', chapter: 119 };
    assert.equal(readReadingPoint(location), null);
    const point = { verse: 80, fraction: .3 };
    assert.ok(rememberReadingPoint(location, point)); assert.deepEqual(readReadingPoint(location), point);
    assert.equal(validReadingPoint({ verse: -1, fraction: 0 }), null);
    assert.equal(validReadingPoint({ verse: 1, fraction: NaN }), null);
    for (let chapter = 1; chapter <= 70; chapter++) rememberReadingPoint({ ...location, chapter }, { verse: 1, fraction: 0 });
    assert.equal(Object.keys(JSON.parse(entries.get('bible:readingPositions'))).length, 60);
    globalThis.localStorage.setItem = () => { throw new Error('quota'); };
    assert.equal(rememberReadingPoint(location, point), false);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

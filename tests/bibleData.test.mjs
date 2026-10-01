import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { prepareBible } from '../scripts/bible-data.mjs';

const chapter = {
  usfm: 'GEN.1', html: '<p>Preserved source</p>',
  items: [
    { type: 'verse', verse_numbers: [1, 2], lines: ['First part'], rlw_lines: [] },
    { type: 'verse', verse_numbers: [1, 2], lines: ['Second part'], rlw_lines: ['Second part'] },
  ],
};
const fixture = chapters => ({ copyright: { text: 'Attribution' }, books: [{ usfm: 'GEN', chapters }] });

test('removes only exact duplicate chapters without mutating the source', () => {
  const source = fixture([chapter, structuredClone(chapter)]);
  const original = structuredClone(source);
  const result = prepareBible(source);
  assert.deepEqual(result.removedDuplicates, ['GEN.1']);
  assert.equal(result.bible.books[0].chapters.length, 1);
  assert.deepEqual(result.bible.books[0].chapters[0], chapter);
  assert.deepEqual(result.bible.copyright, source.copyright);
  assert.deepEqual(source, original);
});

test('does not merge or discard grouped verse fragments or red-letter fields', () => {
  assert.deepEqual(prepareBible(fixture([chapter])).bible.books[0].chapters[0].items, chapter.items);
});

test('refuses conflicting duplicates, including differences only in HTML', () => {
  assert.throws(() => prepareBible(fixture([chapter, { ...chapter, html: '<p>Other</p>' }])), /Conflicting chapter/);
});

test('rejects missing items or chapter HTML', () => {
  assert.throws(() => prepareBible(fixture([{ ...chapter, items: [] }])), /Missing items/);
  assert.throws(() => prepareBible(fixture([{ ...chapter, html: null }])), /Missing HTML/);
});

test('prepared packages match their checksums and retain both representations', async () => {
  const root = new URL('../data/bible/prepared/', import.meta.url);
  const catalog = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'));
  assert.deepEqual(catalog.versions.map(version => version.id), ['RVR1960', 'NTV', 'NVI', 'TLA']);
  for (const version of catalog.versions) {
    const bytes = await readFile(new URL(version.file, root));
    assert.equal(bytes.length, version.downloadBytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), version.sha256);
    const decoded = gunzipSync(bytes);
    assert.equal(decoded.length, version.unpackedBytes);
    const { schemaVersion, bible, notes } = JSON.parse(decoded.toString('utf8'));
    assert.equal(schemaVersion, 1);
    assert.equal(bible.books.length, 66);
    const chapters = bible.books.flatMap(book => book.chapters);
    assert.equal(chapters.length, 1189);
    assert.equal(new Set(chapters.map(entry => entry.usfm)).size, 1189);
    assert.ok(chapters.every(entry => entry.html && entry.items.length));
    assert.ok(bible.copyright.text);
    assert.equal(Object.values(notes).flat().length, version.notes);
    assert.ok(Object.values(notes).flat().every(note => typeof note.text === 'string' && note.reference));
  }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { chapterVerses, favoriteKey, verseClipboard, verseLabel } from '../src/lib/bibleVerses.js';
import { versionBackgrounds, versions } from '../src/lib/bibleModel.js';

function chapter(versionId, bookId, number) {
  const book = versions.find(version => version.id === versionId).books.find(book => book.id === bookId);
  return JSON.parse(gunzipSync(readFileSync(new URL(`../public${book.url}`, import.meta.url)))).chapters[number - 1];
}
test('verse extraction includes all fragments but excludes verse numbers and notes', () => {
  const entries = chapterVerses(chapter('NTV', 'GEN', 1).nodes);
  assert.equal(entries.get('GEN.1.1').text, 'En el principio, Dios creó los cielos y la tierra.');
  assert.match(entries.get('GEN.1.5').text, /Dios llamó a la luz.*Y pasó la tarde.*primer día\./);
  assert.equal(entries.size, 31);
});
test('grouped translations retain their full reference and combined text', () => {
  const entry = chapterVerses(chapter('TLA', 'GEN', 2).nodes).get('GEN.2.1+GEN.2.2+GEN.2.3');
  assert.equal(entry.label, '1–3');
  assert.ok(entry.text.length > 100);
  assert.equal(verseLabel('GEN.2.1+GEN.2.3'), '1, 3');
  assert.equal(favoriteKey({ version: 'TLA', reference: entry.reference }), 'TLA:GEN.2.1+GEN.2.2+GEN.2.3');
});
test('table copies retain both cells and omit editorial column headings', () => {
  const entries = chapterVerses(chapter('NTV', 'NUM', 1).nodes);
  assert.match(entries.get('NUM.1.6').text, /Simeón Selumiel, hijo de Zurisadai/);
  assert.ok(!entries.get('NUM.1.5').text.includes('Tribu Jefe'));
});
test('copy includes version and human-readable citation', () => {
  assert.equal(verseClipboard({ text: ' Texto. ', title: 'Génesis', chapter: 1, label: '1', version: 'RVR1960' }), 'Génesis 1:1 (RVR1960)\n\n«Texto.»');
  assert.equal(verseClipboard({ text: 'Texto agrupado.', title: 'Génesis', chapter: 2, label: '1–3', version: 'TLA' }), 'Génesis 2:1–3 (TLA)\n\n«Texto agrupado.»');
});
test('version backgrounds have distinct defaults and reject corrupt preferences', () => {
  assert.equal(new Set(Object.values(versionBackgrounds())).size, 4);
  assert.deepEqual(versionBackgrounds(null), versionBackgrounds());
  assert.equal(versionBackgrounds({ NTV: 'rose', NVI: 'invalid' }).NTV, 'rose');
  assert.equal(versionBackgrounds({ NVI: 'invalid' }).NVI, 'sky');
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { adjacentChapter, nodeText, normalizeBook, selection, validateBook, versions } from '../src/lib/bibleModel.js';

test('normalizes invalid deep links and searches without accents', () => {
  assert.deepEqual(selection(null), { version: 'RVR1960', book: 'GEN', chapter: 1 });
  assert.deepEqual(selection({ version: 'bad', book: 'bad', chapter: -10 }), selection());
  assert.equal(selection({ book: 'PSA', chapter: 1000 }).chapter, 150);
  assert.equal(selection({ chapter: 'NaN' }).chapter, 1);
  assert.equal(normalizeBook('Génesis'), 'genesis');
});
test('chapter navigation crosses book boundaries and stops at both ends', () => {
  assert.equal(adjacentChapter(selection(), -1), null);
  assert.deepEqual(adjacentChapter({ version: 'NTV', book: 'GEN', chapter: 50 }, 1), { version: 'NTV', book: 'EXO', chapter: 1 });
  assert.deepEqual(adjacentChapter({ version: 'NTV', book: 'EXO', chapter: 1 }, -1), { version: 'NTV', book: 'GEN', chapter: 50 });
  assert.equal(adjacentChapter({ version: 'NTV', book: 'REV', chapter: 22 }, 1), null);
});
test('all published books match archive, checksums and the safe node schema', async () => {
  const allowed = new Set(['div', 'span', 'table', 'tbody', 'tr', 'th', 'td', 'br', 'i', 'b', 'sup', 'em', 'strong']);
  function inspect(node) {
    if (typeof node === 'string') return;
    assert.ok(allowed.has(node[0]));
    assert.equal(typeof node[1], 'string');
    assert.equal(typeof node[2], 'string');
    assert.ok(Array.isArray(node[3]));
    node[3].forEach(inspect);
  }
  async function decode(asset) {
    const bytes = await readFile(new URL(`../public${asset.url}`, import.meta.url));
    assert.equal(bytes.length, asset.bytes);
    const json = gunzipSync(bytes);
    assert.equal(json.length, asset.unpackedBytes);
    assert.equal(createHash('sha256').update(json).digest('hex'), asset.sha256);
    return JSON.parse(json);
  }
  for (const version of versions) {
    const archive = await decode(version.archive);
    assert.equal(archive.books.length, 66);
    let chapters = 0;
    for (const [index, expected] of version.books.entries()) {
      const book = validateBook(await decode(expected), version.id, expected);
      assert.deepEqual(book, archive.books[index]);
      for (const chapter of book.chapters) {
        chapters++;
        chapter.nodes.forEach(inspect);
        assert.ok(chapter.nodes.map(nodeText).join('').trim().length > 10);
      }
    }
    assert.equal(chapters, 1189);
  }
});

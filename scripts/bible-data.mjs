import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

export const sources = [
  ['RVR1960', 'RVR1960_vid_149.json'],
  ['NTV', 'NTV_vid_127.json'],
  ['NVI', 'NVI_vid_128.json'],
  ['TLA', 'TLA_vid_176.json'],
];

export function prepareBible(source) {
  assert.ok(Array.isArray(source.books) && source.books.length, 'Missing books');
  const removedDuplicates = [];
  const bookIds = new Set();
  const books = source.books.map(book => {
    assert.ok(!bookIds.has(book.usfm), `Duplicate book: ${book.usfm}`);
    bookIds.add(book.usfm);
    assert.ok(Array.isArray(book.chapters) && book.chapters.length, `Missing chapters: ${book.usfm}`);
    const seen = new Map();
    const chapters = [];
    for (const chapter of book.chapters) {
      assert.ok(chapter.usfm.startsWith(`${book.usfm}.`), 'Invalid chapter reference');
      assert.equal(typeof chapter.html, 'string', `Missing HTML: ${chapter.usfm}`);
      assert.ok(Array.isArray(chapter.items) && chapter.items.length, `Missing items: ${chapter.usfm}`);
      for (const item of chapter.items) {
        assert.ok(Array.isArray(item.lines) && item.lines.every(line => typeof line === 'string'));
        assert.ok(Array.isArray(item.verse_numbers));
      }
      if (seen.has(chapter.usfm)) {
        // Matching identifiers alone do not make chapters interchangeable.
        assert.ok(isDeepStrictEqual(seen.get(chapter.usfm), chapter), `Conflicting chapter: ${chapter.usfm}`);
        removedDuplicates.push(chapter.usfm);
        continue;
      }
      seen.set(chapter.usfm, chapter);
      chapters.push(chapter);
    }
    return { ...book, chapters };
  });
  return { bible: { ...source, books }, removedDuplicates };
}

// Executed inside an offline browser page; DOMParser decodes entities without running scripts.
export function inspectChapters(chapters) {
  const normalize = text => text.replace(/\s+/g, '').normalize('NFC');
  return chapters.map(chapter => {
    const doc = new DOMParser().parseFromString(chapter.html, 'text/html');
    const noteElements = [...doc.querySelectorAll('.note')];
    const notes = noteElements.map((element, index) => {
      const body = element.querySelector('.body');
      const fallback = element.cloneNode(true);
      fallback.querySelectorAll('.label').forEach(label => label.remove());
      return {
        id: `${chapter.usfm}:note:${index + 1}`,
        reference: element.closest('.verse')?.getAttribute('data-usfm') || chapter.usfm,
        kind: [...element.classList].filter(name => name !== 'note'),
        marker: element.querySelector('.label')?.textContent || '',
        text: (body || fallback).textContent.trim(),
      };
    });
    const tableCount = doc.querySelectorAll('table').length;
    const redLetterSpans = doc.querySelectorAll('.wj').length;
    const poetryBlocks = [...doc.querySelectorAll('div')].filter(element =>
      [...element.classList].some(name => /^q\d*$|^qm\d*$/.test(name))).length;
    noteElements.forEach(element => element.remove());
    doc.querySelectorAll('.label').forEach(element => element.remove());
    const htmlVerseText = [...doc.querySelectorAll('.verse')].map(element => element.textContent).join('');
    const itemVerseText = chapter.items.filter(item => item.type === 'verse').flatMap(item => item.lines).join('');
    return {
      id: chapter.usfm,
      notes,
      tableCount,
      redLetterSpans,
      poetryBlocks,
      // This is diagnostic, not permission to drop HTML or rewrite the source text.
      verseTextMatches: normalize(htmlVerseText) === normalize(itemVerseText),
    };
  });
}

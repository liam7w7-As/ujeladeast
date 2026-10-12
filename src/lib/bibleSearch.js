import MiniSearch from 'minisearch';
import { chapterVerses } from './bibleVerses.js';

export const normalizeSearch = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, ' ').trim();
export function searchDocuments(book, title) {
  return book.chapters.flatMap((chapter, index) => [...chapterVerses(chapter.nodes).values()].map(verse => ({
    ...verse, id: verse.reference, version: book.version, book: book.id, chapter: index + 1, title,
  })));
}
export function createBibleIndex() {
  return new MiniSearch({ fields: ['text'], storeFields: ['text', 'reference', 'version', 'book', 'chapter', 'title', 'label'],
    tokenize: value => normalizeSearch(value).split(/\s+/).filter(Boolean), processTerm: term => term,
    searchOptions: { combineWith: 'AND', prefix: false, fuzzy: false } });
}
export function searchIndex(index, query, { book = '', phrase = false, offset = 0, limit = 40 } = {}) {
  const normalized = normalizeSearch(query);
  if (normalized.length < 2 || query.length > 180) return { results: [], total: 0 };
  const results = index.search(normalized, { filter: row => (!book || row.book === book) && (!phrase || ` ${normalizeSearch(row.text)} `.includes(` ${normalized} `)) });
  return { results: results.slice(offset, offset + limit), total: results.length };
}

// React renders these fragments as text, never as HTML supplied by a Bible file.
export function highlightedText(text, query) {
  const terms = new Set(normalizeSearch(query).split(' '));
  return text.split(/([\p{L}\p{N}\p{M}]+)/u).map(part => ({ text: part, match: terms.has(normalizeSearch(part)) && Boolean(normalizeSearch(part)) }));
}

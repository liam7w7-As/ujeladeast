import catalog from './bibleCatalog.json' with { type: 'json' };

export const versions = catalog.versions;
export const normalizeBook = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function selection(value = {}) {
  value = value || {};
  const version = versions.find(entry => entry.id === value.version) || versions[0];
  const book = version.books.find(entry => entry.id === value.book) || version.books[0];
  const number = Number(value.chapter);
  const chapter = Number.isInteger(number) ? Math.min(book.chapters, Math.max(1, number)) : 1;
  return { version: version.id, book: book.id, chapter };
}
export function adjacentChapter(current, direction) {
  const version = versions.find(entry => entry.id === current.version);
  const index = version.books.findIndex(entry => entry.id === current.book);
  const chapter = current.chapter + direction;
  if (chapter >= 1 && chapter <= version.books[index].chapters) return { ...current, chapter };
  const book = version.books[index + direction];
  return book ? { ...current, book: book.id, chapter: direction > 0 ? 1 : book.chapters } : null;
}
export const bookmarkKey = value => `${value.version}:${value.book}:${value.chapter}`;
export function readPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`bible:${key}`)) ?? fallback; } catch { return fallback; }
}
export function writePreference(key, value) {
  try { localStorage.setItem(`bible:${key}`, JSON.stringify(value)); return true; } catch { return false; }
}
export function nodeText(node) {
  return typeof node === 'string' ? node : node[3].map(nodeText).join('');
}
export function validateBook(book, version, expected) {
  if (book?.schema !== 1 || book.version !== version || book.id !== expected.id || book.chapters?.length !== expected.chapters
    || !book.chapters.every((chapter, index) => chapter.id === `${expected.id}.${index + 1}` && Array.isArray(chapter.nodes))) {
    throw new Error('El archivo de la Biblia no es válido. Intenta descargarlo otra vez.');
  }
  return book;
}

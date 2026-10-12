import { storedBook, listDownloads } from './bibleStorage.js';
import { versions, validateBook } from './bibleModel.js';
import { createBibleIndex, searchDocuments, searchIndex } from './bibleSearch.js';

let cached = null, task = 0;
self.onmessage = async ({ data }) => {
  const token = ++task;
  const reply = patch => { if (token === task) self.postMessage({ id: data.id, ...patch }); };
  try {
    const version = versions.find(version => version.id === data.version);
    if (!version) throw new Error('Versión no disponible.');
    const installed = (await listDownloads()).find(entry => entry.id === version.id);
    if (!installed) { cached = null; throw new Error('Descarga esta versión para buscar en todo su texto.'); }
    if (!cached || cached.version !== version.id || cached.sha256 !== installed.sha256) {
      const index = createBibleIndex();
      for (let i = 0; i < version.books.length; i++) {
        if (token !== task) return;
        const expected = version.books[i];
        const book = validateBook(await storedBook(version.id, expected.id), version.id, expected);
        index.addAll(searchDocuments(book, expected.title));
        reply({ type: 'progress', progress: Math.round((i + 1) / version.books.length * 100) });
      }
      if (token !== task) return;
      cached = { version: version.id, sha256: installed.sha256, index };
    }
    reply({ type: 'result', ...searchIndex(cached.index, data.query, data) });
  } catch (error) {
    cached = null;
    reply({ type: 'error', message: error.message || 'No pudimos abrir el buscador. Inténtalo de nuevo.' });
  }
};

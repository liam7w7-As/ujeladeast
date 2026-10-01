import { versions, validateBook } from './bibleModel';
import { deleteVersion, listDownloads, saveVersion, storedBook } from './bibleStorage';

const listeners = new Set();
let state = { installed: {}, operation: null, error: '', ready: false };
let controller;
const memory = new Map();
const publish = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
export const subscribeLibrary = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const librarySnapshot = () => state;
export async function refreshLibrary() {
  try { publish({ installed: Object.fromEntries((await listDownloads()).map(entry => [entry.id, entry])), ready: true }); }
  catch { publish({ ready: true, error: 'El almacenamiento no está disponible. Puedes leer con conexión.' }); }
}
export function fetchBibleAsset(asset, signal, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./bible.worker.js', import.meta.url), { type: 'module' });
    let timer;
    const finish = (fn, value) => { clearTimeout(timer); worker.terminate(); signal?.removeEventListener('abort', abort); fn(value); };
    const abort = () => finish(reject, new DOMException('Cancelled', 'AbortError'));
    const deadline = () => { clearTimeout(timer); timer = setTimeout(() => finish(reject, new Error('La descarga tardó demasiado. Revisa tu conexión e inténtalo otra vez.')), 60000); };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      deadline();
      if (data.type === 'progress') onProgress(data.value);
      else if (data.type === 'result') finish(resolve, data.value);
      else finish(reject, new Error(data.message));
    };
    worker.onerror = () => finish(reject, new Error('No se pudo abrir la Biblia. Actualiza la página e intenta otra vez.'));
    deadline();
    worker.postMessage(asset);
  });
}
export async function loadBibleBook(versionId, bookId, signal) {
  const version = versions.find(entry => entry.id === versionId);
  const expected = version.books.find(entry => entry.id === bookId);
  const key = `${versionId}:${bookId}`;
  try {
    const book = await storedBook(versionId, bookId);
    if (book) return validateBook(book, versionId, expected);
  } catch { /* Online reading remains available when device storage is disabled. */ }
  if (memory.has(key)) return memory.get(key);
  const book = validateBook(await fetchBibleAsset(expected, signal), versionId, expected);
  memory.set(key, book);
  if (memory.size > 3) memory.delete(memory.keys().next().value);
  return book;
}
export async function downloadBible(version) {
  if (state.operation) return;
  controller = new AbortController();
  publish({ operation: { id: version.id, phase: 'download', progress: 0 }, error: '' });
  try {
    const data = await fetchBibleAsset(version.archive, controller.signal, progress => publish({ operation: { id: version.id, phase: 'download', progress } }));
    if (data.schema !== 1 || data.version !== version.id || data.books?.length !== version.books.length) throw new Error('La versión descargada no está completa.');
    data.books.forEach((book, index) => validateBook(book, version.id, version.books[index]));
    publish({ operation: { id: version.id, phase: 'save', progress: 98 } });
    await saveVersion(version, data.books);
    await refreshLibrary();
    // Persistence is best effort; a browser may still reclaim non-persistent storage.
    navigator.storage?.persist?.().catch(() => {});
  } catch (error) {
    if (error.name !== 'AbortError') publish({ error: error.name === 'QuotaExceededError' ? 'No hay espacio suficiente. Libera espacio o elimina otra versión.' : error.name === 'SecurityError' ? 'El navegador no permite guardar descargas en este dispositivo.' : error.message });
  } finally { controller = null; publish({ operation: null }); }
}
export function cancelBibleDownload() { if (state.operation?.phase === 'download') controller?.abort(); }
export async function removeBible(version) {
  if (state.operation) return;
  publish({ operation: { id: version.id, phase: 'delete', progress: 0 }, error: '' });
  try {
    await deleteVersion(version);
    for (const key of memory.keys()) if (key.startsWith(`${version.id}:`)) memory.delete(key);
    await refreshLibrary();
  } catch { publish({ error: 'No se pudo eliminar esta descarga. Inténtalo nuevamente.' }); }
  finally { publish({ operation: null }); }
}

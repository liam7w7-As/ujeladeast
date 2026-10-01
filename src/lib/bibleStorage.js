let connection;
function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('ujeladea-bible', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('books');
      request.result.createObjectStore('versions', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); connection = null; };
      resolve(request.result);
    };
    request.onerror = () => { connection = null; reject(request.error); };
    request.onblocked = () => { connection = null; reject(new Error('Cierra las otras pestañas de la Biblia e intenta otra vez.')); };
  });
  return connection;
}
async function transaction(stores, mode, work) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let request;
    tx.oncomplete = () => resolve(request?.result);
    tx.onabort = () => reject(tx.error || new Error('No se pudo guardar la descarga.'));
    tx.onerror = () => reject(tx.error);
    try { request = work(tx); } catch (error) { tx.abort(); reject(error); }
  });
}
export const listDownloads = () => transaction(['versions'], 'readonly', tx => tx.objectStore('versions').getAll());
export const storedBook = (version, book) => transaction(['books'], 'readonly', tx => tx.objectStore('books').get(`${version}:${book}`));
export async function saveVersion(version, books) {
  await transaction(['books', 'versions'], 'readwrite', tx => {
    for (const book of books) tx.objectStore('books').put(book, `${version.id}:${book.id}`);
    tx.objectStore('versions').put({ id: version.id, sha256: version.archive.sha256, bytes: version.archive.unpackedBytes, savedAt: Date.now() });
  });
}
export async function deleteVersion(version) {
  await transaction(['books', 'versions'], 'readwrite', tx => {
    for (const book of version.books) tx.objectStore('books').delete(`${version.id}:${book.id}`);
    tx.objectStore('versions').delete(version.id);
  });
}

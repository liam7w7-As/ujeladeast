import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, BookMarked, Bookmark, Check, ChevronDown, Download, HardDriveDownload, LoaderCircle, Minus, Moon, Plus, RotateCw, Search, Settings2, Sun, Trash2, WifiOff, X } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import AppDialog from '../components/ui/AppDialog';
import BibleText from '../components/ui/BibleText';
import { adjacentChapter, bookmarkKey, normalizeBook, readPreference, selection, versions, writePreference } from '../lib/bibleModel';
import { cancelBibleDownload, downloadBible, librarySnapshot, loadBibleBook, refreshLibrary, removeBible, subscribeLibrary } from '../lib/bibleLibrary';
import './bible.css';

function IconButton({ label, children, ...props }) {
  return <button type="button" className="bible-icon" title={label} aria-label={label} {...props}>{children}</button>;
}
const initialBookmarks = () => {
  const saved = readPreference('bookmarks', []);
  return Array.isArray(saved) ? saved.filter(value => value && versions.some(version => version.id === value.version && version.books.some(book => book.id === value.book && value.chapter >= 1 && value.chapter <= book.chapters))).slice(0, 200) : [];
};

export default function Bible() {
  const [params, setParams] = useSearchParams();
  const [initial] = useState(() => selection(readPreference('position', {})));
  const current = selection(params.has('version') || params.has('book') || params.has('chapter') ? Object.fromEntries(params) : initial);
  const { version: versionId, book: bookId, chapter: chapterNumber } = current;
  const version = versions.find(entry => entry.id === versionId);
  const bookInfo = version.books.find(entry => entry.id === bookId);
  const key = bookmarkKey(current);
  const library = useSyncExternalStore(subscribeLibrary, librarySnapshot);
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [dialog, setDialog] = useState('');
  const [note, setNote] = useState(null);
  const [query, setQuery] = useState('');
  const [pickerBook, setPickerBook] = useState(bookId);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [fontSize, setFontSize] = useState(() => Math.max(16, Math.min(28, Number(readPreference('fontSize', 19)) || 19)));
  const [theme, setTheme] = useState(() => readPreference('theme', 'dark') === 'light' ? 'light' : 'dark');
  const [redLetters, setRedLetters] = useState(() => readPreference('redLetters', true) !== false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const articleRef = useRef(null);
  const reduced = useReducedMotion();
  const installed = library.installed[versionId];
  const ready = loaded?.version === versionId && loaded?.id === bookId;
  const chapter = ready ? loaded.chapters[chapterNumber - 1] : null;
  const saved = bookmarks.some(entry => bookmarkKey(entry) === key);
  const previous = adjacentChapter(current, -1), next = adjacentChapter(current, 1);

  useEffect(() => {
    refreshLibrary();
    const sync = () => { setOnline(navigator.onLine); refreshLibrary(); };
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); window.removeEventListener('focus', sync); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadBibleBook(versionId, bookId, controller.signal).then(book => {
      if (!controller.signal.aborted) { setLoaded(book); setError(''); }
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [versionId, bookId, retry, online, installed?.sha256]);
  useEffect(() => {
    if (chapter) writePreference('position', { version: versionId, book: bookId, chapter: chapterNumber });
  }, [chapter, versionId, bookId, chapterNumber]);

  function go(value) {
    if (!value) return;
    const target = selection(value);
    setError(''); setNote(null); setDialog(''); setNotice('');
    setParams({ version: target.version, book: target.book, chapter: String(target.chapter) });
    window.scrollTo({ top: 0, behavior: 'instant' });
    articleRef.current?.focus({ preventScroll: true });
  }
  function toggleBookmark() {
    if (!saved && bookmarks.length >= 200) { setNotice('Ya tienes 200 marcadores. Elimina alguno para guardar otro.'); return; }
    const updated = saved ? bookmarks.filter(entry => bookmarkKey(entry) !== key) : [current, ...bookmarks];
    if (writePreference('bookmarks', updated)) { setBookmarks(updated); setNotice(saved ? 'Marcador eliminado.' : 'Capítulo guardado en marcadores.'); }
    else setNotice('No se pudo guardar el marcador en este dispositivo.');
  }
  function changeSetting(name, value, setter) {
    setter(value);
    if (!writePreference(name, value)) setNotice('El ajuste se mantendrá solo durante esta visita.');
  }
  const openPicker = () => { setPickerBook(bookId); setQuery(''); setDialog('books'); };
  const matchingBooks = version.books.filter(book => normalizeBook(book.title).includes(normalizeBook(query.trim())));
  const chosenBook = version.books.find(book => book.id === pickerBook) || bookInfo;

  return <PageShell activeItem="bible" withFooter={false} ambient={false} className={`bible-page bible-theme-${theme}`}>
    <main className="bible-layout">
      <header className="bible-heading">
        <div><h1><BookOpen size={25} />Biblia</h1><span className="bible-connection">{installed ? <><Check size={13} />{online ? 'Disponible sin conexión' : 'Leyendo sin conexión'}</> : online ? 'Lectura en línea' : <><WifiOff size={13} />Sin conexión</>}</span></div>
        <div className="bible-header-actions"><IconButton label="Marcadores" onClick={() => setDialog('bookmarks')}><BookMarked size={21} /></IconButton><IconButton label="Descargas" onClick={() => setDialog('downloads')}><HardDriveDownload size={21} />{library.operation && <span className="bible-busy-dot" />}</IconButton><IconButton label="Ajustes de lectura" onClick={() => setDialog('settings')}><Settings2 size={21} /></IconButton></div>
      </header>
      <div className="bible-workspace">
        <aside className="bible-sidebar" aria-label="Libros de la Biblia">
          <div className="bible-sidebar-title"><span>Libros</span><span>66</span></div>
          <label className="bible-search"><Search size={17} /><input aria-label="Buscar libro" placeholder="Buscar libro" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <div className="bible-book-list">{matchingBooks.map(book => <button type="button" key={book.id} aria-current={book.id === bookId ? 'true' : undefined} onClick={() => go({ ...current, book: book.id, chapter: 1 })}><span>{book.title}</span><span>{book.chapters}</span></button>)}{!matchingBooks.length && <p className="bible-muted">No se encontraron libros.</p>}</div>
        </aside>
        <div className="bible-reading-area">
          <div className="bible-controls">
            <button type="button" className="bible-location" onClick={openPicker} aria-label="Elegir libro y capítulo"><span>{bookInfo.title} <strong>{chapterNumber}</strong></span><ChevronDown size={18} /></button>
            <label className="bible-version"><span className="sr-only">Versión de la Biblia</span><select value={versionId} onChange={event => go({ ...current, version: event.target.value })}>{versions.map(entry => <option key={entry.id} value={entry.id}>{entry.id}</option>)}</select></label>
            <IconButton label={saved ? 'Quitar marcador' : 'Guardar capítulo'} aria-pressed={saved} onClick={toggleBookmark}><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} /></IconButton>
          </div>
          <p role="status" className="bible-notice">{notice}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.article key={key} ref={articleRef} tabIndex={-1} aria-label={`${bookInfo.title} ${chapterNumber}, ${versionId}`} className={`bible-chapter ${redLetters ? 'bible-red-letters' : ''}`} style={{ '--bible-font-size': `${fontSize}px` }} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <header className="bible-chapter-heading"><p>{version.title}</p><h2>{bookInfo.title} {chapterNumber}</h2></header>
              {chapter ? <BibleText nodes={chapter.nodes} onNote={setNote} /> : error ? <div className="bible-state" role="alert"><WifiOff size={28} /><h3>No pudimos abrir este capítulo</h3><p>{online ? error : 'Esta versión no está descargada en este dispositivo.'}</p><div><button className="bible-command" type="button" onClick={() => { setError(''); setRetry(value => value + 1); }}><RotateCw size={17} />Reintentar</button><button className="bible-command" type="button" onClick={() => setDialog('downloads')}><Download size={17} />Descargas</button></div></div> : <div className="bible-state" role="status"><LoaderCircle className="bible-spin" size={26} /><p>Abriendo capítulo...</p></div>}
              {chapter && <p className="bible-copyright">{version.copyright}</p>}
            </motion.article>
          </AnimatePresence>
          <nav className="bible-chapter-nav" aria-label="Navegación de capítulos"><button type="button" disabled={!previous} onClick={() => go(previous)}><ArrowLeft size={19} /><span>Anterior</span></button><button type="button" onClick={openPicker} aria-label="Seleccionar capítulo">{chapterNumber} <span>/ {bookInfo.chapters}</span></button><button type="button" disabled={!next} onClick={() => go(next)}><span>Siguiente</span><ArrowRight size={19} /></button></nav>
        </div>
      </div>
    </main>

    <AppDialog open={dialog === 'books'} onClose={() => setDialog('')} title="Libros y capítulos" wide>
      <div className="bible-picker"><div className="bible-picker-books"><label className="bible-search"><Search size={17} /><input autoFocus aria-label="Filtrar libros" placeholder="Buscar libro" value={query} onChange={event => setQuery(event.target.value)} /></label><div className="bible-book-list">{matchingBooks.map(book => <button key={book.id} type="button" aria-pressed={pickerBook === book.id} onClick={() => setPickerBook(book.id)}><span>{book.title}</span><span>{book.chapters}</span></button>)}{!matchingBooks.length && <p>No se encontraron libros.</p>}</div></div><div className="bible-picker-chapters"><h3>{chosenBook.title}</h3><div className="bible-chapter-grid">{Array.from({ length: chosenBook.chapters }, (_, index) => <button type="button" key={index} aria-label={`${chosenBook.title} ${index + 1}`} aria-current={chosenBook.id === bookId && index + 1 === chapterNumber ? 'true' : undefined} onClick={() => go({ ...current, book: chosenBook.id, chapter: index + 1 })}>{index + 1}</button>)}</div></div></div>
    </AppDialog>
    <AppDialog open={dialog === 'settings'} onClose={() => setDialog('')} title="Ajustes de lectura">
      <div className="bible-dialog-body"><div className="bible-setting"><span>Tamaño del texto</span><div><IconButton label="Reducir texto" disabled={fontSize <= 16} onClick={() => changeSetting('fontSize', fontSize - 1, setFontSize)}><Minus size={18} /></IconButton><output>{fontSize}</output><IconButton label="Aumentar texto" disabled={fontSize >= 28} onClick={() => changeSetting('fontSize', fontSize + 1, setFontSize)}><Plus size={18} /></IconButton></div></div><div className="bible-setting"><span>Apariencia</span><div className="bible-segment" role="group" aria-label="Apariencia"><IconButton label="Tema claro" aria-pressed={theme === 'light'} onClick={() => changeSetting('theme', 'light', setTheme)}><Sun size={20} /></IconButton><IconButton label="Tema oscuro" aria-pressed={theme === 'dark'} onClick={() => changeSetting('theme', 'dark', setTheme)}><Moon size={20} /></IconButton></div></div><label className="bible-setting"><span>Palabras de Jesús en rojo</span><input type="checkbox" checked={redLetters} onChange={event => changeSetting('redLetters', event.target.checked, setRedLetters)} /></label></div>
    </AppDialog>
    <AppDialog open={Boolean(note)} onClose={() => setNote(null)} title={`Nota · ${bookInfo.title} ${chapterNumber}`}><div className="bible-dialog-body bible-note-body">{note && <BibleText nodes={note} onNote={setNote} />}</div></AppDialog>
    <AppDialog open={dialog === 'bookmarks'} onClose={() => setDialog('')} title="Marcadores">
      <div className="bible-dialog-body">{bookmarks.length ? bookmarks.map(entry => <div key={bookmarkKey(entry)} className="bible-bookmark-row"><button type="button" onClick={() => go(entry)}><Bookmark size={19} /><span>{versions.find(v => v.id === entry.version).books.find(b => b.id === entry.book).title} {entry.chapter}<small>{entry.version}</small></span></button><IconButton label="Eliminar marcador" onClick={() => { const updated = bookmarks.filter(mark => bookmarkKey(mark) !== bookmarkKey(entry)); if (writePreference('bookmarks', updated)) setBookmarks(updated); }}><Trash2 size={17} /></IconButton></div>) : <div className="bible-state"><Bookmark size={30} /><p>Aún no hay capítulos guardados.</p></div>}</div>
    </AppDialog>
    <AppDialog open={dialog === 'downloads'} onClose={() => { setDialog(''); setConfirmDelete(''); }} title="Biblias sin conexión">
      <div className="bible-dialog-body bible-downloads">{library.error && <p role="alert" className="bible-download-error">{library.error}</p>}{!online && <p className="bible-download-offline"><WifiOff size={16} />Sin conexión</p>}{versions.map(entry => {
        const downloaded = library.installed[entry.id];
        const operation = library.operation?.id === entry.id ? library.operation : null;
        const currentDownload = downloaded?.sha256 === entry.archive.sha256;
        return <section className="bible-download-row" key={entry.id}><div className="bible-download-info"><strong>{entry.id}</strong><span>{entry.title}</span><small>{downloaded ? <><Check size={13} />{currentDownload ? 'Disponible sin conexión' : 'Actualización disponible'}</> : `${(entry.archive.bytes / 1e6).toFixed(2)} MB`}</small></div><div className="bible-download-actions">{operation ? <>{operation.phase === 'download' ? <IconButton label={`Cancelar descarga de ${entry.id}`} onClick={cancelBibleDownload}><X size={19} /></IconButton> : <LoaderCircle size={22} className="bible-spin" />}</> : <>{(!downloaded || !currentDownload) && <IconButton label={`Descargar ${entry.id}`} disabled={!online || Boolean(library.operation) || !library.ready} onClick={() => downloadBible(entry)}><Download size={21} /></IconButton>}{downloaded && <IconButton label={`Eliminar descarga de ${entry.id}`} disabled={Boolean(library.operation)} onClick={() => setConfirmDelete(entry.id)}><Trash2 size={19} /></IconButton>}</>}</div>{operation && <div className="bible-download-progress" role="status"><progress max="100" value={operation.progress} aria-label={`Descarga ${entry.id}`} /><span>{operation.phase === 'save' ? 'Guardando y verificando...' : operation.phase === 'delete' ? 'Eliminando...' : `${operation.progress}%`}</span></div>}{confirmDelete === entry.id && <div className="bible-confirm"><p>¿Eliminar {entry.id} de este dispositivo? Tus marcadores se conservarán.</p><div><button type="button" className="bible-command" onClick={() => setConfirmDelete('')}>Cancelar</button><button type="button" className="bible-command" disabled={Boolean(library.operation)} onClick={() => { setConfirmDelete(''); removeBible(entry); }}><Trash2 size={16} />Eliminar</button></div></div>}</section>;
      })}</div>
    </AppDialog>
  </PageShell>;
}

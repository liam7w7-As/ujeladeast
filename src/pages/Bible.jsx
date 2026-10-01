import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, BookMarked, Bookmark, Check, ChevronDown, Columns3, Copy, Download, HardDriveDownload, Heart, LoaderCircle, Minus, Moon, Plus, RotateCw, Search, Settings2, Sun, Trash2, WifiOff, X } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import AppDialog from '../components/ui/AppDialog';
import BibleText from '../components/ui/BibleText';
import BibleComparison from '../components/ui/BibleComparison';
import { chapterVerses, favoriteKey, verseCitation, verseClipboard } from '../lib/bibleVerses';
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
const initialFavorites = () => {
  const saved = readPreference('verseFavorites', []);
  return Array.isArray(saved) ? saved.filter(entry => entry && typeof entry.text === 'string' && typeof entry.reference === 'string'
    && typeof entry.title === 'string' && typeof entry.label === 'string' && entry.reference.startsWith(`${entry.book}.${entry.chapter}.`)
    && versions.some(version => version.id === entry.version && version.books.some(book => book.id === entry.book && Number.isInteger(entry.chapter) && entry.chapter >= 1 && entry.chapter <= book.chapters))).slice(0, 500) : [];
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
  const [favorites, setFavorites] = useState(initialFavorites);
  const [savedError, setSavedError] = useState('');
  const [savedTab, setSavedTab] = useState('verses');
  const [activeVerse, setActiveVerse] = useState(null);
  const [verseNotice, setVerseNotice] = useState('');
  const [copyFallback, setCopyFallback] = useState(false);
  const [comparison, setComparison] = useState([]);
  const [compareDraft, setCompareDraft] = useState([]);
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [fontSize, setFontSize] = useState(() => Math.max(16, Math.min(28, Number(readPreference('fontSize', 19)) || 19)));
  const [theme, setTheme] = useState(() => readPreference('theme', 'dark') === 'light' ? 'light' : 'dark');
  const [redLetters, setRedLetters] = useState(() => readPreference('redLetters', true) !== false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const articleRef = useRef(null);
  const copyRequest = useRef(0);
  const reduced = useReducedMotion();
  const installed = library.installed[versionId];
  const ready = loaded?.version === versionId && loaded?.id === bookId;
  const chapter = ready ? loaded.chapters[chapterNumber - 1] : null;
  const saved = bookmarks.some(entry => bookmarkKey(entry) === key);
  const previous = adjacentChapter(current, -1), next = adjacentChapter(current, 1);
  const targetReference = params.get('verse') || '';
  const activeFavorite = activeVerse && favorites.some(entry => favoriteKey(entry) === favoriteKey(activeVerse));

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
  useEffect(() => {
    if (!chapter || !targetReference || comparison.length) return;
    const timer = setTimeout(() => {
      const target = [...(articleRef.current?.querySelectorAll('[data-reference]') || [])].find(element => element.dataset.reference === targetReference);
      target?.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
      target?.querySelector('button')?.focus({ preventScroll: true });
    }, reduced ? 0 : 220);
    return () => clearTimeout(timer);
  }, [chapter, targetReference, comparison.length, reduced]);

  function go(value, reference = '') {
    if (!value) return;
    const target = selection(value);
    setError(''); setNote(null); setDialog(''); setNotice(''); setActiveVerse(null);
    setParams({ version: target.version, book: target.book, chapter: String(target.chapter), ...(reference ? { verse: reference } : {}) });
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
  function openVerse(reference, id = versionId, source = chapter) {
    const verse = chapterVerses(source.nodes).get(reference);
    if (!verse) return;
    const title = versions.find(entry => entry.id === id).books.find(entry => entry.id === bookId).title;
    copyRequest.current++;
    setActiveVerse({ ...verse, version: id, book: bookId, chapter: chapterNumber, title });
    setVerseNotice(''); setCopyFallback(false);
  }
  function storeFavorites(updated) {
    if (!writePreference('verseFavorites', updated)) { setSavedError('No se pudo actualizar tus favoritos en este dispositivo.'); return false; }
    setSavedError(''); setFavorites(updated); return true;
  }
  function toggleFavorite() {
    if (!activeFavorite && favorites.length >= 500) { setVerseNotice('Ya tienes 500 favoritos. Elimina alguno para guardar otro.'); return; }
    const updated = activeFavorite ? favorites.filter(entry => favoriteKey(entry) !== favoriteKey(activeVerse)) : [activeVerse, ...favorites];
    setVerseNotice(storeFavorites(updated) ? activeFavorite ? 'Versículo eliminado de favoritos.' : 'Versículo guardado en favoritos.' : 'No se pudo guardar en este dispositivo.');
  }
  async function copyVerse() {
    const request = ++copyRequest.current;
    try {
      await navigator.clipboard.writeText(verseClipboard(activeVerse));
      if (request !== copyRequest.current) return;
      setVerseNotice('Versículo copiado con su referencia.'); setCopyFallback(false);
    } catch { if (request === copyRequest.current) { setVerseNotice('No se pudo acceder al portapapeles. Puedes seleccionar el texto de abajo.'); setCopyFallback(true); } }
  }
  function chooseComparison() {
    const suggested = [versionId, ...versions.filter(entry => library.installed[entry.id]).map(entry => entry.id), ...versions.map(entry => entry.id)];
    setCompareDraft(comparison.length ? comparison : [...new Set(suggested)].slice(0, 3));
    setDialog('compare');
  }
  function savedTabKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === 'Home' ? 'verses' : event.key === 'End' ? 'chapters' : savedTab === 'verses' ? 'chapters' : 'verses';
    setSavedTab(tab);
    document.getElementById(`bible-${tab}-tab`)?.focus();
  }
  const openPicker = () => { setPickerBook(bookId); setQuery(''); setDialog('books'); };
  const matchingBooks = version.books.filter(book => normalizeBook(book.title).includes(normalizeBook(query.trim())));
  const chosenBook = version.books.find(book => book.id === pickerBook) || bookInfo;

  return <PageShell activeItem="bible" withFooter={false} ambient={false} className={`bible-page bible-theme-${theme} ${comparison.length ? 'bible-comparing' : ''}`}>
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
            {!comparison.length && <label className="bible-version"><span className="sr-only">Versión de la Biblia</span><select value={versionId} onChange={event => go({ ...current, version: event.target.value })}>{versions.map(entry => <option key={entry.id} value={entry.id}>{entry.id}</option>)}</select></label>}
            <IconButton label="Comparar versiones" aria-pressed={Boolean(comparison.length)} onClick={chooseComparison}><Columns3 size={20} /></IconButton>
            {comparison.length > 0 && <IconButton label="Cerrar comparación" onClick={() => setComparison([])}><X size={19} /></IconButton>}
            <IconButton label={saved ? 'Quitar marcador' : 'Guardar capítulo'} aria-pressed={saved} onClick={toggleBookmark}><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} /></IconButton>
          </div>
          <p role="status" className="bible-notice">{notice}</p>
          {comparison.length > 0 ? <BibleComparison key={`${bookId}:${chapterNumber}`} ids={comparison} current={current} primary={{ chapter, error, onRetry: () => { setError(''); setRetry(value => value + 1); } }} installed={library.installed} online={online} onNote={(nodes, id) => setNote({ nodes, version: id })} onVerse={openVerse} favorites={favorites} fontSize={fontSize} redLetters={redLetters} selectedReference={activeVerse?.reference || targetReference} /> : <AnimatePresence mode="wait" initial={false}>
            <motion.article key={key} ref={articleRef} tabIndex={-1} aria-label={`${bookInfo.title} ${chapterNumber}, ${versionId}`} className={`bible-chapter ${redLetters ? 'bible-red-letters' : ''}`} style={{ '--bible-font-size': `${fontSize}px` }} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <header className="bible-chapter-heading"><p>{version.title}</p><h2>{bookInfo.title} {chapterNumber}</h2></header>
              {chapter ? <BibleText nodes={chapter.nodes} onNote={nodes => setNote({ nodes, version: versionId })} onVerse={openVerse} favorites={favorites.filter(entry => entry.version === versionId).map(entry => entry.reference)} selectedReference={activeVerse?.reference || targetReference} /> : error ? <div className="bible-state" role="alert"><WifiOff size={28} /><h3>No pudimos abrir este capítulo</h3><p>{online ? error : 'Esta versión no está descargada en este dispositivo.'}</p><div><button className="bible-command" type="button" onClick={() => { setError(''); setRetry(value => value + 1); }}><RotateCw size={17} />Reintentar</button><button className="bible-command" type="button" onClick={() => setDialog('downloads')}><Download size={17} />Descargas</button></div></div> : <div className="bible-state" role="status"><LoaderCircle className="bible-spin" size={26} /><p>Abriendo capítulo...</p></div>}
              {chapter && <p className="bible-copyright">{version.copyright}</p>}
            </motion.article>
          </AnimatePresence>}
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
    <AppDialog open={Boolean(note)} onClose={() => setNote(null)} title={`Nota · ${bookInfo.title} ${chapterNumber} (${note?.version || versionId})`}><div className="bible-dialog-body bible-note-body">{note && <BibleText nodes={note.nodes} onNote={nodes => setNote({ ...note, nodes })} />}</div></AppDialog>
    <AppDialog open={Boolean(activeVerse)} onClose={() => setActiveVerse(null)} title={activeVerse ? verseCitation(activeVerse) : 'Versículo'}>
      {activeVerse && <div className="bible-dialog-body bible-verse-dialog"><blockquote>{activeVerse.text}</blockquote><div className="bible-verse-commands"><button type="button" className="bible-command" onClick={toggleFavorite} aria-pressed={Boolean(activeFavorite)}><Heart size={19} fill={activeFavorite ? 'currentColor' : 'none'} />{activeFavorite ? 'Quitar de favoritos' : 'Guardar favorito'}</button><button type="button" className="bible-command" onClick={copyVerse}><Copy size={19} />Copiar versículo</button></div><p role="status">{verseNotice}</p>{copyFallback && <textarea aria-label="Texto para copiar" readOnly value={verseClipboard(activeVerse)} onFocus={event => event.target.select()} autoFocus />}</div>}
    </AppDialog>
    <AppDialog open={dialog === 'compare'} onClose={() => setDialog('')} title="Comparar versiones">
      <div className="bible-dialog-body"><div className="bible-comparison-options">{versions.map(entry => <label key={entry.id}><input type="checkbox" checked={compareDraft.includes(entry.id)} disabled={!compareDraft.includes(entry.id) && compareDraft.length >= 3} onChange={event => setCompareDraft(event.target.checked ? [...compareDraft, entry.id] : compareDraft.filter(id => id !== entry.id))} /><span><strong>{entry.id}</strong><small>{entry.title}</small></span>{library.installed[entry.id] && <Check size={17} aria-label="Descargada" />}</label>)}</div><div className="bible-compare-apply"><span>{compareDraft.length} / 3 versiones</span><button type="button" className="bible-command" disabled={compareDraft.length < 2} onClick={() => { setComparison(compareDraft); go({ ...current, version: compareDraft[0] }); }}><Columns3 size={18} />Comparar</button></div></div>
    </AppDialog>
    <AppDialog open={dialog === 'bookmarks'} onClose={() => setDialog('')} title="Marcadores">
      {savedError && <p role="alert" className="bible-saved-error">{savedError}</p>}
      <div className="bible-saved-tabs" role="tablist" aria-label="Contenido guardado" onKeyDown={savedTabKey}><button id="bible-verses-tab" role="tab" tabIndex={savedTab === 'verses' ? 0 : -1} aria-selected={savedTab === 'verses'} aria-controls="bible-saved-panel" onClick={() => setSavedTab('verses')}>Versículos <span>{favorites.length}</span></button><button id="bible-chapters-tab" role="tab" tabIndex={savedTab === 'chapters' ? 0 : -1} aria-selected={savedTab === 'chapters'} aria-controls="bible-saved-panel" onClick={() => setSavedTab('chapters')}>Capítulos <span>{bookmarks.length}</span></button></div>
      <div id="bible-saved-panel" role="tabpanel" aria-labelledby={savedTab === 'verses' ? 'bible-verses-tab' : 'bible-chapters-tab'} className="bible-dialog-body">{savedTab === 'verses' ? favorites.length ? favorites.map(entry => <div key={favoriteKey(entry)} className="bible-favorite-row"><button type="button" onClick={() => { setComparison([]); go(entry, entry.reference); }}><strong><Heart size={15} fill="currentColor" />{verseCitation(entry)}</strong><span>{entry.text}</span></button><IconButton label={`Eliminar favorito ${verseCitation(entry)}`} onClick={() => { if (!storeFavorites(favorites.filter(item => favoriteKey(item) !== favoriteKey(entry)))) setNotice('No se pudo eliminar el favorito.'); }}><Trash2 size={17} /></IconButton></div>) : <div className="bible-state"><Heart size={30} /><p>Aún no hay versículos favoritos.</p></div> : bookmarks.length ? bookmarks.map(entry => <div key={bookmarkKey(entry)} className="bible-bookmark-row"><button type="button" onClick={() => { setComparison([]); go(entry); }}><Bookmark size={19} /><span>{versions.find(v => v.id === entry.version).books.find(b => b.id === entry.book).title} {entry.chapter}<small>{entry.version}</small></span></button><IconButton label="Eliminar marcador" onClick={() => { const updated = bookmarks.filter(mark => bookmarkKey(mark) !== bookmarkKey(entry)); if (writePreference('bookmarks', updated)) setBookmarks(updated); }}><Trash2 size={17} /></IconButton></div>) : <div className="bible-state"><Bookmark size={30} /><p>Aún no hay capítulos guardados.</p></div>}</div>
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

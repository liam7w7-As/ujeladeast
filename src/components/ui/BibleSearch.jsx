import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Download, LoaderCircle, RotateCw, Search, WifiOff, X } from 'lucide-react';
import AppDialog from './AppDialog';
import { versions } from '../../lib/bibleModel';
import { downloadBible, loadBibleBook } from '../../lib/bibleLibrary';
import { parseBibleReference, resolveBibleReference } from '../../lib/bibleReferences';
import { highlightedText } from '../../lib/bibleSearch';

export default function BibleSearch({ current, library, online, onOpen, onClose }) {
  const [versionId, setVersionId] = useState(current.version);
  const [query, setQuery] = useState('');
  const [book, setBook] = useState('');
  const [phrase, setPhrase] = useState(false);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ status: 'idle', results: [], total: 0 });
  const worker = useRef(null), serial = useRef(0), input = useRef(null);
  const version = versions.find(version => version.id === versionId);
  const installed = library.installed[versionId];
  const value = query.trim();
  const reference = useMemo(() => parseBibleReference(value, versionId), [value, versionId]);
  const installedHash = installed?.sha256 || '';
  const requestKey = `${versionId}:${value}:${book}:${phrase}:${offset}:${retry}:${installedHash}`;
  const stateMatches = state.key === requestKey;
  const results = stateMatches ? state.results || [] : [];
  const busy = value.length >= 2 && (reference ? !reference.error : Boolean(installed)) && (!stateMatches || state.status === 'loading');
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => {
    const id = ++serial.current;
    const controller = new AbortController();
    let deadline;
    const report = patch => { if (id === serial.current && !controller.signal.aborted) setState({ key: requestKey, ...patch }); };
    const timer = setTimeout(async () => {
      if (value.length < 2 || reference?.error || (!reference && !installedHash)) return;
      report({ status: 'loading', progress: 0 });
      if (reference) {
        try {
          const source = await loadBibleBook(versionId, reference.book, controller.signal);
          report({ status: 'ready', results: [resolveBibleReference(reference, source)], total: 1 });
        } catch (error) { report({ status: 'error', error: !online && !installedHash ? 'Esta versión no está descargada. Elige una disponible sin conexión.' : error.message }); }
        return;
      }
      try {
        if (!worker.current) worker.current = new Worker(new URL('../../lib/bibleSearch.worker.js', import.meta.url), { type: 'module' });
        worker.current.onmessage = ({ data }) => {
          if (data.id !== id) return;
          if (data.type === 'progress') report({ status: 'loading', progress: data.progress });
          else { clearTimeout(deadline); report(data.type === 'error' ? { status: 'error', error: data.message } : { status: 'ready', results: data.results, total: data.total }); }
        };
        worker.current.onerror = () => { clearTimeout(deadline); worker.current?.terminate(); worker.current = null; report({ status: 'error', error: 'No pudimos iniciar la búsqueda. Inténtalo de nuevo.' }); };
        deadline = setTimeout(() => { worker.current?.terminate(); worker.current = null; report({ status: 'error', error: 'La búsqueda tardó demasiado. Inténtalo de nuevo.' }); }, 45000);
        worker.current.postMessage({ id, version: versionId, query: value, book, phrase, offset });
      } catch { report({ status: 'error', error: 'El buscador no está disponible en este navegador.' }); }
    }, 280);
    return () => { clearTimeout(timer); clearTimeout(deadline); controller.abort(); };
  }, [requestKey, value, versionId, book, phrase, offset, reference, installedHash, online]);
  const change = (setter, next) => { setter(next); setOffset(0); };
  return <AppDialog open onClose={onClose} title="Buscar en la Biblia" wide>
    <div className="bible-search-tools">
      <form className="bible-query-field" onSubmit={event => { event.preventDefault(); input.current?.blur(); }}><Search size={20} /><input ref={input} autoFocus type="search" maxLength={180} aria-label="Cita o palabras de la Biblia" placeholder="Juan 3:16, Salmo 23, amor..." value={query} onChange={event => change(setQuery, event.target.value)} />{query && <button type="button" className="bible-icon" aria-label="Limpiar búsqueda" onClick={() => { change(setQuery, ''); input.current?.focus(); }}><X size={18} /></button>}</form>
      <div className="bible-search-filters"><label>Versión<select aria-label="Versión para buscar" value={versionId} onChange={event => change(setVersionId, event.target.value)}>{versions.map(version => <option key={version.id} value={version.id}>{version.id}{library.installed[version.id] ? ' · Descargada' : ''}</option>)}</select></label><label>Libro<select aria-label="Filtrar búsqueda por libro" value={book} disabled={Boolean(reference)} onChange={event => change(setBook, event.target.value)}><option value="">Todos los libros</option>{version.books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label><label className="bible-phrase-option"><input type="checkbox" checked={phrase} disabled={Boolean(reference)} onChange={event => change(setPhrase, event.target.checked)} />Frase exacta</label></div>
      <p className="bible-search-availability">{installed ? <><Check size={14} />{versionId} disponible sin conexión</> : online ? `${versionId} sin descargar` : <><WifiOff size={14} />{versionId} no disponible sin conexión</>}</p>
    </div>
    <div className="bible-search-results" aria-busy={busy}>
      {!value && <div className="bible-state"><Search size={28} /><p>¿Qué pasaje buscas?</p></div>}
      {value && value.length < 2 && <p className="bible-search-message">Escribe al menos dos caracteres.</p>}
      {reference?.error && <p role="alert" className="bible-search-message">{reference.error}</p>}
      {value.length >= 2 && !reference && !installed && <div className="bible-search-download"><Download size={28} /><h3>Buscar en {versionId}</h3><p>Descarga esta versión para buscar en todo su texto, también sin internet.</p><button type="button" className="bible-command" disabled={!online || Boolean(library.operation) || !library.ready} onClick={() => downloadBible(version)}>{library.operation?.id === versionId ? <LoaderCircle size={17} className="bible-spin" /> : <Download size={17} />}Descargar {versionId} · {(version.archive.bytes / 1e6).toFixed(1)} MB</button>{library.operation?.id === versionId && <progress aria-label={`Descarga ${versionId}`} max={100} value={library.operation.progress} />}{library.error && <p role="alert">{library.error}</p>}</div>}
      {busy && <div className="bible-search-loading" role="status"><LoaderCircle size={22} className="bible-spin" /><span>{stateMatches && state.progress > 0 ? `Preparando búsqueda · ${state.progress}%` : 'Buscando...'}</span></div>}
      {stateMatches && state.status === 'error' && <div className="bible-state"><p role="alert">{state.error}</p><button type="button" className="bible-command" onClick={() => setRetry(value => value + 1)}><RotateCw size={17} />Reintentar búsqueda</button></div>}
      {stateMatches && state.status === 'ready' && <><p className="bible-search-count" role="status">{state.total ? `${state.total} ${state.total === 1 ? 'resultado' : 'resultados'}` : 'No encontramos resultados.'}</p>{results.map(row => <button type="button" className="bible-search-result" key={row.reference || `${row.book}.${row.chapter}`} onClick={() => onOpen(row)}><span><strong>{row.title} {row.chapter}{row.label ? `:${row.label}` : ''}</strong><small>{row.version}</small></span><p>{reference ? row.text : highlightedText(row.text, value).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : part.text)}</p><ArrowRight size={18} /></button>)}{!reference && state.total > 40 && <nav className="bible-search-pagination" aria-label="Páginas de resultados"><button type="button" className="bible-command" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 40))}>Anterior</button><span>{offset + 1}–{Math.min(offset + 40, state.total)}</span><button type="button" className="bible-command" disabled={offset + 40 >= state.total} onClick={() => setOffset(value => value + 40)}>Siguiente</button></nav>}</>}
    </div>
  </AppDialog>;
}

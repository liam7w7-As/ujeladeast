import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, RotateCw, WifiOff } from 'lucide-react';
import BibleText from './BibleText';
import { loadBibleBook } from '../../lib/bibleLibrary';
import { versions } from '../../lib/bibleModel';

function Column({ versionId, bookId, chapterNumber, chapter, error, onRetry, installed, online, onNote, onVerse, favorites, fontSize, redLetters, selectedReference }) {
  const version = versions.find(entry => entry.id === versionId);
  const book = version.books.find(entry => entry.id === bookId);
  return <section className="bible-compare-column" aria-label={`Comparación ${versionId}`}>
    <header><div><strong>{versionId}</strong><span>{book.title} {chapterNumber}</span></div>{installed ? <Check size={16} aria-label="Descargada" /> : !online ? <WifiOff size={16} aria-label="Sin conexión" /> : null}</header>
    <div className={`bible-compare-scroll bible-chapter ${redLetters ? 'bible-red-letters' : ''}`} role="region" aria-label={`Lectura ${versionId}`} tabIndex={0} style={{ '--bible-font-size': `${fontSize}px` }}>
      {chapter ? <><BibleText nodes={chapter.nodes} onNote={nodes => onNote(nodes, versionId)} onVerse={reference => onVerse(reference, versionId, chapter)} favorites={favorites.filter(entry => entry.version === versionId).map(entry => entry.reference)} selectedReference={selectedReference} /><p className="bible-copyright">{version.copyright}</p></> : error ? <div className="bible-state" role="alert"><WifiOff size={24} /><p>{online ? error : `${versionId} no está descargada en este dispositivo.`}</p><button type="button" className="bible-command" onClick={onRetry}><RotateCw size={16} />Reintentar</button></div> : <div className="bible-state" role="status"><LoaderCircle size={24} className="bible-spin" /><p>Abriendo {versionId}...</p></div>}
    </div>
  </section>;
}
function IndependentColumn(props) {
  const [result, setResult] = useState({ chapter: null, error: '' });
  const [retry, setRetry] = useState(0);
  const { versionId, bookId, chapterNumber, online, installed } = props;
  useEffect(() => {
    const controller = new AbortController();
    loadBibleBook(versionId, bookId, controller.signal).then(book => {
      if (!controller.signal.aborted) setResult({ chapter: book.chapters[chapterNumber - 1], error: '' });
    }).catch(error => { if (!controller.signal.aborted) setResult({ chapter: null, error: error.message }); });
    return () => controller.abort();
  }, [versionId, bookId, chapterNumber, online, installed?.sha256, retry]);
  return <Column {...props} {...result} onRetry={() => { setResult({ chapter: null, error: '' }); setRetry(value => value + 1); }} />;
}
export default function BibleComparison({ ids, current, primary, installed, ...props }) {
  const track = useRef(null);
  const [active, setActive] = useState(ids[0]);
  const visible = ids.includes(active) ? active : ids[0];
  useEffect(() => {
    const element = track.current;
    const observer = new ResizeObserver(() => {
      const index = Math.round(element.scrollLeft / element.clientWidth);
      setActive(ids[index] || ids[0]);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ids]);
  function activate(id) {
    const index = ids.indexOf(id);
    track.current?.scrollTo({ left: index * track.current.clientWidth, behavior: 'instant' });
    setActive(id);
  }
  return <div className="bible-comparison">
    <nav className="bible-compare-tabs" aria-label="Versiones en comparación">{ids.map(id => <button type="button" key={id} aria-pressed={id === visible} onClick={() => activate(id)}>{id}</button>)}</nav>
    <div ref={track} className="bible-compare-track" style={{ '--comparison-count': ids.length }} onScroll={event => {
      if (event.target !== event.currentTarget) return;
      const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
      if (ids[index]) setActive(ids[index]);
    }}>
      {ids.map(id => {
        const columnProps = { ...props, versionId: id, bookId: current.book, chapterNumber: current.chapter, installed: installed[id] };
        return id === current.version ? <Column key={id} {...columnProps} {...primary} /> : <IndependentColumn key={id} {...columnProps} />;
      })}
    </div>
  </div>;
}

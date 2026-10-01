import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, RotateCw, WifiOff } from 'lucide-react';
import BibleText from './BibleText';
import { loadBibleBook } from '../../lib/bibleLibrary';
import { versions } from '../../lib/bibleModel';
import { elementAnchors, positionOffset, readingPosition } from '../../lib/bibleScroll';

function Column({ versionId, bookId, chapterNumber, chapter, error, onRetry, installed, online, onNote, onVerse, favorites, fontSize, redLetters, selectedReference, onScroll, onContentChange }) {
  const version = versions.find(entry => entry.id === versionId);
  const book = version.books.find(entry => entry.id === bookId);
  useEffect(() => { onContentChange(); }, [chapter, fontSize, onContentChange]);
  return <section className="bible-compare-column" aria-label={`Comparación ${versionId}`}>
    <header><div><strong>{versionId}</strong><span>{book.title} {chapterNumber}</span></div>{installed ? <Check size={16} aria-label="Descargada" /> : !online ? <WifiOff size={16} aria-label="Sin conexión" /> : null}</header>
    <div onScroll={onScroll} className={`bible-compare-scroll bible-chapter ${redLetters ? 'bible-red-letters' : ''}`} role="region" aria-label={`Lectura ${versionId}`} tabIndex={0} style={{ '--bible-font-size': `${fontSize}px` }}>
      {chapter ? <div className="bible-compare-content"><BibleText nodes={chapter.nodes} onNote={nodes => onNote(nodes, versionId)} onVerse={reference => onVerse(reference, versionId, chapter)} favorites={favorites.filter(entry => entry.version === versionId).map(entry => entry.reference)} selectedReference={selectedReference} /><p className="bible-copyright">{version.copyright}</p></div> : error ? <div className="bible-state" role="alert"><WifiOff size={24} /><p>{online ? error : `${versionId} no está descargada en este dispositivo.`}</p><button type="button" className="bible-command" onClick={onRetry}><RotateCw size={16} />Reintentar</button></div> : <div className="bible-state" role="status"><LoaderCircle size={24} className="bible-spin" /><p>Abriendo {versionId}...</p></div>}
    </div>
  </section>;
}
function LoadedColumn(props) {
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
  const position = useRef({ verse: 1, fraction: 0, intro: 0 });
  const expectedScroll = useRef(new WeakMap());
  const frame = useRef(0);
  const applyPosition = useCallback((except = null) => {
    const targets = [...(track.current?.querySelectorAll('.bible-compare-scroll') || [])]
      .filter(element => element !== except)
      .map(element => ({ element, top: positionOffset(elementAnchors(element), position.current) }));
    for (const { element, top } of targets) {
      const clamped = Math.min(top, Math.max(0, element.scrollHeight - element.clientHeight));
      if (Math.abs(element.scrollTop - clamped) < 0.5) continue;
      // Ignore only scroll events caused by synchronization, not subsequent user input.
      element.scrollTo({ top: clamped, behavior: 'instant' });
      expectedScroll.current.set(element, element.scrollTop);
    }
  }, []);
  const contentChanged = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => applyPosition());
  }, [applyPosition]);
  const handleScroll = useCallback(event => {
    if (event.target !== event.currentTarget) return;
    const element = event.currentTarget;
    const expected = expectedScroll.current.get(element);
    expectedScroll.current.delete(element);
    if (expected !== undefined && Math.abs(expected - element.scrollTop) < 1) return;
    const next = readingPosition(elementAnchors(element), element.scrollTop);
    if (!next) return;
    position.current = next;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => applyPosition(element));
  }, [applyPosition]);
  useEffect(() => {
    let active = true;
    const observer = new ResizeObserver(contentChanged);
    observer.observe(track.current);
    document.fonts.ready.then(() => { if (active) contentChanged(); });
    return () => { active = false; observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, [contentChanged]);
  return <div className="bible-comparison">
    <div ref={track} className="bible-compare-track" style={{ '--comparison-count': ids.length }}>
      {ids.map(id => {
        const columnProps = { ...props, versionId: id, bookId: current.book, chapterNumber: current.chapter, installed: installed[id], onScroll: handleScroll, onContentChange: contentChanged };
        return id === current.version ? <Column key={id} {...columnProps} {...primary} /> : <LoadedColumn key={id} {...columnProps} />;
      })}
    </div>
  </div>;
}

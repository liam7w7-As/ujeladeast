import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { elementAnchors, positionOffset, readingPosition, referenceNumbers } from '../lib/bibleScroll';
import { bookmarkKey } from '../lib/bibleModel';
import { readReadingPoint, rememberReadingPoint } from '../lib/bibleReadingResume';

export function useBibleReadingResume({ location, chapter, comparing, reference, targetPoint, fontSize, fontFamily }) {
  const { version, book, chapter: chapterNumber } = location;
  const key = bookmarkKey(location);
  const articleRef = useRef(null), point = useRef(null), pending = useRef(null), timer = useRef(0), reshape = useRef(null);
  const restored = useRef(null), consumedTargets = useRef(new WeakSet());
  const [element, setElement] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const attachArticle = useCallback(node => { articleRef.current = node; setElement(node); }, []);
  const flush = useCallback(() => {
    clearTimeout(timer.current); timer.current = 0;
    if (!pending.current) return;
    const { location, position } = pending.current; pending.current = null;
    setStorageError(!rememberReadingPoint(location, position));
  }, []);
  const record = useCallback(position => {
    if (!position) return;
    if (pending.current && bookmarkKey(pending.current.location) !== key) flush();
    point.current = { key, position };
    pending.current = { location: { version, book, chapter: chapterNumber }, position };
    if (!timer.current) timer.current = setTimeout(flush, 250);
  }, [key, version, book, chapterNumber, flush]);
  const getPosition = useCallback(() => point.current?.key === key ? point.current.position : readReadingPoint({ version, book, chapter: chapterNumber }), [key, version, book, chapterNumber]);
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hidden);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden); };
  }, [flush]);
  useLayoutEffect(() => {
    if (!element || element.dataset.readingKey !== key || !chapter || comparing) return;
    // A refreshed book or a history visit must not replay an old navigation intent.
    const freshTarget = targetPoint && !consumedTargets.current.has(targetPoint);
    const freshReference = reference && (freshTarget || restored.current?.key !== key || restored.current.reference !== reference);
    let position = freshReference ? { verse: referenceNumbers(reference)[0] || 1, fraction: 0 }
      : freshTarget ? targetPoint : point.current?.key === key ? point.current.position
        : readReadingPoint({ version, book, chapter: chapterNumber }) || { verse: 1, fraction: 0, intro: 0 };
    if (targetPoint) consumedTargets.current.add(targetPoint);
    restored.current = { key, reference };
    let active = true, expected = null, frame = 0, dimensions = '';
    const geometry = () => `${element.clientWidth}:${element.clientHeight}:${element.scrollHeight}`;
    const apply = () => {
      if (!active) return;
      const anchors = elementAnchors(element);
      if (!anchors.length) return;
      cancelAnimationFrame(frame); frame = 0;
      dimensions = geometry();
      const top = Math.min(positionOffset(anchors, position), Math.max(0, element.scrollHeight - element.clientHeight));
      element.scrollTo({ top, behavior: 'instant' }); expected = element.scrollTop;
      record(position);
    };
    const scroll = () => {
      if (dimensions !== geometry()) { apply(); return; }
      if (expected !== null && Math.abs(element.scrollTop - expected) < 1) { expected = null; return; }
      expected = null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        position = readingPosition(elementAnchors(element), element.scrollTop) || position;
        record(position);
      });
    };
    apply(); reshape.current = apply;
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    if (element.querySelector('.bible-text-content')) observer.observe(element.querySelector('.bible-text-content'));
    document.fonts.ready.then(() => { if (active) apply(); });
    element.addEventListener('scroll', scroll, { passive: true });
    return () => {
      active = false;
      if (frame) { cancelAnimationFrame(frame); record(readingPosition(elementAnchors(element), element.scrollTop) || position); }
      flush(); observer.disconnect(); element.removeEventListener('scroll', scroll);
      if (reshape.current === apply) reshape.current = null;
    };
  }, [element, key, version, book, chapterNumber, chapter, comparing, reference, targetPoint, record, flush]);
  useLayoutEffect(() => { reshape.current?.(); }, [fontSize, fontFamily]);
  const focusArticle = useCallback(() => articleRef.current?.focus({ preventScroll: true }), []);
  return { attachArticle, getPosition, recordComparison: record, storageError, flush, focusArticle };
}

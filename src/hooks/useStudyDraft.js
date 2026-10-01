import { useEffect, useState } from 'react';
import { draftKey, restoreDraft, serializeDraft } from '../lib/studyJourney';

export function useStudyDraft(userId, lesson) {
  const key = draftKey(userId, lesson.id);
  const [initial] = useState(() => {
    try { return { draft: restoreDraft(lesson, JSON.parse(localStorage.getItem(key))), error: false }; }
    catch { return { draft: restoreDraft(lesson), error: true }; }
  });
  const [draft, setDraft] = useState(initial.draft);
  const [storageError, setStorageError] = useState(initial.error);
  const [finished, setFinished] = useState(false);
  const readOnly = lesson.user_progress?.completed === true;

  // Write in the input event, not a debounce: navigating away cannot lose the last keystroke.
  const changeDraft = patch => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (readOnly || finished) return;
    try { localStorage.setItem(key, serializeDraft(lesson, next)); setStorageError(false); }
    catch { setStorageError(true); }
  };
  useEffect(() => {
    if (!storageError || readOnly || finished) return;
    const preventLoss = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [storageError, readOnly, finished]);

  const clearDraft = () => {
    setFinished(true);
    try { localStorage.removeItem(key); } catch { /* Completed answers already live in Supabase. */ }
  };
  return { draft, changeDraft, storageError, clearDraft };
}

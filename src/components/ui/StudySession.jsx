import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, CircleAlert, CloudCheck, LoaderCircle, MessageCircle, Plus, X } from 'lucide-react';
import { lessonQuestions, lessonSteps, missingAnswers } from '../../lib/studyJourney';
import { useStudyDraft } from '../../hooks/useStudyDraft';
import { BEFORE_APP_UPDATE } from '../../lib/appUpdate';
import AppDialog from './AppDialog';
import ujeladitoAvatar from '../../assets/ujeladito-avatar.png';
import './study-session.css';

export default function StudySession({ userId, lesson, ordinal, total, onExit, onComplete }) {
  const { draft, changeDraft, storageError, clearDraft } = useStudyDraft(userId, lesson);
  const readOnly = lesson.user_progress?.completed === true;
  const steps = lessonSteps(lesson);
  const [reviewStep, setReviewStep] = useState(0);
  const stepIndex = readOnly ? reviewStep : draft.step;
  const step = steps[stepIndex];
  const questions = lessonQuestions(lesson);
  const answers = readOnly ? lesson.user_progress.answers || {} : draft.answers;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const lock = useRef(false);
  const heading = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const protectStudy = event => {
      if (lock.current || (storageError && !readOnly && !result)) {
        event.preventDefault();
        event.detail.reason = lock.current
          ? 'Tu estudio se está guardando. Espera a que termine y vuelve a actualizar.'
          : 'Tu borrador no está guardado. Guarda el estudio antes de actualizar.';
      }
    };
    window.addEventListener(BEFORE_APP_UPDATE, protectStudy);
    return () => window.removeEventListener(BEFORE_APP_UPDATE, protectStudy);
  }, [storageError, readOnly, result]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [stepIndex, result]);

  const go = index => {
    setError('');
    setTransitioning(!reduced);
    if (readOnly) setReviewStep(index);
    else changeDraft({ step: index });
  };
  const ask = () => {
    const extraContext = `Lección: ${lesson.title}\nReferencia: ${lesson.scripture_ref || ''}\nPregunta: ${step.question?.text || ''}\nDa pistas para comprender el pasaje, sin resolver la actividad por la persona.`;
    window.dispatchEvent(new CustomEvent('ujeladito:open', { detail: { contextType: 'estudio', extraContext } }));
  };
  const addVerse = () => {
    const value = draft.verseInput.trim();
    if (value) changeDraft({ favoriteVerses: [...new Set([...draft.favoriteVerses, value])], verseInput: '' });
  };
  const next = async event => {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    if (!readOnly && step.question?.required && !answers[step.question.index]?.trim()) {
      setError('Esta respuesta está vacía. Escribe tu reflexión antes de continuar.');
      return;
    }
    if (stepIndex < steps.length - 1) { go(stepIndex + 1); return; }
    if (readOnly) { onExit(); return; }
    const missing = missingAnswers(lesson, answers);
    if (missing.length) {
      go(steps.findIndex(item => item.question?.index === missing[0].index));
      setError('Queda una pregunta sin responder. Tu borrador se conserva.');
      return;
    }
    lock.current = true; setBusy(true);
    try {
      const favoriteVerses = [...new Set([...draft.favoriteVerses, draft.verseInput.trim()].filter(Boolean))];
      const saved = await onComplete({ answers, journalContent: draft.journalContent, favoriteVerses });
      clearDraft();
      setResult(saved || {});
    } catch (err) {
      setError(['study_content_changed', 'study_week_locked'].includes(err.code) ? err.message : 'No pudimos guardar el estudio completo. Tus respuestas siguen aquí; revisa la conexión e intenta de nuevo.');
    } finally { lock.current = false; setBusy(false); }
  };
  const exit = () => storageError && !readOnly && !result ? setConfirmExit(true) : onExit();
  const actions = mobile => <div className={`study-session-actions${mobile ? ' study-session-actions-mobile' : ''}`}>
    <button type="button" onClick={() => go(stepIndex - 1)} disabled={busy || transitioning || stepIndex === 0} className="study-back"><ArrowLeft size={18} />Anterior</button>
    <motion.button type="submit" form="study-session-form" className="study-primary" disabled={busy || transitioning} whileTap={reduced ? undefined : { scale: 0.98 }}>{busy ? <><LoaderCircle size={18} className="animate-spin" />Guardando...</> : <>{step.id === 'close' ? readOnly ? 'Volver al estudio' : 'Guardar estudio' : 'Continuar'}<ArrowRight size={18} /></>}</motion.button>
  </div>;

  return <section className="study-session" aria-label="Estudio por pasos">
    <div className="study-session-toolbar">
      <button type="button" onClick={exit} disabled={busy}><ArrowLeft size={18} />Mi estudio</button>
      <span className="study-save-status" role="status">{readOnly ? <><CheckCircle2 size={15} />Completado</> : result ? <><CloudCheck size={15} />Guardado</> : storageError ? <><CircleAlert size={15} />Sin guardar</> : <><Check size={15} />Borrador en este navegador</>}</span>
    </div>
    {result ? <motion.div className="study-finished" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <CheckCircle2 size={44} /><h1 ref={heading} tabIndex={-1}>Estudio guardado</h1>
      <p>{lesson.title}</p><p>Tus respuestas ya forman parte de tu recorrido.</p>
      {result.notice && <p role="status" className="study-notice">{result.notice}</p>}
      <button type="button" className="study-primary" onClick={onExit}>Volver a mi estudio<ArrowRight size={18} /></button>
    </motion.div> : <>
      <header className="study-session-heading">
        <p className="study-eyebrow">{ordinal ? `Día ${ordinal} de ${total}` : `Día ${lesson.day_number}`}{readOnly ? ' · Relectura' : ''}</p>
        <h1>{lesson.title}</h1>
        {lesson.scripture_ref && <p className="study-reference"><BookOpen size={17} />{lesson.scripture_ref}</p>}
      </header>
      <div className="study-step-progress" aria-label={`Paso ${stepIndex + 1} de ${steps.length}: ${step.label}`}>
        <ol className="study-session-stages" aria-label="Etapas del estudio">{['Leer', ...(lesson.teaching?.trim() ? ['Comprender'] : []), ...(questions.length ? ['Reflexionar'] : []), 'Cerrar'].map(label => <li key={label} aria-current={step.label === label ? 'step' : undefined}>{label}</li>)}</ol>
        <div><span>{step.label}</span><span>{stepIndex + 1} / {steps.length}</span></div>
        <progress value={stepIndex + 1} max={steps.length} />
      </div>
      {storageError && !readOnly && <p role="alert" className="study-notice">No se pudo guardar el borrador en este navegador. Mantén esta página abierta hasta guardar el estudio.</p>}
      {draft.revised && !readOnly && <p className="study-notice">El contenido se actualizó. Revisa de nuevo la lección; conservamos las respuestas que siguen correspondiendo a sus preguntas.</p>}
      <AnimatePresence mode="wait" initial={false}>
        <motion.form id="study-session-form" key={step.id} onSubmit={next} className="study-step" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: 0.16 }} aria-busy={busy} onAnimationComplete={definition => { if (definition?.opacity === 1) { setTransitioning(false); heading.current?.focus({ preventScroll: true }); } }}>
          <h2 ref={heading} tabIndex={-1}>{step.id === 'read' ? 'El pasaje' : step.id === 'teaching' ? 'La enseñanza' : step.question ? `Pregunta ${step.number} de ${questions.length}` : readOnly ? 'Tus respuestas guardadas' : 'Tu cierre de hoy'}</h2>
          {step.id === 'read' && (lesson.scripture_text?.trim()
            ? <div className="study-reading" dangerouslySetInnerHTML={{ __html: lesson.scripture_text }} />
            : <p className="study-reading">Lee {lesson.scripture_ref || 'el pasaje de esta lección'} en tu Biblia.</p>)}
          {step.id === 'teaching' && <div className="study-reading" dangerouslySetInnerHTML={{ __html: lesson.teaching }} />}
          {step.question && <div className="study-answer-field">
            <label htmlFor={`study-answer-${step.question.index}`}>{step.question.text}{!step.question.required && <span> (opcional)</span>}</label>
            {readOnly ? <p className="study-saved-answer">{answers[step.question.index] || 'No se guardó una respuesta.'}</p>
              : <textarea id={`study-answer-${step.question.index}`} value={answers[step.question.index] || ''} onChange={event => changeDraft({ answers: { ...answers, [step.question.index]: event.target.value } })} placeholder="Tu reflexión..." aria-required={step.question.required} aria-describedby={error ? 'study-session-error' : undefined} disabled={busy} />}
          </div>}
          {step.id !== 'close' && <div className="study-help"><img src={ujeladitoAvatar} alt="" /><button type="button" onClick={ask}><MessageCircle size={17} />Tengo una duda</button></div>}
          {step.id === 'close' && <>
            {questions.length > 0 && <details className="study-answer-review" open={readOnly || undefined}><summary>Mis respuestas ({questions.length})</summary>{questions.map(question => <div key={question.index}><h3>{question.text}</h3><p>{answers[question.index] || 'Sin respuesta (opcional)'}</p></div>)}</details>}
            {!readOnly && <>
              <div className="study-answer-field"><label htmlFor="study-journal">Mi diario <span>(opcional)</span></label><textarea id="study-journal" value={draft.journalContent} onChange={event => changeDraft({ journalContent: event.target.value })} placeholder="Algo que quiero recordar, una oración o una reflexión..." disabled={busy} /></div>
              <div className="study-verse-field"><label htmlFor="study-verse">Versículo para recordar <span>(opcional)</span></label><div><input id="study-verse" value={draft.verseInput} onChange={event => changeDraft({ verseInput: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addVerse(); } }} placeholder="Ej. Santiago 1:19" disabled={busy} /><button type="button" title="Añadir versículo" aria-label="Añadir versículo" onClick={addVerse} disabled={busy || !draft.verseInput.trim()}><Plus size={20} /></button></div>
                <ul>{draft.favoriteVerses.map(verse => <li key={verse}>{verse}<button type="button" aria-label={`Quitar ${verse}`} title="Quitar versículo" onClick={() => changeDraft({ favoriteVerses: draft.favoriteVerses.filter(item => item !== verse) })} disabled={busy}><X size={15} /></button></li>)}</ul>
              </div>
            </>}
          </>}
          {error && <p id="study-session-error" role="alert" className="study-notice"><CircleAlert size={18} />{error}</p>}
        </motion.form>
      </AnimatePresence>
      {actions(false)}
      {createPortal(actions(true), document.body)}
    </>}
    <AppDialog open={confirmExit} onClose={() => setConfirmExit(false)} title="El borrador no está guardado"><div className="p-5"><p className="text-sm leading-7 mb-5">Si sales ahora, podrías perder los cambios de esta lección.</p><button type="button" className="study-primary" onClick={() => setConfirmExit(false)}>Seguir estudiando</button><button type="button" className="study-back mt-4" onClick={onExit}>Salir sin guardar</button></div></AppDialog>
  </section>;
}

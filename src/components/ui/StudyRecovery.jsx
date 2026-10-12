import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, LoaderCircle, RotateCcw, Send } from 'lucide-react';
import AppDialog from './AppDialog';
import { supabase } from '../../lib/supabase';
import { BEFORE_APP_UPDATE } from '../../lib/appUpdate';
import { answerLength, readRecoveryDraft, recoveryDate, recoveryDeadline, recoveryDraftKey, recoveryError, recoveryLabels, recoveryText, validRecoveryAnswers } from '../../lib/studyRecovery';
import './study-recovery.css';

function RecoverySession({ userId, initial, serverNow, onClose, onStatus }) {
  const [request, setRequest] = useState(initial);
  const [draft, setDraft] = useState(() => readRecoveryDraft(userId, initial));
  const [step, setStep] = useState(initial.status === 'draft' ? 'read' : 'answers');
  const [error, setError] = useState(''), [storageError, setStorageError] = useState(false);
  const [busy, setBusy] = useState(false), [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const readOnly = request.status !== 'draft';
  const expired = Date.parse(serverNow) >= Date.parse(request.expires_at);
  const key = recoveryDraftKey(userId, request.id);
  useEffect(() => {
    const block = event => {
      if (!lock.current && (!storageError || readOnly)) return;
      event.preventDefault();
      if (event.detail) event.detail.reason = 'El repaso se está enviando o tiene respuestas sin guardar.';
      else event.returnValue = '';
    };
    window.addEventListener(BEFORE_APP_UPDATE, block); window.addEventListener('beforeunload', block);
    return () => { window.removeEventListener(BEFORE_APP_UPDATE, block); window.removeEventListener('beforeunload', block); };
  }, [storageError, readOnly]);
  function change(patch) {
    const next = { ...draft, ...patch }; setDraft(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current || readOnly || expired) return;
    if (!draft.read || !validRecoveryAnswers(draft.answers)) { setError('Confirma la lectura y desarrolla las tres respuestas: al menos 40 caracteres sin espacios en cada una.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const { data, error } = await supabase.rpc('submit_study_recovery', { p_request_id: request.id, p_answers: draft.answers, p_read: draft.read });
      if (error) throw error;
      if (!data?.status?.atomic || !['pending', 'approved', 'rejected'].includes(data.request?.status)) throw new Error('Invalid confirmation');
      setRequest(data.request); setDraft({ answers: data.request.answers, read: true }); onStatus(data.status);
      try { localStorage.removeItem(key); } catch { /* Confirmed answers live in Supabase. */ }
      setStorageError(false);
    } catch (error) { setError(recoveryError(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  function close() { if (lock.current) return; if (storageError && !readOnly) setDiscard(true); else onClose(); }
  const lesson = request.snapshot;
  return <AppDialog open onClose={close} busy={busy} title="Repaso de recuperación" wide>
    <div className="recovery-session">
      <header><span className={`recovery-status is-${request.status}`}>{recoveryLabels[request.status]}</span><h3>{lesson.title}</h3><p><BookOpen size={16} />{lesson.scripture_ref}</p></header>
      <p className="recovery-policy">Día a recuperar: {recoveryDate(request.missed_day)}. No suma XP ni días a la racha real del campamento.</p>
      {!readOnly && <p className="recovery-deadline"><Clock3 size={15} />Envía antes del {recoveryDeadline(request.expires_at)} (Bolivia).</p>}
      {!readOnly && expired && <p role="alert" className="recovery-error">El plazo de envío terminó. Tu borrador se conserva, pero este día ya no se puede recuperar.</p>}
      <div className="recovery-modes" role="group" aria-label="Contenido del repaso"><button type="button" aria-pressed={step === 'read'} onClick={() => setStep('read')}>Lectura</button><button type="button" aria-pressed={step === 'answers'} onClick={() => setStep('answers')}>Tres preguntas</button></div>
      {step === 'read' ? <section className="recovery-reading" aria-label="Lectura para recuperar">
        <p>{recoveryText(lesson.scripture_text) || 'Lee el pasaje indicado en tu Biblia.'}</p>
        {lesson.teaching && <><h4>Para reflexionar</h4><p>{recoveryText(lesson.teaching)}</p></>}
        <button type="button" className="recovery-command is-primary" onClick={() => setStep('answers')}>Ir al repaso<ArrowRight size={17} /></button>
      </section> : <form onSubmit={submit}>
        {readOnly && <p role="status" className="recovery-confirmation"><CheckCircle2 size={20} />{request.status === 'pending' ? 'Repaso recibido. Un administrador revisará tus respuestas.' : recoveryLabels[request.status]}</p>}
        {lesson.questions.map((question, i) => <label className="recovery-answer" key={i}><span>{i + 1}. {question}</span><textarea aria-label={`Respuesta ${i + 1}`} rows={4} maxLength={2000} value={draft.answers[i]} readOnly={readOnly} disabled={busy} onChange={event => change({ answers: draft.answers.map((value, n) => n === i ? event.target.value : value) })} />{!readOnly && <small>{answerLength(draft.answers[i])}/40 caracteres mínimos sin espacios</small>}</label>)}
        {request.decision_note && <div className="recovery-feedback"><h4>Observación del administrador</h4><p>{request.decision_note}</p></div>}
        {!readOnly && <><label className="recovery-check"><input type="checkbox" checked={draft.read} disabled={busy} onChange={event => change({ read: event.target.checked })} />He vuelto a leer el pasaje y respondí con mis palabras.</label><p className="recovery-policy">Tus respuestas se compartirán con los administradores para revisar este repaso.</p></>}
        {storageError && <p role="alert">No se pudo guardar el borrador en este dispositivo. No cierres el repaso hasta enviarlo.</p>}
        {error && <p className="recovery-error" role="alert">{error}</p>}
        {!readOnly && <button type="submit" className="recovery-command is-primary" disabled={busy || expired || !draft.read || !validRecoveryAnswers(draft.answers)}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={17} />}Enviar a revisión</button>}
      </form>}
      {discard && <div className="recovery-error" role="alert"><p>Hay respuestas sin guardar. ¿Cerrar y perder esos cambios?</p><button type="button" className="recovery-command" onClick={() => setDiscard(false)}>Seguir escribiendo</button><button type="button" className="recovery-command" onClick={onClose}>Cerrar sin guardar</button></div>}
    </div>
  </AppDialog>;
}

export default function StudyRecovery({ userId, recovery, serverNow, unconfirmed, onStatus, onRefresh }) {
  const [request, setRequest] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef(true), lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  if (recovery?.version !== 1) return null;
  const previous = recovery.request;
  async function open(start) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = start ? await supabase.rpc('begin_study_recovery') : await supabase.from('study_streak_recoveries').select('*').eq('id', previous.id).single();
      if (result.error) throw result.error;
      if (!result.data?.snapshot?.questions || result.data.user_id !== userId) throw new Error('Invalid recovery');
      if (active.current) setRequest(result.data);
    } catch (error) { if (active.current) { setError(recoveryError(error)); onRefresh(); } }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <section className="study-recovery" aria-label="Recuperación de racha">
    <h3><RotateCcw size={17} />Un nuevo impulso</h3>
    {recovery.eligible ? <><p>Puedes recuperar el {recoveryDate(recovery.missed_day)} con un repaso.</p><p className="recovery-policy">Un día perdido. Una recuperación cada 30 días. Requiere aprobación.</p><button type="button" className="recovery-command" disabled={busy || unconfirmed} onClick={() => open(true)}>{busy ? <LoaderCircle size={17} className="animate-spin" /> : <BookOpen size={17} />}{previous?.status === 'draft' && previous.missed_day === recovery.missed_day ? 'Continuar repaso' : 'Recuperar un día'}</button></>
      : previous ? <><p>{recoveryLabels[previous.status]} · {recoveryDate(previous.missed_day)}</p>{previous.status === 'draft' && <p>El plazo ya terminó. Puedes consultar tu borrador.</p>}<button type="button" className="recovery-command" disabled={busy} onClick={() => open(false)}>{busy ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}Ver repaso</button></>
        : <p>Disponible cuando se pierde un solo día, durante las 48 horas siguientes a su cierre.</p>}
    {recovery.reason === 'cooldown' && <p className="recovery-policy">Ya hay un día recuperado dentro del período de 30 días.</p>}
    {error && <p role="alert" className="recovery-error">{error}</p>}
    {request && <RecoverySession key={request.id} userId={userId} initial={request} serverNow={serverNow} onClose={() => { setRequest(null); onRefresh(); }} onStatus={onStatus} />}
  </section>;
}

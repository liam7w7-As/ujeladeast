import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AppDialog from '../ui/AppDialog';
import { BEFORE_APP_UPDATE } from '../../lib/appUpdate';
import { recoveryDate, recoveryError, recoveryLabels, recoveryText } from '../../lib/studyRecovery';
import '../ui/study-recovery.css';

function Review({ request, onClose, onReviewed }) {
  const [note, setNote] = useState(''), [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    const block = event => { if (lock.current) { event.preventDefault(); event.detail.reason = 'Espera a que se confirme la revisión del repaso.'; } };
    window.addEventListener(BEFORE_APP_UPDATE, block);
    return () => window.removeEventListener(BEFORE_APP_UPDATE, block);
  }, []);
  async function review(approve) {
    if (lock.current || !checked || note.trim().length < 10) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { data, error } = await supabase.rpc('review_study_recovery', { p_request_id: request.id, p_approve: approve, p_note: note });
      if (error) throw error;
      if (!['approved', 'rejected'].includes(data?.status)) throw new Error('Invalid review');
      onReviewed();
    } catch (error) { setError(recoveryError(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <AppDialog open title="Revisar recuperación" busy={busy} onClose={() => { if (!lock.current) onClose(); }} wide>
    <div className="recovery-session">
      <header><span className={`recovery-status is-${request.status}`}>{recoveryLabels[request.status]}</span><h3>{request.full_name || 'Sin nombre'}</h3><p>{request.church_name || 'Sin iglesia'} · {recoveryDate(request.missed_day)}</p></header>
      <h3>{request.snapshot.title}</h3><p>{request.snapshot.scripture_ref}</p>
      <details className="recovery-reading"><summary>Pasaje y enseñanza del repaso</summary><p>{recoveryText(request.snapshot.scripture_text)}</p><p>{recoveryText(request.snapshot.teaching)}</p></details>
      {request.snapshot.questions.map((question, i) => <section className="recovery-feedback" key={i}><h4>{i + 1}. {question}</h4><p>{request.answers?.[i]}</p></section>)}
      {request.status === 'pending' ? <>
        <label className="recovery-answer"><span>Observación para el joven</span><textarea className="recovery-note" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} disabled={busy} /></label>
        <label className="recovery-check"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} disabled={busy} />Revisé la comprensión del pasaje y la aplicación personal.</label>
        <p className="recovery-policy">Aprobar restaura la continuidad personal. No cambia fechas de estudios, XP ni la clasificación del campamento.</p>
        <button type="button" className="recovery-command" disabled={busy || !checked || note.trim().length < 10} onClick={() => review(false)}><X size={17} />No aprobar</button>
        <button type="button" className="recovery-command is-primary" disabled={busy || !checked || note.trim().length < 10} onClick={() => review(true)}>{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}Aprobar recuperación</button>
      </> : <section className="recovery-feedback"><h4>Observación registrada</h4><p>{request.decision_note}</p><p className="recovery-policy">Revisado: {new Date(request.reviewed_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</p></section>}
      {error && <p role="alert" className="recovery-error">{error}</p>}
    </div>
  </AppDialog>;
}

export default function StudyRecoveriesAdmin() {
  const [filter, setFilter] = useState('pending'), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null), [selected, setSelected] = useState(null);
  const key = `${filter}:${page}:${revision}`;
  const ready = result?.key === key;
  useEffect(() => {
    let active = true;
    supabase.rpc('admin_study_recoveries', { p_status: filter, p_offset: page * 20 }).then(({ data, error }) => {
      if (!active) return;
      if (error || !Array.isArray(data?.items)) setResult({ key, error: recoveryError(error) });
      else if (!data.items.length && page > 0) setPage(Math.max(0, Math.ceil(data.total / 20) - 1));
      else setResult({ key, ...data });
    }).catch(error => { if (active) setResult({ key, error: recoveryError(error) }); });
    return () => { active = false; };
  }, [filter, page, revision, key]);
  return <section aria-label="Recuperaciones de racha" className="space-y-5">
    <header className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Recuperaciones de racha</h1><p className="recovery-policy">Repasos enviados por los jóvenes. La clasificación del campamento conserva la racha real.</p></div><button type="button" className="recovery-command" title="Actualizar recuperaciones" aria-label="Actualizar recuperaciones" onClick={() => setRevision(value => value + 1)} disabled={!ready}><RefreshCw size={18} /></button></header>
    <label className="block text-sm max-w-xs">Estado<select aria-label="Estado de recuperación" value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }} className="block w-full mt-2 p-3 rounded border border-white/20 bg-surface-container">{['pending', 'approved', 'rejected'].map(value => <option key={value} value={value}>{recoveryLabels[value]}</option>)}</select></label>
    {!ready ? <p role="status">Cargando repasos...</p> : result.error ? <p role="alert" className="recovery-error">{result.error}</p> : <>
      <p className="text-sm text-on-surface-variant">{result.total} solicitudes</p>
      <div className="recovery-admin-list">{result.items.map(request => <button type="button" key={request.id} onClick={() => setSelected(request)}><span><strong>{request.full_name || 'Sin nombre'}</strong><small>{request.church_name || 'Sin iglesia'} · {recoveryDate(request.missed_day)}</small><small>{request.snapshot.title}</small></span><ChevronRight size={20} /></button>)}</div>
      {!result.items.length && <p>No hay solicitudes en este estado.</p>}
      {result.total > 20 && <nav aria-label="Páginas de recuperaciones" className="flex items-center justify-between"><button type="button" className="recovery-command" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(value => value - 1)}><ChevronLeft size={18} /></button><span>{page + 1} / {Math.ceil(result.total / 20)}</span><button type="button" className="recovery-command" aria-label="Página siguiente" disabled={(page + 1) * 20 >= result.total} onClick={() => setPage(value => value + 1)}><ChevronRight size={18} /></button></nav>}
    </>}
    {selected && <Review key={selected.id} request={selected} onClose={() => setSelected(null)} onReviewed={() => { setSelected(null); setPage(0); setRevision(value => value + 1); }} />}
  </section>;
}

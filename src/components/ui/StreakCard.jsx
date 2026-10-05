import { Check, LoaderCircle, RotateCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { daysSince, studyDay } from '../../lib/studyTracking';

export default function StreakCard({ data, loading, error, onRetry }) {
  const confirmed = data && !error;
  const reduced = useReducedMotion();
  const burning = confirmed && data.current_streak > 0;
  const today = confirmed && (data.atomic ? data.today_completed : daysSince(data.last_study_date) === 0);
  const dateLabel = value => new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(studyDay(value) * 86400000));
  return <section className="rounded-lg border border-surface-border p-5" aria-label="Tu racha" aria-busy={loading}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-on-surface-variant">Racha activa</h2><motion.span aria-hidden="true" className={`flex h-16 w-16 shrink-0 items-center justify-center text-5xl leading-none ${burning ? '' : 'grayscale opacity-40'}`} style={{ fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif', transformOrigin: '50% 85%' }} animate={burning && !reduced ? { scale: [1, 1.1, 1], rotate: [0, 4, -3, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 2.4, repeat: burning && !reduced ? Infinity : 0, ease: 'easeInOut' }}>{'\u{1F525}'}</motion.span></div>
    {error ? <div role="alert" className="mt-4"><p className="text-sm text-on-surface-variant">{error}</p><button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm" onClick={onRetry} disabled={loading}><RotateCw size={17} />Reintentar racha</button></div>
      : !data ? <p role="status" className="mt-4 flex items-center gap-2 text-sm"><LoaderCircle size={18} className="animate-spin" />Consultando racha...</p>
        : <><p className="mt-2"><strong className="text-4xl font-bold text-white">{data.current_streak}</strong><span className="ml-2 text-sm text-on-surface-variant">días</span></p>
          <p className={`mt-3 flex items-center gap-2 text-sm ${today ? 'text-emerald-300' : 'text-on-surface-variant'}`}>{today && <Check size={16} />}{today ? 'Hoy completado' : 'Hoy pendiente'}</p>
          {!!data.recent_days?.length && <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Últimos siete días">{data.recent_days.map(day => <li key={day.date} title={`${dateLabel(day.date)}: ${day.completed ? 'completado' : 'sin completar'}`} className="min-w-0 text-center"><span className="block text-[10px] text-on-surface-variant">{new Intl.DateTimeFormat('es-BO', { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</span><span className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${day.completed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-on-surface-variant'}`} aria-label={`${dateLabel(day.date)}: ${day.completed ? 'completado' : 'sin completar'}`}>{day.completed ? <Check size={15} /> : Number(day.date.slice(-2))}</span></li>)}</ol>}
          {data.last_study_date && <p className="mt-3 text-xs text-on-surface-variant">Último estudio: {dateLabel(data.last_study_date)}</p>}
        </>}
  </section>;
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Circle, RefreshCw, Search, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { collectPages, STUDY_TIME_ZONE, trackingRows } from '../../lib/studyTracking';

const STATUS = { 'not-started': 'Sin iniciar', active: 'Activo', inactive: 'Sin actividad reciente', completed: 'Completado' };
const STATUS_STYLE = { 'not-started': 'text-on-surface-variant', active: 'text-emerald-400', inactive: 'text-amber-300', completed: 'text-sky-300' };
const inputClass = 'min-w-0 rounded-lg border border-surface-border bg-surface-container px-3 py-2.5 text-sm text-white outline-none focus:border-primary w-full';
const buttonClass = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-border hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed';
const dateFormatter = new Intl.DateTimeFormat('es-BO', { timeZone: STUDY_TIME_ZONE, dateStyle: 'medium' });
const formatDate = value => value ? dateFormatter.format(new Date(value)) : 'Sin registro';
const lessonLabel = lesson => lesson ? `S${lesson.week_number} · D${lesson.day_number}: ${lesson.title}` : null;

export default function AdminStudyTracking() {
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [data, setData] = useState({ profiles: [], lessons: [], weeks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [church, setChurch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const nextPlans = await collectPages((from, to) => supabase.from('study_plans')
          .select('id,title,created_at').order('created_at', { ascending: false }).order('id').range(from, to));
        if (cancelled) return;
        setPlans(nextPlans);
        setPlanId(current => nextPlans.some(plan => plan.id === current) ? current : nextPlans[0]?.id || '');
        if (!nextPlans.length) setLoading(false);
      } catch {
        if (!cancelled) { setError('No se pudieron cargar los planes de estudio.'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    async function load() {
      try {
        const [profiles, weeks, lessons] = await Promise.all([
          collectPages((from, to) => supabase.rpc('admin_study_tracking', { p_plan_id: planId }).range(from, to)),
          collectPages((from, to) => supabase.from('study_weeks').select('id,title,week_number')
            .eq('plan_id', planId).order('week_number').order('id').range(from, to)),
          collectPages((from, to) => supabase.from('study_lessons')
            .select('id,title,day_number,week_id,study_weeks!inner(plan_id,week_number)')
            .eq('study_weeks.plan_id', planId).order('id').range(from, to)),
        ]);
        if (cancelled) return;
        setData({ profiles, weeks, lessons: lessons.map(lesson => ({ ...lesson, week_number: lesson.study_weeks.week_number })) });
        setLoadedAt(new Date());
        setError('');
      } catch (err) {
        if (!cancelled) {
          setData({ profiles: [], lessons: [], weeks: [] });
          setError(err.code === 'PGRST202' || err.code === '42883'
            ? 'El seguimiento aún no está habilitado en la base de datos. Contacta al administrador del sistema.'
            : err.code === '42501' ? 'Tu cuenta no tiene permiso para consultar el seguimiento.'
              : 'No se pudo cargar el seguimiento. Intenta actualizar nuevamente.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [planId, reload]);

  const rows = useMemo(() => trackingRows(data.profiles, data.lessons, loadedAt || new Date()), [data, loadedAt]);
  const churches = [...new Set(rows.map(row => row.church_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const filtered = rows.filter(row => (!church || (row.church_name || '__none') === church)
    && (!status || row.status === status)
    && `${row.full_name || ''} ${row.church_name || ''}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
    .sort((a, b) => sort === 'progress' ? b.percentage - a.percentage
      : sort === 'streak' ? b.streak - a.streak
        : sort === 'recent' ? (new Date(b.lastDate || 0) - new Date(a.lastDate || 0))
          : (a.full_name || '').localeCompare(b.full_name || '', 'es'));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages - 1);
  const selected = rows.find(row => row.id === selectedId);
  const plan = plans.find(item => item.id === planId);
  const updateFilter = (setter, value) => { setter(value); setPage(0); };
  const refresh = () => { setLoading(true); setError(''); setReload(value => value + 1); };

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white break-words">Seguimiento de estudios</h1>
          {loadedAt && !error && <p className="mt-1 text-xs text-on-surface-variant">Actualizado: {loadedAt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: STUDY_TIME_ZONE })}</p>}
        </div>
        <button type="button" onClick={refresh} disabled={loading} className={buttonClass} title="Actualizar seguimiento" aria-label="Actualizar seguimiento"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
      </header>

      <label className="block max-w-lg text-xs text-on-surface-variant">Plan de estudio
        <select className={`${inputClass} mt-1`} value={planId} disabled={!plans.length} onChange={event => {
          setLoading(true); setError(''); setSelectedId(null); setPage(0); setPlanId(event.target.value);
        }}>
          {!plans.length && <option value="">Sin planes</option>}
          {plans.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>

      {error ? <div role="alert" className="border-l-2 border-red-400 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        : loading ? <p role="status" className="py-12 text-center text-on-surface-variant">Cargando seguimiento...</p>
          : !plans.length ? <p className="py-12 text-center text-on-surface-variant">Todavía no hay planes de estudio.</p>
            : selected ? (
              <section className="space-y-6">
                <button type="button" onClick={() => setSelectedId(null)} className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-white"><ArrowLeft size={18} />Volver al listado</button>
                <div className="border-b border-surface-border pb-5">
                  <h2 className="text-xl font-semibold break-words">{selected.full_name || 'Sin nombre'}</h2>
                  <p className="text-sm text-on-surface-variant break-words">{selected.church_name || 'Sin iglesia registrada'}</p>
                  <dl className="mt-5 grid grid-cols-2 xl:grid-cols-4 gap-5 text-sm">
                    <div><dt className="text-on-surface-variant">Avance del plan</dt><dd className="mt-1 font-semibold">{selected.completed.size}/{data.lessons.length} · {selected.percentage}%</dd></div>
                    <div><dt className="text-on-surface-variant">Racha general</dt><dd className="mt-1 font-semibold">{selected.streak} días · Récord {selected.max_streak || 0}</dd></div>
                    <div><dt className="text-on-surface-variant">Última lección completada</dt><dd className="mt-1">{formatDate(selected.lastDate)}</dd></div>
                    <div><dt className="text-on-surface-variant">Próxima pendiente</dt><dd className="mt-1 break-words">{lessonLabel(selected.nextLesson) || (data.lessons.length ? 'Plan completado' : 'Sin lecciones')}</dd></div>
                  </dl>
                </div>
                {!data.lessons.length && <p className="text-on-surface-variant">Este plan todavía no tiene lecciones.</p>}
                {data.weeks.map(week => {
                  const lessons = data.lessons.filter(lesson => lesson.week_id === week.id).sort((a, b) => a.day_number - b.day_number);
                  return <section key={week.id} className="border-b border-surface-border pb-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3"><h3 className="font-semibold break-words">Semana {week.week_number}: {week.title}</h3><span className="text-xs text-on-surface-variant">{lessons.filter(lesson => selected.completed.has(lesson.id)).length}/{lessons.length}</span></div>
                    <ul className="divide-y divide-surface-border/50">{lessons.map(lesson => {
                      const done = selected.completed.has(lesson.id);
                      return <li key={lesson.id} className="flex items-start gap-3 py-3 text-sm">
                        {done ? <Check size={18} className="shrink-0 text-emerald-400 mt-0.5" /> : <Circle size={18} className="shrink-0 text-on-surface-variant mt-0.5" />}
                        <div className="min-w-0 flex-1"><p className="break-words">Día {lesson.day_number}: {lesson.title}</p><p className={`mt-1 text-xs ${done ? 'text-emerald-400' : 'text-on-surface-variant'}`}>{done ? `Completada · ${formatDate(selected.completed.get(lesson.id))}` : 'Pendiente'}</p></div>
                      </li>;
                    })}</ul>
                    {!lessons.length && <p className="text-sm text-on-surface-variant">Sin lecciones.</p>}
                  </section>;
                })}
              </section>
            ) : (
              <>
                <dl className="grid grid-cols-2 xl:grid-cols-4 gap-5 border-y border-surface-border py-5">
                  {[
                    ['Jóvenes registrados', rows.length],
                    ['Iniciaron el plan', rows.filter(row => row.completed.size > 0).length],
                    ['Activos en 7 días', rows.filter(row => row.days !== null && row.days >= 0 && row.days < 7).length],
                    ['Completaron el plan', rows.filter(row => row.status === 'completed').length],
                  ].map(([label, count]) => <div key={label}><dt className="text-xs text-on-surface-variant">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{count}</dd></div>)}
                </dl>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <label className="relative block"><span className="sr-only">Buscar joven o iglesia</span><Search size={16} className="absolute left-3 top-3 text-on-surface-variant" /><input className={`${inputClass} pl-9`} placeholder="Buscar joven o iglesia" value={search} onChange={event => updateFilter(setSearch, event.target.value)} /></label>
                  <select aria-label="Filtrar por iglesia" className={inputClass} value={church} onChange={event => updateFilter(setChurch, event.target.value)}><option value="">Todas las iglesias</option><option value="__none">Sin iglesia registrada</option>{churches.map(name => <option key={name}>{name}</option>)}</select>
                  <select aria-label="Filtrar por actividad" className={inputClass} value={status} onChange={event => updateFilter(setStatus, event.target.value)}><option value="">Todos los estados</option>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <select aria-label="Ordenar jóvenes" className={inputClass} value={sort} onChange={event => updateFilter(setSort, event.target.value)}><option value="name">Nombre</option><option value="progress">Mayor avance</option><option value="streak">Mayor racha</option><option value="recent">Actividad más reciente</option></select>
                </div>
                {!data.lessons.length && <p className="text-sm text-amber-300">Este plan todavía no tiene lecciones.</p>}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <caption className="sr-only">Seguimiento de {plan?.title}</caption>
                    <thead className="border-b border-surface-border text-xs text-on-surface-variant"><tr>{['Joven / Iglesia', 'Avance', 'Última / Próxima lección', 'Racha general', 'Último estudio del plan'].map(label => <th key={label} scope="col" className="px-3 py-3 font-medium">{label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-surface-border/60">
                      {filtered.slice(currentPage * 20, currentPage * 20 + 20).map(row => <tr key={row.id} className="hover:bg-white/[0.03]">
                        <td className="px-3 py-4 max-w-56"><div className="flex items-start gap-3">{row.avatar_url && <img src={row.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />}<div className="min-w-0"><button type="button" onClick={() => setSelectedId(row.id)} className="text-left font-semibold text-white hover:text-primary underline-offset-4 hover:underline break-words">{row.full_name || 'Sin nombre'}</button><p className="text-xs text-on-surface-variant mt-1 break-words">{row.church_name || 'Sin iglesia registrada'}</p></div></div></td>
                        <td className="px-3 py-4"><p className="tabular-nums whitespace-nowrap">{row.completed.size}/{data.lessons.length} · {row.percentage}%</p><progress aria-label={`Avance de ${row.full_name || 'usuario'}`} value={row.percentage} max="100" className="mt-2 h-1.5 w-24 accent-emerald-400" /><p className={`text-xs mt-1 ${STATUS_STYLE[row.status]}`}>{STATUS[row.status]}</p></td>
                        <td className="px-3 py-4 max-w-72"><p className="break-words">{lessonLabel(row.lastCompleted) || 'Sin lecciones completadas'}</p><p className="mt-1 text-xs text-on-surface-variant break-words">Próxima: {lessonLabel(row.nextLesson) || (data.lessons.length ? 'Plan completado' : 'Sin lecciones')}</p></td>
                        <td className="px-3 py-4 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><Flame size={16} className={row.streak ? 'text-amber-300' : 'text-on-surface-variant'} />{row.streak} días</span><p className="mt-1 text-xs text-on-surface-variant">Récord: {row.max_streak || 0}</p></td>
                        <td className="px-3 py-4 whitespace-nowrap">{formatDate(row.lastDate)}{row.days !== null && <p className="mt-1 text-xs text-on-surface-variant">{row.days === 0 ? 'Hoy' : row.days === 1 ? 'Ayer' : `Hace ${row.days} días`}</p>}</td>
                      </tr>)}
                      {!filtered.length && <tr><td colSpan={5} className="py-12 text-center text-on-surface-variant">{rows.length ? 'No hay jóvenes que coincidan con los filtros.' : 'Todavía no hay jóvenes registrados.'}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
                  <span>{filtered.length} jóvenes · Página {currentPage + 1} de {pages}</span>
                  <div className="flex gap-2"><button type="button" className={buttonClass} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} title="Página anterior" aria-label="Página anterior"><ChevronLeft size={18} /></button><button type="button" className={buttonClass} disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} title="Página siguiente" aria-label="Página siguiente"><ChevronRight size={18} /></button></div>
                </footer>
              </>
            )}
    </div>
  );
}

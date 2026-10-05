import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, HeartHandshake, LoaderCircle, NotebookPen, RotateCw } from 'lucide-react';
import { motion } from 'motion/react';
import StreakCard from './StreakCard';
import DailyBibleFact from './DailyBibleFact';

export default function StudyDashboard({ name, plan, journey, weeks, loading, error, planError, planLoading, retryPlan, retryJourney, openingLesson, openLesson, openWeek, openPlan, streak, streakLoading, streakError, retryStreak, entries, openJournal, openSOS }) {
  const currentWeek = weeks.find(week => week.current) || weeks.findLast(week => week.finished);
  const next = journey?.nextLesson;
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
    <header className="study-home-heading"><div><p>Un día a la vez</p><h1>Hola, {name}.</h1></div><button type="button" title="Apoyo SOS" aria-label="Apoyo SOS" onClick={openSOS}><HeartHandshake size={21} /></button></header>
    <div className="study-home-grid">
      <div className="study-home-main">
        <section className="study-next" aria-label="Tu siguiente estudio">
          <div className="study-section-label"><BookOpen size={18} /><span>{plan?.title || 'Tu plan de estudio'}</span></div>
          {planError && !plan ? <p role="alert" className="study-notice">No se pudo cargar el plan.<button type="button" onClick={retryPlan} aria-label="Reintentar carga del plan"><RotateCw size={18} /></button></p>
            : !plan ? <p>{planLoading ? 'Cargando tu plan...' : 'Todavía no hay un plan disponible.'}</p>
            : loading ? <p role="status" className="study-loading"><LoaderCircle size={20} className="animate-spin" />Cargando tu recorrido...</p>
            : error ? <><p role="alert" className="study-notice">{error}</p><button type="button" className="study-primary" onClick={retryJourney}><RotateCw size={17} />Reintentar</button></>
            : next ? <>
              <p className="study-next-day">Día {String(next.ordinal).padStart(2, '0')}<span> / {journey.total}</span></p>
              <h2>{next.title}</h2><p className="study-next-reference">{next.scripture_ref}</p>
              <button type="button" className="study-primary" disabled={openingLesson} onClick={() => openLesson(next.id)} aria-label={`Continuar: día ${next.ordinal} de ${journey.total}`}>{openingLesson ? <LoaderCircle size={18} className="animate-spin" /> : <BookOpen size={18} />}Continuar mi estudio<ArrowRight size={18} /></button>
            </> : journey?.total ? <><CheckCircle2 size={32} className="text-emerald-300 mt-5" /><h2>Completaste tu recorrido</h2><p>Tus {journey.total} estudios y respuestas se conservan.</p><button type="button" className="study-primary" onClick={openPlan}>Volver a leer<ArrowRight size={18} /></button></>
            : <p>Este plan todavía no tiene lecciones publicadas.</p>}
          {!!journey?.total && !error && <div className="study-total-progress"><span>{journey.completed} de {journey.total} estudios completados</span><progress value={journey.completed} max={journey.total} aria-label="Estudios completados" /></div>}
        </section>
        {currentWeek && !error && <section className="study-this-week" aria-label="Tu semana actual">
          <header><div><p>Tu recorrido</p><h2>Semana {currentWeek.week_number}</h2></div><button type="button" onClick={() => openWeek(currentWeek)} aria-label={`Abrir semana ${currentWeek.week_number}`}>Ver semana<ChevronRight size={17} /></button></header>
          <ol>{currentWeek.items.map(item => <li key={item.id}><button type="button" disabled={openingLesson || item.locked} onClick={() => openLesson(item.id)} aria-label={`Día ${item.day_number}: ${item.title}${item.completed ? ', completado' : ''}`} aria-current={item.id === next?.id ? 'step' : undefined} className={item.completed ? 'is-done' : ''}><span>{item.completed ? <Check size={19} /> : item.day_number}</span><small>Día {item.day_number}</small></button></li>)}</ol>
        </section>}
      </div>
      <aside className="study-home-aside" aria-label="Mi constancia y reflexiones">
        <StreakCard data={streak} loading={streakLoading} error={streakError} onRetry={retryStreak} />
        {streak && !streakError && <div className="study-xp"><span>Nivel {Math.floor(streak.total_xp / 100) + 1}</span><strong>{streak.total_xp} XP</strong><progress value={streak.total_xp % 100} max={100} aria-label="Experiencia del nivel" /></div>}
        <section className="study-diary-preview"><header><h2><NotebookPen size={18} />Mi diario</h2><button type="button" onClick={openJournal} aria-label="Abrir mi diario" title="Abrir mi diario"><ArrowRight size={18} /></button></header>
          {entries.length ? entries.slice(0, 2).map(entry => <button type="button" key={entry.id} onClick={openJournal}><time>{new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short' }).format(new Date(entry.created_at))}</time><p>{entry.content || entry.favorite_verses?.join(', ') || 'Versículos guardados'}</p><ChevronRight size={16} /></button>) : <p>Todavía no hay reflexiones guardadas.</p>}
        </section>
      </aside>
      <div className="study-discovery"><DailyBibleFact /></div>
    </div>
  </motion.div>;
}

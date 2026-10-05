import { Check, ChevronRight, LockKeyhole } from 'lucide-react';
import { motion } from 'motion/react';

export default function WeekCard({ week, onClick, disabled }) {
  return <motion.button type="button" disabled={disabled || !week.canOpen} onClick={() => onClick(week)} whileTap={{ scale: 0.99 }} className={`study-week-row ${week.current ? 'is-current' : ''} ${week.finished ? 'is-finished' : ''}`}>
    <span className="study-week-number">{week.finished ? <Check size={21} /> : week.locked ? <LockKeyhole size={18} /> : String(week.week_number).padStart(2, '0')}</span>
    <span className="study-week-info"><span className="study-week-label">Semana {week.week_number}{week.current ? ' · En curso' : ''}</span><strong>{week.title}</strong><span>{week.total ? `${week.completed}/${week.total} completadas` : 'Sin lecciones'}{week.locked ? week.canOpen ? ' · Relecturas disponibles' : ' · Bloqueada' : week.finished ? ' · Completada' : ''}</span></span>
    {week.canOpen && <ChevronRight size={18} className="shrink-0" />}
  </motion.button>;
}

import { Check, ChevronRight, LockKeyhole } from 'lucide-react';

export default function LessonCard({ lesson, onClick, disabled, locked = false }) {
  const { day_number, title, scripture_ref, user_progress } = lesson;
  const isCompleted = user_progress?.completed;

  return (
    <button type="button" disabled={disabled || locked}
      onClick={() => onClick(lesson)}
      className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between group text-left min-w-0 disabled:opacity-50 ${
        isCompleted 
          ? 'bg-primary-container/10 border-primary-container/30 hover:bg-primary-container/20' 
          : 'bg-surface-container-low border-surface-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${
          isCompleted ? 'bg-primary-container text-white' : 'bg-surface-container-high text-on-surface-variant'
        }`}>
          {isCompleted ? <Check size={18} /> : locked ? <LockKeyhole size={18} /> : day_number}
        </div>
        <div className="min-w-0 break-words">
          <h4 className={`font-medium ${isCompleted ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-white transition-colors'}`}>
            {title}
          </h4>
          <span className="text-xs text-on-surface-variant/70">{scripture_ref}</span>
          {locked && <span className="block text-xs text-on-surface-variant mt-1">Completa las semanas anteriores</span>}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-on-surface-variant" />
    </button>
  );
}

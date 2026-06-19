export default function LessonCard({ lesson, onClick }) {
  const { day_number, title, scripture_ref, user_progress } = lesson;
  const isCompleted = user_progress?.completed;

  return (
    <div 
      onClick={() => onClick(lesson)}
      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
        isCompleted 
          ? 'bg-primary-container/10 border-primary-container/30 hover:bg-primary-container/20' 
          : 'bg-surface-container-low border-surface-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          isCompleted ? 'bg-primary-container text-white' : 'bg-surface-container-high text-on-surface-variant'
        }`}>
          {isCompleted ? <span className="material-symbols-outlined text-sm">check</span> : day_number}
        </div>
        <div>
          <h4 className={`font-medium ${isCompleted ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-white transition-colors'}`}>
            {title}
          </h4>
          <span className="text-xs text-on-surface-variant/70">{scripture_ref}</span>
        </div>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
        chevron_right
      </span>
    </div>
  );
}

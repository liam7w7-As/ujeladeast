export default function WeekCard({ week, onClick }) {
  const { week_number, title, study_lessons } = week;
  
  // Calcular progreso de la semana
  const totalLessons = study_lessons?.length || 7;
  const completedLessons = study_lessons?.filter(l => l.completed).length || 0;
  const isCompleted = completedLessons === totalLessons;
  const inProgress = completedLessons > 0 && completedLessons < totalLessons;

  return (
    <div 
      onClick={() => onClick(week)}
      className={`glass-card rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] ${
        isCompleted 
          ? 'border-green-500/30 bg-green-500/5' 
          : inProgress 
            ? 'border-primary-container/50 bg-primary-container/10 shadow-[0_0_15px_rgba(143,25,55,0.1)]' 
            : 'border-surface-border hover:border-white/20'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase mb-1 block">
            Semana {week_number}
          </span>
          <h4 className="text-sm font-medium text-white line-clamp-2">{title}</h4>
        </div>
        {isCompleted && (
          <span className="material-symbols-outlined text-green-500 text-[20px]">verified</span>
        )}
      </div>

      <div className="w-full bg-surface-container rounded-full h-1.5 mb-2">
        <div 
          className={`h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-primary'}`} 
          style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
        ></div>
      </div>
      <div className="text-right text-[10px] text-on-surface-variant">
        {completedLessons}/{totalLessons} completadas
      </div>
    </div>
  );
}

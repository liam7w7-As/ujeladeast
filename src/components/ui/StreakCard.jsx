export default function StreakCard({ streak, lastStudy }) {
  const isHot = streak >= 1;
  
  return (
    <div className="glass-card rounded-2xl p-6 flex items-center justify-between relative overflow-hidden">
      {isHot && (
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/20 blur-2xl rounded-full"></div>
      )}
      <div className="flex flex-col z-10">
        <span className="text-on-surface-variant text-sm font-medium mb-1">Racha Actual</span>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-white">{streak}</span>
          <span className="text-on-surface-variant text-sm mb-1">días</span>
        </div>
        {lastStudy && (
          <span className="text-xs text-on-surface-variant mt-2 opacity-70">
            Último: {new Date(lastStudy).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className={`text-5xl z-10 transition-transform duration-300 ${isHot ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,100,0,0.8)] animate-pulse' : 'grayscale opacity-50'}`}>
        🔥
      </div>
    </div>
  );
}

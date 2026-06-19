export default function XPBar({ xp }) {
  const level = Math.floor(xp / 100) + 1;
  const currentLevelXP = xp % 100;
  const progress = (currentLevelXP / 100) * 100;

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-container text-white font-bold text-sm">
            {level}
          </span>
          <span className="text-on-surface font-medium">Nivel Actual</span>
        </div>
        <span className="text-primary font-bold">{xp} XP</span>
      </div>
      
      <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden relative">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-on-surface-variant">
        <span>{currentLevelXP} XP</span>
        <span>100 XP para Nivel {level + 1}</span>
      </div>
    </div>
  );
}

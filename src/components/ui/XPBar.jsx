import { motion } from 'motion/react';

export default function XPBar({ xp }) {
  const level = Math.floor(xp / 100) + 1;
  const currentLevelXP = xp % 100;
  const progress = (currentLevelXP / 100) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-6 flex flex-col gap-4 border border-surface-border"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-container text-white font-bold text-sm shadow-[0_0_12px_rgba(143,25,55,0.4)]">
            {level}
          </span>
          <span className="text-on-surface font-semibold text-sm">Nivel Actual</span>
        </div>
        <span className="text-primary font-black text-base">{xp} XP</span>
      </div>
      
      <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden relative border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-container via-[#a61c3f] to-primary rounded-full shadow-[0_0_10px_rgba(143,25,55,0.5)]"
        />
      </div>
      <div className="flex justify-between text-xs text-on-surface-variant font-medium">
        <span>{currentLevelXP} XP</span>
        <span>{100 - currentLevelXP} XP para Nivel {level + 1}</span>
      </div>
    </motion.div>
  );
}


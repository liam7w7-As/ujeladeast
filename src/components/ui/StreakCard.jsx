import { motion } from 'motion/react';

export default function StreakCard({ streak, lastStudy }) {
  const isHot = streak >= 1;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card rounded-2xl p-6 flex items-center justify-between relative overflow-hidden border border-surface-border hover:border-orange-500/30 transition-colors"
    >
      {isHot && (
        <div className="absolute -right-4 -top-4 w-28 h-28 bg-orange-500/20 blur-2xl rounded-full animate-pulse"></div>
      )}
      <div className="flex flex-col z-10">
        <span className="text-on-surface-variant text-sm font-semibold mb-1">Racha Actual</span>
        <div className="flex items-end gap-2">
          <motion.span 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-4xl font-black text-white"
          >
            {streak}
          </motion.span>
          <span className="text-on-surface-variant text-sm font-medium mb-1">días</span>
        </div>
        {lastStudy && (
          <span className="text-xs text-on-surface-variant mt-2 opacity-70">
            Último: {new Date(lastStudy).toLocaleDateString()}
          </span>
        )}
      </div>
      <motion.div 
        animate={isHot ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className={`text-5xl z-10 select-none ${isHot ? 'drop-shadow-[0_0_20px_rgba(255,120,0,0.8)]' : 'grayscale opacity-40'}`}
      >
        🔥
      </motion.div>
    </motion.div>
  );
}


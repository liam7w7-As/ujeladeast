import { motion, AnimatePresence } from 'motion/react';
import { modalBackdrop, modalContent } from '../../lib/animations';

export default function CelebrationModal({ show, data, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            variants={modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={onClose} 
          />
          
          <motion.div 
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative glass-card w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center overflow-hidden border border-primary/30 shadow-[0_0_50px_rgba(143,25,55,0.4)]"
          >
            {/* Confetti / Glow effect behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary-container/20 blur-[50px] -z-10 rounded-full animate-pulse"></div>

            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.25, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-20 h-20 bg-gradient-to-tr from-secondary to-primary rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(230,195,100,0.5)] mb-6"
            >
              🎉
            </motion.div>

            <h2 className="text-2xl font-black text-white mb-2">¡Lección Completada!</h2>
            <p className="text-on-surface-variant text-sm mb-8">Has dado un gran paso en tu crecimiento espiritual hoy.</p>

            <div className="flex w-full justify-between gap-4 mb-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1 bg-surface-container rounded-2xl p-4 flex flex-col items-center border border-surface-border/50"
              >
                <span className="material-symbols-outlined text-secondary mb-1">star</span>
                <span className="text-2xl font-black text-white">+{data?.xp || 10}</span>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">XP Ganado</span>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 bg-surface-container rounded-2xl p-4 flex flex-col items-center border border-surface-border/50"
              >
                <span className="material-symbols-outlined text-orange-500 mb-1">local_fire_department</span>
                <span className="text-2xl font-black text-white">{data?.streak || 1}</span>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Racha Días</span>
              </motion.div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="w-full bg-gradient-to-r from-primary-container to-[#a61c3f] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(143,25,55,0.4)]"
            >
              Continuar
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


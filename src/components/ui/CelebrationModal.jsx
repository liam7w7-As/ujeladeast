import { useEffect } from 'react';

export default function CelebrationModal({ show, data, onClose }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center animate-in zoom-in duration-500 overflow-hidden">
        
        {/* Confetti / Glow effect behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary-container/20 blur-[50px] -z-10 rounded-full"></div>

        <div className="w-20 h-20 bg-gradient-to-tr from-secondary to-primary rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(230,195,100,0.4)] mb-6 animate-bounce">
          🎉
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">¡Lección Completada!</h2>
        <p className="text-on-surface-variant text-sm mb-8">Has dado un gran paso en tu crecimiento espiritual hoy.</p>

        <div className="flex w-full justify-between gap-4 mb-8">
          <div className="flex-1 bg-surface-container rounded-2xl p-4 flex flex-col items-center border border-surface-border/50">
            <span className="material-symbols-outlined text-secondary mb-1">star</span>
            <span className="text-xl font-bold text-white">+{data?.xp || 10}</span>
            <span className="text-[10px] text-on-surface-variant uppercase">XP Ganado</span>
          </div>
          <div className="flex-1 bg-surface-container rounded-2xl p-4 flex flex-col items-center border border-surface-border/50">
            <span className="material-symbols-outlined text-orange-500 mb-1">local_fire_department</span>
            <span className="text-xl font-bold text-white">{data?.streak || 1}</span>
            <span className="text-[10px] text-on-surface-variant uppercase">Racha Días</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-primary-container hover:bg-inverse-primary text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(143,25,55,0.3)] hover:shadow-[0_0_20px_rgba(201,168,76,0.4)]"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

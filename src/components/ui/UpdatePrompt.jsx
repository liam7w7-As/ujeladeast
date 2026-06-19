import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 fade-in">
      <div className="bg-[#1a1a1f] border border-white/10 shadow-xl rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#8f1937]">system_update</span>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Nueva versión disponible</p>
            <p className="text-white/50 text-xs">Actualiza para ver los últimos cambios.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => updateServiceWorker(true)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-[#8f1937] hover:bg-[#a61c3f] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Actualizar
          </button>
          <button 
            onClick={() => setNeedRefresh(false)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

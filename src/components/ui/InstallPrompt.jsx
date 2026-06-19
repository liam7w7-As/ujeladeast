import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Escuchar el evento que indica que se puede instalar la app
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Evitar que el navegador muestre su propio prompt modal
      setDeferredPrompt(e);
      
      // Comprobar si el usuario dijo "Ahora no" previamente en esta sesión
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si la app ya está instalada, no mostrar nada
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Mostrar el prompt nativo
    deferredPrompt.prompt();
    
    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación');
    } else {
      console.log('El usuario rechazó la instalación');
    }
    
    // El prompt solo se puede usar una vez
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Guardar preferencia para no volver a molestar
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-24 md:pb-6 pointer-events-none flex justify-center">
      <div className="bg-[#1a1a1f] border border-white/10 shadow-2xl rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center gap-4 max-w-lg w-full pointer-events-auto animate-in slide-in-from-bottom-5">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8f1937] to-[#5a1023] rounded-xl flex items-center justify-center shrink-0 border border-white/5">
          <span className="text-white font-bold text-lg">UJ</span>
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-white font-semibold text-sm">Instalar UJELADEA</h3>
          <p className="text-white/50 text-xs mt-0.5">Agrega la app a tu inicio para un acceso más rápido y uso sin conexión.</p>
        </div>
        
        <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <button 
            onClick={handleInstallClick}
            className="flex-1 sm:flex-none px-4 py-2 bg-[#8f1937] hover:bg-[#a61c3f] text-white text-xs font-semibold rounded-lg transition-colors text-center"
          >
            Instalar
          </button>
          <button 
            onClick={handleDismiss}
            className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg transition-colors text-center"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

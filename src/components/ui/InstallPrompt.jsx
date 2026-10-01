import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function InstallPrompt() {
  const { pathname } = useLocation();
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
    const handleInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
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

  if (pathname === '/biblia') return null;
  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="pwa-install-prompt fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-24 md:pb-6 pointer-events-none flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#141418] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center gap-4 max-w-lg w-full pointer-events-auto backdrop-blur-xl"
          >
            <div className="w-14 h-14 bg-[#09090b] rounded-2xl flex items-center justify-center shrink-0 border border-white/10 p-2 shadow-[0_0_20px_rgba(143,25,55,0.25)]">
              <img 
                src="/logo-ujeladea.png" 
                alt="UJELADEA Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-bold text-sm tracking-wide flex items-center justify-center sm:justify-start gap-1.5">
                Instalar UJELADEA
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h3>
              <p className="text-white/60 text-xs mt-1 leading-relaxed">
                Acceso ultra rápido desde tu cajón de aplicaciones, pantalla completa y funcionamiento sin conexión.
              </p>
            </div>
            
            <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <motion.button 
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallClick}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-[#8f1937] to-[#a61c3f] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#8f1937]/30 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <Download size={16} aria-hidden="true" />
                Instalar
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleDismiss}
                className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium rounded-xl transition-colors text-center"
              >
                Ahora no
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


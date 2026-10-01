import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function OfflineBanner() {
  const { pathname } = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline || pathname === '/biblia') return null;

  return (
    <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 w-full z-[100] relative">
      <span className="material-symbols-outlined text-amber-400 text-[18px]">wifi_off</span>
      <p className="text-amber-200 text-xs font-medium text-center">
        Sin conexión. Puedes abrir el contenido que ya esté guardado en este dispositivo.
      </p>
    </div>
  );
}

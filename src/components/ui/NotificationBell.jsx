import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-white/10 transition-colors"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-primary-container text-white text-[9px] font-bold rounded-full border border-surface shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface-container-high border border-surface-border rounded-2xl shadow-2xl z-50 flex flex-col no-scrollbar">
          <div className="sticky top-0 bg-surface-container-high/90 backdrop-blur-md p-4 border-b border-surface-border flex justify-between items-center z-10">
            <h3 className="font-semibold text-white text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-white transition-colors"
              >
                Marcar leídas
              </button>
            )}
          </div>
          
          <div className="flex flex-col">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-sm">
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                  }}
                  className={`p-4 border-b border-surface-border/50 hover:bg-white/5 transition-colors cursor-pointer flex gap-3 ${notif.read ? 'opacity-60' : 'bg-primary-container/5'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'logro' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {notif.type === 'logro' ? 'emoji_events' : notif.type === 'racha' ? 'local_fire_department' : 'info'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-white">{notif.title}</span>
                    <span className="text-xs text-on-surface-variant">{notif.message}</span>
                    <span className="text-[10px] text-on-surface-variant/50 mt-1">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

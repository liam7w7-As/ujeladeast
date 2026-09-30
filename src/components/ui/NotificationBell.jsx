import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, RefreshCw, Trophy, Flame, Info, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationLink } from '../../lib/notificationLinks';

export default function NotificationBell({ admin = false }) {
  const { notifications, unreadCount, loading, error, getNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function outside(event) { if (!dropdownRef.current?.contains(event.target)) setIsOpen(false); }
    function escape(event) { if (event.key === 'Escape' && isOpen) { setIsOpen(false); triggerRef.current?.focus(); } }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [isOpen]);

  const openNotification = async item => {
    setBusy(true);
    const success = item.read || await markAsRead(item.id);
    setBusy(false);
    const target = notificationLink(item.action_url);
    if (success && target) { setIsOpen(false); navigate(target); }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button ref={triggerRef} type="button" aria-label="Notificaciones" aria-expanded={isOpen} onClick={() => {
        if (!isOpen) getNotifications();
        setIsOpen(open => !open);
      }} className="relative w-10 h-10 rounded-lg flex items-center justify-center text-on-surface hover:bg-white/10">
        <Bell size={20} />
        {unreadCount > 0 && <span aria-label={`${unreadCount} sin leer`} className="absolute top-0 right-0 min-w-4 h-4 px-0.5 bg-primary-container text-white text-[10px] font-bold rounded-full">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {isOpen && <section aria-label="Notificaciones recibidas" className="fixed left-4 right-4 top-20 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-96 max-h-[min(32rem,calc(100dvh-6rem))] overflow-y-auto bg-surface-container-high border border-surface-border rounded-lg shadow-2xl z-50">
        <header className="sticky top-0 bg-surface-container-high p-3 border-b border-surface-border flex justify-between items-center gap-2">
          <h2 className="font-semibold text-sm">Notificaciones</h2>
          <div className="flex gap-1">
            <button type="button" aria-label="Actualizar notificaciones" title="Actualizar" disabled={loading} onClick={getNotifications} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            <button type="button" aria-label="Marcar todas como leídas" title="Marcar todas como leídas" disabled={!unreadCount || busy} onClick={async () => { setBusy(true); await markAllAsRead(); setBusy(false); }} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40"><CheckCheck size={16} /></button>
            <button type="button" aria-label="Cerrar notificaciones" onClick={() => { setIsOpen(false); triggerRef.current?.focus(); }} className="p-2 rounded-lg hover:bg-white/10"><X size={16} /></button>
          </div>
        </header>
        {error && <p role="alert" className="p-4 text-sm text-red-300">{error}</p>}
        {loading && !notifications.length ? <p role="status" className="p-6 text-sm text-on-surface-variant">Cargando notificaciones...</p>
          : !error && !notifications.length ? <p className="p-6 text-sm text-on-surface-variant">No tienes notificaciones.</p> : null}
        {notifications.map(item => {
          const Icon = item.type === 'logro' ? Trophy : item.type === 'racha' ? Flame : Info;
          return <button key={item.id} type="button" disabled={busy} onClick={() => openNotification(item)} className={`w-full text-left p-4 border-b border-surface-border/50 hover:bg-white/5 flex gap-3 disabled:opacity-60 ${item.read ? 'opacity-65' : 'bg-primary-container/10'}`}>
            <Icon size={18} className={`shrink-0 mt-0.5 ${item.type === 'logro' ? 'text-amber-300' : 'text-primary'}`} />
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium break-words">{item.title}</span><span className="block mt-1 text-xs text-on-surface-variant whitespace-pre-wrap break-words">{item.message}</span><span className="block mt-2 text-xs text-on-surface-variant">{new Date(item.created_at).toLocaleDateString('es-BO')}{!item.read && ' · Sin leer'}</span></span>
          </button>;
        })}
        {admin && <Link to="/admin/notificaciones" onClick={() => setIsOpen(false)} className="block p-4 text-sm text-primary hover:underline">Administrar avisos</Link>}
      </section>}
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { collectPages } from '../lib/studyTracking';

export function useNotifications({ subscribe = true } = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  const [snapshot, setSnapshot] = useState({ userId: null, items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const notifications = snapshot.userId === userId ? snapshot.items : [];
  const unreadCount = notifications.filter(item => !item.read).length;

  const getNotifications = useCallback(async () => {
    if (!userId) return;
    const request = ++requestId.current;
    setLoading(true);
    try {
      const items = await collectPages((from, to) => supabase.from('notifications')
        .select('id,title,message,type,action_url,read,created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(from, to));
      if (request === requestId.current) {
        setSnapshot({ userId, items });
        setError('');
      }
      return items;
    } catch {
      if (request === requestId.current) setError('No se pudieron cargar las notificaciones.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [userId]);

  const markRead = useCallback(async notificationId => {
    if (!userId) return false;
    try {
      let query = supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
      if (notificationId) query = query.eq('id', notificationId);
      const { error } = await query;
      if (error) throw error;
      await getNotifications();
      return true;
    } catch {
      setError('No se pudo marcar la notificación como leída. Intenta nuevamente.');
      return false;
    }
  }, [userId, getNotifications]);

  const createNotification = useCallback(async (recipientId, title, message, type = 'anuncio', actionUrl = null) => {
    const { data, error } = await supabase.from('notifications')
      .insert({ user_id: recipientId, title, message, type, action_url: actionUrl }).select().single();
    if (error) { console.error('Error creating notification:', error); return null; }
    return data;
  }, []);

  useEffect(() => {
    if (!userId || !subscribe) return;
    const initialLoad = window.setTimeout(getNotifications, 0);
    const channel = supabase.channel(`notifications-${userId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, getNotifications)
      .subscribe();
    const refresh = () => { if (document.visibilityState === 'visible') getNotifications(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('notifications:changed', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      requestId.current += 1;
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('notifications:changed', refresh);
      supabase.removeChannel(channel);
    };
  }, [userId, subscribe, getNotifications]);

  return { notifications, unreadCount, loading, error, getNotifications,
    markAsRead: markRead, markAllAsRead: () => markRead(), createNotification };
}

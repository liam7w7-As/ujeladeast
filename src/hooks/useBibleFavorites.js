import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { createFavoriteStore } from '../lib/bibleFavorites';

export function useBibleFavorites() {
  const { user, loading } = useAuth();
  const owner = user?.id || null;
  const ready = Boolean(owner) || !loading;
  const store = useMemo(() => createFavoriteStore({
    owner,
    // Defer localStorage access so blocked storage becomes an actionable UI error.
    storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key), key: index => localStorage.key(index), get length() { return localStorage.length; } },
    online: () => navigator.onLine,
    lock: run => navigator.locks ? navigator.locks.request(`bible-favorites:${owner}`, run) : run(),
    remote: async (operations, signal) => {
      const { data, error } = await supabase.auth.getSession();
      if (error || signal.aborted || data.session?.user.id !== owner) throw new Error('Session changed');
      // Capture the JWT; an account switch must not send the old queue as the new user.
      const response = await supabase.rpc('sync_bible_favorites', { p_operations: operations })
        .setHeader('Authorization', `Bearer ${data.session.access_token}`).abortSignal(signal);
      if (response.error) throw response.error;
      return response.data;
    },
  }), [owner]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    if (!ready) return;
    store.start();
    const refresh = () => { store.refresh(); void store.sync(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    const changed = event => { if (store.acceptsStorageKey(event.key)) refresh(); };
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    window.addEventListener('focus', refresh); window.addEventListener('storage', changed);
    document.addEventListener('visibilitychange', visible);
    return () => {
      store.stop(); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh);
      window.removeEventListener('focus', refresh); window.removeEventListener('storage', changed);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [store, ready]);
  return { ...state, favorites: ready ? state.favorites : [], owner, ready, save: store.save, remove: store.remove, retry: store.sync, importGuest: store.importGuest };
}

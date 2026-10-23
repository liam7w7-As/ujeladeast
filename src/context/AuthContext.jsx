import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { AVATAR_CHOICES, selectedAvatar } from '../lib/avatars';
import { loadUserProfile, profileChanges } from '../lib/authProfile';
import { checkGoogleProvider, startGoogleAuth } from '../lib/googleAuth';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUser = useRef(null);
  const profileRequest = useRef(0);
  const mounted = useRef(false);
  const invalidateProfile = useCallback(() => { profileRequest.current++; }, []);

  const refreshProfile = useCallback(async (authUser = currentUser.current) => {
    if (!authUser) return null;
    const request = ++profileRequest.current;
    try {
      const data = await loadUserProfile(supabase, authUser);
      if (mounted.current && request === profileRequest.current) { setProfile(data); setProfileError(false); }
      return data;
    } catch (error) {
      if (mounted.current && request === profileRequest.current) setProfileError(true);
      throw error;
    } finally {
      if (mounted.current && request === profileRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let receivedEvent = false;
    const timers = new Set();
    const receiveSession = session => {
      if (!active) return;
      const nextUser = session?.user || null;
      const changed = currentUser.current?.id !== nextUser?.id;
      currentUser.current = nextUser;
      setUser(nextUser);
      if (changed) { profileRequest.current++; setProfile(null); setProfileError(false); }
      if (!nextUser) { profileRequest.current++; setProfile(null); setLoading(false); return; }
      if (changed) setLoading(true);
      // Supabase calls this listener under its auth lock; fetch after it returns.
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (currentUser.current?.id === nextUser.id) refreshProfile(nextUser).catch(() => {});
      }, 0);
      timers.add(timer);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      receiveSession(session);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (receivedEvent || !active) return;
      if (error) { setProfileError(true); setLoading(false); }
      else receiveSession(data.session);
    }).catch(() => { if (active && !receivedEvent) { setProfileError(true); setLoading(false); } });
    return () => {
      active = false;
      mounted.current = false;
      invalidateProfile();
      timers.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, [refreshProfile, invalidateProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const register = async (email, password, fullName, churchName, avatarChoice) => {
    const avatarUrl = selectedAvatar(avatarChoice);
    if (!avatarUrl) throw new Error('Selecciona tu avatar.');
    const avatar = AVATAR_CHOICES.find(item => item.src === avatarUrl);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: {
        full_name: fullName, church_name: churchName, avatar_id: avatar.id, avatar_url: avatarUrl,
        ...(['hombre', 'mujer'].includes(avatar.id) ? { gender: avatar.id } : {}),
      } },
    });
    if (error) throw error;
    if (data.user && data.session) {
      try { await refreshProfile(data.user); }
      catch { return { ...data, profilePending: true }; }
    }
    return data;
  };

  const googleAccess = async (path, link = false) => {
    if (link && !currentUser.current) throw new Error('Sign in before linking');
    let storage;
    try { storage = window.sessionStorage; } catch { /* Continue without return-path persistence. */ }
    const url = await startGoogleAuth(supabase, {
      origin: window.location.origin, path, storage, userId: link ? currentUser.current.id : null,
      online: navigator.onLine,
      checkProvider: () => checkGoogleProvider(supabaseUrl, supabaseAnonKey),
    });
    window.location.assign(url);
  };

  const saveProfile = async values => {
    const authUser = currentUser.current;
    if (!authUser || !profile || profileError) throw new Error('Profile unavailable');
    const changes = profileChanges(values, profile);
    const { data, error } = await supabase.from('profiles').update(changes).eq('id', authUser.id).select('*').single();
    if (error) throw error;
    if (mounted.current && currentUser.current?.id === authUser.id) {
      profileRequest.current++;
      setProfile(data); setProfileError(false); setLoading(false);
    }
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return <AuthContext.Provider value={{ user, profile, profileError, loading, login, register, logout, refreshProfile, saveProfile,
    googleLogin: path => googleAccess(path), linkGoogle: () => googleAccess('/cuenta', true) }}>
    {children}
  </AuthContext.Provider>;
}

import { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PROFILE_AVATARS } from '../lib/avatars';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let profileRequest = 0;
    const fetchProfile = async (userId, metadata) => {
      const request = ++profileRequest;
      try {
        let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const selectedAvatar = PROFILE_AVATARS[metadata?.gender];
        if (error?.code === 'PGRST116' && selectedAvatar) {
          const result = await supabase.from('profiles').upsert({
            id: userId,
            full_name: metadata.full_name || '',
            church_name: metadata.church_name || '',
            avatar_url: selectedAvatar,
          }).select('*').single();
          data = result.data;
          error = result.error;
        }
        if (error) throw error;
        if (data && !data.avatar_url && selectedAvatar) {
          const { error: avatarError } = await supabase.from('profiles')
            .update({ avatar_url: selectedAvatar }).eq('id', userId);
          if (!avatarError) data = { ...data, avatar_url: selectedAvatar };
          else console.error('Error saving profile avatar:', avatarError);
        }
        if (active && request === profileRequest) setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        if (active && request === profileRequest) setLoading(false);
      }
    };
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata);
      } else {
        profileRequest++;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const register = async (email, password, fullName, churchName, gender) => {
    const avatarUrl = PROFILE_AVATARS[gender];
    if (!avatarUrl) throw new Error('Selecciona Hombre o Mujer para tu avatar.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          church_name: churchName,
          gender,
          avatar_url: avatarUrl,
        }
      }
    });
    if (error) throw error;

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        church_name: churchName,
        avatar_url: avatarUrl,
      });
      if (profileError) console.error('Error creating profile', profileError);
    }

    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

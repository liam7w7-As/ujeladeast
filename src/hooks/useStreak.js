import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import { daysSince, effectiveStreak } from '../lib/studyTracking';
import { missingStudyRpc } from '../lib/studyApi';

export function useStreak() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const { createNotification } = useNotifications({ subscribe: false });

  const getStreak = useCallback(async () => {
    if (!user) return;
    const request = ++requestId.current;
    try {
      setLoading(true);
      const { data: status, error: rpcError } = await supabase.rpc('get_study_status');
      if (!rpcError) {
        if (!status?.atomic) throw new Error('Invalid study status');
        if (request === requestId.current) { setStreakData(status); setError(''); }
        return status;
      }
      if (!missingStudyRpc(rpcError)) throw rpcError;
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      const normalized = { max_streak: 0, total_xp: 0, ...data, current_streak: effectiveStreak(data), atomic: false };
      if (request === requestId.current) { setStreakData(normalized); setError(''); }
      return normalized;
    } catch (err) {
      console.error('Error fetching streak:', err);
      if (request === requestId.current) setError('No pudimos confirmar tu racha. Tu avance no se ha borrado.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [user]);

  const acceptStatus = useCallback(status => {
    requestId.current++;
    setStreakData(status); setError(''); setLoading(false);
  }, []);
  useEffect(() => {
    const pending = requestId;
    const refresh = () => { if (document.visibilityState === 'visible') getStreak(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      pending.current++;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [getStreak]);

  const updateStreak = useCallback(async (xpGained = 0) => {
    if (!user) return;
    try {
      // A migration may have been activated since this page was opened.
      const { data: status, error: rpcError } = await supabase.rpc('get_study_status');
      if (!rpcError && status?.atomic) { acceptStatus(status); return { streak: status, addedXP: 0 }; }
      if (!missingStudyRpc(rpcError)) throw rpcError || new Error('Invalid study status');
      const { data: current, error: fetchError } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      let currentData = current;
      
      if (fetchError && fetchError.code === 'PGRST116') {
         // Create initial if not exists
         const { data: newData, error: insertError } = await supabase
          .from('user_streaks')
          .insert({ user_id: user.id, current_streak: 0, max_streak: 0, total_xp: 0 })
          .select()
          .single();
         if (insertError) throw insertError;
         currentData = newData;
      } else if (fetchError) {
         throw fetchError;
      }

      const lastStudy = currentData.last_study_date;
      
      let newStreak = currentData.current_streak;
      let newMax = currentData.max_streak;
      let addedXP = xpGained;
      
      if (lastStudy) {
        const diffDays = daysSince(lastStudy);
        
        if (diffDays === 1) {
          newStreak += 1; // Studied yesterday, streak continues
        } else if (diffDays > 1) {
          newStreak = 1; // Streak broken
        } else if (diffDays === 0) {
          // Ya estudió hoy, no incrementa racha, pero sí suma XP
        }
      } else {
        newStreak = 1; // First time
      }

      if (newStreak > newMax) newMax = newStreak;
      
      // Bonus logic
      if (newStreak === 7 && currentData.current_streak < 7) {
        addedXP += 20;
        await createNotification(user.id, '¡Racha de 7 días!', 'Has completado 7 días seguidos. +20 XP', 'logro');
      } else if (newStreak === 30 && currentData.current_streak < 30) {
        addedXP += 100;
        await createNotification(user.id, '¡Racha de 30 días!', 'Has completado 30 días seguidos. ¡Increíble! +100 XP', 'logro');
      }

      const { data: updated, error: updateError } = await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          max_streak: newMax,
          total_xp: currentData.total_xp + addedXP,
          last_study_date: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      acceptStatus({ ...updated, atomic: false });
      return { streak: updated, addedXP };
    } catch (err) {
      console.error('Error updating streak:', err);
      throw err;
    }
  }, [user, createNotification, acceptStatus]);

  return { streakData, loading, error, getStreak, updateStreak, acceptStatus };
}

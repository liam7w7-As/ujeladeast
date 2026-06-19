import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';

export function useStreak() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState({ current_streak: 0, max_streak: 0, total_xp: 0 });
  const [loading, setLoading] = useState(false);
  const { createNotification } = useNotifications();

  const getStreak = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setStreakData(data);
        return data;
      } else {
        // Create initial record
        const { data: newData, error: insertError } = await supabase
          .from('user_streaks')
          .insert({ user_id: user.id, current_streak: 0, max_streak: 0, total_xp: 0 })
          .select()
          .single();
        if (insertError) throw insertError;
        setStreakData(newData);
        return newData;
      }
    } catch (err) {
      console.error('Error fetching streak:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateStreak = useCallback(async (xpGained = 0) => {
    if (!user) return;
    try {
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

      const today = new Date();
      const lastStudy = currentData.last_study_date ? new Date(currentData.last_study_date) : null;
      
      let newStreak = currentData.current_streak;
      let newMax = currentData.max_streak;
      let addedXP = xpGained;
      
      if (lastStudy) {
        // Compare dates (ignore time)
        const diffTime = today.setHours(0,0,0,0) - new Date(lastStudy).setHours(0,0,0,0);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
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
      setStreakData(updated);
      return { streak: updated, addedXP };
    } catch (err) {
      console.error('Error updating streak:', err);
      throw err;
    }
  }, [user, createNotification]);

  const checkStreakLost = useCallback(async () => {
    if (!user) return;
    try {
      const current = await getStreak();
      if (!current || !current.last_study_date) return;
      
      const today = new Date();
      const lastStudy = new Date(current.last_study_date);
      const diffTime = today.setHours(0,0,0,0) - lastStudy.setHours(0,0,0,0);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1 && current.current_streak > 0) {
        const { data, error } = await supabase
          .from('user_streaks')
          .update({ current_streak: 0 })
          .eq('user_id', user.id)
          .select()
          .single();
        if (!error) setStreakData(data);
      }
    } catch (err) {
      console.error('Error checking streak lost:', err);
    }
  }, [user, getStreak]);

  return { streakData, loading, getStreak, updateStreak, checkStreakLost };
}

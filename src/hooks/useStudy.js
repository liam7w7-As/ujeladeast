import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { collectPages, progressPercentage } from '../lib/studyTracking';

export function useStudy() {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentPlan = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setPlan(data);
      return data;
    } catch (err) {
      console.error('Error fetching plan:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWeeks = useCallback(async (planId) => {
    if (!planId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_weeks')
        .select(`
          *,
          study_lessons (
            id, day_number, title, scripture_ref,
            user_progress ( completed, user_id )
          )
        `)
        .eq('plan_id', planId)
        .order('week_number', { ascending: true });
        
      if (error) throw error;
      
      // Filtrar el progreso para que sea solo del usuario actual
      const processedData = data.map(week => ({
        ...week,
        study_lessons: week.study_lessons.map(lesson => ({
          ...lesson,
          user_progress: lesson.user_progress?.find(p => p.user_id === user?.id) || null,
          completed: lesson.user_progress?.some(p => p.user_id === user?.id && p.completed) || false
        }))
      }));
      
      setWeeks(processedData);
      return processedData;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getLessons = useCallback(async (weekId) => {
    if (!weekId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_lessons')
        .select(`
          *,
          user_progress ( completed, answers, user_id )
        `)
        .eq('week_id', weekId)
        .order('day_number', { ascending: true });
      
      if (error) throw error;
      
      const processedData = data.map(lesson => {
        const userProgress = lesson.user_progress?.find(p => p.user_id === user?.id);
        return {
          ...lesson,
          user_progress: userProgress || null
        };
      });
      
      setLessons(processedData);
      return processedData;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getTodayLesson = useCallback(async (planId) => {
    if (!planId) return null;
    
    // Simplificación: Para la demo, calcular el día del año
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diff = now - startOfYear + (startOfYear.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const weekNumber = Math.floor(dayOfYear / 7) + 1;
    const dayOfWeek = (dayOfYear % 7) + 1; // 1-7

    try {
      setLoading(true);
      const { data: weekData } = await supabase
        .from('study_weeks')
        .select('id')
        .eq('plan_id', planId)
        .eq('week_number', weekNumber)
        .maybeSingle(); // Evita el error 406

      if (weekData) {
        const { data: lessonData } = await supabase
          .from('study_lessons')
          .select('*')
          .eq('week_id', weekData.id)
          .eq('day_number', dayOfWeek)
          .maybeSingle();
        
        if (lessonData) return lessonData;
      }

      // FALLBACK PARA MOCK DATA: Si no existe la semana actual, retorna la primera lección del plan
      const { data: firstWeek } = await supabase
        .from('study_weeks')
        .select('id')
        .eq('plan_id', planId)
        .order('week_number', { ascending: true })
        .limit(1)
        .maybeSingle();
        
      if (firstWeek) {
        const { data: firstLesson } = await supabase
          .from('study_lessons')
          .select('*')
          .eq('week_id', firstWeek.id)
          .order('day_number', { ascending: true })
          .limit(1)
          .maybeSingle();
          
        return firstLesson;
      }

      return null;
    } catch (err) {
      console.error("Error getting today's lesson", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeLesson = useCallback(async (lessonId, answers) => {
    if (!user) throw new Error('Usuario no autenticado');
    try {
      setLoading(true);
      const payload = {
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        answers: answers || {},
        completed_at: new Date().toISOString()
      };
      // The unique user/lesson key chooses one winner, including concurrent tabs.
      const { data, error } = await supabase
        .from('user_progress')
        .upsert(payload, { onConflict: 'user_id, lesson_id', ignoreDuplicates: true })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) return data;

      const { data: updated, error: updateError } = await supabase
        .from('user_progress')
        .update(payload)
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .eq('completed', false)
        .select()
        .maybeSingle();
      if (updateError) throw updateError;
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getUserProgress = useCallback(async (planId) => {
    if (!user || !planId) return 0;
    try {
      const lessons = await collectPages((from, to) => supabase
        .from('study_lessons')
        .select('id, study_weeks!inner(plan_id), user_progress(user_id, completed)')
        .eq('study_weeks.plan_id', planId)
        .order('id')
        .range(from, to));
      const completedCount = lessons.filter(lesson => lesson.user_progress
        ?.some(progress => progress.user_id === user.id && progress.completed)).length;
      return progressPercentage(completedCount, lessons.length);
    } catch (err) {
      console.error('Error in getUserProgress:', err);
      return 0;
    }
  }, [user]);

  return {
    plan,
    weeks,
    lessons,
    loading,
    error,
    getCurrentPlan,
    getWeeks,
    getLessons,
    getTodayLesson,
    completeLesson,
    getUserProgress
  };
}

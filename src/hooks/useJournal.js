import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useJournal() {
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const getEntry = useCallback(async (lessonId) => {
    if (!user || !lessonId) return null;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setEntry(data || null);
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveEntry = useCallback(async (lessonId, content, favoriteVerses) => {
    if (!user || !lessonId) return;
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          content,
          favorite_verses: favoriteVerses || []
        }, { onConflict: 'user_id, lesson_id' })
        .select()
        .single();
        
      if (error) throw error;
      setEntry(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const getRecentEntries = useCallback(async (limit = 10) => {
    if (!user) return [];
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          study_lessons ( title, scripture_ref )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      setEntries(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching journal entries:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    entry,
    entries,
    loading,
    saving,
    error,
    getEntry,
    saveEntry,
    getRecentEntries
  };
}

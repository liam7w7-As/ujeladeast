import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSocieties() {
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSocieties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setSocieties(data || []);
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchSocieties = useCallback(async (query) => {
    try {
      setLoading(true);
      setError(null);
      if (!query.trim()) {
        return await getSocieties();
      }
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .or(`name.ilike.%${query}%,zone.ilike.%${query}%`)
        .order('name', { ascending: true });
      if (error) throw error;
      setSocieties(data || []);
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getSocieties]);

  const filterByZone = useCallback(async (zone) => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('societies').select('*').order('name', { ascending: true });
      if (zone) query = query.ilike('zone', `%${zone}%`);
      const { data, error } = await query;
      if (error) throw error;
      setSocieties(data || []);
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getSocietyById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    societies,
    loading,
    error,
    getSocieties,
    searchSocieties,
    filterByZone,
    getSocietyById,
  };
}

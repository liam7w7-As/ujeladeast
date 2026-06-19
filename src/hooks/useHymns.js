import { useState, useEffect, useMemo } from 'react';

export function useHymns(fileName, searchQuery = '') {
  const [hymns, setHymns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileName) return;

    const fetchHymns = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/data/${fileName}.json`);
        if (!response.ok) throw new Error(`Error al cargar el himnario: ${fileName}`);
        const data = await response.json();
        setHymns(data);
      } catch (err) {
        setError(err.message);
        setHymns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHymns();
  }, [fileName]);

  const filteredHymns = useMemo(() => {
    if (!searchQuery.trim()) return hymns;
    
    const query = searchQuery.trim();
    const normalize = (str) => str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || '';
    const normalQuery = normalize(query);

    return hymns.filter(h => {
      // Exact number match or partial match in titles
      const numMatch = h.numero?.toString() === query || h.numero?.toString().includes(query);
      const esMatch = normalize(h.titulo_es).includes(normalQuery);
      const ayMatch = normalize(h.titulo_ay).includes(normalQuery);
      return numMatch || esMatch || ayMatch;
    });
  }, [hymns, searchQuery]);

  return { hymns: filteredHymns, loading, error };
}

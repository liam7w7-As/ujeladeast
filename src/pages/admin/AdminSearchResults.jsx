import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { searchPattern, searchSections } from '../../lib/adminSearch';

const pageSize = 10;

export default function AdminSearchResults() {
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim().slice(0, 100);
  const rawPage = Number(params.get('page') || 0);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? Math.min(rawPage, 10000) : 0;
  const [response, setResponse] = useState({ key: '', groups: [] });
  const [retry, setRetry] = useState(0);
  const key = `${query}:${page}:${retry}`;
  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    async function load() {
      const groups = await Promise.all(searchSections.map(async section => {
        try {
          const { data, error, count } = await supabase.from(section.table).select(section.fields, { count: 'exact' })
            .ilike(section.column, searchPattern(query)).order('id').range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) throw error;
          return { ...section, items: data || [], count: count || 0 };
        } catch { return { ...section, items: [], count: 0, error: true }; }
      }));
      if (!cancelled) setResponse({ key, groups });
    }
    load();
    return () => { cancelled = true; };
  }, [query, page, key]);
  const loading = query && response.key !== key;
  const changePage = value => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(value)); return next; });
  return <div className="space-y-6 min-w-0">
    <header className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl font-bold">Resultados de búsqueda</h1><p className="text-sm text-on-surface-variant mt-2 break-words">{query ? `“${query}”` : 'Escribe una búsqueda.'}</p></div><button type="button" aria-label="Actualizar resultados" title="Actualizar resultados" disabled={loading || !query} onClick={() => setRetry(value => value + 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40"><RefreshCw size={18} /></button></header>
    {loading ? <p role="status" className="py-10 text-on-surface-variant">Buscando...</p> : query && <>
      {response.groups.map(group => <section key={group.table} className="border-b border-surface-border pb-5">
        <h2 className="font-semibold mb-3">{group.label}{!group.error && <span className="ml-2 text-xs text-on-surface-variant">{group.count}</span>}</h2>
        {group.error ? <p role="alert" className="text-sm text-red-300">No se pudo consultar {group.label.toLowerCase()}.</p>
          : !group.items.length ? <p className="text-sm text-on-surface-variant">Sin resultados en esta página.</p>
            : <ul className="divide-y divide-surface-border/50">{group.items.map(item => <li key={item.id}><Link to={group.table === 'study_plans' ? `${group.path}?plan=${encodeURIComponent(item.id)}` : `${group.path}?q=${encodeURIComponent(query)}`} className="flex items-start gap-3 py-3 hover:text-primary"><span className="flex-1 min-w-0"><span className="block break-words line-clamp-3 text-sm">{item[group.title] || 'Sin título'}</span>{group.detail && <span className="block text-xs text-on-surface-variant mt-1 break-words">{item[group.detail]}</span>}</span><ArrowUpRight size={18} className="shrink-0" /></Link></li>)}</ul>}
      </section>)}
      <footer className="flex items-center justify-between gap-3 text-sm"><span className="text-on-surface-variant">Página {page + 1}</span><div className="flex gap-2"><button type="button" aria-label="Página anterior" disabled={!page} onClick={() => changePage(page - 1)} className="p-2 rounded-lg border border-surface-border disabled:opacity-40"><ChevronLeft size={18} /></button><button type="button" aria-label="Página siguiente" disabled={!response.groups.some(group => group.count > (page + 1) * pageSize)} onClick={() => changePage(page + 1)} className="p-2 rounded-lg border border-surface-border disabled:opacity-40"><ChevronRight size={18} /></button></div></footer>
    </>}
  </div>;
}

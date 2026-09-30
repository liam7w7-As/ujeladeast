import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

export default function AdminSearch() {
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const search = event => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/admin/buscar?q=${encodeURIComponent(query.trim())}`);
    setMobileOpen(false);
  };
  return <>
    <button type="button" aria-label="Abrir buscador" aria-expanded={mobileOpen} onClick={() => setMobileOpen(open => !open)} className="md:hidden p-2 rounded-lg hover:bg-white/10"><Search size={20} /></button>
    <form role="search" onSubmit={search} className={`${mobileOpen ? 'flex fixed left-4 right-4 top-20 bg-surface-container-high p-3 border border-surface-border rounded-lg shadow-xl' : 'hidden'} md:static md:flex md:border-0 md:p-0 md:shadow-none items-center gap-1`}>
      <input aria-label="Buscar en administración" value={query} onChange={event => setQuery(event.target.value)} maxLength={100} className="min-w-0 w-full md:w-52 lg:w-64 bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar..." type="search" />
      <button type="submit" disabled={!query.trim()} aria-label="Buscar" title="Buscar" className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40"><Search size={18} /></button>
      {mobileOpen && <button type="button" aria-label="Cerrar buscador" onClick={() => setMobileOpen(false)} className="md:hidden p-2"><X size={18} /></button>}
    </form>
  </>;
}

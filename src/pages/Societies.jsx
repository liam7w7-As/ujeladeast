import { useState, useEffect, useMemo } from 'react';
import PageShell from '../components/layout/PageShell';
import SocietyCard from '../components/ui/SocietyCard';
import SocietyDetailModal from '../components/ui/SocietyDetailModal';
import { useSocieties } from '../hooks/useSocieties';

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
      <div className="w-full h-44 bg-surface-container-high" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-5 bg-surface-container rounded w-3/4" />
        <div className="h-3 bg-surface-container rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="flex-1 h-10 bg-surface-container rounded-xl" />
          <div className="flex-1 h-10 bg-surface-container rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Societies() {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedSociety, setSelectedSociety] = useState(null);

  const { societies, loading, error, getSocieties } = useSocieties();

  useEffect(() => {
    getSocieties();
  }, []);

  // Zonas únicas disponibles dinámicamente
  const zones = useMemo(() => {
    const allZones = societies.map((s) => s.zone).filter(Boolean);
    return [...new Set(allZones)].sort();
  }, [societies]);

  // Filtro y búsqueda en cliente (rápido sin llamadas extra)
  const filtered = useMemo(() => {
    return societies.filter((s) => {
      const matchSearch = !searchQuery ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.president_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchZone = !selectedZone || s.zone === selectedZone;
      return matchSearch && matchZone;
    });
  }, [societies, searchQuery, selectedZone]);

  return (
    <PageShell activeItem="societies">
      <main className="flex-grow pt-28 pb-section-gap px-margin-mobile md:px-gutter max-w-container-max mx-auto w-full relative">

        {/* Header */}
        <header className="mb-10 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Sociedades</h1>
          <p className="text-on-surface-variant">Encuentra las sociedades de jóvenes del distrito en El Alto</p>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-slide-up-delay-1">
          {/* Búsqueda */}
          <div className="relative flex-grow max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container border border-surface-border rounded-xl py-3 pl-10 pr-4 text-on-surface text-sm focus:outline-none focus:border-primary/60 transition-all"
              placeholder="Buscar sociedad, zona o presidente..."
            />
          </div>

          {/* Filtro por zona */}
          <div className="relative w-full sm:w-52">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full appearance-none bg-surface-container border border-surface-border rounded-xl py-3 pl-4 pr-10 text-on-surface text-sm focus:outline-none focus:border-primary/60 transition-all cursor-pointer"
            >
              <option value="">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">expand_more</span>
          </div>

          {/* Toggle Grid / List */}
          <div className="flex bg-surface-container border border-surface-border rounded-xl p-1 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-primary-container/30 text-primary' : 'text-on-surface-variant hover:text-white'}`}
              title="Vista cuadrícula"
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-primary-container/30 text-primary' : 'text-on-surface-variant hover:text-white'}`}
              title="Vista lista"
            >
              <span className="material-symbols-outlined text-[20px]">view_list</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            Error al cargar las sociedades: {error}
          </div>
        )}

        {/* Contador */}
        {!loading && (
          <p className="text-xs text-on-surface-variant mb-5">
            {filtered.length} {filtered.length === 1 ? 'sociedad encontrada' : 'sociedades encontradas'}
            {(searchQuery || selectedZone) && ' · '}
            {(searchQuery || selectedZone) && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedZone(''); }}
                className="text-primary hover:underline ml-1"
              >
                Limpiar filtros
              </button>
            )}
          </p>
        )}

        {/* Grid / List */}
        {loading ? (
          <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">church</span>
            <p className="text-on-surface-variant">No se encontraron sociedades</p>
            {(searchQuery || selectedZone) && (
              <p className="text-sm text-on-surface-variant/60 mt-1">Intenta con otro término de búsqueda</p>
            )}
          </div>
        ) : (
          <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
            {filtered.map((society) => (
              <SocietyCard
                key={society.id}
                society={society}
                viewMode={viewMode}
                onClick={setSelectedSociety}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedSociety && (
        <SocietyDetailModal
          society={selectedSociety}
          onClose={() => setSelectedSociety(null)}
        />
      )}
    </PageShell>
  );
}

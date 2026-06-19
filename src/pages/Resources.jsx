import { useState, useEffect } from 'react';
import PageShell from '../components/layout/PageShell';
import ResourceCard from '../components/ui/ResourceCard';
import { useResources } from '../hooks/useResources';

const FILTERS = [
  { id: 'Todos',        label: 'Todos',          icon: 'apps' },
  { id: 'DOCUMENTO',   label: 'Documentos',      icon: 'description' },
  { id: 'FORMULARIO',  label: 'Formularios',     icon: 'assignment' },
  { id: 'PRESENTACIÓN',label: 'Presentaciones',  icon: 'co_present' },
  { id: 'VIDEO',       label: 'Videos',          icon: 'smart_display' },
];

const FILE_ICONS = {
  PDF: 'picture_as_pdf', DOC: 'description', DOCX: 'description',
  VIDEO: 'smart_display', PPT: 'co_present', PPTX: 'co_present',
};

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-surface-container-high" />
      <div className="space-y-2">
        <div className="h-4 bg-surface-container rounded w-3/4" />
        <div className="h-3 bg-surface-container rounded w-1/2" />
      </div>
      <div className="h-10 bg-surface-container rounded-xl" />
    </div>
  );
}

export default function Resources() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const { resources, featured, loading, error, getResources, getFeaturedResource } = useResources();

  useEffect(() => {
    getFeaturedResource();
    getResources('Todos');
  }, []);

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    getResources(filterId);
  };

  const featuredIcon = FILE_ICONS[featured?.file_type] || 'attach_file';

  return (
    <PageShell activeItem="resources">
      <main className="flex-grow pt-32 pb-section-gap px-margin-mobile md:px-gutter max-w-container-max mx-auto w-full relative z-10">

        {/* Header */}
        <div className="mb-12 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Recursos</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Material disponible para los jóvenes. Descarga y comparte los documentos oficiales, estudios y herramientas de UJELADEA.
          </p>
        </div>

        {/* Featured Banner */}
        {featured && (
          <section className="mb-12 animate-slide-up-delay-1">
            <div className="glass-card rounded-2xl overflow-hidden relative group border-secondary/20">
              <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/95 via-[#09090b]/80 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary-container/20 to-transparent z-0" />

              <div className="relative z-20 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="max-w-xl">
                  <span className="inline-block px-3 py-1 rounded-full border border-secondary text-secondary text-xs font-bold mb-4 uppercase tracking-wider">
                    ⭐ Destacado
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{featured.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-on-surface-variant text-sm">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">{featuredIcon}</span>
                      {featured.file_type || featured.category}
                    </span>
                    {featured.file_size && (
                      <>
                        <span>·</span>
                        <span>{featured.file_size}</span>
                      </>
                    )}
                    {featured.category && (
                      <>
                        <span>·</span>
                        <span>{featured.category}</span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={featured.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex-shrink-0 bg-primary-container hover:bg-primary-container/80 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(143,25,55,0.4)] hover:shadow-[0_0_30px_rgba(143,25,55,0.6)]"
                >
                  <span className="material-symbols-outlined">download</span>
                  Descargar
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            Error al cargar recursos: {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-surface-border animate-slide-up-delay-2">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => handleFilterChange(filter.id)}
              className={`px-4 py-2 rounded-full border text-sm flex items-center gap-1.5 transition-all ${
                activeFilter === filter.id
                  ? 'border-primary text-primary bg-primary-container/10 shadow-[0_0_12px_rgba(143,25,55,0.2)]'
                  : 'border-surface-border text-on-surface-variant hover:text-white hover:border-white/20 bg-surface-container/40'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>

        {/* Counter */}
        {!loading && (
          <p className="text-xs text-on-surface-variant mb-5">
            {resources.length} {resources.length === 1 ? 'recurso' : 'recursos'} disponibles
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : resources.length === 0 ? (
          <div className="glass-card rounded-2xl p-14 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">folder_open</span>
            <p className="text-on-surface-variant">
              {activeFilter === 'Todos'
                ? 'No hay recursos disponibles aún.'
                : `No hay recursos en la categoría "${activeFilter}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}

      </main>
    </PageShell>
  );
}

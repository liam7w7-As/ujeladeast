import ContentIcon from '../components/ui/ContentIcon';
import { useState } from 'react';
import PageShell from '../components/layout/PageShell';
import HymnCard from '../components/ui/HymnCard';
import HymnModal from '../components/ui/HymnModal';
import { useHymns } from '../hooks/useHymns';

const HYMNARIES = [
  { id: 'himnario_inela', label: 'Himnario INELA' },
  { id: 'himnario_cala', label: 'Himnario CALA' },
  { id: 'coros', label: 'Coros Varios' }
];

export default function Hymnal() {
  const [activeHymnary, setActiveHymnary] = useState(HYMNARIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHymn, setSelectedHymn] = useState(null);

  const { hymns, loading, error } = useHymns(activeHymnary, searchQuery);

  return (
    <PageShell activeItem="himnario">
      <main className="flex-grow pt-[120px] pb-section-gap px-margin-mobile md:px-gutter max-w-container-max mx-auto w-full z-10 relative">
        
        {/* Header & Controls */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-on-surface mb-2">Himnario</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Encuentra alabanzas y cánticos de adoración</p>
            </div>
            
            {/* Search Bar */}
            <div className="w-full md:w-80">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ContentIcon className="text-on-surface-variant group-focus-within:text-primary transition-colors" name="search" />
                </div>
                <input 
                  type="text" 
                  aria-label="Buscar himnos"
                  placeholder="Buscar por número o título..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-glass-bg border border-surface-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg pl-10 pr-4 py-3 text-on-surface placeholder-on-surface-variant outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Hymnary Selector */}
          <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
            {HYMNARIES.map(h => (
              <button 
                key={h.id}
                onClick={() => {
                  setActiveHymnary(h.id);
                  setSearchQuery(''); // Optional: clear search on switch
                }}
                className={`whitespace-nowrap px-5 py-2.5 rounded-lg font-label-md text-sm uppercase tracking-wider transition-all duration-300 ${
                  activeHymnary === h.id 
                    ? 'bg-primary-container text-white'
                    : 'bg-glass-bg border border-surface-border text-on-surface-variant hover:border-surface-variant hover:text-on-surface'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl flex items-center gap-3">
            <ContentIcon className="" name="error" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-glass-bg border border-surface-border rounded-xl p-6 h-40 animate-pulse flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="h-5 w-3/4 bg-surface-container-high rounded"></div>
                  <div className="h-6 w-8 bg-surface-container-high rounded"></div>
                </div>
                <div className="h-4 w-1/2 bg-surface-container-high rounded"></div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-surface-container-high rounded"></div>
                  <div className="h-5 w-20 bg-surface-container-high rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : hymns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {hymns.map(hymn => (
              <HymnCard 
                key={hymn.numero || Math.random()} 
                hymn={hymn} 
                onClick={() => setSelectedHymn(hymn)} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-surface-border border-dashed rounded-2xl bg-glass-bg">
            <ContentIcon className="text-6xl text-surface-variant mb-4" name="music_off" />
            <h3 className="text-xl font-headline-md text-on-surface mb-2">No se encontraron himnos</h3>
            <p className="text-on-surface-variant">Prueba con otro término de búsqueda o cambia de himnario.</p>
          </div>
        )}

      </main>

      <HymnModal 
        isOpen={!!selectedHymn} 
        hymn={selectedHymn} 
        onClose={() => setSelectedHymn(null)} 
      />
    </PageShell>
  );
}

import { useState, useEffect } from 'react';

const HYMNALS = [
  { id: 'himnario_cala', name: 'Himnario CALA', file: '/data/himnario_cala.json' },
  { id: 'himnario_inela', name: 'Himnario INELA', file: '/data/himnario_inela.json' },
  { id: 'coros', name: 'Coros de Fuego', file: '/data/coros.json' }
];

export default function AdminHymnal() {
  const [selectedHymnal, setSelectedHymnal] = useState(HYMNALS[0]);
  const [hymns, setHymns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchHymnal() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(selectedHymnal.file);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Handle different JSON structures
        const items = Array.isArray(data) ? data : (data.himnos || data.coros || []);
        setHymns(items);
      } catch (err) {
        setError(`No se pudo cargar el archivo ${selectedHymnal.file}: ` + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHymnal();
  }, [selectedHymnal]);

  const handleExportCSV = () => {
    if (hymns.length === 0) return;

    const headers = ['Número', 'Título Español', 'Título Aymara', 'Contenido'];
    const csvContent = [
      headers.join(','),
      ...hymns.map(h => {
        const titleEs = `"${(h.titulo_es || h.titulo || '').replace(/"/g, '""')}"`;
        const titleAy = `"${(h.titulo_ay || '').replace(/"/g, '""')}"`;
        
        let contentStr = '';
        if (h.estrofas_es && Array.isArray(h.estrofas_es)) contentStr += h.estrofas_es.join(' ');
        if (h.coro_es) contentStr += ' ' + h.coro_es;
        if (!contentStr) contentStr = h.letra || h.contenido || '';
        
        const contentPreview = `"${contentStr.substring(0, 50).replace(/"/g, '""')}..."`;
        return `${h.numero || h.id},${titleEs},${titleAy},${contentPreview}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedHymnal.id}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHymns = hymns.filter(h => {
    const term = searchQuery.toLowerCase();
    return (h.titulo_es?.toLowerCase() || '').includes(term) || 
           (h.titulo_ay?.toLowerCase() || '').includes(term) ||
           (h.titulo?.toLowerCase() || '').includes(term) || 
           (h.numero?.toString() === searchQuery) || 
           (h.id?.toString() === searchQuery);
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">Gestión del Himnario</h1>
        <p className="text-on-surface-variant text-sm mb-4">Visualiza y exporta los cantos de la aplicación.</p>
        
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-primary shrink-0">info</span>
          <p className="text-sm text-primary/90">
            <strong>Nota Informativa:</strong> Los himnarios son de solo lectura aquí. Se gestionan estáticamente desde los archivos JSON en <code className="bg-black/20 px-1.5 py-0.5 rounded text-primary">/public/data/</code>. Para modificarlos, edita directamente esos archivos en el código fuente.
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-surface-container/30 p-4 rounded-2xl border border-surface-border items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar por título o número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-all"
          />
        </div>
        <select
          value={selectedHymnal.id}
          onChange={(e) => setSelectedHymnal(HYMNALS.find(h => h.id === e.target.value))}
          className="bg-surface-container border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-all sm:w-48 cursor-pointer w-full sm:w-auto"
        >
          {HYMNALS.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <button 
          onClick={handleExportCSV}
          disabled={hymns.length === 0}
          className="px-4 py-2.5 bg-surface-container border border-surface-border rounded-xl text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          <span className="text-sm font-medium">Exportar CSV</span>
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          Error: {error}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-surface-border bg-surface-container-high/30 flex justify-between items-center">
            <h2 className="font-semibold text-white">{selectedHymnal.name}</h2>
            <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-md">
              {filteredHymns.length} cantos
            </span>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 bg-surface-container z-10">
                <tr className="border-b border-surface-border/50 text-on-surface-variant text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold w-16 text-center">#</th>
                  <th className="p-4 font-semibold w-1/3">Título</th>
                  <th className="p-4 font-semibold">Previsualización de Letra</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-surface-border/50">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="p-10 text-center text-on-surface-variant">Cargando himnario...</td>
                  </tr>
                ) : filteredHymns.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-10 text-center text-on-surface-variant">No se encontraron cantos.</td>
                  </tr>
                ) : (
                  filteredHymns.map((h, i) => {
                    let contentStr = '';
                    if (h.estrofas_es && Array.isArray(h.estrofas_es)) contentStr += h.estrofas_es[0] || '';
                    if (!contentStr && h.coro_es) contentStr += h.coro_es;
                    if (!contentStr) contentStr = h.letra || h.contenido || 'No hay letra disponible';

                    return (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-center font-bold text-on-surface-variant">
                          {h.numero || h.id || i + 1}
                        </td>
                        <td className="p-4 font-medium text-white">
                          <p>{h.titulo_es || h.titulo || 'Sin título'}</p>
                          {h.titulo_ay && <p className="text-xs text-on-surface-variant mt-0.5 italic">{h.titulo_ay}</p>}
                        </td>
                        <td className="p-4 text-on-surface-variant text-xs line-clamp-2 leading-relaxed">
                          {contentStr}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

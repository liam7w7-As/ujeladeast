import { useState } from 'react';

export default function HymnModal({ hymn, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('es'); // 'es' or 'ay'

  if (!isOpen || !hymn) return null;

  const hasAymara = hymn.titulo_ay || (hymn.estrofas_ay && hymn.estrofas_ay.length > 0);

  // If user had Aymara selected from previous hymn but this one doesn't have it, switch back to Spanish
  if (activeTab === 'ay' && !hasAymara) {
    setActiveTab('es');
  }

  const renderLyrics = (language) => {
    const estrofas = language === 'es' ? hymn.estrofas_es : hymn.estrofas_ay;
    const coro = language === 'es' ? hymn.coro_es : hymn.coro_ay;

    if (!estrofas || estrofas.length === 0) {
      return <p className="text-on-surface-variant italic text-center py-8">Letra no disponible.</p>;
    }

    return (
      <div className="space-y-6">
        {/* Estrofa 1 */}
        <div className="flex gap-4">
          <span className="font-bold text-primary select-none mt-1">1.</span>
          <p className="font-body-lg text-lg text-on-surface whitespace-pre-wrap leading-relaxed">{estrofas[0]}</p>
        </div>

        {/* Coro (Only shown once after 1st stanza) */}
        {coro && (
          <div className="my-6 bg-[#8f1937]/10 border-l-4 border-[#8f1937] p-5 rounded-r-lg relative">
            <span className="absolute top-2 right-3 text-[#8f1937]/30 font-bold text-xs uppercase tracking-widest select-none">Coro</span>
            <p className="font-body-lg text-lg text-on-surface font-medium whitespace-pre-wrap leading-relaxed italic">{coro}</p>
          </div>
        )}

        {/* Remaining Estrofas */}
        {estrofas.slice(1).map((estrofa, index) => (
          <div key={index + 1} className="flex gap-4">
            <span className="font-bold text-primary select-none mt-1">{index + 2}.</span>
            <p className="font-body-lg text-lg text-on-surface whitespace-pre-wrap leading-relaxed">{estrofa}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#27272a] bg-[#0e0e10]">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#8f1937] text-white font-bold text-lg px-3 py-1 rounded-lg leading-none">
                {hymn.numero}
              </span>
              {hymn.categoria && (
                <span className="text-[#8f1937] text-xs font-semibold uppercase tracking-wider border border-[#8f1937]/30 px-2 py-0.5 rounded-full">
                  {hymn.categoria}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">
              {activeTab === 'es' ? (hymn.titulo_es || 'Sin título') : (hymn.titulo_ay || hymn.titulo_es)}
            </h2>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-400 font-medium">
              {hymn.tonalidad && (
                <span className="flex items-center gap-1.5 bg-[#18181b] px-2.5 py-1 rounded-md border border-[#27272a]">
                  <span className="material-symbols-outlined text-[16px]">music_note</span>
                  {hymn.tonalidad}
                </span>
              )}
              {hymn.compas && (
                <span className="flex items-center gap-1.5 bg-[#18181b] px-2.5 py-1 rounded-md border border-[#27272a]">
                  <span className="material-symbols-outlined text-[16px]">speed</span>
                  {hymn.compas}
                </span>
              )}
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] hover:text-white text-gray-400 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        {hasAymara && (
          <div className="flex border-b border-[#27272a] bg-[#0e0e10] px-6">
            <button
              onClick={() => setActiveTab('es')}
              className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider transition-colors relative ${
                activeTab === 'es' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Español
              {activeTab === 'es' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ay')}
              className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider transition-colors relative ${
                activeTab === 'ay' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Aymara
              {activeTab === 'ay' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
              )}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {renderLyrics(activeTab)}
        </div>
      </div>
    </div>
  );
}

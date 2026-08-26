import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdrop, modalContent } from '../../lib/animations';

export default function HymnModal({ hymn, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('es'); // 'es' or 'ay'
  const [fontSize, setFontSize] = useState('normal'); // 'compact', 'normal', 'large'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef(null);

  const hasAymara = hymn?.titulo_ay || (hymn?.estrofas_ay && hymn?.estrofas_ay.length > 0);

  // Switch back to Spanish if current hymn has no Aymara lyrics
  useEffect(() => {
    if (activeTab === 'ay' && !hasAymara && hymn) {
      setActiveTab('es');
    }
  }, [hymn, hasAymara, activeTab]);

  // Manejo del botón "Atrás" del celular (Android / iOS history navigation)
  useEffect(() => {
    if (!isOpen || !hymn) return;

    // Agregar estado temporal al historial del navegador
    window.history.pushState({ hymnModalOpen: true }, '');

    const handlePopState = () => {
      // Si el usuario presiona el botón atrás físico del cel
      onClose();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, hymn]);

  const handleClose = () => {
    if (window.history.state?.hymnModalOpen) {
      window.history.back();
    } else {
      onClose();
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'compact': return 'text-sm sm:text-base leading-relaxed';
      case 'large': return 'text-lg sm:text-xl leading-loose';
      default: return 'text-base sm:text-lg leading-relaxed';
    }
  };

  const renderLyrics = (language) => {
    if (!hymn) return null;
    const estrofas = language === 'es' ? hymn.estrofas_es : hymn.estrofas_ay;
    const coro = language === 'es' ? hymn.coro_es : hymn.coro_ay;

    if (!estrofas || estrofas.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-white/40">
          <span className="material-symbols-outlined text-4xl mb-2 text-white/20">menu_book</span>
          <p className="italic text-sm">Letra no disponible en este momento.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Estrofa 1 */}
        <div className="flex gap-3 items-start bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl transition-colors border border-white/5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#8f1937]/20 border border-[#8f1937]/40 text-xs font-bold text-[#ff4d79] mt-0.5 select-none shadow-sm">
            1
          </span>
          <p className={`font-inter text-white/90 whitespace-pre-wrap ${getFontSizeClass()}`}>
            {estrofas[0]}
          </p>
        </div>

        {/* 🌟 Coro Destacado con Alto Contraste y Brillo 🌟 */}
        {coro && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-3 relative overflow-hidden rounded-xl border-l-4 border-[#ff4d79] bg-gradient-to-r from-[#8f1937]/35 via-[#8f1937]/15 to-transparent p-4 shadow-[0_0_30px_rgba(143,25,55,0.25)] border-y border-r border-white/5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ff4d79] text-white text-[10px] font-black uppercase tracking-widest shadow-md">
                <span className="material-symbols-outlined text-[13px]">record_voice_over</span>
                CORO
              </span>
              <span className="text-[11px] font-semibold text-[#ff80a0] uppercase tracking-wider">
                Cantar con Júbilo
              </span>
            </div>
            <p className={`font-inter font-medium text-white italic whitespace-pre-wrap ${getFontSizeClass()}`}>
              {coro}
            </p>
          </motion.div>
        )}

        {/* Demás Estrofas */}
        {estrofas.slice(1).map((estrofa, index) => (
          <div 
            key={index + 1} 
            className="flex gap-3 items-start bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl transition-colors border border-white/5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#8f1937]/20 border border-[#8f1937]/40 text-xs font-bold text-[#ff4d79] mt-0.5 select-none shadow-sm">
              {index + 2}
            </span>
            <p className={`font-inter text-white/90 whitespace-pre-wrap ${getFontSizeClass()}`}>
              {estrofa}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && hymn && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-2 sm:p-4'}`}>
          {/* Backdrop */}
          <motion.div 
            variants={modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <motion.div 
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`relative flex flex-col bg-[#0b0b0e] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300 ${
              isFullscreen 
                ? 'w-full h-full rounded-none border-none max-h-none' 
                : 'w-full max-w-2xl rounded-2xl max-h-[92vh]'
            }`}
          >
            {/* Header Compacto */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/10 bg-[#121216] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {/* Badge Número */}
                <span className="bg-gradient-to-br from-[#8f1937] to-[#d85d7c] text-white font-black text-sm px-2.5 py-1 rounded-lg shrink-0 shadow-[0_0_12px_rgba(143,25,55,0.4)]">
                  #{hymn.numero}
                </span>

                {/* Título Compacto */}
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                    {activeTab === 'es' ? (hymn.titulo_es || 'Sin título') : (hymn.titulo_ay || hymn.titulo_es)}
                  </h2>
                  <div className="flex items-center gap-2 text-[11px] text-white/50 mt-0.5 truncate">
                    {hymn.categoria && (
                      <span className="text-[#ff4d79] font-semibold">{hymn.categoria}</span>
                    )}
                    {hymn.tonalidad && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">music_note</span>
                          {hymn.tonalidad}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Acciones de Cabecera (Tamaño de fuente, Pantalla completa, Cerrar) */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Control de Tamaño de Letra */}
                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setFontSize(fontSize === 'large' ? 'normal' : 'compact')}
                    className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                      fontSize === 'compact' ? 'bg-[#8f1937] text-white' : 'text-white/60 hover:text-white'
                    }`}
                    title="Letra compacta"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize(fontSize === 'compact' ? 'normal' : 'large')}
                    className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                      fontSize === 'large' ? 'bg-[#8f1937] text-white' : 'text-white/60 hover:text-white'
                    }`}
                    title="Letra grande"
                  >
                    A+
                  </button>
                </div>

                {/* Toggle Pantalla Completa */}
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  title={isFullscreen ? "Salir de pantalla completa" : "Modo lectura pantalla completa"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </motion.button>

                {/* Botón Cerrar (X) */}
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-white/70 hover:text-red-400 flex items-center justify-center transition-colors ml-1"
                  title="Cerrar (o botón atrás del cel)"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </motion.button>
              </div>
            </div>

            {/* Pestañas de Idioma (Español / Aymara) */}
            {hasAymara && (
              <div className="flex border-b border-white/10 bg-[#0e0e12] px-4">
                <button
                  onClick={() => setActiveTab('es')}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                    activeTab === 'es' ? 'text-[#ff4d79]' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Español
                  {activeTab === 'es' && (
                    <motion.span 
                      layoutId="hymnTabIndicator"
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-[#ff4d79] rounded-t-full shadow-[0_0_8px_rgba(255,77,121,0.6)]"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('ay')}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                    activeTab === 'ay' ? 'text-[#ff4d79]' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Aymara
                  {activeTab === 'ay' && (
                    <motion.span 
                      layoutId="hymnTabIndicator"
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-[#ff4d79] rounded-t-full shadow-[0_0_8px_rgba(255,77,121,0.6)]"
                    />
                  )}
                </button>
              </div>
            )}

            {/* Cuerpo del Himno (Scroll optimizado) */}
            <div 
              ref={contentRef}
              className="p-3.5 sm:p-5 overflow-y-auto custom-scrollbar flex-1"
            >
              {renderLyrics(activeTab)}
            </div>

            {/* Footer Compacto */}
            <div className="px-4 py-2 bg-[#121216]/80 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
              <span>UJELADEA • Distrito El Alto</span>
              <span className="hidden sm:inline">Presiona ESC o botón Atrás para salir</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}



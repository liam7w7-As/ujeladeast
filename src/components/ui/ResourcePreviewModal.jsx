import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdrop, modalContent } from '../../lib/animations';

export default function ResourcePreviewModal({ resource, isOpen, onClose, onDownload }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  const { title, file_url, file_type, category, file_size } = resource;
  const type = (file_type || category || '').toUpperCase();

  const isPdf = type === 'PDF' || file_url?.toLowerCase().endsWith('.pdf');
  const isImage = ['IMAGEN', 'JPG', 'JPEG', 'PNG', 'WEBP', 'SVG'].includes(type) || /\.(jpg|jpeg|png|webp|svg)$/i.test(file_url);
  const isVideo = ['VIDEO', 'MP4', 'WEBM', 'MOV'].includes(type) || /\.(mp4|webm|mov)$/i.test(file_url);
  const isAudio = ['AUDIO', 'MP3', 'WAV', 'OGG'].includes(type) || /\.(mp3|wav|ogg)$/i.test(file_url);
  const isOffice = ['DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX'].includes(type);
  const isExternalDrive = file_url?.includes('drive.google.com') || file_url?.includes('docs.google.com');

  const officeViewerUrl = isOffice
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(file_url)}&embedded=true`
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={modalBackdrop}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={modalContent}
          className="relative z-10 w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col bg-[#121217] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#16161c]/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">
                {isPdf ? 'picture_as_pdf' : isImage ? 'image' : isVideo ? 'smart_display' : isAudio ? 'music_note' : 'description'}
              </span>
              <div className="min-w-0">
                <h2 className="text-white text-sm sm:text-base font-semibold truncate leading-tight">
                  {title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                  <span className="text-primary font-medium">{type || 'ARCHIVO'}</span>
                  {file_size && <span>• {file_size}</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={file_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir en pestaña nueva"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium border border-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Pestaña nueva</span>
              </a>

              <button
                onClick={() => onDownload(resource)}
                title="Descargar archivo"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container hover:bg-primary-container/80 text-white text-xs font-semibold shadow-md shadow-primary-container/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span className="hidden sm:inline">Descargar</span>
              </button>

              <button
                onClick={onClose}
                title="Cerrar vista previa"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-black/40 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
            {isPdf && (
              <iframe
                src={`${file_url}#toolbar=1`}
                title={title}
                className="w-full h-full rounded-lg border border-white/5 bg-white/5"
              />
            )}

            {isImage && (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                <img
                  src={file_url}
                  alt={title}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

            {isVideo && (
              <div className="w-full h-full flex items-center justify-center">
                <video
                  src={file_url}
                  controls
                  autoPlay
                  className="max-h-full max-w-full rounded-lg shadow-lg"
                />
              </div>
            )}

            {isAudio && (
              <div className="w-full max-w-md p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <span className="material-symbols-outlined text-4xl">music_note</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-base mb-1">{title}</h3>
                  <p className="text-white/50 text-xs">{category || 'Audio UJELADEA'}</p>
                </div>
                <audio src={file_url} controls autoPlay className="w-full mt-2" />
              </div>
            )}

            {isOffice && (
              <iframe
                src={officeViewerUrl}
                title={title}
                className="w-full h-full rounded-lg border border-white/5 bg-white"
              />
            )}

            {!isPdf && !isImage && !isVideo && !isAudio && !isOffice && (
              <div className="w-full max-w-md p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary-container/20 border border-primary-container/30 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">attach_file</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-base mb-1">{title}</h3>
                  <p className="text-white/50 text-xs">
                    {isExternalDrive ? 'Recurso alojado en Google Drive' : 'Este tipo de archivo se puede abrir externamente o descargar'}
                  </p>
                </div>
                <div className="flex gap-3 w-full justify-center">
                  <a
                    href={file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Abrir en pestaña nueva
                  </a>
                  <button
                    onClick={() => onDownload(resource)}
                    className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary-container/80 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Descargar
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

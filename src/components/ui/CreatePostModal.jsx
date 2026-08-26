import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdrop, modalContent } from '../../lib/animations';

export default function CreatePostModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Reflexiones');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content, imageFile, category);
    // Reset internal state
    setContent('');
    setCategory('Reflexiones');
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            variants={modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div 
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-lg bg-[#0e0e10] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
              <h2 className="text-xl font-bold text-white">Crear publicación</h2>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </motion.button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-[#18181b] border border-[#27272a] text-sm text-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#8f1937]"
                >
                  <option value="Reflexiones">Reflexión</option>
                  <option value="Devocionales">Devocional</option>
                  <option value="Anuncios">Anuncio</option>
                </select>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué quieres compartir con la comunidad?"
                className="w-full bg-transparent border-none text-white text-base resize-none focus:outline-none min-h-[120px] placeholder-gray-500"
                required
              />

              {imagePreview && (
                <div className="relative rounded-lg overflow-hidden border border-[#27272a] bg-black">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
                  <button 
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}
              
              {!imagePreview && (
                <div className="flex rounded-lg overflow-hidden border border-[#27272a] bg-[#18181b]">
                  <input 
                    type="url"
                    placeholder="O pega el link de una imagen..."
                    value={typeof imageFile === 'string' ? imageFile : ''}
                    onChange={(e) => {
                      setImageFile(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    className="w-full bg-transparent border-none text-sm text-gray-300 p-3 focus:outline-none placeholder-gray-600"
                  />
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="p-4 border-t border-[#27272a] flex items-center justify-between bg-[#09090b]">
              <div className="flex items-center gap-2">
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span> Subir Foto
                </motion.button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-[#8f1937] to-[#a81c40] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-[#8f1937]/30 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'Publicar'
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


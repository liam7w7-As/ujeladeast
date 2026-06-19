import { useState, useRef } from 'react';

export default function CreatePostModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Reflexiones');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0e0e10] border border-[#27272a] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
          <h2 className="text-xl font-semibold text-white">Crear publicación</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 overflow-y-auto">
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
        <div className="p-4 border-t border-[#27272a] flex items-center justify-between bg-[#09090b] rounded-b-xl">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span> Subir Foto
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="px-6 py-2 bg-[#8f1937] hover:bg-[#a81c40] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Publicar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

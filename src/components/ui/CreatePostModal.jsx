import { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Send, X } from 'lucide-react';
import AppDialog from './AppDialog';
import ProfileAvatar from './ProfileAvatar';
import { useAuth } from '../../hooks/useAuth';

export default function CreatePostModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Reflexiones');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const lock = useRef(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const chooseImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Elige una imagen JPG, PNG, WebP o GIF de hasta 10 MB.');
      event.target.value = '';
      return;
    }
    setError(''); setImageFile(file); setImageUrl(''); setPreview(URL.createObjectURL(file));
  };
  const submit = async event => {
    event.preventDefault();
    if (lock.current || isSubmitting || !content.trim()) return;
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) { setError('El enlace de la imagen debe comenzar con https://.'); return; }
    lock.current = true;
    setError('');
    try {
      await onSubmit(content.trim(), imageFile || imageUrl || null, category);
      setContent(''); setCategory('Reflexiones'); setImageFile(null); setPreview(null); setImageUrl('');
    } catch (err) { setError(err.message || 'No se pudo publicar. Tu borrador se conserva.'); }
    finally { lock.current = false; }
  };
  return <AppDialog open={isOpen} onClose={onClose} title="Crear publicación" busy={isSubmitting}>
    <form onSubmit={submit} className="flex min-h-0 flex-col">
      <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3"><ProfileAvatar profile={profile} metadata={user?.user_metadata} /><div className="min-w-0"><p className="text-sm font-semibold break-words">{profile?.full_name || user?.user_metadata?.full_name || 'Tu publicación'}</p><p className="text-xs text-[#a7aaa9] mt-1">Comunidad UJELADEA</p></div></div>
        <label className="block text-xs text-[#a7aaa9]">Categoría<select disabled={isSubmitting} value={category} onChange={event => setCategory(event.target.value)} className="mt-2 block rounded-lg border border-white/15 bg-[#222629] px-3 py-2 text-sm text-white"><option>Reflexiones</option><option>Devocionales</option><option>Anuncios</option></select></label>
        <textarea aria-label="Contenido de la publicación" autoFocus disabled={isSubmitting} required maxLength={5000} value={content} onChange={event => setContent(event.target.value)} placeholder="¿Qué quieres compartir con la comunidad?" className="block min-h-36 w-full resize-y rounded-lg border border-white/10 bg-transparent p-3 text-sm leading-7 text-white outline-none placeholder:text-[#858c88] focus:border-[#d48b9a]" />
        {imageFile && preview && <div className="relative rounded-lg bg-black overflow-hidden"><img src={preview} alt="Vista previa de tu imagen" className="max-h-64 w-full object-contain" /><button type="button" aria-label="Quitar imagen" disabled={isSubmitting} onClick={() => { setImageFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ''; }} className="absolute right-2 top-2 bg-black/75 rounded-lg p-2"><X size={18} /></button></div>}
        {!imageFile && <label className="block text-xs text-[#a7aaa9]">Enlace de imagen (opcional)<input type="url" disabled={isSubmitting} placeholder="https://" value={imageUrl} onChange={event => setImageUrl(event.target.value)} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#222629] px-3 py-2 text-sm text-white outline-none focus:border-[#d48b9a]" /></label>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-3 sm:px-6"><button type="button" disabled={isSubmitting} onClick={() => inputRef.current?.click()} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-[#bdc9c3] hover:bg-white/5"><ImagePlus size={18} /><span>Foto</span></button><input ref={inputRef} onChange={chooseImage} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" aria-label="Subir imagen" /><button type="submit" disabled={isSubmitting || !content.trim()} className="flex min-h-11 items-center gap-2 rounded-lg bg-[#a92d4a] px-4 text-sm font-semibold text-white disabled:opacity-40">{isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}{isSubmitting ? 'Publicando...' : 'Publicar'}</button></footer>
    </form>
  </AppDialog>;
}

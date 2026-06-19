import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import CreatePostModal from '../../components/ui/CreatePostModal';
import { usePosts } from '../../hooks/usePosts';

const CATEGORIES = ['Devocional', 'Estudio', 'Anuncio', 'Testimonio', 'Otro'];

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createPost } = usePosts();

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, 
          content, 
          category, 
          created_at,
          likes_count,
          user_id,
          profiles ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreatePost = async (content, imageFileOrUrl, category) => {
    setIsSubmitting(true);
    try {
      await createPost(content, imageFileOrUrl, category);
      setIsModalOpen(false);
      await loadPosts();
    } catch (err) {
      alert(err.message || 'Error al publicar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (postId) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== postId));
      setDeleteConfirm(null);
    } catch (err) {
      alert("Error al eliminar post: " + err.message);
    }
  };

  const handleChangeCategory = async (postId, newCategory) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ category: newCategory })
        .eq('id', postId);
      
      if (error) throw error;
      setPosts(posts.map(p => p.id === postId ? { ...p, category: newCategory } : p));
    } catch (err) {
      alert("Error al cambiar categoría: " + err.message);
    }
  };

  const filteredPosts = posts.filter(p => {
    const matchesSearch = (
      p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Gestión de Publicaciones</h1>
          <p className="text-on-surface-variant text-sm">Modera y administra todos los posts del sistema.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Crear Publicación
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-surface-container/30 p-4 rounded-2xl border border-surface-border">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar por título, contenido o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-surface-container border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-all sm:w-48 cursor-pointer"
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button 
          onClick={loadPosts}
          className="px-4 py-2.5 bg-surface-container border border-surface-border rounded-xl text-on-surface-variant hover:text-white transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          Error: {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50 border-b border-surface-border text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold w-[40%]">Publicación</th>
                <th className="p-4 font-semibold">Autor</th>
                <th className="p-4 font-semibold">Categoría</th>
                <th className="p-4 font-semibold text-center">Interacciones</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-surface-border/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-on-surface-variant">Cargando publicaciones...</td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-on-surface-variant">No se encontraron publicaciones.</td>
                </tr>
              ) : (
                filteredPosts.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <p className="text-sm text-white line-clamp-2">{p.content}</p>
                      <p className="text-[10px] text-on-surface-variant/60 mt-1 uppercase tracking-wider">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-xs text-primary shrink-0">
                          {p.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="truncate">{p.profiles?.full_name || 'Desconocido'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={p.category || 'Otro'}
                        onChange={(e) => handleChangeCategory(p.id, e.target.value)}
                        className="bg-surface-container border border-surface-border rounded-lg px-2 py-1 text-xs text-on-surface-variant hover:text-white focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">
                        <span className="material-symbols-outlined text-[14px]">favorite</span>
                        {p.likes_count || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setDeleteConfirm(p)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto opacity-0 group-hover:opacity-100"
                        title="Eliminar publicación"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 glass-card rounded-2xl p-6 max-w-sm w-full">
            <span className="material-symbols-outlined text-4xl text-red-400 block mb-4">warning</span>
            <h3 className="font-bold text-white text-lg mb-2">¿Eliminar post?</h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Estás a punto de eliminar un post de <strong className="text-white">{deleteConfirm.profiles?.full_name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-surface-border text-on-surface-variant hover:text-white transition-colors text-sm">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 font-semibold text-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <CreatePostModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePost}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

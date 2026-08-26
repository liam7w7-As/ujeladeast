import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../hooks/useAuth';
import { usePosts } from '../../hooks/usePosts';
import { useNavigate } from 'react-router-dom';

export default function CommentsSection({ postId }) {
  const { user } = useAuth();
  const { getComments, addComment, deleteComment } = usePosts();
  const navigate = useNavigate();
  
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    const data = await getComments(postId);
    setComments(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const newComment = await addComment(postId, content.trim());
      setComments([...comments, newComment]);
      setContent('');
    } catch (error) {
      console.error('Error al comentar:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('¿Seguro que deseas eliminar este comentario?')) return;
    try {
      await deleteComment(commentId, postId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mt-4 pt-4 border-t border-white/5 overflow-hidden"
    >
      <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="text-center py-4 text-white/40 text-sm">Cargando comentarios...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-white/40 text-sm">No hay comentarios aún. ¡Sé el primero!</div>
        ) : (
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="flex gap-3 group"
              >
                <img 
                  src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles?.full_name}&background=8f1937&color=fff`}
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full bg-white/10 shrink-0 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-white/5 hover:bg-white/[0.07] transition-colors rounded-2xl rounded-tl-none px-4 py-2.5 inline-block max-w-full">
                    <div className="flex items-baseline gap-2 justify-between">
                      <span className="font-semibold text-white text-sm truncate">
                        {comment.profiles?.full_name || 'Usuario UJELADEA'}
                      </span>
                      <span className="text-[10px] text-white/40 shrink-0">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm break-words whitespace-pre-wrap mt-0.5">{comment.content}</p>
                  </div>
                  {user && user.id === comment.user_id && (
                    <div className="mt-1 flex gap-3 px-2">
                      <button 
                        onClick={() => handleDelete(comment.id)}
                        className="text-[11px] font-medium text-white/30 hover:text-red-400 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <img 
          src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.full_name || 'U'}&background=8f1937&color=fff`}
          alt="Tu avatar" 
          className="w-8 h-8 rounded-full bg-white/10 shrink-0 object-cover"
        />
        <div className="relative flex-1">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user ? "Escribe un comentario..." : "Inicia sesión para comentar..."}
            className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#8f1937] transition-colors pr-10"
            disabled={submitting}
          />
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="submit" 
            disabled={!content.trim() || submitting}
            className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center text-[#8f1937] hover:bg-white/5 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}


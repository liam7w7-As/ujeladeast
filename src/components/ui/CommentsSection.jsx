import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePosts } from '../../hooks/usePosts';
import { postTime } from '../../lib/feed';
import ProfileAvatar from './ProfileAvatar';

export default function CommentsSection({ postId, onCountChange }) {
  const { user, profile } = useAuth();
  const { getComments, addComment, deleteComment } = usePosts();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    getComments(postId).then(data => { if (!cancelled) { setComments(data); setError(''); } })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar los comentarios.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId, getComments, retry]);

  const submit = async event => {
    event.preventDefault();
    if (!user || !content.trim() || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const comment = await addComment(postId, content.trim());
      setComments(current => [...current, comment]);
      onCountChange?.(comments.length + 1);
      setContent('');
    } catch { setError('No se pudo enviar el comentario. Intenta nuevamente.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const remove = async id => {
    if (lock.current || !window.confirm('¿Eliminar tu comentario?')) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await deleteComment(id, postId);
      setComments(current => current.filter(comment => comment.id !== id));
      onCountChange?.(Math.max(0, comments.length - 1));
    } catch { setError('No se pudo eliminar el comentario.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="feed-comments" aria-label="Comentarios">
    <h3 className="text-xs font-semibold text-[#cad4cd] mb-2">Conversación</h3>
    {loading ? <p role="status" className="py-4 text-xs text-[#a7aaa9]">Cargando comentarios...</p> : !error && comments.length === 0 && <p className="py-4 text-xs text-[#a7aaa9]">Sé el primero en comentar.</p>}
    <div className="max-h-96 overflow-y-auto">{comments.map(comment => <div key={comment.id} className="feed-comment"><ProfileAvatar profile={comment.profiles} className="h-8 w-8" /><div className="feed-comment-body"><div className="feed-comment-heading"><strong>{comment.profiles?.full_name || 'Miembro de la comunidad'}</strong><time dateTime={comment.created_at}>{postTime(comment.created_at)}</time></div><p>{comment.content}</p></div>{user?.id === comment.user_id && <button type="button" disabled={busy} title="Eliminar comentario" aria-label="Eliminar comentario" onClick={() => remove(comment.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#929c95] hover:text-red-300"><Trash2 size={14} /></button>}</div>)}</div>
    {error && <p role="alert" className="my-3 text-xs text-red-300">{error}{!comments.length && <button type="button" onClick={() => { setLoading(true); setRetry(value => value + 1); }} className="ml-2 underline">Reintentar</button>}</p>}
    {user ? <form onSubmit={submit} className="mt-4 flex items-start gap-2"><ProfileAvatar profile={profile} metadata={user.user_metadata} className="h-8 w-8" /><div className="flex flex-1 min-w-0 items-end gap-1 rounded-lg border border-white/15 bg-[#121618] p-1"><textarea aria-label="Escribe un comentario" placeholder="Escribe un comentario..." value={content} onChange={event => setContent(event.target.value)} rows={1} maxLength={2000} disabled={busy} className="max-h-40 min-h-9 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-xs leading-5 outline-none" /><button type="submit" aria-label="Enviar comentario" title="Enviar comentario" disabled={busy || !content.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#ffc0c8] hover:bg-white/5 disabled:opacity-30"><Send size={17} /></button></div></form>
      : <Link to="/login" className="mt-4 inline-block text-xs text-[#ffc0c8] underline underline-offset-4">Inicia sesión para comentar</Link>}
  </section>;
}

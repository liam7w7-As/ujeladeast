import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { postCategory, postTime } from '../../lib/feed';
import CommentsSection from './CommentsSection';
import ShareButton from './ShareButton';
import ProfileAvatar from './ProfileAvatar';
import AppDialog from './AppDialog';

export default function PostCard({ id, profiles, created_at, content, image_url, likes_count = 0, comments_count = 0, category, isLiked = false, onToggleLike }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const linked = new URLSearchParams(location.search).get('post') === String(id);
  const [commentsOpen, setCommentsOpen] = useState(linked);
  const [pendingLike, setPendingLike] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [commentSnapshot, setCommentSnapshot] = useState(null);
  const postRef = useRef(null);
  const likeLock = useRef(false);
  const author = profiles?.full_name || 'Miembro de la comunidad';
  const badge = postCategory(category);
  const text = content || '';
  const liked = pendingLike ?? isLiked;
  const count = Math.max(0, likes_count + (pendingLike === null || pendingLike === isLiked ? 0 : pendingLike ? 1 : -1));
  const commentCount = commentSnapshot?.base === comments_count ? commentSnapshot.count : comments_count;

  useEffect(() => {
    if (!linked) return;
    const timer = setTimeout(() => { setCommentsOpen(true); postRef.current?.scrollIntoView({ block: 'start' }); }, 100);
    return () => clearTimeout(timer);
  }, [linked]);

  const toggleLike = async () => {
    if (!user) { navigate('/login'); return; }
    if (likeLock.current) return;
    likeLock.current = true;
    setError(''); setPendingLike(!isLiked);
    try { await onToggleLike(id, !isLiked); }
    catch { setError('No se pudo guardar tu reacción. Intenta nuevamente.'); }
    finally { likeLock.current = false; setPendingLike(null); }
  };

  return <article ref={postRef} className="feed-post" aria-label={`Publicación de ${author}`}>
    <header className="feed-post-header"><ProfileAvatar profile={profiles} className="h-[42px] w-[42px]" /><div className="feed-post-author"><h2>{author}</h2><p><span>{profiles?.church_name || 'Comunidad UJELADEA'}</span><span aria-hidden="true">·</span><time dateTime={created_at}>{postTime(created_at)}</time></p></div><span className="feed-category" data-category={badge.id}>{badge.label}</span></header>
    {text && <div className="feed-post-body"><p>{!expanded && text.length > 550 ? `${text.slice(0, 550)}…` : text}</p>{text.length > 550 && <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="mt-2 text-sm text-[#ffc0c8] hover:underline">{expanded ? 'Ver menos' : 'Seguir leyendo'}</button>}</div>}
    {image_url && (imageFailed ? <p className="px-4 py-8 text-center text-sm text-[#a5aaa8]">No se pudo cargar la imagen.</p> : <button type="button" className="feed-post-media" onClick={() => setImageOpen(true)} aria-label="Ampliar imagen de la publicación"><img src={image_url} alt={`Imagen de la publicación de ${author}`} loading="lazy" decoding="async" onError={() => setImageFailed(true)} /></button>)}
    <div className="feed-post-actions"><button type="button" onClick={toggleLike} disabled={pendingLike !== null} aria-pressed={liked} aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} className="feed-action"><Heart size={18} fill={liked ? 'currentColor' : 'none'} /><span>{count > 0 ? count : 'Me gusta'}</span></button><button type="button" onClick={() => setCommentsOpen(value => !value)} aria-expanded={commentsOpen} className="feed-action"><MessageCircle size={18} /><span>{commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'comentario' : 'comentarios'}` : 'Comentar'}</span></button><ShareButton post={{ id, content: text }} className="feed-action" /></div>
    {error && <p role="alert" className="mx-4 mb-4 text-xs text-red-300">{error}</p>}
    {commentsOpen && <CommentsSection postId={id} onCountChange={total => setCommentSnapshot({ base: comments_count, count: total })} />}
    <AppDialog open={imageOpen} onClose={() => setImageOpen(false)} title={`Publicación de ${author}`} wide><div className="overflow-auto bg-black p-2"><img src={image_url} alt={`Imagen de la publicación de ${author}`} className="max-h-[calc(100dvh-110px)] w-full object-contain" /></div></AppDialog>
  </article>;
}

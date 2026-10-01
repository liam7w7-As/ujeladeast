import { useEffect, useRef, useState } from 'react';
import { Heart, Maximize2, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { postCategory, postTime } from '../../lib/feed';
import CommentsSection from './CommentsSection';
import ShareButton from './ShareButton';
import ProfileAvatar from './ProfileAvatar';
import AppDialog from './AppDialog';

export default function PostCard({ id, profiles, created_at, content, image_url, likes_count = 0, comments_count = 0, category, isLiked = false, onToggleLike, entranceIndex = 0 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const linked = new URLSearchParams(location.search).get('post') === String(id);
  const [commentsOpen, setCommentsOpen] = useState(linked);
  const [pendingLike, setPendingLike] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [commentSnapshot, setCommentSnapshot] = useState(null);
  const postRef = useRef(null);
  const likeLock = useRef(false);
  const burstTimer = useRef(null);
  const author = profiles?.full_name || 'Miembro de la comunidad';
  const badge = postCategory(category);
  const text = content || '';
  const liked = pendingLike ?? isLiked;
  const count = Math.max(0, likes_count + (pendingLike === null || pendingLike === isLiked ? 0 : pendingLike ? 1 : -1));
  const commentCount = commentSnapshot?.base === comments_count ? commentSnapshot.count : comments_count;
  const captionLimit = image_url ? 160 : 420;

  useEffect(() => {
    if (!linked) return;
    const timer = setTimeout(() => { setCommentsOpen(true); postRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, 100);
    return () => clearTimeout(timer);
  }, [linked]);
  useEffect(() => () => clearTimeout(burstTimer.current), []);

  const react = async next => {
    if (!user) { navigate('/login'); return; }
    if (likeLock.current || next === isLiked) return;
    likeLock.current = true;
    setError(''); setPendingLike(next);
    try { await onToggleLike(id, next); }
    catch { setError('No se pudo guardar tu reacción. Intenta nuevamente.'); }
    finally { likeLock.current = false; setPendingLike(null); }
  };
  const doubleLike = () => {
    if (!user) { navigate('/login'); return; }
    setHeartBurst(true);
    clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setHeartBurst(false), 850);
    react(true);
  };
  const caption = text && <div className={image_url ? 'feed-post-caption' : 'feed-post-text'}>
    {!image_url && <span className="feed-text-category" data-category={badge.id}>{badge.label}</span>}
    <p>{image_url && <strong>{author} </strong>}{!expanded && text.length > captionLimit ? `${text.slice(0, captionLimit)}…` : text}</p>
    {text.length > captionLimit && <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="feed-read-more">{expanded ? 'Ver menos' : 'Seguir leyendo'}</button>}
  </div>;

  return <motion.article
    ref={postRef} className="feed-post" aria-label={`Publicación de ${author}`}
    initial={reduced ? false : { opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.05 }}
    transition={{ duration: reduced ? 0 : 0.32, delay: reduced ? 0 : Math.min(entranceIndex, 4) * 0.035 }}
  >
    <header className="feed-post-header">
      <ProfileAvatar profile={profiles} className="h-9 w-9" />
      <div className="feed-post-author"><h2>{author}</h2><p>{profiles?.church_name || 'Comunidad UJELADEA'}</p></div>
      <time dateTime={created_at} title={created_at}>{postTime(created_at)}</time>
    </header>
    {image_url ? (imageFailed ? <p className="feed-image-error">No se pudo cargar la imagen.</p> : <div className="feed-post-media" onDoubleClick={doubleLike}>
      <img src={image_url} alt={`Imagen de la publicación de ${author}`} loading={entranceIndex === 0 ? 'eager' : 'lazy'} decoding="async" onError={() => setImageFailed(true)} />
      <button type="button" className="feed-image-expand" onClick={() => setImageOpen(true)} onDoubleClick={event => event.stopPropagation()} aria-label="Ampliar imagen de la publicación" title="Ampliar imagen"><Maximize2 size={18} /></button>
      <AnimatePresence>{heartBurst && <motion.span className="feed-heart-burst" aria-hidden="true" initial={{ opacity: 0, scale: reduced ? 1 : 0.4, rotate: reduced ? 0 : -15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: reduced ? 1 : 1.15 }} transition={{ duration: 0.22 }}><Heart size={88} fill="currentColor" strokeWidth={1} /></motion.span>}</AnimatePresence>
    </div>) : caption}
    <div className="feed-post-actions">
      <motion.button type="button" onClick={() => react(!isLiked)} disabled={pendingLike !== null} aria-pressed={liked} aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} title={liked ? 'Quitar me gusta' : 'Me gusta'} className="feed-action" whileTap={reduced ? undefined : { scale: 0.82 }}>
        <motion.span animate={liked && !reduced ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}><Heart size={25} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.7} /></motion.span>
      </motion.button>
      <motion.button type="button" onClick={() => setCommentsOpen(value => !value)} aria-label="Comentar" title="Comentar" aria-expanded={commentsOpen} className="feed-action" whileTap={reduced ? undefined : { scale: 0.88 }}><MessageCircle size={25} strokeWidth={1.7} /></motion.button>
      <ShareButton post={{ id, content: text }} className="feed-action" iconOnly />
      <span className="feed-category" data-category={badge.id}>{badge.label}</span>
    </div>
    <p className="feed-like-count" aria-live="polite">{count > 0 ? `${count} me gusta` : 'Sé el primero en reaccionar'}</p>
    {image_url && caption}
    <button type="button" className="feed-comment-count" onClick={() => setCommentsOpen(value => !value)} aria-expanded={commentsOpen}>{commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'comentario' : 'comentarios'}` : 'Inicia la conversación'}</button>
    {error && <p role="alert" className="feed-post-error">{error}</p>}
    <AnimatePresence initial={false}>
      {commentsOpen && <motion.div key="comments" className="feed-comments-reveal" initial={{ height: reduced ? 'auto' : 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: reduced ? 'auto' : 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.22 }}><CommentsSection postId={id} onCountChange={total => setCommentSnapshot({ base: comments_count, count: total })} /></motion.div>}
    </AnimatePresence>
    <AppDialog open={imageOpen} onClose={() => setImageOpen(false)} title={`Publicación de ${author}`} wide><div className="overflow-auto bg-black p-2"><img src={image_url} alt={`Imagen de la publicación de ${author}`} className="max-h-[calc(100dvh-110px)] w-full object-contain" /></div></AppDialog>
  </motion.article>;
}

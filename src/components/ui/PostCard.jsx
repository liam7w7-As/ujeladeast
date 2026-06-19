import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import CommentsSection from './CommentsSection';
import ShareButton from './ShareButton';
import { useLocation } from 'react-router-dom';

export default function PostCard({ id, profiles, created_at, content, image_url, likes_count, comments_count, category, isLiked, onToggleLike }) {
  const { user } = useAuth();
  const [localLike, setLocalLike] = useState(isLiked);
  const [localCount, setLocalCount] = useState(likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  
  const location = useLocation();
  const postRef = useRef(null);

  const author = profiles?.full_name || 'Usuario';
  const role = profiles?.church_name || 'Comunidad';
  const avatar = profiles?.avatar_url || `https://ui-avatars.com/api/?name=${author}&background=8f1937&color=fff`;
  
  useEffect(() => {
    // Check if URL has ?post=id
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('post') === id) {
      setShowComments(true);
      setTimeout(() => {
        postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [id, location.search]);

  // Format relative time
  const time = (() => {
    const diff = new Date() - new Date(created_at);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    if (days === 1) return `Ayer`;
    return `Hace ${days} días`;
  })();

  const handleLike = async () => {
    if (!user) return; // Or show a toast
    const currentlyLiked = localLike;
    setLocalLike(!currentlyLiked);
    setLocalCount(prev => currentlyLiked ? Math.max(0, prev - 1) : prev + 1);
    
    try {
      await onToggleLike(id, !currentlyLiked);
    } catch (error) {
      // Revert on error
      setLocalLike(currentlyLiked);
      setLocalCount(prev => currentlyLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const isImageCard = !!image_url;
  const displayCategory = category === 'reflexion' ? 'Reflexión' : category === 'devocional' ? 'Devocional' : 'Anuncio';

  return (
    <article ref={postRef} className="bg-glass-bg border border-surface-border rounded-xl p-6 backdrop-blur-xl hover:border-primary-container transition-colors duration-300 scroll-mt-24">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-surface-border shrink-0">
            <img alt={`Avatar de ${author}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" src={avatar} />
          </div>
          <div className="min-w-0">
            <h4 className="font-headline-md text-[18px] leading-tight text-on-surface truncate">{author}</h4>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 flex items-center gap-2 truncate">
              <span className="truncate">{role}</span>
              <span className="w-1 h-1 rounded-full bg-surface-variant shrink-0"></span>
              <span className="shrink-0">{time}</span>
            </p>
          </div>
        </div>
        <button className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-white/5 transition-colors shrink-0">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      {/* Post Content */}
      <div className={isImageCard ? "mb-4" : "mb-6"}>
        <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap mb-4">{content}</p>
        
        {isImageCard && (
          <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden border border-surface-border relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10"></div>
            <img alt="Contenido" className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700" src={image_url} />
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-border/50">
        <div className="flex gap-4">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 transition-colors group ${localLike ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
            <span className="material-symbols-outlined" style={localLike ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
            <span className="font-label-sm text-label-sm">{localCount}</span>
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 transition-colors group ${showComments ? 'text-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
          >
            <span className="material-symbols-outlined" style={showComments ? { fontVariationSettings: "'FILL' 1" } : {}}>chat_bubble</span>
            <span className="font-label-sm text-label-sm">{comments_count || 0}</span>
          </button>
          
          <ShareButton post={{ id, content }} />
        </div>
        <div className="flex items-center shrink-0 ml-2">
          <span className={`px-2 py-1 border rounded text-[10px] font-label-sm uppercase tracking-wider ${category === 'anuncio' ? 'border-secondary/20 bg-secondary/5 text-secondary' : 'border-primary/20 bg-primary/5 text-primary'}`}>
            {displayCategory}
          </span>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentsSection postId={id} />
      )}
    </article>
  )
}

import { useState, useRef, useEffect } from 'react';
import { Check, Copy, MessageCircle, Send, Share2, ThumbsUp } from 'lucide-react';

export default function ShareButton({ post, className = 'flex items-center gap-2 text-white/60 hover:text-white', iconOnly = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef(null);

  const postUrl = `${window.location.origin}/feed?post=${post.id}`;
  const shareText = `Mira esta publicación en UJELADEA: "${(post.content || '').substring(0, 80)}"`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const escape = event => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', handleClickOutside); document.removeEventListener('keydown', escape); };
  }, []);

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UJELADEA',
          text: shareText,
          url: postUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          setIsOpen(!isOpen);
        }
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  const copyToClipboard = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      setError('No se pudo copiar el enlace.');
      console.error('Failed to copy!', err);
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + postUrl)}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        type="button"
        aria-label="Compartir publicación"
        title="Compartir publicación"
        aria-expanded={isOpen}
        onClick={handleShareClick}
        className={className}
      >
        {iconOnly ? <Send size={24} strokeWidth={1.7} /> : <Share2 size={18} />}
        {!iconOnly && <span className="text-xs font-medium">Compartir</span>}
      </button>

      {isOpen && (
        <div className={`absolute ${iconOnly ? 'left-0' : 'right-0'} bottom-full mb-2 w-48 bg-[#25292c] border border-white/15 rounded-lg shadow-xl overflow-hidden z-20`}>
          <div className="p-1 flex flex-col">
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? '¡Copiado!' : 'Copiar enlace'}
            </button>
            
            <button 
              onClick={shareWhatsApp}
              className="flex items-center gap-3 px-3 py-2 text-sm text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors text-left"
            >
              <MessageCircle size={17} />
              WhatsApp
            </button>
            
            <button 
              onClick={shareFacebook}
              className="flex items-center gap-3 px-3 py-2 text-sm text-[#1877F2] hover:bg-[#1877F2]/10 rounded-lg transition-colors text-left"
            >
              <ThumbsUp size={17} />
              Facebook
            </button>
            {error && <p role="alert" className="px-3 py-2 text-xs text-red-300">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';

export default function ShareButton({ post }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const postUrl = `${window.location.origin}/feed?post=${post.id}`;
  const shareText = `Mira esta publicación en UJELADEA: "${post.content.substring(0, 50)}..."`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + postUrl)}`, '_blank');
    setIsOpen(false);
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={handleShareClick}
        className="flex items-center gap-2 text-white/50 hover:text-[#8f1937] transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">share</span>
        <span className="text-xs font-medium">Compartir</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#1a1a1f] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 fade-in z-10">
          <div className="p-1 flex flex-col">
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? '¡Copiado!' : 'Copiar enlace'}
            </button>
            
            <button 
              onClick={shareWhatsApp}
              className="flex items-center gap-3 px-3 py-2 text-sm text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[18px]">forum</span>
              WhatsApp
            </button>
            
            <button 
              onClick={shareFacebook}
              className="flex items-center gap-3 px-3 py-2 text-sm text-[#1877F2] hover:bg-[#1877F2]/10 rounded-lg transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[18px]">thumb_up</span>
              Facebook
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Expand, RefreshCw } from 'lucide-react';
import { communityPhotos, photoSrc, photoSrcSet } from '../../lib/communityPhotos';
import { GalleryHeading } from '../seo/HomeContent';
import AppDialog from '../ui/AppDialog';

export default function CommunityGallery() {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pointer = useRef(null);
  const swiped = useRef(false);
  const opener = useRef(null);
  const close = () => {
    setExpanded(false);
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
  };
  const photo = communityPhotos[index];
  const select = next => {
    setIndex((next + communityPhotos.length) % communityPhotos.length);
    setFailed(false);
  };
  const keyboard = event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      select(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  };
  const swipe = {
    onPointerDown: event => {
      pointer.current = { x: event.clientX, y: event.clientY };
      swiped.current = false;
    },
    onPointerCancel: () => { pointer.current = null; },
    onPointerUp: event => {
      if (!pointer.current) return;
      const dx = event.clientX - pointer.current.x;
      const dy = event.clientY - pointer.current.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swiped.current = true;
        select(index + (dx < 0 ? 1 : -1));
      }
      pointer.current = null;
    },
  };
  const controls = <div className="gallery-controls">
    <button type="button" onClick={() => select(index - 1)} aria-label="Foto anterior" title="Foto anterior"><ArrowLeft size={20} /></button>
    <button type="button" onClick={() => select(index + 1)} aria-label="Foto siguiente" title="Foto siguiente"><ArrowRight size={20} /></button>
  </div>;
  const image = <img key={`${photo.name}-${attempt}`} src={photoSrc(photo)} srcSet={photoSrcSet(photo)}
    sizes={expanded ? '(max-width: 1024px) 100vw, 1000px' : '(max-width: 1200px) 100vw, 1160px'}
    width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" draggable="false"
    onError={() => setFailed(true)} />;
  const error = <div className="gallery-error" role="status">
    <p>No pudimos cargar esta foto.</p>
    <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}><RefreshCw size={18} />Reintentar</button>
  </div>;

  return <section className="community-gallery landing-container" aria-labelledby="gallery-title" aria-roledescription="carrusel" onKeyDown={keyboard}>
    <GalleryHeading />
    <div className="gallery-stage" {...swipe}>
      {failed ? error : <button ref={opener} type="button" className="gallery-open" onClick={() => { if (!swiped.current) setExpanded(true); }} aria-label={`Ampliar: ${photo.title}`}>
        {image}<span className="gallery-expand"><Expand size={20} aria-hidden="true" /></span>
      </button>}
    </div>
    <div className="gallery-caption">
      <p aria-live="polite" aria-atomic="true"><span>{String(index + 1).padStart(2, '0')} / 04</span>{photo.title}</p>
      {controls}
    </div>
    <div className="gallery-thumbnails" aria-label="Elegir una foto">
      {communityPhotos.map((item, itemIndex) => <button key={item.name} type="button" onClick={() => select(itemIndex)} aria-label={`Ver foto ${itemIndex + 1}: ${item.title}`} aria-pressed={index === itemIndex}>
        <img src={photoSrc(item, item.width === 900 ? 480 : 640)} width={item.width} height={item.height} alt="" loading="lazy" />
      </button>)}
    </div>
    <AppDialog open={expanded} onClose={close} title={photo.title} wide>
      <div className="gallery-lightbox" onKeyDown={keyboard} {...swipe}>
        <div className="gallery-lightbox-image">{failed ? error : image}</div>
        <div className="gallery-caption"><p aria-live="polite">{index + 1} / {communityPhotos.length}</p>{controls}</div>
      </div>
    </AppDialog>
  </section>;
}

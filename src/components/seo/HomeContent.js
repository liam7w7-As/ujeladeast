import { createElement as h } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Music2, NotebookPen } from 'lucide-react';
import { organization } from '../../lib/siteContent.js';
import { coverPhoto, communityPhotos, photoSrc, photoSrcSet } from '../../lib/communityPhotos.js';
import SocialLinks from '../ui/SocialLinks.js';

export function HomeHero() {
  return h('section', { className: 'landing-hero', 'aria-labelledby': 'home-title' },
    h('img', { className: 'landing-cover', src: photoSrc(coverPhoto), srcSet: photoSrcSet(coverPhoto), sizes: '100vw', width: coverPhoto.width, height: coverPhoto.height, alt: coverPhoto.alt, fetchPriority: 'high', decoding: 'async' }),
    h('div', { className: 'landing-hero-shade', 'aria-hidden': true }),
    h('div', { className: 'landing-hero-copy landing-container' },
      h('p', { className: 'landing-kicker' }, 'Una comunidad. Una misma fe.'),
      h('h1', { id: 'home-title' }, 'UJELADEA'),
      h('p', { className: 'landing-motto' }, 'Somos uno en Cristo, ', h('br'), 'unidos permaneceremos.'),
      h('div', { className: 'landing-actions' },
        h('a', { className: 'landing-button', href: '/feed' }, 'Comunidad', h(ArrowUpRight, { size: 19, 'aria-hidden': true })),
        h('a', { className: 'landing-text-link', href: '/estudio-biblico' }, 'Estudio b\u00edblico', h(ArrowRight, { size: 18, 'aria-hidden': true }))),
    ),
  );
}

export function HomeIntro() {
  return h('div', { className: 'landing-container landing-intro' },
    h('div', null,
      h('p', { className: 'landing-kicker' }, 'Desde El Alto, Bolivia'),
      h('h2', null, 'Somos UJELADEA'),
      h('p', { className: 'landing-full-name' }, organization.fullName),
        h('a', { className: 'landing-text-link', href: '/nosotros' }, 'Conoce nuestra comunidad', h(ArrowUpRight, { size: 19, 'aria-hidden': true }))),
    h('div', { className: 'landing-intro-body' },
      h('p', null, organization.introduction),
      h('p', null, organization.structure),
      h('a', { className: 'landing-text-link', href: '/sociedades' }, 'Nuestras sociedades', h(ArrowRight, { size: 18, 'aria-hidden': true }))),
  );
}

const resources = [
  { href: '/biblia', title: 'La Biblia', detail: 'La Palabra, contigo.', icon: BookOpen, color: 'mint' },
  { href: '/estudio-biblico', title: 'Estudio b\u00edblico', detail: 'Un paso de fe cada d\u00eda.', icon: NotebookPen, color: 'rose' },
  { href: '/himnario', title: 'Himnario', detail: 'Una voz para alabar juntos.', icon: Music2, color: 'gold' },
];
export function HomeResources() {
  return h('section', { className: 'landing-resources', 'aria-labelledby': 'resources-title' },
    h('div', { className: 'landing-container' },
      h('div', { className: 'landing-section-heading' },
        h('div', null, h('p', { className: 'landing-kicker' }, 'Para tu d\u00eda a d\u00eda'), h('h2', { id: 'resources-title' }, 'Crezcamos en la fe')),
        h('a', { className: 'landing-text-link', href: '/recursos' }, 'Todos los recursos', h(ArrowUpRight, { size: 18, 'aria-hidden': true }))),
      h('div', { className: 'landing-resource-list' }, resources.map(resource =>
        h('a', { className: 'landing-resource', href: resource.href, key: resource.href, 'data-color': resource.color },
          h(resource.icon, { className: 'landing-resource-icon', size: 30, strokeWidth: 1.5, 'aria-hidden': true }),
          h('div', null, h('h3', null, resource.title), h('p', null, resource.detail)),
          h(ArrowUpRight, { className: 'landing-resource-arrow', size: 20, 'aria-hidden': true })))),
    ),
  );
}

export function HomeConnect() {
  return h('section', { className: 'landing-connect', 'aria-labelledby': 'connect-title' },
    h('div', { className: 'landing-container' },
      h('p', { className: 'landing-kicker' }, 'Hay un lugar para ti'),
      h('h2', { id: 'connect-title' }, 'Sigamos compartiendo.'),
      h('p', null, organization.invitation),
      h(SocialLinks),
      h('a', { className: 'landing-text-link', href: '/feed' }, 'Ir a la comunidad', h(ArrowUpRight, { size: 19, 'aria-hidden': true }))),
  );
}

export function GalleryHeading() {
  return h('div', { className: 'landing-section-heading' },
    h('div', null, h('p', { className: 'landing-kicker' }, 'Nuestra vida juntos'), h('h2', { id: 'gallery-title' }, 'La fe tambi\u00e9n se comparte.')),
    h('p', { className: 'landing-gallery-intro' }, 'Encuentros, oraci\u00f3n y momentos que nos unen.'),
  );
}

// The crawler and no-JS page receive real photos and working links too.
export function HomeGalleryPreview() {
  const photo = communityPhotos[0];
  return h('section', { className: 'community-gallery landing-container', 'aria-labelledby': 'gallery-title' },
    h(GalleryHeading), h('figure', { className: 'gallery-stage' }, h('img', { src: photoSrc(photo), srcSet: photoSrcSet(photo), sizes: '(max-width: 1200px) 100vw, 1160px', width: photo.width, height: photo.height, alt: photo.alt, loading: 'lazy' })),
    h('div', { className: 'gallery-thumbnails' }, communityPhotos.map(photo => h('a', { key: photo.name, href: photoSrc(photo), 'aria-label': photo.title }, h('img', { src: photoSrc(photo, photo.width === 900 ? 480 : 640), width: photo.width, height: photo.height, alt: photo.alt, loading: 'lazy' })))),
  );
}

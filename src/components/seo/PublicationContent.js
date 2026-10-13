import { createElement as h } from 'react';
import { postHeadline, safeImage } from '../../lib/seo.js';

export default function PublicationContent({ post }) {
  const author = post.profiles?.full_name || 'Miembro de la comunidad';
  const date = post.created_at && new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' }).format(new Date(post.created_at));
  return h('article', { className: 'publication-body' },
    h('a', { className: 'institution-link', href: '/feed' }, 'Comunidad'),
    h('h1', null, postHeadline(post.content)),
    h('div', { className: 'publication-byline' }, h('span', null, author), date && h('time', { dateTime: post.created_at }, date)),
    safeImage(post.image_url) && h('img', { src: post.image_url, alt: `Imagen de la publicaci\u00f3n de ${author}`, className: 'publication-image', decoding: 'async' }),
    h('p', { className: 'publication-text' }, post.content),
  );
}

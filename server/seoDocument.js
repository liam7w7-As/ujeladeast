import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InstitutionContent, StudyIntroduction, PublicLinks } from '../src/components/seo/PublicContent.js';
import PublicationContent from '../src/components/seo/PublicationContent.js';
import { serializedSchema } from '../src/lib/seo.js';
import { publicPages } from '../src/lib/siteContent.js';

export const safeJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');
function head(page) {
  const managed = { 'data-page-seo': '' };
  const nodes = [h('title', { key: 'title' }, page.title), h('meta', { key: 'robots', ...managed, name: 'robots', content: page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' })];
  if (page.description) nodes.push(h('meta', { key: 'desc', ...managed, name: 'description', content: page.description }));
  if (page.canonical) nodes.push(h('link', { key: 'canonical', ...managed, rel: 'canonical', href: page.canonical }));
  if (!page.noindex) {
    const social = { 'og:type': 'website', 'og:site_name': 'UJELADEA', 'og:locale': 'es_BO', 'og:title': page.title, 'og:description': page.description, 'og:url': page.canonical, 'og:image': page.image, 'og:image:alt': page.imageAlt };
    for (const [property, content] of Object.entries(social)) nodes.push(h('meta', { key: property, ...managed, property, content }));
    for (const [name, content] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': page.title, 'twitter:description': page.description, 'twitter:image': page.image, 'twitter:image:alt': page.imageAlt })) nodes.push(h('meta', { key: name, ...managed, name, content }));
    nodes.push(h('script', { key: 'schema', ...managed, type: 'application/ld+json', dangerouslySetInnerHTML: { __html: serializedSchema(page.schema) } }));
  }
  return renderToStaticMarkup(nodes);
}
export function staticContent(path) {
  const brand = h('a', { href: '/', 'aria-label': 'UJELADEA inicio' }, h('img', { src: '/logo-ujeladea.png', width: 96, height: 96, alt: 'UJELADEA', className: 'institution-logo' }));
  if (path === '/nosotros' || path === '/') return h('main', { className: 'institution-main' }, brand,
    path === '/' && h('h1', { className: 'text-4xl font-bold mb-8' }, 'UJELADEA'),
    h(InstitutionContent, { heading: path === '/' ? 'h2' : 'h1', compact: path === '/' }), path === '/' && h(PublicLinks));
  if (path === '/estudio-biblico') return h('main', { className: 'institution-main' }, brand, h(StudyIntroduction));
  const page = publicPages[path];
  return page ? h('main', { className: 'institution-main institution-content' }, brand, h('h1', null, page.heading), h('p', null, page.description), h(PublicLinks)) : null;
}
export function renderDocument(template, page, content, data = null) {
  if (!template.includes('<!--page-meta-->') || !template.includes('<div id="root"></div>')) throw new Error('SEO template markers missing');
  const body = renderToStaticMarkup(content);
  const state = data ? `<script id="public-post-data" type="application/json">${safeJson(data)}</script>` : '';
  // Explicit template slots, never substitution over user-supplied markup.
  return template.replace('<!--page-meta-->', () => head(page))
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>${state}`);
}
export function postContent(post) {
  return h('main', { className: 'publication-main' }, h(PublicationContent, { post }), h('a', { className: 'institution-link', href: `/feed?post=${post.id}` }, 'Ver conversaci\u00f3n'));
}
export function errorContent(status) {
  return h('main', { className: 'institution-main institution-content' }, h('h1', null, status === 404 ? 'Publicaci\u00f3n no disponible' : 'No pudimos cargar esta publicaci\u00f3n'), h('p', null, status === 404 ? 'Puede haberse retirado o no ser p\u00fablica.' : 'Intenta nuevamente en unos momentos.'), h('a', { href: '/feed', className: 'institution-link' }, 'Volver a la comunidad'));
}

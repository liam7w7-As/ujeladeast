import { SITE_URL, organization, publicPages } from './siteContent.js';

export const SOCIAL_IMAGE = `${SITE_URL}/social/ujeladea-v1.png`;
export const POST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const postPath = id => `/publicaciones/${id}`;
export const plainSummary = (text, length = 160) => {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= length) return value;
  const prefix = value.slice(0, length - 3);
  const boundary = prefix.lastIndexOf(' ');
  return `${(boundary > length / 2 ? prefix.slice(0, boundary) : prefix).trimEnd()}...`;
};
export const postHeadline = content => plainSummary(String(content || '').split(/\r?\n/).find(line => line.trim()) || '', 85) || 'Publicaci\u00f3n de la comunidad';
export function safeImage(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function organizationSchema() {
  return {
    '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: organization.name,
    alternateName: organization.fullName, url: SITE_URL,
    description: organization.introduction, logo: `${SITE_URL}/pwa-512x512-v2.png`,
    // Share URLs work for visitors, but are not stable profile identifiers.
    sameAs: organization.socials.filter(social => social.identityLink !== false).map(social => social.url),
    location: { '@type': 'Place', name: 'El Alto, La Paz, Bolivia' },
    parentOrganization: {
      '@type': 'Organization', name: 'UJELAB',
      parentOrganization: { '@type': 'Organization', name: 'Iglesia Nacional Evang\u00e9lica Los Amigos', alternateName: 'INELA' },
    },
  };
}
export function pageMetadata(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  const page = publicPages[path];
  if (!page) return { title: 'UJELADEA', description: '', noindex: true, schema: [] };
  const url = SITE_URL + path;
  const schema = [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'UJELADEA', url: SITE_URL, inLanguage: 'es', publisher: { '@id': `${SITE_URL}/#organization` } },
    organizationSchema(),
    { '@type': path === '/nosotros' ? 'AboutPage' : 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: 'es', isPartOf: { '@id': `${SITE_URL}/#website` } },
  ];
  if (path !== '/') schema.push(breadcrumbs([["Inicio", SITE_URL], [page.heading, url]]));
  return { ...page, canonical: url, image: SOCIAL_IMAGE, imageAlt: 'UJELADEA, juventud Los Amigos del Distrito El Alto', schema };
}
function breadcrumbs(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map(([name, item], index) => ({ '@type': 'ListItem', position: index + 1, name, item })) };
}
export function postMetadata(post) {
  const url = SITE_URL + postPath(post.id);
  const headline = postHeadline(post.content);
  const author = post.profiles?.full_name || 'Miembro de la comunidad';
  return {
    title: `${plainSummary(headline, 65)} | UJELADEA`, heading: headline,
    description: plainSummary(post.content) || `Publicaci\u00f3n de ${author} en la comunidad UJELADEA.`,
    canonical: url, image: safeImage(post.image_url) || SOCIAL_IMAGE, imageAlt: `Publicaci\u00f3n de ${author}`,
    schema: [organizationSchema(), {
      '@type': 'SocialMediaPosting', '@id': `${url}#post`, url, headline, articleBody: post.content,
      mainEntityOfPage: url, inLanguage: 'es', author: { '@type': 'Person', name: author },
      publisher: { '@id': `${SITE_URL}/#organization` },
      ...(post.created_at ? { datePublished: post.created_at } : {}),
      ...(safeImage(post.image_url) ? { image: safeImage(post.image_url) } : {}),
    }, breadcrumbs([['Inicio', SITE_URL], ['Comunidad', `${SITE_URL}/feed`], [headline, url]])],
  };
}
export function serializedSchema(schema) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': schema }).replaceAll('<', '\\u003c');
}

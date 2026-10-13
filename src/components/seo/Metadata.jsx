import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageMetadata, serializedSchema } from '../../lib/seo';

export function Metadata({ page }) {
  useEffect(() => {
    document.head.querySelectorAll('[data-page-seo]').forEach(node => node.remove());
    document.title = page.title;
    const add = (tag, attributes, text) => {
      const element = document.createElement(tag);
      element.dataset.pageSeo = '';
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
      if (text) element.textContent = text;
      document.head.append(element);
    };
    add('meta', { name: 'robots', content: page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' });
    if (page.description) add('meta', { name: 'description', content: page.description });
    if (page.canonical) add('link', { rel: 'canonical', href: page.canonical });
    if (!page.noindex) {
      for (const [property, content] of Object.entries({ 'og:type': 'website', 'og:site_name': 'UJELADEA', 'og:locale': 'es_BO', 'og:title': page.title, 'og:description': page.description, 'og:url': page.canonical, 'og:image': page.image, 'og:image:alt': page.imageAlt })) add('meta', { property, content });
      for (const [name, content] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': page.title, 'twitter:description': page.description, 'twitter:image': page.image, 'twitter:image:alt': page.imageAlt })) add('meta', { name, content });
      add('script', { type: 'application/ld+json' }, serializedSchema(page.schema));
    }
  }, [page]);
  return null;
}

export default function RouteMetadata() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/publicaciones/')) return null;
  return <Metadata page={pageMetadata(pathname)} />;
}

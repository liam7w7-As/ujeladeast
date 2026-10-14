import { createElement as h } from 'react';
import { organization } from '../../lib/siteContent.js';

export default function SocialLinks() {
  return h('nav', { className: 'social-links', 'aria-label': 'Redes sociales de UJELADEA' },
    organization.socials.map(({ name, url }) => h('a', {
      key: name, href: url, target: '_blank', rel: 'noopener noreferrer',
      'aria-label': `${name} de UJELADEA (abre en otra pesta\u00f1a)`,
      'data-network': name.toLowerCase(),
    }, h('img', { src: `/social-icons/${name.toLowerCase()}.svg`, alt: '', width: 21, height: 21, loading: 'lazy' }),
    h('span', { className: 'social-tooltip', 'aria-hidden': true }, name))),
  );
}

import { createElement as h } from 'react';
import { organization, publicPages, publicNavigation } from '../../lib/siteContent.js';

export function PublicLinks() {
  return h('nav', { className: 'institution-links', 'aria-label': 'Explorar UJELADEA' }, publicNavigation.map(([label, path]) => h('a', { key: path, href: path }, label)));
}
export function InstitutionContent({ heading = 'h1', compact = false }) {
  return h('section', { className: 'institution-content' },
    h('p', { className: 'institution-eyebrow' }, 'El Alto, La Paz, Bolivia'),
    h(heading, null, compact ? 'Somos UJELADEA' : 'Qui\u00e9nes somos'),
    h('p', { className: 'institution-name' }, organization.fullName),
    h('p', null, organization.introduction), h('p', null, organization.structure), h('p', null, organization.invitation),
    compact ? h('a', { className: 'institution-link', href: '/nosotros' }, 'Conoce nuestra comunidad') : h('div', null,
      h('h2', null, 'Una comunidad, muchas sociedades'),
      h('p', null, 'Cada sociedad forma parte de una iglesia local. Nos encontramos en actividades espirituales, sociales, educativas y evangel\u00edsticas, con el acompa\u00f1amiento de nuestra directiva distrital.'),
      h('h2', null, `Lema de la gesti\u00f3n ${organization.mottoYear}`), h('blockquote', null, organization.motto),
      h('h2', null, 'Crecer en la fe y servir juntos'),
      h('p', null, 'Compartimos lecturas y estudios b\u00edblicos, alabanzas, encuentros entre sociedades y actividades de servicio. Los contenidos institucionales son revisados por la directiva de UJELADEA.'),
      h('h2', null, 'Forma parte de la comunidad'),
      h('p', null, 'Conoce nuestras sociedades y las actividades que se anuncian en la comunidad. Tambi\u00e9n puedes leer la Biblia, consultar el himnario y explorar nuestros recursos desde donde est\u00e9s.'),
      h(PublicLinks), h('h2', null, 'Nuestras redes'),
      h('div', { className: 'institution-links' }, organization.socials.map(social => h('a', { key: social.name, href: social.url, target: '_blank', rel: 'noopener noreferrer' }, social.name))),
    ),
  );
}
export function StudyIntroduction() {
  return h('section', { className: 'institution-content' },
    h('p', { className: 'institution-eyebrow' }, 'Estudio b\u00edblico de 365 d\u00edas'),
    h('h1', null, 'Un momento con la Palabra'),
    h('p', null, publicPages['/estudio-biblico'].description),
    h('h2', null, 'Leer, reflexionar y poner en pr\u00e1ctica'),
    h('p', null, 'El plan propone un recorrido por la Biblia con lecturas y reflexiones para relacionar lo aprendido con la vida diaria. La meta es comprender la Palabra y crecer en la fe.'),
    h('h2', null, 'Un recorrido personal'),
    h('p', null, 'Con tu cuenta puedes continuar tu estudio y conservar tus respuestas y tu avance. El recorrido se organiza por semanas y las siguientes se abren al completar las anteriores. Las respuestas personales no forman parte de esta p\u00e1gina p\u00fablica.'),
    h('a', { className: 'institution-link', href: '/estudios' }, 'Ir a mi estudio'), h(PublicLinks),
  );
}

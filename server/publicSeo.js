import { SITE_URL } from '../src/lib/siteContent.js';
import { POST_ID, postPath, postMetadata } from '../src/lib/seo.js';
import { publicDatabaseConfig, getPublicPost, getPublicPostIds } from '../src/lib/publicPosts.js';
import { renderDocument, postContent, errorContent } from './seoDocument.js';

export function createPublicSeoHandler({ env, getTemplate, fetcher = fetch }) {
  return async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); res.statusCode = 405; return res.end(); }
    // Vercel rewrites pass a fixed kind. No caller-selected table, origin, user or token.
    const url = new URL(req.url, 'https://local.invalid');
    const kind = req.query?.kind || url.searchParams.get('kind');
    const id = req.query?.id || url.searchParams.get('id') || '';
    const send = (status, type, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', `${type}; charset=utf-8`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, s-maxage=60, must-revalidate' : 'no-store');
      if (status !== 200) { res.setHeader('X-Robots-Tag', 'noindex'); if (status === 503) res.setHeader('Retry-After', '60'); }
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['post', 'data', 'sitemap'].includes(kind)) return send(404, 'text/plain', 'Not found');
    try {
      if (kind === 'sitemap') {
        const ids = await getPublicPostIds(publicDatabaseConfig(env), fetcher);
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${ids.map(value => `<url><loc>${SITE_URL}${postPath(value)}</loc></url>`).join('')}</urlset>\n`;
        return send(200, 'application/xml', xml);
      }
      const post = POST_ID.test(id) ? await getPublicPost(publicDatabaseConfig(env), id, fetcher) : null;
      if (kind === 'data') return send(post ? 200 : 404, 'application/json', JSON.stringify({ id, status: post ? 200 : 404, post }));
      const template = await getTemplate();
      if (!post) return send(404, 'text/html', renderDocument(template, { title: 'Publicaci\u00f3n no disponible | UJELADEA', noindex: true }, errorContent(404), { id, status: 404 }));
      return send(200, 'text/html', renderDocument(template, postMetadata(post), postContent(post), { id: post.id, status: 200, post }));
    } catch {
      // Outages must not turn into indexable empty pages or permanent 404 responses.
      if (kind === 'sitemap') return send(503, 'text/plain', 'Sitemap temporarily unavailable');
      if (kind === 'data') return send(503, 'application/json', JSON.stringify({ id, status: 503 }));
      try { return send(503, 'text/html', renderDocument(await getTemplate(), { title: 'Publicaci\u00f3n temporalmente no disponible | UJELADEA', noindex: true }, errorContent(503), { id, status: 503 })); }
      catch { return send(503, 'text/plain', 'Temporarily unavailable'); }
    }
  };
}

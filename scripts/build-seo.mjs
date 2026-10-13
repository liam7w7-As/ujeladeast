import { pageMetadata } from '../src/lib/seo.js';
import { publicPages, SITE_URL } from '../src/lib/siteContent.js';
import { renderDocument, staticContent } from '../server/seoDocument.js';

export default function seoBuildPlugin() {
  return {
    name: 'ujeladea-public-documents',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (!context.server) return html;
        const requested = new URL(context.originalUrl || context.path, 'http://localhost').pathname;
        const path = requested === '/index.html' ? '/' : requested;
        return renderDocument(html, pageMetadata(path), staticContent(path));
      },
    },
    // Run before Workbox scans dist: its revisions must match the final HTML.
    generateBundle: {
      order: 'post',
      handler(options, bundle) {
        const index = bundle['index.html'];
        if (!index) throw new Error('Missing Vite HTML entry');
        const template = String(index.source);
        this.emitFile({ type: 'asset', fileName: 'seo-template.html', source: template });
        for (const path of Object.keys(publicPages)) {
          const source = renderDocument(template, pageMetadata(path), staticContent(path));
          if (path === '/') index.source = source;
          else this.emitFile({ type: 'asset', fileName: `seo-pages${path}.html`, source });
        }
        this.emitFile({ type: 'asset', fileName: 'app.html', source: renderDocument(template, pageMetadata('/login'), null) });
        this.emitFile({ type: 'asset', fileName: 'sitemap-paginas.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(publicPages).map(path => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')}\n</urlset>\n` });
      },
    },
  };
}

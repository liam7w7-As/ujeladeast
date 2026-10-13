import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { publicPages } from '../src/lib/siteContent.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.SEARCH_TEST_URL || 'http://127.0.0.1:5177';
const deployed = process.env.SEARCH_TEST_DEPLOYED === '1';
const expectedPaths = Object.keys(publicPages);
const source = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
for (const name of ['sitemap.xml', 'robots.txt']) {
  assert.equal(await readFile(new URL(`../dist/${name}`, import.meta.url), 'utf8'), name === 'sitemap.xml' ? source : robots, `build copies ${name} unchanged`);
}
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage();
  // The browser's XML parser validates structure; no app session or private API is used.
  const parsed = await page.evaluate(source => {
    const doc = new DOMParser().parseFromString(source, 'application/xml');
    const ns = 'http://www.sitemaps.org/schemas/sitemap/0.9';
    return {
      invalid: doc.querySelector('parsererror') !== null,
      name: doc.documentElement.localName,
      namespace: doc.documentElement.namespaceURI,
      locs: [...doc.getElementsByTagNameNS(ns, 'loc')].map(loc => loc.textContent),
    };
  }, source);
  assert.equal(parsed.invalid, false);
  assert.equal(parsed.name, 'sitemapindex');
  assert.equal(parsed.namespace, 'http://www.sitemaps.org/schemas/sitemap/0.9');
  assert.deepEqual(parsed.locs, ['https://www.ujeladea.org/sitemap-paginas.xml', 'https://www.ujeladea.org/sitemap-publicaciones.xml']);
  const pagesXml = await readFile(new URL('../dist/sitemap-paginas.xml', import.meta.url), 'utf8');
  const pageUrls = await page.evaluate(xml => [...new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('loc')].map(node => node.textContent), pagesXml);
  assert.deepEqual(pageUrls, expectedPaths.map(path => `https://www.ujeladea.org${path}`));

  const origins = deployed ? ['https://www.ujeladea.org', 'https://ujeladeast.vercel.app'] : [base];
  for (const origin of origins) {
    for (const [path, expected, type] of [['/sitemap.xml', source, /(?:application|text)\/xml/], ['/robots.txt', robots, /text\/plain/]]) {
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200, `${origin}${path}`);
      assert.match(response.headers.get('content-type') || '', type);
      assert.equal(await response.text(), expected);
    }
    for (const path of expectedPaths) {
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200, `${origin}${path} is a real direct entry point`);
      assert.match(response.headers.get('content-type') || '', /text\/html/);
      assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') || ''));
      const html = await response.text();
      assert.match(html, /<main/);
      const metadata = await page.evaluate(html => {
        const document = new DOMParser().parseFromString(html, 'text/html');
        return { title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.href, description: document.querySelector('meta[name="description"]')?.content, schema: JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent || '{}') };
      }, html);
      assert.equal(metadata.canonical, `https://www.ujeladea.org${path}`);
      assert.equal(metadata.title, publicPages[path].title);
      assert.ok(metadata.description && metadata.schema['@graph']);
    }
    if (!deployed) continue;
    const postsXml = await fetch(origin + '/sitemap-publicaciones.xml', { signal: AbortSignal.timeout(30000) });
    assert.equal(postsXml.status, 200, 'live publication sitemap');
    assert.match(postsXml.headers.get('content-type'), /application\/xml/);
    const postUrls = await page.evaluate(xml => {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Invalid post XML');
      return [...doc.querySelectorAll('loc')].map(node => node.textContent);
    }, await postsXml.text());
    if (postUrls.length) {
      const path = new URL(postUrls[0]).pathname;
      const postResponse = await fetch(origin + path, { signal: AbortSignal.timeout(30000) });
      assert.equal(postResponse.status, 200);
      const html = await postResponse.text();
      assert.match(html, /SocialMediaPosting/);
      assert.match(html, /publication-text/);
      assert.ok(html.includes(postUrls[0]));
    }
    const missingPost = await fetch(origin + '/publicaciones/00000000-0000-0000-0000-000000000000', { signal: AbortSignal.timeout(30000) });
    assert.equal(missingPost.status, 404);
    assert.match(missingPost.headers.get('x-robots-tag') || '', /noindex/);
    for (const path of ['/login', '/register', '/recuperar', '/chat', '/estudios', '/admin', '/admin/seguimiento']) {
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200, `${path} remains accessible`);
      assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
      await response.body?.cancel();
    }
    for (const path of ['/this-page-does-not-exist-seo-test', '/api/this-endpoint-does-not-exist', '/assets/missing-seo-test.js']) {
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 404, `${path} must not return a fake successful page`);
      await response.body?.cancel();
    }
    const worker = await fetch(origin + '/sw.js', { signal: AbortSignal.timeout(20000) });
    assert.equal(worker.status, 200);
    assert.match(worker.headers.get('content-type') || '', /javascript/);
    assert.match(worker.headers.get('cache-control') || '', /no-cache/);
    await worker.body?.cancel();
    const manifest = await (await fetch(origin + '/manifest.webmanifest', { signal: AbortSignal.timeout(20000) })).json();
    for (const key of ['id', 'start_url', 'scope']) assert.equal(manifest[key], '/', `PWA ${key} is preserved`);
  }
  console.log(`PASS: sitemap index, eight public pages, canonical metadata, structured data${deployed ? ', live public posts, real 404s, noindex, both origins and PWA identity preserved' : ' (dynamic sitemap and Vercel responses require deployed mode)'}.`);
} finally { await browser.close(); }

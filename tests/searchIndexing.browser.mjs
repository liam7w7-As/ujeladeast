import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.SEARCH_TEST_URL || 'http://127.0.0.1:5177';
const deployed = process.env.SEARCH_TEST_DEPLOYED === '1';
const expectedPaths = ['/', '/feed', '/himnario', '/biblia', '/sociedades', '/recursos'];
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
      urls: [...doc.getElementsByTagNameNS(ns, 'url')].map(node => ({
        locs: [...node.getElementsByTagNameNS(ns, 'loc')].map(loc => loc.textContent),
        fields: [...node.children].map(child => child.localName),
      })),
    };
  }, source);
  assert.equal(parsed.invalid, false);
  assert.equal(parsed.name, 'urlset');
  assert.equal(parsed.namespace, 'http://www.sitemaps.org/schemas/sitemap/0.9');
  assert.deepEqual(parsed.urls.map(url => url.locs), expectedPaths.map(path => [`https://www.ujeladea.org${path}`]));
  assert.ok(parsed.urls.every(url => url.fields.length === 1 && url.fields[0] === 'loc'), 'no invented modification dates or extra URLs');

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
      assert.match(await response.text(), /<div id="root"><\/div>/);
    }
    if (!deployed) continue;
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
  console.log(`PASS: valid six-page XML sitemap, public robots.txt, unchanged build assets, direct public routes${deployed ? ', deployed noindex headers, real 404s, both origins and PWA identity preserved' : ' (Vercel headers/404s require deployed mode)'}.`);
} finally { await browser.close(); }

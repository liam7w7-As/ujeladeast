import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pageMetadata, postMetadata, safeImage, serializedSchema } from '../src/lib/seo.js';
import { organization, publicPages, SITE_URL } from '../src/lib/siteContent.js';
import { publicDatabaseConfig, getPublicPost, getPublicPostIds } from '../src/lib/publicPosts.js';
import { createPublicSeoHandler } from '../server/publicSeo.js';

const template = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const id = '00000000-0000-0000-0000-000000000001';
const key = 'header.' + Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') + '.signature';
const env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: key, SUPABASE_SERVICE_ROLE_KEY: 'never-used' };
const row = { id, content: 'Fe, esperanza y comunidad. </script><script>alert(1)</script>', created_at: '2026-10-13T15:00:00Z', image_url: 'javascript:alert(2)', category: 'reflexion', user_id: 'private-id', secret: 'never-visible', profiles: { full_name: 'Autora < & >', email: 'private@example.invalid', phone: 'private-phone' } };
const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const config = publicDatabaseConfig(env);

test('unique public metadata and correct district hierarchy, no invented history or private contacts', () => {
  const titles = new Set();
  for (const path of Object.keys(publicPages)) {
    const page = pageMetadata(path);
    assert.equal(page.canonical, SITE_URL + path);
    assert.ok(page.description && page.image);
    titles.add(page.title);
    JSON.parse(serializedSchema(page.schema));
  }
  assert.equal(titles.size, Object.keys(publicPages).length);
  const org = pageMetadata('/nosotros').schema.find(item => item['@type'] === 'Organization');
  assert.equal(org.parentOrganization.name, 'UJELAB');
  assert.equal(org.parentOrganization.parentOrganization.alternateName, 'INELA');
  assert.equal(org.alternateName, organization.fullName);
  assert.equal(org.foundingDate, undefined);
  assert.equal(org.address, undefined);
  assert.ok(!JSON.stringify(org).includes('whatsapp'));
  for (const path of ['/login', '/estudios', '/admin/seguimiento', '/chat', '/not-found']) {
    assert.equal(pageMetadata(path).noindex, true);
    assert.equal(pageMetadata(path).canonical, undefined);
  }
});

test('anonymous-only configuration rejects missing, elevated and malformed keys', () => {
  for (const value of [undefined, 'sb_secret_bad', 'placeholder', 'header.' + Buffer.from('{"role":"service_role"}').toString('base64url') + '.sig']) {
    assert.throws(() => publicDatabaseConfig({ ...env, VITE_SUPABASE_ANON_KEY: value }));
  }
  assert.equal(publicDatabaseConfig({ ...env, VITE_SUPABASE_ANON_KEY: 'sb_publishable_test' }).key, 'sb_publishable_test');
  assert.equal(safeImage('javascript:alert(1)'), null);
  assert.equal(safeImage('https://user:secret@host.test/image.png'), null);
});

test('public queries never forward a session and return an explicit field allowlist', async () => {
  let called = false;
  const post = await getPublicPost(config, id, async (url, options) => {
    called = true;
    assert.equal(url.pathname, '/rest/v1/posts');
    assert.equal(url.searchParams.get('id'), 'eq.' + id);
    assert.ok(!url.searchParams.get('select').includes('*'));
    assert.equal(options.headers.Authorization, 'Bearer ' + key);
    return response([row]);
  });
  assert.equal(called, true);
  assert.equal(post.image_url, null);
  for (const value of ['private-id', 'never-visible', 'private@example.invalid', 'private-phone']) assert.ok(!JSON.stringify(post).includes(value));
  assert.equal(await getPublicPost(config, 'invalid', () => { throw new Error('must not fetch'); }), null);
  assert.equal(postMetadata(post).schema[1]['@type'], 'SocialMediaPosting');
});

test('publication sitemap traverses database pages without guessing lastmod', async () => {
  const calls = [];
  const ids = await getPublicPostIds(config, async url => {
    calls.push(url.searchParams.get('offset'));
    return response(calls.length === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}` })) : calls.length === 2 ? [{ id: '00000000-0000-0000-0001-000000000001' }] : []);
  });
  assert.deepEqual(calls, ['0', '100', '101']);
  assert.equal(ids.length, 101);
});

async function run({ kind = 'post', fetcher = async () => response([row]), method = 'GET', target = id } = {}) {
  const result = { headers: {} };
  const handler = createPublicSeoHandler({ env, getTemplate: async () => template, fetcher });
  const res = { setHeader: (name, value) => { result.headers[name] = value; }, end: body => { result.body = body; result.status = res.statusCode; } };
  await handler({ url: '/api/public-seo', method, query: { kind, id: target }, headers: { authorization: 'Bearer privileged-user', cookie: 'session=private' } }, res);
  return result;
}
test('server HTML includes escaped public content, canonical and JSON-LD without exposing fields', async () => {
  const result = await run();
  assert.equal(result.status, 200);
  assert.match(result.headers['Content-Type'], /text\/html/);
  assert.ok(result.body.includes(SITE_URL + '/publicaciones/' + id));
  assert.ok(result.body.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!result.body.includes('<script>alert(1)</script>'));
  assert.ok(!result.body.includes('javascript:alert'));
  assert.ok(!result.body.includes('private@example.invalid'));
  assert.ok(!result.body.includes('privileged-user'));
  assert.ok(result.body.includes('\\u003c/script>'));
});
test('missing, withdrawn and malformed posts return real noindex 404s; outages are retryable 503s', async () => {
  for (const options of [{ fetcher: async () => response([]) }, { target: 'bad-id' }]) {
    const result = await run(options);
    assert.equal(result.status, 404);
    assert.equal(result.headers['X-Robots-Tag'], 'noindex');
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  const failed = await run({ fetcher: async () => { throw new Error('private upstream error'); } });
  assert.equal(failed.status, 503);
  assert.equal(failed.headers['Retry-After'], '60');
  assert.ok(!failed.body.includes('private upstream error'));
  const head = await run({ method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, undefined);
  assert.equal((await run({ method: 'POST' })).status, 405);
});
test('sitemap exposes only valid public IDs, no private metadata and no empty success on outage', async () => {
  const result = await run({ kind: 'sitemap', fetcher: async url => response(url.searchParams.get('offset') === '0' ? [row] : []) });
  assert.equal(result.status, 200);
  assert.match(result.headers['Content-Type'], /application\/xml/);
  assert.ok(result.body.includes('/publicaciones/' + id));
  assert.ok(!result.body.includes('lastmod') && !result.body.includes('Autora'));
  const failed = await run({ kind: 'sitemap', fetcher: async () => new Response('', { status: 500 }) });
  assert.equal(failed.status, 503);
});
test('SPA JSON endpoint uses the same anonymous projection and preserves missing/error status', async () => {
  const found = await run({ kind: 'data' });
  assert.equal(found.status, 200);
  assert.match(found.headers['Content-Type'], /application\/json/);
  assert.equal(JSON.parse(found.body).post.id, id);
  assert.ok(!found.body.includes('private@example.invalid'));
  assert.equal((await run({ kind: 'data', fetcher: async () => response([]) })).status, 404);
  assert.equal((await run({ kind: 'data', fetcher: async () => { throw new Error('offline'); } })).status, 503);
});

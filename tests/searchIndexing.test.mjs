import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('known SPA routes open directly without rewriting assets, APIs or unknown public paths', () => {
  const paths = ['/feed', '/himnario', '/biblia', '/sociedades', '/recursos', '/estudios', '/login', '/register', '/recuperar', '/chat', '/admin/:path*'];
  assert.deepEqual(config.rewrites.map(rule => rule.source), paths);
  assert.ok(config.rewrites.every(rule => rule.destination === '/index.html'));
  assert.equal(config.redirects, undefined, 'no forced migration of the old PWA');
  assert.deepEqual(config.functions, { 'api/daily-bible-fact.js': { maxDuration: 30 } });
});

test('private and account pages use noindex without suppressing public content or SW updates', async () => {
  const headers = Object.fromEntries(config.headers.map(rule => [rule.source, rule.headers]));
  const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, follow' }];
  assert.deepEqual(headers['/:page(login|register|recuperar|estudios|chat)'], noindex);
  assert.deepEqual(headers['/admin/:path*'], noindex);
  assert.deepEqual(headers['/sw.js'], [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }]);
  assert.equal(config.headers.length, 3, 'no site-wide noindex rule');
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.equal(robots.replaceAll('\r\n', '\n'), 'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.ujeladea.org/sitemap.xml\n');
  // Account pages must be crawlable for Google to see the noindex response header.
  for (const path of ['/admin', '/estudios', '/login', '/assets', '/biblia', '/data']) assert.ok(!robots.includes(`Disallow: ${path}`));
});

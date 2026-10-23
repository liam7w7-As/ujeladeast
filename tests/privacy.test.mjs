import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { staticContent, renderDocument } from '../server/seoDocument.js';
import { pageMetadata } from '../src/lib/seo.js';

const html = renderToStaticMarkup(staticContent('/privacidad'));

test('privacy is a complete public document with the approved contact and accurate data flows', () => {
  assert.equal((html.match(/<h1/g) || []).length, 1);
  for (const text of ['Política de privacidad', 'delap4787@gmail.com', 'Supabase', 'Vercel', 'Google', 'OpenRouter', 'primer nombre', 'IndexedDB', 'eliminación', 'contraseña de Google', 'userinfo.email', 'userinfo.profile']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('href="mailto:delap4787@gmail.com"'));
  for (const id of ['datos', 'google', 'proveedores', 'tus-opciones']) {
    assert.ok(html.includes(`href="#${id}"`));
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.ok(!html.includes('<form') && !html.includes('type="password"'));
});

test('privacy and the homepage link are available without JavaScript', async () => {
  const template = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const document = renderDocument(template, pageMetadata('/privacidad'), staticContent('/privacidad'));
  assert.ok(document.includes('<title>Política de privacidad | UJELADEA</title>'));
  assert.ok(document.includes('rel="canonical" href="https://www.ujeladea.org/privacidad"'));
  assert.ok(document.includes('mailto:delap4787@gmail.com'));
  assert.ok(!pageMetadata('/privacidad').noindex);
  assert.ok(renderToStaticMarkup(staticContent('/')).includes('href="/privacidad"'));
});

test('privacy has its own public deployment route instead of the account shell', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(config.rewrites.some(rule => rule.source === '/privacidad' && rule.destination === '/seo-pages/privacidad.html'));
  assert.ok(!config.redirects, 'the old PWA does not acquire a forced redirect');
});

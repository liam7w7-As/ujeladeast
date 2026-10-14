import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { renderToStaticMarkup } from 'react-dom/server';
import { staticContent } from '../server/seoDocument.js';
import { coverPhoto, communityPhotos, photoSrc, photoSrcSet } from '../src/lib/communityPhotos.js';
import { organizationSchema } from '../src/lib/seo.js';

test('community photos have responsive local WebP variants without cropping or metadata', async () => {
  for (const photo of [coverPhoto, ...communityPhotos]) {
    assert.ok(photo.alt && photo.title);
    for (const width of photo.width === 900 ? [480, 900] : [640, 960, 1600]) {
      const path = `public${photoSrc(photo, width)}`;
      const meta = await sharp(path).metadata();
      assert.equal(meta.format, 'webp');
      assert.equal(meta.width, width);
      assert.ok(Math.abs(meta.height - width * photo.height / photo.width) < 1);
      assert.ok(!meta.exif && !meta.xmp);
      assert.ok((await stat(path)).size < 270_000);
      assert.ok(photoSrcSet(photo).includes(`${width}w`));
    }
  }
});
test('home server HTML includes the actual hero and institution, icons and crawlable links', async () => {
  const html = renderToStaticMarkup(staticContent('/'));
  assert.match(html, /fetchPriority="high"/i);
  assert.match(html, /comunidad-1600.webp/);
  assert.match(html, /dependiente de UJELAB/);
  for (const network of ['facebook', 'instagram', 'youtube', 'tiktok']) {
    assert.match(html, new RegExp(`/social-icons/${network}.svg`));
    const icon = await readFile(`public/social-icons/${network}.svg`, 'utf8');
    assert.match(icon, /<svg/);
    assert.ok(!icon.includes('<script'));
  }
  assert.ok(!organizationSchema().sameAs.some(url => url.includes('/share/')));
  for (const route of ['/nosotros', '/feed', '/sociedades', '/biblia', '/estudio-biblico', '/himnario', '/recursos']) assert.ok(html.includes(`href="${route}"`));
});

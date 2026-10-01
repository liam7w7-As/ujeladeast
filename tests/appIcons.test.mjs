import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const background = [143, 25, 55];
const variants = [
  ['pwa-192x192-v2.png', 192], ['pwa-512x512-v2.png', 512],
  ['pwa-maskable-192x192-v2.png', 192], ['pwa-maskable-512x512-v2.png', 512],
  ['apple-touch-icon-v2.png', 180], ['favicon-v2.png', 64],
];
for (const [name, size] of variants) test(`${name}: opaque brand background, correct size and visible logo`, async () => {
  const source = sharp(`public/${name}`);
  const metadata = await source.metadata();
  assert.equal(metadata.width, size);
  assert.equal(metadata.height, size);
  assert.equal(metadata.hasAlpha, false);
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.subarray((y * size + x) * info.channels, (y * size + x) * info.channels + 3)];
  for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) assert.deepEqual(pixel(x, y), background);
  let whitePixels = 0, outsideSafeZone = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const rgb = pixel(x, y);
    if (rgb.every(value => value > 220)) whitePixels++;
    if (rgb.some((value, index) => Math.abs(value - background[index]) > 12)
      && Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) > size * 0.4) outsideSafeZone++;
  }
  assert.ok(whitePixels > size * size * .05, 'the source mark remains visible');
  if (name.includes('maskable')) assert.equal(outsideSafeZone, 0, 'all meaningful content fits the circular safe zone');
});

test('favicon fallback is an ICO with an embedded PNG', async () => {
  const data = await readFile('public/favicon.ico');
  assert.equal(data.readUInt16LE(2), 1);
  assert.equal(data.readUInt16LE(4), 1);
  assert.equal(data.readUInt32LE(18), 22);
  assert.equal(data.readUInt32LE(14), data.length - 22);
  assert.equal((await sharp(data.subarray(22)).metadata()).width, 32);
});

test('installation references use the new icon URLs', async () => {
  const html = await readFile('index.html', 'utf8');
  const config = await readFile('vite.config.js', 'utf8');
  assert.match(html, /href="\/apple-touch-icon-v2.png"/);
  assert.match(html, /href="\/favicon-v2.png"/);
  for (const [name] of variants.slice(0, 4)) assert.ok(config.includes(`src: '${name}'`));
});

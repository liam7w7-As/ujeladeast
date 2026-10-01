import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const publicDir = path.resolve('public');
const background = '#8f1937';

async function generate() {
  // Preserve the source mark; only its installation-icon canvas changes.
  const logo = await sharp(path.join(publicDir, 'logo-ujeladea.png'))
    .resize(1024, 1024, { fit: 'inside' }).png().toBuffer();
  const variants = [
    ['pwa-192x192-v2.png', 192, 0.84],
    ['pwa-512x512-v2.png', 512, 0.84],
    ['pwa-maskable-192x192-v2.png', 192, 0.62],
    ['pwa-maskable-512x512-v2.png', 512, 0.62],
    ['apple-touch-icon-v2.png', 180, 0.82],
    ['favicon-v2.png', 64, 0.88],
  ];
  for (const [name, size, ratio] of variants) {
    const mark = await sharp(logo).resize(Math.round(size * ratio), Math.round(size * ratio), { fit: 'inside' }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 3, background } })
      .composite([{ input: mark, gravity: 'centre' }])
      .flatten({ background }).removeAlpha().png().toFile(path.join(publicDir, name));
    console.log(`Generated ${name} (${size}x${size}, opaque)`);
  }

  // A real ICO container for clients requesting /favicon.ico directly.
  const favicon = await sharp(path.join(publicDir, 'favicon-v2.png')).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32; header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(favicon.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, favicon]));
}

generate().catch(error => { console.error(error); process.exitCode = 1; });

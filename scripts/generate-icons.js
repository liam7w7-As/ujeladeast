import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImage = path.resolve('public/logo-ujeladea.png');
const publicDir = path.resolve('public');

async function generate() {
  if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found:', sourceImage);
    process.exit(1);
  }

  console.log('Generating PWA icons from:', sourceImage);
  const metadata = await sharp(sourceImage).metadata();
  console.log('Source dimensions:', metadata.width, 'x', metadata.height);

  const bg = { r: 9, g: 9, b: 11, alpha: 1 }; // #09090b

  // 1. 192x192 PNG (Standard)
  await sharp(sourceImage)
    .resize(192, 192, { fit: 'contain', background: bg })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated: pwa-192x192.png (192x192)');

  // 2. 512x512 PNG (Standard)
  await sharp(sourceImage)
    .resize(512, 512, { fit: 'contain', background: bg })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated: pwa-512x512.png (512x512)');

  // 3. Apple Touch Icon (180x180)
  await sharp(sourceImage)
    .resize(180, 180, { fit: 'contain', background: bg })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated: apple-touch-icon.png (180x180)');

  // 4. Favicon PNGs (32x32 & 48x48) & favicon.ico (or PNG fallback)
  await sharp(sourceImage)
    .resize(64, 64, { fit: 'contain', background: bg })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated: favicon.png (64x64)');

  // 5. Also create favicon.ico as a PNG-container or copy
  // Modern browsers and PWA work great with PNG favicons or 48x48
  await sharp(sourceImage)
    .resize(48, 48, { fit: 'contain', background: bg })
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated: favicon.ico (48x48)');

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

import { verseCitation } from './bibleVerses.js';
import { readingFont } from './bibleTypography.js';

export const verseImageThemes = [
  { id: 'mountains', label: 'Montañas', image: '/verse-backgrounds/mountains-v1.webp', thumbnail: '/verse-backgrounds/mountains-v1-thumb.webp', text: '#ffffff', accent: '#ffffff', line: '#ffffff55' },
  { id: 'forest', label: 'Bosque', image: '/verse-backgrounds/forest-v1.webp', thumbnail: '/verse-backgrounds/forest-v1-thumb.webp', text: '#ffffff', accent: '#ffffff', line: '#ffffff55' },
  { id: 'sea', label: 'Mar', image: '/verse-backgrounds/sea-v1.webp', thumbnail: '/verse-backgrounds/sea-v1-thumb.webp', text: '#ffffff', accent: '#ffffff', line: '#ffffff55' },
  { id: 'wine', label: 'Granate', background: '#781d39', text: '#fff6f8', accent: '#efb9cb', line: '#a6506a' },
  { id: 'paper', label: 'Papel', background: '#f2f5f1', text: '#263e36', accent: '#567666', line: '#c3d1c7' },
  { id: 'night', label: 'Noche', background: '#17191e', text: '#f6f3ed', accent: '#d8bf83', line: '#494334' },
];
export const verseImageFormats = [
  { id: 'portrait', label: '4:5', width: 1080, height: 1350 },
  { id: 'square', label: '1:1', width: 1080, height: 1080 },
  { id: 'story', label: '9:16', width: 1080, height: 1920 },
];

// Use measured glyph widths, including long unbroken words, without clipping text.
export function wrapImageText(text, measure, width) {
  const lines = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const character of Array.from(word)) {
      if (line && measure(line + character) > width) { lines.push(line); line = ''; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function fitImageText(text, measureAtSize, { width, height, maxSize = 64, minSize = 24, spacing = 1.42 }) {
  for (let size = maxSize; size >= minSize; size--) {
    const lines = wrapImageText(text, value => measureAtSize(value, size), width);
    if (lines.length * size * spacing <= height) return { lines, size, lineHeight: size * spacing };
  }
  throw new Error('Este pasaje es muy largo para este formato. Prueba el formato vertical 9:16 o comparte el texto.');
}

export const verseImageName = (verse, format) => `ujeladea-${verse.book}-${verse.chapter}-${verse.label}-${verse.version}-${format}.png`.replace(/[^a-z0-9._-]/gi, '-');

let logoPromise;
const backgroundImages = new Map();
function loadBackground(src) {
  if (backgroundImages.has(src)) return backgroundImages.get(src);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    const finish = error => {
      clearTimeout(timer); image.onload = null; image.onerror = null;
      if (error) { image.src = ''; reject(new Error('No pudimos cargar este fondo. Reintenta o elige un color.')); }
      else resolve(image);
    };
    const timer = setTimeout(() => finish(true), 10000);
    image.onload = () => finish(false);
    image.onerror = () => finish(true);
    image.src = src;
  }).catch(error => { backgroundImages.delete(src); throw error; });
  backgroundImages.set(src, promise);
  return promise;
}

// Keep the scenery visible in square exports without stretching the photograph.
export function coverSource(imageWidth, imageHeight, width, height) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const cropWidth = width / scale, cropHeight = height / scale;
  return [(imageWidth - cropWidth) / 2, (imageHeight - cropHeight) * .65, cropWidth, cropHeight];
}

function loadLogo() {
  return logoPromise ||= new Promise(resolve => {
    const logo = new Image();
    const timer = setTimeout(() => resolve(null), 4000);
    logo.onload = () => { clearTimeout(timer); resolve(logo); };
    logo.onerror = () => { clearTimeout(timer); resolve(null); };
    logo.src = '/logo-ujeladea.png';
  });
}

export async function prepareVersePhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Elige una foto JPG, PNG o WebP.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La foto debe pesar menos de 12 MB.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 25000000) throw new Error('La foto es demasiado grande. Elige una de hasta 25 megapíxeles.');
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo abrir la foto.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch (error) {
    throw new Error(error.message.includes('megapíxeles') ? error.message : 'No pudimos abrir la foto. Prueba con otra imagen.', { cause: error });
  } finally { bitmap?.close(); }
}

export async function renderVerseImage(verse, { theme = 'mountains', format = 'story', font = 'classic', align = 'center', position = 'center', customBackground } = {}) {
  const colors = verseImageThemes.find(item => item.id === theme) || verseImageThemes[0];
  const dimensions = verseImageFormats.find(item => item.id === format) || verseImageFormats[0];
  const family = readingFont(font).family;
  await document.fonts.ready;
  await document.fonts.load(`500 64px ${family}`);
  const background = theme === 'custom' ? customBackground : colors.image ? await loadBackground(colors.image) : null;
  if (theme === 'custom' && !background) throw new Error('Selecciona una foto para el fondo.');
  const logo = await loadLogo();
  const canvas = document.createElement('canvas');
  const { width, height } = dimensions;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la imagen en este navegador.');
  if (background) {
    ctx.drawImage(background, ...coverSource(background.naturalWidth || background.width, background.naturalHeight || background.height, width, height), 0, 0, width, height);
    // White lettering retains contrast even over bright sky; the photo remains full bleed.
    ctx.fillStyle = '#0000008f'; ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = colors.background; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = colors.line; ctx.lineWidth = 2; ctx.strokeRect(48, 48, width - 96, height - 96);
  }
  const alignment = ['left', 'center', 'right'].includes(align) ? align : 'center';
  const textX = alignment === 'left' ? 104 : alignment === 'right' ? width - 104 : width / 2;
  ctx.textAlign = alignment;
  ctx.textBaseline = 'top'; ctx.fillStyle = colors.accent;
  ctx.font = '500 23px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('UNA PALABRA PARA HOY', textX, 106);
  ctx.fillRect(alignment === 'center' ? width / 2 - 46 : alignment === 'right' ? width - 196 : 104, 153, 92, 3);
  const citation = `${verse.title} ${verse.chapter}:${verse.label}`;
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  const reference = wrapImageText(citation, value => ctx.measureText(value).width, width - 208);
  if (reference.length > 2) throw new Error('La referencia es demasiado larga para esta imagen.');
  const referenceHeight = 56 + reference.length * 37 + 30;
  const region = { width: width - 208, height: height - 450 - referenceHeight, maxSize: background ? 78 : 64 };
  const layout = fitImageText(verse.text, (value, size) => {
    ctx.font = `500 ${size}px ${family}`;
    return ctx.measureText(value).width;
  }, region);
  const textHeight = layout.lines.length * layout.lineHeight;
  const ratio = position === 'top' ? 0 : position === 'bottom' ? 1 : .5;
  const top = 290 + (region.height - textHeight) * ratio;
  ctx.font = '120px Georgia, serif'; ctx.fillText('\u201c', textX, top - 105);
  ctx.font = `500 ${layout.size}px ${family}`; ctx.fillStyle = colors.text;
  layout.lines.forEach((line, index) => ctx.fillText(line, textX, top + index * layout.lineHeight));
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  const citationTop = top + textHeight + 56;
  reference.forEach((line, index) => ctx.fillText(line, textX, citationTop + index * 37));
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = colors.accent;
  ctx.fillText(verse.version, textX, citationTop + reference.length * 37 + 10);
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.line; ctx.fillRect(104, height - 101, width - 208, 1);
  if (logo) {
    if (!background) { ctx.fillStyle = '#17191e'; ctx.fillRect(width - 293, height - 81, 32, 32); }
    const ratio = Math.min(28 / logo.naturalWidth, 28 / logo.naturalHeight);
    ctx.drawImage(logo, width - 277 - logo.naturalWidth * ratio / 2, height - 65 - logo.naturalHeight * ratio / 2, logo.naturalWidth * ratio, logo.naturalHeight * ratio);
  }
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = colors.text;
  ctx.fillText('UJELADEA', width - 248, height - 75);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo exportar la imagen.')), 'image/png'));
  return { blob, width, height, description: verseCitation(verse), layout: { ...layout, top, citationTop, alignment, bottom: citationTop + reference.length * 37 + 30 } };
}

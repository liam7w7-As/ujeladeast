import { verseCitation } from './bibleVerses.js';
import { readingFont } from './bibleTypography.js';

export const verseImageThemes = [
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
function loadLogo() {
  return logoPromise ||= new Promise(resolve => {
    const logo = new Image();
    const timer = setTimeout(() => resolve(null), 4000);
    logo.onload = () => { clearTimeout(timer); resolve(logo); };
    logo.onerror = () => { clearTimeout(timer); resolve(null); };
    logo.src = '/logo-ujeladea.png';
  });
}

export async function renderVerseImage(verse, { theme = 'wine', format = 'portrait', font = 'classic' } = {}) {
  const colors = verseImageThemes.find(item => item.id === theme) || verseImageThemes[0];
  const dimensions = verseImageFormats.find(item => item.id === format) || verseImageFormats[0];
  const family = readingFont(font).family;
  await document.fonts.ready;
  await document.fonts.load(`500 64px ${family}`);
  const logo = await loadLogo();
  const canvas = document.createElement('canvas');
  const { width, height } = dimensions;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la imagen en este navegador.');
  ctx.fillStyle = colors.background; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = colors.line; ctx.lineWidth = 2; ctx.strokeRect(48, 48, width - 96, height - 96);
  ctx.textBaseline = 'top'; ctx.fillStyle = colors.accent;
  ctx.font = '500 23px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('UNA PALABRA PARA HOY', 104, 106);
  ctx.fillRect(104, 153, 92, 3);
  ctx.font = '160px Georgia, serif'; ctx.fillText('\u201c', 93, 198);
  const region = { width: width - 208, height: height - 565 };
  const layout = fitImageText(verse.text, (value, size) => {
    ctx.font = `500 ${size}px ${family}`;
    return ctx.measureText(value).width;
  }, region);
  ctx.font = `500 ${layout.size}px ${family}`; ctx.fillStyle = colors.text;
  const top = 310 + (region.height - layout.lines.length * layout.lineHeight) / 2;
  layout.lines.forEach((line, index) => ctx.fillText(line, 104, top + index * layout.lineHeight));
  const citation = `${verse.title} ${verse.chapter}:${verse.label}`;
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  const reference = wrapImageText(citation, value => ctx.measureText(value).width, width - 208);
  if (reference.length > 2) throw new Error('La referencia es demasiado larga para esta imagen.');
  reference.forEach((line, index) => ctx.fillText(line, 104, height - 226 + index * 37));
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = colors.accent;
  ctx.fillText(verse.version, 104, height - 226 + reference.length * 37 + 10);
  ctx.fillStyle = colors.line; ctx.fillRect(104, height - 101, width - 208, 1);
  if (logo) {
    ctx.fillStyle = '#17191e'; ctx.fillRect(width - 293, height - 81, 32, 32);
    const ratio = Math.min(28 / logo.naturalWidth, 28 / logo.naturalHeight);
    ctx.drawImage(logo, width - 277 - logo.naturalWidth * ratio / 2, height - 65 - logo.naturalHeight * ratio / 2, logo.naturalWidth * ratio, logo.naturalHeight * ratio);
  }
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = colors.text;
  ctx.fillText('UJELADEA', width - 248, height - 75);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo exportar la imagen.')), 'image/png'));
  return { blob, width, height, description: verseCitation(verse), layout };
}

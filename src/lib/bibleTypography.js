export const bibleFonts = [
  { id: 'jakarta', label: 'Plus Jakarta Sans', family: '"Plus Jakarta Sans", sans-serif' },
  { id: 'classic', label: 'Clásica', family: 'Georgia, "Noto Serif", serif' },
  { id: 'system', label: 'Sistema', family: 'system-ui, sans-serif' },
];

export const readingFont = id => bibleFonts.find(font => font.id === id) || bibleFonts[0];
export const readingSize = value => Math.max(16, Math.min(32, Math.round(Number(value) || 19)));

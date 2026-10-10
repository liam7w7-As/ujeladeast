const classes = node => typeof node === 'string' ? [] : node[1].split(/\s+/);
export function verseText(node) {
  if (typeof node === 'string') return node;
  if (classes(node).some(name => ['note', 'label', 'vp', 'va', 'heading'].includes(name))) return '';
  return node[3].map(verseText).join('');
}
export function verseLabel(reference) {
  const numbers = reference.split('+').map(part => Number(part.split('.').at(-1)));
  if (numbers.length === 1) return String(numbers[0]);
  return numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1)
    ? `${numbers[0]}–${numbers.at(-1)}` : numbers.join(', ');
}
export function chapterVerses(nodes) {
  const entries = new Map();
  function visit(node) {
    if (typeof node === 'string') return;
    if (classes(node).includes('verse') && node[2]) {
      const text = verseText(node).replace(/\s+/g, ' ').trim();
      if (text) {
        const previous = entries.get(node[2]);
        entries.set(node[2], { reference: node[2], label: verseLabel(node[2]), text: previous ? `${previous.text} ${text}` : text });
      }
      return;
    }
    if (!classes(node).includes('note')) node[3].forEach(visit);
  }
  nodes.forEach(visit);
  return entries;
}
export const favoriteKey = entry => `${entry.version}:${entry.reference}`;
export const referencesOverlap = (left, right) => Boolean(left && right && left.split('+').some(part => right.split('+').includes(part)));
export function passageBetween(entries, from, to = from) {
  const start = entries.findIndex(entry => entry.reference === from);
  const end = entries.findIndex(entry => entry.reference === to);
  if (start < 0 || end < 0) return null;
  const selected = entries.slice(Math.min(start, end), Math.max(start, end) + 1);
  const reference = [...new Set(selected.flatMap(entry => entry.reference.split('+')))].join('+');
  return { reference, label: verseLabel(reference), text: selected.map(entry => entry.text).join(' ') };
}
export const verseCitation = entry => `${entry.title} ${entry.chapter}:${entry.label} (${entry.version})`;
export const verseClipboard = entry => `${verseCitation(entry)}\n\n«${entry.text.trim()}»`;

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
export const verseCitation = entry => `${entry.title} ${entry.chapter}:${entry.label} (${entry.version})`;
export const verseClipboard = entry => `${entry.text}\n\n${verseCitation(entry)}`;

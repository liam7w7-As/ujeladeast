import { Fragment } from 'react';
import { Heart, MoreHorizontal } from 'lucide-react';
import { verseLabel, verseText } from '../../lib/bibleVerses';
import { nodeText } from '../../lib/bibleModel';

const tags = new Set(['div', 'span', 'table', 'tbody', 'tr', 'th', 'td', 'br', 'i', 'b', 'sup', 'em', 'strong']);
export default function BibleText({ nodes, onNote, onVerse, favorites = [], selectedReference = '' }) {
  const seen = new Set();
  function render(node, key) {
    if (typeof node === 'string') return node;
    const [tag, style, reference, children, spans] = node;
    if (!tags.has(tag)) return null;
    const classes = style.split(/\s+/).filter(Boolean);
    // Source headings are inline fragments, not the reader's application header.
    if (classes.some(value => ['r', 'sr', 'mr'].includes(value))) {
      return <div key={key} className="bible-cross-references" role="note" aria-label="Referencias bíblicas">{nodeText(node).replace(/\s+/g, ' ').trim()}</div>;
    }
    const verse = classes.includes('verse') && Boolean(reference) && Boolean(onVerse);
    const meaningful = verse && verseText(node).trim();
    const first = meaningful && !seen.has(reference);
    if (meaningful) seen.add(reference);
    if (verse && !meaningful && !nodeText(node).trim()) return null;
    if (classes.includes('note')) {
      const body = children.find(child => Array.isArray(child) && child[1].split(/\s+/).includes('body'));
      return <button key={key} type="button" className="bible-note-marker" title="Ver nota" aria-label="Ver nota" onClick={() => onNote(body?.[3] || children)}>*</button>;
    }
    if (tag === 'br') return <br key={key} />;
    const Tag = tag;
    const content = <Tag key={key} className={`${classes.map(value => value === 'heading' ? 'bible-source-heading' : `bible-${value}`).join(' ')} ${verse ? 'bible-verse-row' : ''} ${first ? 'bible-verse-start' : ''} ${verse && reference === selectedReference ? 'bible-verse-selected' : ''}`} data-reference={reference || undefined}
      onClick={meaningful ? event => {
        if (event.target.closest('button') || !window.getSelection()?.isCollapsed) return;
        event.stopPropagation();
        onVerse(reference);
      } : undefined}
      colSpan={tag === 'td' || tag === 'th' ? spans?.[0] : undefined} rowSpan={tag === 'td' || tag === 'th' ? spans?.[1] : undefined}>
      {tag === 'br' ? undefined : children.map((child, index) => render(child, `${key}.${index}`))}
      {first && <button type="button" className={`bible-verse-action ${favorites.includes(reference) ? 'is-favorite' : ''}`} title={`Seleccionar versículo ${verseLabel(reference)}`} aria-label={`Opciones del versículo ${reference}`} aria-pressed={reference === selectedReference} onClick={() => onVerse(reference)}>{favorites.includes(reference) ? <Heart size={16} fill="currentColor" /> : <MoreHorizontal size={19} />}</button>}
    </Tag>;
    return tag === 'table' ? <div key={key} className="bible-table-scroll" tabIndex={0} role="region" aria-label="Tabla bíblica">{content}</div> : content;
  }
  return nodes.map((node, index) => <Fragment key={index}>{render(node, index)}</Fragment>);
}

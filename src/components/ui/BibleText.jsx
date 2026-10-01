import { Fragment } from 'react';

const tags = new Set(['div', 'span', 'table', 'tbody', 'tr', 'th', 'td', 'br', 'i', 'b', 'sup', 'em', 'strong']);
export default function BibleText({ nodes, onNote }) {
  function render(node, key) {
    if (typeof node === 'string') return node;
    const [tag, style, reference, children, spans] = node;
    if (!tags.has(tag)) return null;
    const classes = style.split(/\s+/).filter(Boolean);
    if (classes.includes('note')) {
      const body = children.find(child => Array.isArray(child) && child[1].split(/\s+/).includes('body'));
      return <button key={key} type="button" className="bible-note-marker" title="Ver nota" aria-label="Ver nota" onClick={() => onNote(body?.[3] || children)}>*</button>;
    }
    const Tag = tag;
    const content = <Tag key={key} className={classes.map(value => `bible-${value}`).join(' ')} data-reference={reference || undefined}
      colSpan={tag === 'td' || tag === 'th' ? spans?.[0] : undefined} rowSpan={tag === 'td' || tag === 'th' ? spans?.[1] : undefined}>
      {tag === 'br' ? undefined : children.map((child, index) => render(child, `${key}.${index}`))}
    </Tag>;
    return tag === 'table' ? <div key={key} className="bible-table-scroll" tabIndex={0} role="region" aria-label="Tabla bíblica">{content}</div> : content;
  }
  return nodes.map((node, index) => <Fragment key={index}>{render(node, index)}</Fragment>);
}

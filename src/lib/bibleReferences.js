import { bcv_parser } from 'bible-passage-reference-parser/esm/bcv_parser.js';
import * as spanish from 'bible-passage-reference-parser/esm/lang/es.js';
import { versions } from './bibleModel.js';
import { chapterVerses } from './bibleVerses.js';

const parser = new bcv_parser(spanish);
parser.set_options({ book_alone_strategy: 'first_chapter', sequence_combination_strategy: 'separate', osis_compaction_strategy: 'bc', passage_existence_strategy: 'bc', invalid_passage_strategy: 'include' });
const books = Object.fromEntries(parser.translation_info().books.slice(0, 66).map((osis, index) => [osis, versions[0].books[index].id]));
export function parseBibleReference(query, versionId) {
  const input = query.trim();
  if (!input || input.length > 180) return null;
  const entities = parser.parse(input).parsed_entities();
  if (!entities.length || entities[0].indices[0] !== 0 || entities.at(-1).indices[1] !== input.length) return null;
  const invalid = message => ({ error: message });
  if (entities.length !== 1) return invalid('Busca una sola cita o un rango dentro del mismo capítulo.');
  const entity = entities[0];
  const book = versions.find(version => version.id === versionId)?.books.find(book => book.id === books[entity.start.b]);
  if (!entity.osis || !book || entity.start.c > book.chapters || entity.start.c < 1) return invalid('Esa cita no existe. Revisa el libro y el capítulo.');
  if (entity.start.b !== entity.end.b || entity.start.c !== entity.end.c) return invalid('Busca un capítulo a la vez.');
  const entireChapter = ['b', 'bc'].includes(entity.type);
  const from = entireChapter ? 0 : entity.start.v, to = entireChapter ? 0 : entity.end.v;
  if (from < 0 || to < from || to > 999) return invalid('Revisa los números de los versículos.');
  return { version: versionId, book: book.id, chapter: entity.start.c, title: book.title, from, to };
}
export function resolveBibleReference(target, book) {
  const chapter = book.chapters[target.chapter - 1];
  if (!chapter) throw new Error('Ese capítulo no está disponible en esta versión.');
  if (!target.from) return { ...target, reference: '', label: '', text: [...chapterVerses(chapter.nodes).values()].slice(0, 2).map(verse => verse.text).join(' ') };
  const verses = [...chapterVerses(chapter.nodes).values()].filter(verse => verse.reference.split('+').some(part => {
    const number = Number(part.split('.').at(-1)); return number >= target.from && number <= target.to;
  }));
  const numbers = new Set(verses.flatMap(verse => verse.reference.split('+').map(part => Number(part.split('.').at(-1)))));
  if (!numbers.has(target.from) || !numbers.has(target.to)) throw new Error('Ese versículo no está disponible en esta versión.');
  return { ...target, reference: [...new Set(verses.flatMap(verse => verse.reference.split('+')))].join('+'), label: target.from === target.to ? String(target.from) : `${target.from}–${target.to}`, text: verses.map(verse => verse.text).join(' ') };
}

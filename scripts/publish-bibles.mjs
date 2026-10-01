import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { gzipSync, gunzipSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const catalog = { schema: 1, versions: [] };
const hash = data => createHash('sha256').update(data).digest('hex');
async function asset(name, data) {
  const json = Buffer.from(JSON.stringify(data));
  const sha256 = hash(json);
  const gzip = gzipSync(json, { level: 9 });
  const filename = `${name}-${sha256.slice(0, 12)}.json.gz`;
  await writeFile(new URL(`public/bibles/${filename}`, root), gzip);
  return { url: `/bibles/${filename}`, sha256, bytes: gzip.length, unpackedBytes: json.length };
}
try {
  await mkdir(new URL('public/bibles/', root), { recursive: true });
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  for (const id of ['RVR1960', 'NTV', 'NVI', 'TLA']) {
    const { bible } = JSON.parse(gunzipSync(await readFile(new URL(`data/bible/prepared/${id}.json.gz`, root))));
    const books = [];
    const index = [];
    for (const book of bible.books) {
      const chapters = await page.evaluate(chapters => {
        const allowed = new Set(['div', 'span', 'table', 'tbody', 'tr', 'th', 'td', 'br', 'i', 'b', 'sup', 'em', 'strong']);
        function convert(node) {
          if (node.nodeType === 3) return node.textContent;
          if (node.nodeType !== 1) return '';
          const tag = node.tagName.toLowerCase();
          if (!allowed.has(tag)) throw new Error(`Unsupported source element: ${tag}`);
          const result = [tag, node.className || '', node.getAttribute('data-usfm') || '', [...node.childNodes].map(convert)];
          if (node.hasAttribute('colspan') || node.hasAttribute('rowspan')) result.push([node.colSpan || 1, node.rowSpan || 1]);
          return result;
        }
        const text = node => typeof node === 'string' ? node : node[3].map(text).join('');
        return chapters.map(chapter => {
          const document = new DOMParser().parseFromString(chapter.html, 'text/html');
          const content = document.querySelector('.chapter');
          if (!content) throw new Error(`Missing chapter: ${chapter.usfm}`);
          const nodes = [...content.childNodes].map(convert);
          if (nodes.map(text).join('') !== content.textContent) throw new Error(`Text changed: ${chapter.usfm}`);
          return { id: chapter.usfm, title: chapter.human, nodes };
        });
      }, book.chapters);
      const payload = { schema: 1, version: id, id: book.usfm, title: book.human, chapters };
      books.push(payload);
      index.push({ id: book.usfm, title: book.human, chapters: chapters.length, ...await asset(`${id}-${book.usfm}`, payload) });
    }
    assert.equal(books.reduce((n, book) => n + book.chapters.length, 0), 1189);
    const archive = await asset(id, { schema: 1, version: id, books });
    catalog.versions.push({ id, title: bible.local_title, copyright: bible.copyright.text, books: index, archive });
    console.log(`${id}: 66 books, 1189 chapters, all source text verified; archive ${(archive.bytes / 1e6).toFixed(2)} MB`);
  }
  await writeFile(new URL('src/lib/bibleCatalog.json', root), JSON.stringify(catalog));
} finally {
  await browser.close();
}

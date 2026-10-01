import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { inspectChapters, prepareBible, sources } from './bible-data.mjs';

const sourceDir = process.argv[2];
assert.ok(sourceDir, 'Usage: node scripts/prepare-bibles.mjs <source-directory>');
const outputDir = fileURLToPath(new URL('../data/bible/prepared/', import.meta.url));
assert.notEqual(path.resolve(sourceDir), path.resolve(outputDir), 'Source and output must differ');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const pending = [];
const catalog = { schemaVersion: 1, compression: 'gzip', versions: [] };
const report = { schemaVersion: 1, htmlRetained: true, versions: [] };

try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  for (const [version, filename] of sources) {
    const original = await readFile(path.join(sourceDir, filename));
    const source = JSON.parse(original.toString('utf8'));
    assert.equal(source.local_abbreviation, version);
    const { bible, removedDuplicates } = prepareBible(source);
    const chapters = bible.books.flatMap(book => book.chapters);
    assert.equal(bible.books.length, 66);
    assert.equal(chapters.length, 1189);
    const inspections = [];
    for (let offset = 0; offset < chapters.length; offset += 50) {
      inspections.push(...await page.evaluate(inspectChapters, chapters.slice(offset, offset + 50)));
    }
    const notes = Object.fromEntries(inspections.filter(entry => entry.notes.length).map(entry => [entry.id, entry.notes]));
    const payload = { schemaVersion: 1, bible, notes };
    const json = Buffer.from(JSON.stringify(payload));
    const compressed = gzipSync(json, { level: 9 });
    const restored = JSON.parse(gunzipSync(compressed).toString('utf8'));
    assert.deepEqual(restored, payload, `Round-trip failed: ${version}`);
    // Every retained source chapter (including all HTML and unknown fields) survives exactly.
    for (const book of source.books) {
      const restoredBook = restored.bible.books.find(entry => entry.usfm === book.usfm);
      for (const chapter of book.chapters) {
        assert.deepEqual(restoredBook.chapters.find(entry => entry.usfm === chapter.usfm), chapter);
      }
    }
    const file = `${version}.json.gz`;
    const noteCount = inspections.reduce((total, entry) => total + entry.notes.length, 0);
    catalog.versions.push({
      id: version, title: bible.local_title, file, books: bible.books.length,
      chapters: chapters.length, notes: noteCount, sourceBytes: original.length,
      unpackedBytes: json.length, downloadBytes: compressed.length,
      sha256: hash(compressed), sourceSha256: hash(original),
    });
    report.versions.push({
      id: version, sourceFile: filename, removedExactDuplicateChapters: removedDuplicates,
      noteCount, emptyNotes: inspections.flatMap(entry => entry.notes).filter(note => !note.text).map(note => note.id),
      tableCount: inspections.reduce((total, entry) => total + entry.tableCount, 0),
      redLetterSpans: inspections.reduce((total, entry) => total + entry.redLetterSpans, 0),
      poetryBlocks: inspections.reduce((total, entry) => total + entry.poetryBlocks, 0),
      verseTextDifferenceChapters: inspections.filter(entry => !entry.verseTextMatches).map(entry => entry.id),
      sourcePreservationVerified: true,
    });
    pending.push([file, compressed]);
    console.log(`${version}: ${chapters.length} chapters, ${noteCount} notes, ${(compressed.length / 1e6).toFixed(2)} MB gzip; source preservation verified`);
  }
  // Publish nothing until all four sources have passed parsing and preservation checks.
  await mkdir(outputDir, { recursive: true });
  for (const [file, bytes] of pending) await writeFile(path.join(outputDir, file), bytes);
  await writeFile(path.join(outputDir, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  await writeFile(path.join(outputDir, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}

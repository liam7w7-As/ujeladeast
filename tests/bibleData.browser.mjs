import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { inspectChapters } from '../scripts/bible-data.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  const [result] = await page.evaluate(inspectChapters, [{
    usfm: 'GEN.1',
    html: '<div class="q1"><span class="verse" data-usfm="GEN.1.1+GEN.1.2"><span class="label">1-2</span><span class="content">First &amp; </span><span class="note f"><span class="label">a</span><span class="body">Reference &amp; <i>explanation</i></span></span><span class="wj">second</span></span></div><table><tr><td>Preserved in source</td></tr></table><script>window.executed = true</script>',
    items: [{ type: 'verse', verse_numbers: [1, 2], lines: ['First & second'] }],
  }]);
  assert.equal(result.notes[0].text, 'Reference & explanation');
  assert.equal(result.notes[0].reference, 'GEN.1.1+GEN.1.2');
  assert.equal(result.notes[0].marker, 'a');
  assert.deepEqual(result.notes[0].kind, ['f']);
  assert.equal(result.verseTextMatches, true);
  assert.equal(result.tableCount, 1);
  assert.equal(result.redLetterSpans, 1);
  assert.equal(result.poetryBlocks, 1);
  assert.equal(await page.evaluate(() => window.executed), undefined);
  console.log('Browser checks passed: notes, entities, grouped references, tables, poetry, red letters and inert parsing.');
} finally {
  await browser.close();
}

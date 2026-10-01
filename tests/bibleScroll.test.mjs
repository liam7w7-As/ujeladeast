import test from 'node:test';
import assert from 'node:assert/strict';
import { referenceNumbers, readingPosition, positionOffset } from '../src/lib/bibleScroll.js';

test('synchronizes verse position instead of absolute pixel offset', () => {
  const a = [{ numbers: [1], top: 20, end: 120 }, { numbers: [2], top: 120, end: 320 }];
  const b = [{ numbers: [1], top: 80, end: 380 }, { numbers: [2], top: 380, end: 780 }];
  const position = readingPosition(a, 170);
  assert.deepEqual(position, { verse: 2, fraction: 0.25 });
  assert.equal(positionOffset(b, position), 480);
  assert.deepEqual(readingPosition(b, 480), position);
  assert.equal(positionOffset(b, readingPosition(a, 10)), 40);
});

test('maps grouped references proportionally without changing their text', () => {
  assert.deepEqual(referenceNumbers('GEN.2.1+GEN.2.2+GEN.2.3'), [1, 2, 3]);
  const grouped = [{ numbers: [1, 2, 3], top: 30, end: 330 }];
  assert.equal(positionOffset(grouped, { verse: 2, fraction: 0.5 }), 180);
  assert.deepEqual(readingPosition(grouped, 180), { verse: 2, fraction: 0.5 });
});

test('handles absent verses, empty content and the chapter end', () => {
  const anchors = [{ numbers: [1], top: 10, end: 100 }, { numbers: [3], top: 100, end: 200 }];
  assert.equal(positionOffset(anchors, { verse: 2, fraction: 0.5 }), 100);
  assert.equal(positionOffset(anchors, { verse: 9, fraction: 0 }), 100);
  assert.equal(readingPosition([], 100), null);
  assert.equal(positionOffset([], { verse: 1, fraction: 0 }), 0);
  assert.equal(readingPosition(anchors, 900).verse, 3);
  assert.ok(readingPosition(anchors, 900).fraction < 1);
});

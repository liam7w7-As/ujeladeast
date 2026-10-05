import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appUpdateBlocker, BEFORE_APP_UPDATE } from '../src/lib/appUpdate.js';

test('updates are allowed when no operation blocks a reload', () => {
  assert.equal(appUpdateBlocker(new EventTarget()), '');
});

test('a save can block activation with an actionable explanation', () => {
  const target = new EventTarget();
  const protect = event => {
    event.preventDefault();
    event.detail.reason = 'El estudio sigue guardándose.';
  };
  target.addEventListener(BEFORE_APP_UPDATE, protect);
  assert.equal(appUpdateBlocker(target), 'El estudio sigue guardándose.');
  target.removeEventListener(BEFORE_APP_UPDATE, protect);
  assert.equal(appUpdateBlocker(target), '');
});

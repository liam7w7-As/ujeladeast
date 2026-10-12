import test from 'node:test';
import assert from 'node:assert/strict';
import { answerLength, readRecoveryDraft, recoveryDraftKey, recoveryError, validRecoveryAnswers } from '../src/lib/studyRecovery.js';

test('recovery requires three developed answers and retains isolated local drafts', () => {
  assert.equal(answerLength(' \n\t '), 0);
  assert.equal(validRecoveryAnswers(['short', 'short', 'short']), false);
  assert.equal(validRecoveryAnswers(Array(3).fill('x'.repeat(40))), true);
  assert.equal(validRecoveryAnswers(Array(3).fill('x'.repeat(2001))), false);
  assert.equal(validRecoveryAnswers(Array(3).fill(123)), false);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => data.get(key) } });
  try {
    const request = { id: 'one', status: 'draft' };
    data.set(recoveryDraftKey('a', 'one'), JSON.stringify({ answers: ['My answer', 10, null], read: true }));
    assert.deepEqual(readRecoveryDraft('a', request), { answers: ['My answer', '', ''], read: true });
    assert.deepEqual(readRecoveryDraft('b', request), { answers: ['', '', ''], read: false });
    data.set(recoveryDraftKey('a', 'one'), '{');
    assert.deepEqual(readRecoveryDraft('a', request).answers, ['', '', '']);
    assert.deepEqual(readRecoveryDraft('a', { ...request, status: 'pending', answers: ['server', 'server', 'server'] }).answers, ['server', 'server', 'server']);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; }
});
test('missing migration, expiry and network errors have distinct recovery messages', () => {
  assert.match(recoveryError({ code: 'PGRST202' }), /migración/);
  assert.equal(recoveryError({ code: 'P0004', message: 'Expired' }), 'Expired');
  assert.match(recoveryError({ code: '42501' }), /permiso/);
  assert.match(recoveryError({ message: 'private technical data' }), /conexión/);
});

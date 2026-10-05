import test from 'node:test';
import assert from 'node:assert/strict';
import { missingStudyRpc, studySaveError } from '../src/lib/studyApi.js';
test('only a missing atomic RPC permits the legacy path', () => {
  for (const code of ['PGRST202', '42883']) assert.equal(missingStudyRpc({ code }), true);
  for (const code of ['42501', 'PGRST301', 'P0002', '23505', '503', undefined]) assert.equal(missingStudyRpc({ code }), false);
  assert.equal(missingStudyRpc(null), false);
});
test('server revision conflicts preserve the draft workflow', () => {
  assert.equal(studySaveError({ code: 'P0002' }).code, 'study_content_changed');
  const failure = new Error('Connection lost');
  assert.equal(studySaveError(failure), failure);
});

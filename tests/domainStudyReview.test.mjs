import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectStudyDraft, compareStudyDrafts, readMigrationStudies } from '../src/lib/domainStudyReview.js';

const owner = 'alice';
const id = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const study = (n, value = {}) => inspectStudyDraft('study', id(n), { version: 1, ...value });
const recovery = (n, answers) => inspectStudyDraft('recovery', id(n), { answers, read: true });
const inventory = drafts => ({ owner, signature: 'local-snapshot', drafts });
const completed = (n, answers = {}, user_id = owner) => ({ user_id, lesson_id: id(n), completed: true, answers });
const report = (drafts, remote = {}) => compareStudyDrafts(inventory(drafts), { completedCount: 10, ...remote });

test('navigation-only, whitespace and read-confirmation drafts are empty; notes and verses are not', () => {
  assert.equal(study(1, { step: 3, answers: { 0: ' \n ' }, journalContent: '', favoriteVerses: [], verseInput: '' }).empty, true);
  assert.equal(recovery(2, ['', ' ', '']).empty, true);
  for (const data of [{ answers: { 0: 'Respuesta' } }, { journalContent: 'Mi nota' }, { verseInput: 'Jn 1:1' }, { favoriteVerses: ['Jn 1:1'] }]) assert.equal(study(1, data).empty, false);
  for (const data of [{ version: 2 }, { unknown: 'Texto que no se debe ignorar' }, { answers: null }, { answers: [] }, { answers: { 0: 12 } }, { journalContent: {} }, { favoriteVerses: [null] }]) assert.throws(() => study(1, data));
});

test('confirmed studies compare every meaningful answer, journal and verse, without changing either copy', () => {
  const drafts = [study(1, { answers: { 0: ' Reflexión ', 1: '' }, journalContent: 'Mi nota', verseInput: 'Jn 1:1', favoriteVerses: ['Sal 23:1'] })];
  const remote = { progress: [completed(1, { 0: 'Reflexión', 1: 'Otra respuesta' })], journals: [{ user_id: owner, lesson_id: id(1), content: 'Mi nota', favorite_verses: ['Jn 1:1', 'Sal 23:1'] }] };
  const before = JSON.stringify({ drafts, remote });
  assert.equal(report(drafts, remote).confirmed, 1);
  assert.equal(report(drafts, { progress: remote.progress }).pending.length, 1, 'completed alone cannot discard a local journal');
  assert.equal(report(drafts, { ...remote, journals: [{ ...remote.journals[0], favorite_verses: ['Sal 23:1'] }] }).pending.length, 1);
  assert.equal(report(drafts, { ...remote, progress: [completed(1, { 0: 'Diferente' })] }).pending.length, 1);
  assert.equal(report(drafts, { ...remote, progress: [{ ...remote.progress[0], completed: false }] }).pending.length, 1);
  assert.equal(JSON.stringify({ drafts, remote }), before);
});

test('other accounts cannot confirm drafts; pending items identify lessons without exposing answers', () => {
  const result = report([study(1, { answers: { 0: 'Texto privado' } }), study(2)], {
    progress: [completed(1, { 0: 'Texto privado' }, 'bob')], lessons: [{ id: id(1), title: 'La oración' }],
  });
  assert.equal(result.confirmed, 0); assert.equal(result.empty, 1);
  assert.equal(result.pending[0].title, 'La oración'); assert.equal(JSON.stringify(result).includes('Texto privado'), false);
});

test('submitted recovery copies match answers, not just approval status; expired drafts stay pending', () => {
  const drafts = [recovery(1, ['Uno', 'Dos', 'Tres'])];
  for (const status of ['pending', 'approved', 'rejected']) {
    assert.equal(report(drafts, { recoveries: [{ id: id(1), user_id: owner, status, answers: ['Uno', 'Dos', 'Tres'] }] }).confirmed, 1);
  }
  for (const status of ['draft', 'expired']) assert.equal(report(drafts, { recoveries: [{ id: id(1), user_id: owner, status, answers: ['Uno', 'Dos', 'Tres'] }] }).pending.length, 1);
  assert.equal(report(drafts, { recoveries: [{ id: id(1), user_id: owner, status: 'approved', answers: ['Otro', 'Dos', 'Tres'] }] }).pending.length, 1);
});

function mockClient(tables, { errorTable, user = owner, count = 1200 } = {}) {
  const calls = [];
  const client = { calls, auth: { getSession: async () => ({ data: { session: { user: { id: user }, access_token: 'captured-test-token' } } }) },
    from(table) {
      const call = { table, filters: [], start: 0, end: 49 }; calls.push(call);
      const query = {
        select(columns, options) { call.columns = columns; call.head = options?.head; return query; },
        eq(field, value) { call.filters.push([field, value]); return query; },
        in(field, values) { call.ids = [field, values]; return query; },
        order() { return query; }, range(start, end) { call.start = start; call.end = end; return query; },
        setHeader(name, value) { call.header = [name, value]; return query; }, abortSignal(signal) { call.signal = signal; return query; },
        then(resolve) {
          if (table === errorTable) return Promise.resolve(resolve({ error: new Error('Unavailable') }));
          if (call.head) return Promise.resolve(resolve({ count, data: null, error: null }));
          const rows = (tables[table] || []).filter(row => call.filters.every(([field, value]) => row[field] === value)
            && (!call.ids || call.ids[1].includes(row[call.ids[0]])));
          return Promise.resolve(resolve({ data: rows.slice(call.start, Math.min(call.end + 1, call.start + 1)), error: null }));
        },
      };
      return query;
    },
  };
  return client;
}

test('remote review uses scoped read-only queries, captured JWT, bounded IDs and complete pagination', async () => {
  const drafts = [study(1, { answers: { 0: 'Uno' }, journalContent: 'Nota' }), study(2, { answers: { 0: 'Dos' } }), recovery(3, ['Repaso']), study(4)];
  const client = mockClient({ user_progress: [completed(1, { 0: 'Uno' }), completed(2, { 0: 'Dos' })],
    journal_entries: [{ user_id: owner, lesson_id: id(1), content: 'Nota' }],
    study_streak_recoveries: [{ id: id(3), user_id: owner, status: 'pending', answers: ['Repaso'] }],
    study_lessons: [{ id: id(1), title: 'Uno' }, { id: id(2), title: 'Dos' }],
  });
  const result = await readMigrationStudies(client, owner, inventory(drafts), new AbortController().signal);
  assert.equal(result.completedCount, 1200); assert.equal(result.confirmed, 3); assert.equal(result.empty, 1);
  assert.ok(client.calls.every(call => call.header[1] === 'Bearer captured-test-token'));
  assert.ok(client.calls.filter(call => call.table !== 'study_lessons').every(call => call.filters.some(([field, value]) => field === 'user_id' && value === owner)));
  assert.ok(client.calls.filter(call => !call.head).every(call => call.ids && !call.ids[1].includes(id(4))));
  assert.equal(client.calls.filter(call => call.table === 'user_progress' && !call.head).length, 3, 'continues beyond a server cap of one row');
});

test('query errors, unknown counts, wrong accounts and cancellation never produce confirmation', async () => {
  const state = inventory([study(1, { answers: { 0: 'Uno' } })]);
  for (const options of [{ errorTable: 'user_progress' }, { errorTable: 'study_lessons' }, { user: 'bob' }, { count: null }]) {
    await assert.rejects(readMigrationStudies(mockClient({}, options), owner, state, new AbortController().signal));
  }
  const controller = new AbortController(); controller.abort();
  const client = mockClient({});
  await assert.rejects(readMigrationStudies(client, owner, state, controller.signal)); assert.equal(client.calls.length, 0);
});

test('empty drafts require only a study count, while invalid legacy IDs stay pending without a bad UUID query', async () => {
  const client = mockClient({});
  const result = await readMigrationStudies(client, owner, inventory([study(1), recovery(2, []), { ...study(3, { answers: { 0: 'Pendiente' } }), id: 'legacy-id' }]), new AbortController().signal);
  assert.equal(client.calls.length, 1); assert.equal(result.empty, 2); assert.equal(result.pending.length, 1);
});

test('large inventories split IDs into small batches without losing confirmations', async () => {
  const drafts = Array.from({ length: 61 }, (_, index) => study(index + 1, { answers: { 0: 'Respuesta' } }));
  const client = mockClient({ user_progress: drafts.map((_, index) => completed(index + 1, { 0: 'Respuesta' })) });
  const result = await readMigrationStudies(client, owner, inventory(drafts), new AbortController().signal);
  assert.equal(result.confirmed, 61); assert.equal(result.pending.length, 0);
  assert.ok(client.calls.filter(call => call.ids).every(call => call.ids[1].length <= 50));
});

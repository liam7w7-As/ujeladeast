import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyBibleFact, parseDailyQuestion } from '../src/lib/dailyBibleFact.js';
import { createDailyFactHandler } from '../server/dailyBibleFact.js';

test('the discovery changes at Bolivia midnight, and always includes a reading', () => {
  const before = dailyBibleFact('2026-10-05T03:59:59Z');
  const after = dailyBibleFact('2026-10-05T04:00:00Z');
  assert.equal(before.day, '2026-10-04');
  assert.equal(after.day, '2026-10-05');
  assert.notEqual(before.text, after.text);
  assert.deepEqual(after, dailyBibleFact('2026-10-05'));
  assert.match(after.reference, /\d+:\d+/);
  assert.ok(after.book && after.chapter && after.question);
});

test('malformed AI text uses the curated question instead', () => {
  for (const value of ['not json', '{"question":null}', '{"question":"<script>alert(1)</script>"}', JSON.stringify({ question: 'a'.repeat(300) })]) assert.equal(parseDailyQuestion(value), null);
  assert.equal(parseDailyQuestion('{"question":"¿Cómo puedes escuchar mejor hoy?"}'), '¿Cómo puedes escuchar mejor hoy?');
});

function fixture({ configured = true, validUser = true, aiFailure = false, saveFailure = false } = {}) {
  let slot = null, calls = 0;
  const env = configured ? { SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'server-only', OPENROUTER_API_KEY: 'server-ai', OPENROUTER_DAILY_MODEL: 'test-model' } : {};
  const db = {
    auth: { getUser: async () => ({ data: { user: validUser ? { id: 'user' } : null } }) },
    rpc: async () => {
      const claimed = !slot;
      slot ||= { day: '2026-10-05', status: 'pending', question: null };
      return { data: { ...slot, claimed } };
    },
    from: () => ({ update: value => ({ eq: async () => { if (!saveFailure) slot = { ...slot, ...value }; return { error: saveFailure }; } }) }),
  };
  const handler = createDailyFactHandler({ env, createClient: () => db, now: () => new Date('2026-10-05T18:00:00Z'), fetch: async (_url, options) => {
    calls++;
    const payload = JSON.parse(options.body);
    assert.equal(payload.max_tokens, 150);
    assert.equal(payload.messages.length, 2);
    if (aiFailure) throw new Error('Offline');
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"question":"¿Qué gesto de ayuda puedes ofrecer hoy?"}' } }] }) };
  } });
  async function call(token = 'valid', method = 'GET') {
    const res = { statusCode: 200, setHeader() {}, status(value) { this.statusCode = value; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method, headers: { authorization: token ? `Bearer ${token}` : '' } }, res);
    return res;
  }
  return { call, calls: () => calls };
}

test('concurrent visitors share one daily generation; no user text is sent to the model', async () => {
  const app = fixture();
  const results = await Promise.all(Array.from({ length: 12 }, () => app.call()));
  assert.ok(results.every(result => result.statusCode === 200));
  const result = await app.call();
  assert.equal(result.body.ai, true);
  assert.equal(app.calls(), 1);
  assert.equal(result.body.text, dailyBibleFact('2026-10-05').text);
});

test('failed generations and cache writes do not repeatedly spend tokens', async () => {
  for (const options of [{ aiFailure: true }, { saveFailure: true }]) {
    const app = fixture(options);
    assert.equal((await app.call()).body.ai, false);
    assert.equal((await app.call()).body.ai, false);
    assert.equal(app.calls(), 1);
  }
});

test('missing configuration falls back, and configured endpoint checks authentication/method', async () => {
  const app = fixture({ configured: false });
  assert.equal((await app.call()).body.ai, false);
  assert.equal(app.calls(), 0);
  assert.equal((await fixture().call(null)).statusCode, 401);
  assert.equal((await fixture({ validUser: false }).call()).statusCode, 401);
  assert.equal((await fixture().call('valid', 'POST')).statusCode, 405);
});

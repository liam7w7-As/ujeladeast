import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = createRequire(import.meta.url)('@electric-sql/pglite');
const db = new PGlite();
const id = (group, n) => `${group}0000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const user = id(1, 1), historical = id(1, 2), plan = id(2, 1);
const as = async role => db.exec(`reset role; set role ${role};`);
const asUser = async value => { await as('authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [value]); };
const save = async n => (await db.query('select complete_study_lesson($1,$2,$3) as value', [id(4, n), '{}', '["Jn 1:1","Texto","",[]]'])).rows[0].value;
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    create table profiles(id uuid primary key, full_name text, church_name text, avatar_url text, role text);
    create table study_weeks(id uuid primary key, plan_id uuid, week_number integer);
    create table study_lessons(id uuid primary key, week_id uuid, scripture_ref text, scripture_text text, teaching text, questions jsonb);
    create table user_progress(user_id uuid, lesson_id uuid references study_lessons(id), completed boolean, answers jsonb, completed_at timestamptz, unique(user_id,lesson_id));
    create table user_streaks(user_id uuid primary key, current_streak integer, max_streak integer, total_xp integer, last_study_date date);
    create table notifications(user_id uuid, title text, message text, type text, action_url text);
  `);
  for (const n of [1, 2, 3, 4]) await db.query('insert into study_weeks values($1,$2,$3)', [id(3, n), plan, n]);
  // Week 3 is empty; an unrelated plan must never gate this one.
  await db.query('insert into study_weeks values($1,$2,1)', [id(3, 5), id(2, 2)]);
  for (const [n, week] of [[1, 1], [2, 1], [3, 2], [4, 2], [5, 4], [6, 5]]) {
    await db.query("insert into study_lessons values($1,$2,'Jn 1:1','Texto','', '[]')", [id(4, n), id(3, week)]);
  }
  await db.query("insert into user_progress values($1,$2,true,'{}','2026-10-04T12:00:00Z')", [historical, id(4, 4)]);
  for (const file of ['202610050001_atomic_study.sql', '202610050002_study_week_unlocks.sql', '202610050003_daily_bible_fact.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const file of ['202610050002_study_week_unlocks.sql', '202610050003_daily_bible_fact.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await asUser(user);
  await assert.rejects(save(3), e => e.code === 'P0003');
  await as('postgres');
  assert.equal((await db.query('select count(*)::int as n from user_progress where user_id=$1', [user])).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int as n from user_streaks where user_id=$1', [user])).rows[0].n, 0);
  await asUser(user);
  await save(2); // Order within the current week is deliberately unrestricted.
  await assert.rejects(save(3), e => e.code === 'P0003');
  await save(1);
  assert.equal((await save(3)).completed, true);
  await assert.rejects(save(5), e => e.code === 'P0003');
  await save(4);
  const last = await save(5);
  assert.equal(last.status.current_streak, 1, 'Multiple weeks on one day do not multiply streak days');
  assert.equal(last.status.total_xp, 50);
  assert.equal((await save(5)).added_xp, 0);
  await asUser(historical);
  assert.equal((await save(4)).already_completed, true);
  await assert.rejects(save(3), e => e.code === 'P0003');
  await assert.rejects(db.query('select claim_daily_bible_fact()'), e => e.code === '42501');
  await assert.rejects(db.query("insert into daily_bible_facts(day) values(current_date)"), e => e.code === '42501');
  await as('anon');
  await assert.rejects(db.query('select claim_daily_bible_fact()'), e => e.code === '42501');
  await as('service_role');
  const claim = async () => (await db.query('select claim_daily_bible_fact() as value')).rows[0].value;
  const first = await claim(), second = await claim();
  assert.equal(first.claimed, true);
  assert.equal(second.claimed, false);
  assert.equal(first.day, second.day);
  await db.query("update daily_bible_facts set question='Una pregunta de prueba para reflexionar', status='ready' where day=$1", [first.day]);
  assert.equal((await claim()).status, 'ready');
  await as('postgres');
  assert.equal((await db.query('select completed_at::text as at from user_progress where user_id=$1', [historical])).rows[0].at.startsWith('2026-10-04'), true);
  console.log('PASS: SQL week order, gaps/empty weeks/other plans, historical completions, rollback without XP, unchanged streak counting, daily AI claim and permissions, repeatable migrations.');
} finally { await db.close(); }

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Isolated PostgreSQL/WASM fixture; no connection to the production database.
const { PGlite } = createRequire(import.meta.url)('@electric-sql/pglite');
const db = new PGlite();
const admin = '00000000-0000-0000-0000-000000000001';
const ana = '00000000-0000-0000-0000-000000000002';
const pedro = '00000000-0000-0000-0000-000000000003';
const requestId = number => `10000000-0000-0000-0000-${String(number).padStart(12, '0')}`;
const send = (id, title = 'Aviso', user = null, church = null, link = '/estudios') => db.query(
  'select public.admin_send_notification($1, $2, $3, $4, $5, $6) as batch',
  [id, title, 'Mensaje de prueba', user, church, link],
);
const asUser = async id => {
  await db.exec('reset role; set role authenticated;');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
};
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table public.profiles(id uuid primary key references auth.users(id), full_name text, church_name text, role text);
    create table public.notifications(
      id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
      title text not null, message text not null, type text not null check (type in ('anuncio','racha','logro')),
      action_url text, read boolean not null default false, created_at timestamptz not null default now()
    );
  `);
  for (const [id, name, church, role] of [[admin, 'Admin', 'Central', 'admin'], [ana, 'Ana', 'Central', 'user'], [pedro, 'Pedro', 'Norte', 'user']]) {
    await db.query('insert into auth.users values ($1)', [id]);
    await db.query('insert into public.profiles values ($1,$2,$3,$4)', [id, name, church, role]);
  }
  const migration = await readFile(new URL('../supabase/migrations/202609300002_admin_notifications.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.exec('set role anon;');
  await assert.rejects(send(requestId(1)), error => error.code === '42501');
  await asUser(ana);
  await assert.rejects(send(requestId(1)), error => error.code === '42501');
  await assert.rejects(db.query('select * from public.admin_notification_history()'), error => error.code === '42501');
  await asUser(admin);
  await assert.rejects(db.query('select * from public.admin_notification_batches'), error => error.code === '42501');

  const first = await send(requestId(1));
  assert.equal(first.rows[0].batch.recipient_count, 3);
  const repeat = await send(requestId(1));
  assert.deepEqual(repeat.rows[0].batch, first.rows[0].batch);
  await assert.rejects(send(requestId(1), 'Changed'), error => error.code === '22023');
  assert.equal((await send(requestId(2), 'Individual', ana)).rows[0].batch.recipient_count, 1);
  assert.equal((await send(requestId(3), 'Central', null, 'Central')).rows[0].batch.recipient_count, 2);
  await assert.rejects(send(requestId(4), 'Nobody', requestId(999)), error => error.code === '22023');
  await assert.rejects(send(requestId(5), 'Invalid', null, null, 'https://example.com'), error => error.code === '22023');
  await assert.rejects(send(requestId(6), '   '), error => error.code === '22023');
  await assert.rejects(send(requestId(7), 'Both', ana, 'Central'), error => error.code === '22023');
  assert.equal((await db.query('select * from public.admin_notification_history()')).rows.length, 3);
  await db.exec('reset role;');
  assert.equal((await db.query('select count(*)::integer as count from public.notifications')).rows[0].count, 6);
  await db.exec(`
    create function public.test_fail_recipient() returns trigger language plpgsql as $$
    begin
      if new.user_id = '${pedro}'::uuid then raise exception 'Simulated recipient failure'; end if;
      return new;
    end;
    $$;
    create trigger test_recipient before insert on public.notifications for each row execute function public.test_fail_recipient();
  `);
  await asUser(admin);
  await assert.rejects(send(requestId(8), 'Atomic batch'), /Simulated recipient failure/);
  await db.exec('reset role;');
  assert.equal((await db.query('select count(*)::integer as count from public.notifications')).rows[0].count, 6);
  assert.equal((await db.query('select count(*)::integer as count from public.admin_notification_batches')).rows[0].count, 3);
  console.log('SQL passed: rerunnable migration, anonymous/user denials, protected ledger, three audiences, idempotency, input validation, all-or-nothing rollback. Isolated schema fixture only.');
} finally { await db.close(); }

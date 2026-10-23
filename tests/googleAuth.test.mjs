import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';
import { authReturnPath, authErrorMessage } from '../src/lib/authMessages.js';
import { AVATAR_CHOICES, profileAvatar, selectedAvatar } from '../src/lib/avatars.js';
import { loadUserProfile, profileChanges } from '../src/lib/authProfile.js';
import { googleCallbackUrl, rememberGoogleAttempt, readGoogleAttempt, clearGoogleAttempt, googleCallbackError, hasGoogleIdentity, needsGoogleProfile, startGoogleAuth, checkGoogleProvider } from '../src/lib/googleAuth.js';

const user = { id: 'existing-user', user_metadata: { full_name: 'Ana', avatar_url: 'https://google.invalid/photo.jpg' }, app_metadata: { provider: 'google' } };
const original = { id: user.id, full_name: 'Ana Original', church_name: 'Central', avatar_url: '/custom.png', role: 'admin' };
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function database(initial, { readError, race } = {}) {
  let row = initial ? { ...initial } : null;
  const writes = [];
  return {
    writes, row: () => row,
    from: table => {
      assert.equal(table, 'profiles', 'auth never mutates study/streak tables');
      let op = 'read', values, options, onlyNull = false;
      const query = {
        select: () => query,
        eq: (key, value) => { assert.equal(key, 'id'); assert.equal(value, user.id); return query; },
        is: (key, value) => { assert.equal(key, 'avatar_url'); assert.equal(value, null); onlyNull = true; return query; },
        upsert: (data, opts) => { op = 'insert'; values = data; options = opts; return query; },
        update: data => { op = 'update'; values = data; return query; },
        maybeSingle: async () => {
          if (op === 'read') return { data: row && { ...row }, error: readError };
          writes.push({ op, values, options, onlyNull });
          if (op === 'insert') {
            assert.equal(options.ignoreDuplicates, true);
            if (race) row = { ...race };
            if (row) return { data: null, error: null };
            row = { role: 'user', ...values };
          } else {
            if (onlyNull && row.avatar_url !== null) return { data: null, error: null };
            row = { ...row, ...values };
          }
          return { data: { ...row }, error: null };
        },
      };
      return query;
    },
  };
}

test('return paths cannot escape the app or loop through auth', () => {
  assert.equal(authReturnPath('/biblia?book=MAT&chapter=6#v3'), '/biblia?book=MAT&chapter=6#v3');
  for (const path of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/\n/evil.invalid', '/%2f%2fevil.invalid', '/%5cevil.invalid', '/login', '/AUTH/callback', '/completar-perfil', '/x/../login', '/bad%XX', null]) assert.equal(authReturnPath(path), '/feed', String(path));
});

test('Google always returns to the same origin, including the old PWA', () => {
  for (const origin of ['https://www.ujeladea.org', 'https://ujeladeast.vercel.app', 'http://127.0.0.1:5178']) assert.equal(googleCallbackUrl(origin), `${origin}/auth/callback`);
  assert.throws(() => googleCallbackUrl('javascript:alert(1)'));
});

test('pending attempts contain no credentials, expire, and tolerate blocked storage', () => {
  const store = storage();
  rememberGoogleAttempt(store, { path: '/estudios', userId: user.id }, 1000);
  assert.deepEqual(readGoogleAttempt(store, 2000), { path: '/estudios', userId: user.id });
  assert.equal(readGoogleAttempt(store, 1000 + 21 * 60 * 1000), null);
  assert.equal(readGoogleAttempt(store, 999), null);
  clearGoogleAttempt(store);
  assert.equal(readGoogleAttempt(store), null);
  const blocked = { setItem() { throw new Error(); }, getItem() { throw new Error(); }, removeItem() { throw new Error(); } };
  rememberGoogleAttempt(blocked, {}); clearGoogleAttempt(blocked);
  assert.equal(readGoogleAttempt(blocked), null);
});

test('OAuth cancellation and identity conflicts have clear messages', () => {
  assert.equal(googleCallbackError('?error=access_denied'), 'access_denied');
  assert.equal(googleCallbackError('', '#error=server_error&error_code=identity_already_exists'), 'identity_already_exists');
  assert.equal(googleCallbackError('', '#access_token=private'), null);
  assert.match(authErrorMessage({ code: 'identity_already_exists' }), /No hemos combinado/);
  assert.match(authErrorMessage({ code: 'manual_linking_disabled' }), /acceso actual sigue/);
});

test('Google profile completion never infers gender or overwrites a complete account', () => {
  assert.equal(hasGoogleIdentity(user), true);
  assert.equal(hasGoogleIdentity({ identities: [{ provider: 'google' }] }), true);
  assert.equal(needsGoogleProfile(user, original), false);
  assert.equal(needsGoogleProfile(user, { ...original, church_name: '' }), true);
  assert.equal(needsGoogleProfile(user, null), true);
  assert.equal(needsGoogleProfile({ app_metadata: { provider: 'email' } }, null), false);
});

test('login reads existing profiles without writing name, avatar, or role', async () => {
  const db = database(original);
  assert.deepEqual(await loadUserProfile(db, user), original);
  assert.deepEqual(db.writes, []);
});

test('first Google login creates only a normal profile, not study data', async () => {
  const db = database(null);
  const result = await loadUserProfile(db, user);
  assert.equal(result.id, user.id);
  assert.equal(result.full_name, 'Ana');
  assert.equal(result.avatar_url, null, 'Google photo is not silently selected');
  assert.equal(result.church_name, '');
  assert.equal(result.role, 'user');
  assert.deepEqual(Object.keys(db.writes[0].values).sort(), ['avatar_url', 'church_name', 'full_name', 'id']);
});

test('concurrent creation cannot replace an existing profile', async () => {
  const db = database(null, { race: original });
  assert.deepEqual(await loadUserProfile(db, user), original);
});

test('a failed profile read never triggers an upsert', async () => {
  const error = new Error('Connection unavailable');
  const db = database(null, { readError: error });
  await assert.rejects(loadUserProfile(db, user), error);
  assert.deepEqual(db.writes, []);
});

test('legacy and new avatar selections backfill only a null avatar', async () => {
  for (const metadata of [{ gender: 'mujer' }, { avatar_id: 'personaje-1' }]) {
    const db = database({ ...original, avatar_url: null });
    const result = await loadUserProfile(db, { ...user, user_metadata: metadata });
    assert.ok(result.avatar_url.startsWith('/avatars/'));
    assert.equal(result.role, 'admin');
    assert.equal(db.writes[0].onlyNull, true);
    assert.deepEqual(Object.keys(db.writes[0].values), ['avatar_url']);
  }
});

test('profile updates whitelist editable fields and preserve custom avatars', () => {
  assert.deepEqual(profileChanges({ fullName: ' Ana ', churchName: ' Central ', avatar: '/custom.png', role: 'admin', id: 'other' }, original), { full_name: 'Ana', church_name: 'Central', avatar_url: '/custom.png' });
  assert.throws(() => profileChanges({ fullName: 'Ana', churchName: 'Central', avatar: 'https://evil.invalid/new.png' }, original));
  assert.throws(() => profileChanges({ fullName: ' ', churchName: 'Central', avatar: 'hombre' }, original));
  assert.equal(profileAvatar(original, { avatar_id: 'personaje-1' }), original.avatar_url);
  assert.equal(selectedAvatar('personaje-1'), '/avatars/personaje-1-v1.webp');
});

test('Google signin and explicit linking use separate SDK methods', async () => {
  const calls = [];
  const client = { auth: {
    signInWithOAuth: async args => { calls.push(['signin', args]); return { data: { url: 'https://auth.invalid' } }; },
    linkIdentity: async args => { calls.push(['link', args]); return { data: { url: 'https://auth.invalid' } }; },
  } };
  const store = storage();
  const options = { origin: 'https://ujeladeast.vercel.app', path: '/estudios', storage: store };
  await startGoogleAuth(client, options);
  assert.equal(calls[0][0], 'signin');
  assert.equal(calls[0][1].options.redirectTo, 'https://ujeladeast.vercel.app/auth/callback');
  assert.equal(calls[0][1].options.skipBrowserRedirect, true);
  assert.equal(calls[0][1].options.queryParams.prompt, 'select_account');
  await startGoogleAuth(client, { ...options, path: '/cuenta', userId: user.id });
  assert.equal(calls[1][0], 'link');
  assert.equal(readGoogleAttempt(store).userId, user.id);
  await assert.rejects(startGoogleAuth(client, { ...options, online: false }), { code: 'offline' });
  assert.equal(calls.length, 2);
});

test('disabled Google is reported before leaving the app', async () => {
  const fetcher = async (_url, options) => {
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.apikey, 'public-key');
    return { ok: true, json: async () => ({ external: { google: false } }) };
  };
  await assert.rejects(checkGoogleProvider('https://test.invalid', 'public-key', fetcher), { code: 'google_disabled' });
  await checkGoogleProvider('https://test.invalid', 'public-key', async () => ({ ok: true, json: async () => ({ external: { google: true } }) }));
});

test('avatar assets are small and auth routes stay out of Google indexing', async () => {
  assert.equal(AVATAR_CHOICES.length, 10);
  let total = 0;
  for (const avatar of AVATAR_CHOICES.slice(2)) total += (await stat(`public${avatar.src}`)).size;
  assert.ok(total < 50000);
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  for (const path of ['/cuenta', '/completar-perfil', '/auth/callback']) assert.equal(config.rewrites.find(rule => rule.source === path)?.destination, '/app.html');
  assert.ok(config.headers.find(rule => rule.source === '/auth/:path*').headers.some(header => header.key === 'Cache-Control' && header.value === 'no-store'));
});

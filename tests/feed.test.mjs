import test from 'node:test';
import assert from 'node:assert/strict';
import { postCategory, postTime } from '../src/lib/feed.js';
import { profileAvatar, PROFILE_AVATARS } from '../src/lib/avatars.js';

test('categories normalize public and admin values', () => {
  for (const value of ['Reflexiones', 'Reflexión', 'reflexion']) assert.equal(postCategory(value).id, 'reflexion');
  for (const value of ['Devocionales', 'Devocional']) assert.equal(postCategory(value).id, 'devocional');
  assert.equal(postCategory('Anuncios').id, 'anuncio');
  assert.equal(postCategory(null).label, 'Comunidad');
});
test('relative dates tolerate absent, invalid and future timestamps', () => {
  const now = Date.parse('2026-09-30T12:00:00Z');
  assert.equal(postTime(null, now), '');
  assert.equal(postTime('invalid', now), '');
  assert.equal(postTime('2026-09-30T12:01:00Z', now), 'Ahora');
  assert.equal(postTime('2026-09-30T11:50:00Z', now), 'Hace 10 min');
  assert.equal(postTime('2026-09-29T10:00:00Z', now), 'Ayer');
});
test('avatars preserve custom portraits and never infer gender from names', () => {
  assert.equal(profileAvatar({ avatar_url: '/custom.png' }, { gender: 'mujer' }), '/custom.png');
  assert.equal(profileAvatar(null, { gender: 'hombre' }), PROFILE_AVATARS.hombre);
  assert.equal(profileAvatar(null, { gender: 'mujer' }), PROFILE_AVATARS.mujer);
  assert.equal(profileAvatar({ full_name: 'Ana' }), null);
});

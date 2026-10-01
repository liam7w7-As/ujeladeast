import test from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, authReturnPath } from '../src/lib/authMessages.js';

test('auth messages are readable and do not reveal raw backend errors', () => {
  assert.match(authErrorMessage({ code: 'invalid_credentials' }), /no son correctos/);
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /Confirma/);
  assert.match(authErrorMessage({ status: 429 }), /Espera/);
  assert.match(authErrorMessage({ message: 'Failed to fetch' }), /conexión/);
  assert.equal(authErrorMessage({ message: 'Internal private details' }).includes('private'), false);
});
test('return destinations stay inside the app', () => {
  assert.equal(authReturnPath('/estudios'), '/estudios');
  for (const path of [null, 'https://other.invalid', '//other.invalid', '/\\other.invalid', '/login', '/register?q=1', '/recuperar']) assert.equal(authReturnPath(path), '/feed');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationLink } from '../src/lib/notificationLinks.js';
import { searchPattern } from '../src/lib/adminSearch.js';

test('las notificaciones solo abren destinos internos de la comunidad', () => {
  assert.equal(notificationLink('/estudios'), '/estudios');
  assert.equal(notificationLink('/feed?post=123#comments'), '/feed?post=123#comments');
  for (const link of [null, 'https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)', '/admin', '/login', '/feed\n', '/%2fexample.com']) {
    assert.equal(notificationLink(link), null, String(link));
  }
});

test('la busqueda trata comodines como texto literal', () => {
  assert.equal(searchPattern('Ana'), '%Ana%');
  assert.equal(searchPattern('100%_\\'), '%100\\%\\_\\\\%');
  assert.equal(searchPattern("O'Connor"), "%O'Connor%");
});

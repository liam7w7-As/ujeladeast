import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPages, daysSince, effectiveStreak, progressPercentage, studyDay, trackingRows } from '../src/lib/studyTracking.js';

const now = new Date('2026-09-30T18:00:00Z');
const lessons = [
  { id: 'b', week_number: 2, day_number: 1, title: 'Segunda' },
  { id: 'a', week_number: 1, day_number: 1, title: 'Primera' },
  { id: 'c', week_number: 2, day_number: 2, title: 'Tercera' },
];

test('racha vigente hoy y ayer; vencida tras un dia sin estudiar', () => {
  for (const [date, expected] of [['2026-09-30T12:00:00Z', 5], ['2026-09-29T12:00:00Z', 5], ['2026-09-28T12:00:00Z', 0]]) {
    assert.equal(effectiveStreak({ current_streak: 5, last_study_date: date }, now), expected);
  }
  assert.equal(effectiveStreak({ current_streak: 5 }, now), 0);
  assert.equal(effectiveStreak({ current_streak: 5, last_study_date: 'bad-date' }, now), 0);
});

test('el cambio de dia usa Bolivia, no UTC o la zona del dispositivo', () => {
  assert.equal(daysSince('2026-09-30T03:59:00Z', new Date('2026-09-30T04:01:00Z')), 1);
  assert.equal(daysSince('2026-09-29T05:00:00Z', new Date('2026-09-30T03:59:00Z')), 0);
  assert.equal(studyDay('2026-09-29'), studyDay('2026-09-29T18:00:00Z'));
});

test('avance por lecciones reales, sin 100% antes de terminar ni division por cero', () => {
  assert.equal(progressPercentage(2, 3), 67);
  assert.equal(progressPercentage(363, 364), 99);
  assert.equal(progressPercentage(1, 364), 1);
  assert.equal(progressPercentage(0, 0), 0);
  assert.equal(progressPercentage(4, 3), 100);
});

test('omite otros planes y duplicados, separa ultima realizada de primera pendiente', () => {
  const [row] = trackingRows([{ id: 'user', current_streak: 12, last_study_date: '2026-09-25', progress: [
    { lesson_id: 'b', completed_at: '2026-09-29T12:00:00Z' },
    { lesson_id: 'b', completed_at: '2026-09-29T12:00:00Z' },
    { lesson_id: 'outside', completed_at: '2026-09-30T12:00:00Z' },
  ] }], lessons, now);
  assert.equal(row.completed.size, 1);
  assert.equal(row.percentage, 33);
  assert.equal(row.lastCompleted.id, 'b');
  assert.equal(row.nextLesson.id, 'a');
  assert.equal(row.streak, 0);
  assert.equal(row.status, 'active');
});

test('incluye usuarios sin progreso y no trata un plan vacio como completado', () => {
  const [row] = trackingRows([{ id: 'new' }], [], now);
  assert.equal(row.status, 'not-started');
  assert.equal(row.percentage, 0);
  assert.equal(row.lastDate, null);
});

test('actividad de siete dias y plan completado', () => {
  const profile = date => ({ progress: [{ lesson_id: 'a', completed_at: date }] });
  assert.equal(trackingRows([profile('2026-09-24T12:00:00Z')], lessons, now)[0].status, 'active');
  assert.equal(trackingRows([profile('2026-09-23T12:00:00Z')], lessons, now)[0].status, 'inactive');
  const [complete] = trackingRows([{ progress: lessons.map(lesson => ({ lesson_id: lesson.id, completed_at: '2026-09-20T12:00:00Z' })) }], lessons, now);
  assert.equal(complete.status, 'completed');
  assert.equal(complete.percentage, 100);
  assert.equal(complete.nextLesson, undefined);
});

test('paginacion no pierde filas cuando el servidor limita las respuestas', async () => {
  const source = [1, 2, 3, 4, 5];
  const result = await collectPages(async from => ({ data: source.slice(from, from + 2), error: null }), 200);
  assert.deepEqual(result, source);
});

test('un error de permisos nunca se transforma en un resultado vacio', async () => {
  const error = new Error('permission denied');
  await assert.rejects(collectPages(async () => ({ data: null, error })), /permission denied/);
});

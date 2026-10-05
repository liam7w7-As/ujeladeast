import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedJourney, journeyWeeks, lessonQuestions, lessonSteps, missingAnswers, restoreDraft, serializeDraft, draftKey } from '../src/lib/studyJourney.js';

test('weeks open in order, preserve old answers and skip empty weeks', () => {
  const weeks = [1, 2, 4].map(n => ({ id: `w${n}`, week_number: n }));
  const lessons = [1, 2, 4].flatMap(n => [1, 2].map(day => ({ id: `${n}-${day}`, week_id: `w${n}`, day_number: day, study_weeks: { week_number: n }, user_progress: [] })));
  lessons[4].user_progress = [{ user_id: 'me', completed: true }];
  let journey = orderedJourney(lessons, 'me');
  let groups = journeyWeeks(journey, weeks);
  assert.deepEqual(groups.map(week => [week.current, week.canOpen, week.locked]), [[true, true, false], [false, false, true], [false, true, true]]);
  assert.equal(journey.items[4].locked, false, 'Historical completions stay readable');
  assert.equal(journey.items[5].locked, true, 'Historical completion does not unlock its neighbors');
  lessons[0].user_progress = lessons[1].user_progress = [{ user_id: 'me', completed: true }];
  journey = orderedJourney(lessons, 'me');
  groups = journeyWeeks(journey, weeks);
  assert.equal(groups[1].canOpen, true);
  assert.equal(groups[1].current, true);
  assert.equal(journey.nextLesson.id, '2-1');
  lessons[2].user_progress = lessons[3].user_progress = [{ user_id: 'me', completed: true }];
  assert.equal(orderedJourney(lessons, 'me').items[5].locked, false);
  assert.deepEqual(journeyWeeks(null, weeks), [], 'Never unlock weeks on failed loading');
});

test('365 lessons follow actual plan order and find gaps, not the calendar', () => {
  const lessons = Array.from({ length: 365 }, (_, index) => ({ id: `lesson-${index}`, day_number: index % 7 + 1,
    study_weeks: { week_number: Math.floor(index / 7) + 1 },
    user_progress: index === 1 ? [{ user_id: 'other', completed: true }] : [{ user_id: 'me', completed: true }] }));
  const journey = orderedJourney(lessons.reverse(), 'me');
  assert.equal(journey.total, 365);
  assert.equal(journey.completed, 364);
  assert.equal(journey.nextLesson.id, 'lesson-1');
  assert.equal(journey.nextLesson.ordinal, 2);
  assert.equal(journey.items.at(-1).ordinal, 365);
  assert.equal(orderedJourney([], 'me').nextLesson, null);
  assert.equal(orderedJourney(lessons, 'other').completed, 1);
});

const lesson = { scripture_ref: 'Referencia', scripture_text: 'Texto', teaching: 'Enseñanza',
  questions: [{ text: 'Primera pregunta' }, { text: ' ' }, { text: 'Otra pregunta' }, { text: 'Opcional', required: false }] };
test('legacy question indexes are preserved and only meaningful required answers gate completion', () => {
  assert.deepEqual(lessonQuestions(lesson).map(item => item.index), [0, 2, 3]);
  assert.equal(missingAnswers(lesson, { 0: '  ', 2: 'Sí' }).length, 1);
  assert.equal(missingAnswers(lesson, { 0: 'Sí', 2: 'Breve' }).length, 0);
  assert.equal(missingAnswers(lesson, { 0: 12, 2: {} }).length, 2);
  assert.equal(lessonSteps(lesson).length, 6);
  assert.equal(lessonSteps({ questions: null }).length, 2);
  assert.equal(missingAnswers({ questions: ['Pregunta'] }, {}).length, 1);
});

test('draft restores answers, journal and step, isolated per account and lesson', () => {
  const draft = { answers: { 0: 'Primera', 2: 'Segunda' }, journalContent: 'Mi reflexión', favoriteVerses: ['Referencia'], verseInput: 'Otra', step: 4 };
  const restored = restoreDraft(lesson, JSON.parse(serializeDraft(lesson, draft)));
  assert.deepEqual(restored, { ...draft, revised: false });
  assert.notEqual(draftKey('one', 'lesson'), draftKey('two', 'lesson'));
  assert.notEqual(draftKey('one', 'lesson'), draftKey('one', 'another'));
});

test('changed content resets the step without applying old answers to changed questions', () => {
  const raw = JSON.parse(serializeDraft(lesson, { answers: { 0: 'Primera', 2: 'Segunda' }, journalContent: 'Diario', step: 5 }));
  const revised = { ...lesson, questions: [{ text: 'Pregunta nueva' }, { text: '' }, { text: 'Otra pregunta' }] };
  const restored = restoreDraft(revised, raw);
  assert.equal(restored.step, 0);
  assert.equal(restored.revised, true);
  assert.deepEqual(restored.answers, { 2: 'Segunda' });
  assert.equal(restored.journalContent, 'Diario');
  assert.equal(restoreDraft(lesson, { ...raw, step: 999 }).step, 5);
  assert.equal(restoreDraft(lesson, { version: 999 }).step, 0);
});

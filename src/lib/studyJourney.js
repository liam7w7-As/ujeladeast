export function orderedJourney(lessons, userId) {
  const ordered = [...lessons].sort((a, b) =>
    Number(a.study_weeks?.week_number || 0) - Number(b.study_weeks?.week_number || 0)
    || Number(a.day_number) - Number(b.day_number)
    || String(a.id).localeCompare(String(b.id)));
  const items = ordered.map((lesson, index) => ({
    ...lesson,
    ordinal: index + 1,
    completed: lesson.user_progress?.some(item => item.user_id === userId && item.completed === true) || false,
  }));
  const currentWeek = items.find(item => !item.completed)?.study_weeks?.week_number;
  for (const item of items) {
    item.locked = !item.completed && currentWeek != null && Number(item.study_weeks?.week_number) > Number(currentWeek);
  }
  return { items, total: items.length, completed: items.filter(item => item.completed).length,
    nextLesson: items.find(item => !item.completed) || null };
}

export function journeyWeeks(journey, weeks = []) {
  if (!journey) return [];
  return weeks.map(week => {
    const items = journey.items.filter(item => item.week_id ? item.week_id === week.id : Number(item.study_weeks?.week_number) === Number(week.week_number));
    const completed = items.filter(item => item.completed).length;
    const locked = items.some(item => item.locked);
    return { ...week, items, total: items.length, completed, locked,
      canOpen: items.some(item => !item.locked),
      current: items.some(item => item.id === journey.nextLesson?.id),
      finished: items.length > 0 && completed === items.length };
  }).sort((a, b) => Number(a.week_number) - Number(b.week_number));
}

export function lessonQuestions(lesson) {
  return (Array.isArray(lesson.questions) ? lesson.questions : []).flatMap((question, index) => {
    const text = typeof question === 'string' ? question : question?.text;
    return typeof text === 'string' && text.trim()
      ? [{ index, text: text.trim(), required: question?.required !== false }]
      : [];
  });
}

export function missingAnswers(lesson, answers = {}) {
  return lessonQuestions(lesson).filter(question => question.required
    && (typeof answers[question.index] !== 'string' || !answers[question.index].trim()));
}

export function lessonSteps(lesson) {
  return [
    { id: 'read', label: 'Leer' },
    ...(lesson.teaching?.trim() ? [{ id: 'teaching', label: 'Comprender' }] : []),
    ...lessonQuestions(lesson).map((question, index) => ({ id: `question-${question.index}`, label: 'Reflexionar', question, number: index + 1 })),
    { id: 'close', label: 'Cerrar' },
  ];
}

export function draftKey(userId, lessonId) {
  return `ujeladea:study-draft:v1:${userId}:${lessonId}`;
}

export function lessonRevision(lesson) {
  return JSON.stringify([lesson.scripture_ref, lesson.scripture_text, lesson.teaching, lesson.questions]);
}

export function restoreDraft(lesson, raw) {
  const initial = { answers: {}, journalContent: '', favoriteVerses: [], verseInput: '', step: 0 };
  if (!raw || raw.version !== 1) return initial;
  const unchanged = raw.revision === lessonRevision(lesson);
  const answers = {};
  for (const question of lessonQuestions(lesson)) {
    const oldQuestion = raw.questions?.find(item => item.index === question.index && item.text === question.text);
    if ((unchanged || oldQuestion) && typeof raw.answers?.[question.index] === 'string') answers[question.index] = raw.answers[question.index];
  }
  return { answers, journalContent: typeof raw.journalContent === 'string' ? raw.journalContent : '',
    favoriteVerses: Array.isArray(raw.favoriteVerses) ? raw.favoriteVerses.filter(value => typeof value === 'string' && value.trim()) : [],
    verseInput: typeof raw.verseInput === 'string' ? raw.verseInput : '',
    step: unchanged && Number.isInteger(raw.step) ? Math.max(0, Math.min(raw.step, lessonSteps(lesson).length - 1)) : 0,
    revised: !unchanged,
  };
}

export function serializeDraft(lesson, draft) {
  return JSON.stringify({ ...draft, version: 1, revision: lessonRevision(lesson), questions: lessonQuestions(lesson) });
}

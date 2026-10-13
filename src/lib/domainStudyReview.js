import { collectPages } from './studyTracking.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = value => typeof value === 'string' ? value.trim() : '';
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function inspectStudyDraft(kind, id, value) {
  const fields = kind === 'study'
    ? ['version', 'revision', 'questions', 'answers', 'journalContent', 'favoriteVerses', 'verseInput', 'step', 'revised']
    : ['answers', 'read'];
  if (Object.keys(value).some(key => !fields.includes(key))) throw new Error('Unknown draft fields');
  if (kind === 'study' && value.version !== 1) throw new Error('Unknown study draft');
  const answers = value.answers === undefined ? (kind === 'study' ? {} : []) : value.answers;
  if (!(kind === 'study' ? object(answers) : Array.isArray(answers))
    || Object.values(answers).some(answer => typeof answer !== 'string')) throw new Error('Invalid answers');
  for (const field of ['journalContent', 'verseInput']) {
    if (value[field] !== undefined && typeof value[field] !== 'string') throw new Error('Invalid text');
  }
  if (value.favoriteVerses !== undefined && (!Array.isArray(value.favoriteVerses)
    || value.favoriteVerses.some(verse => typeof verse !== 'string'))) throw new Error('Invalid verses');
  const meaningfulAnswers = Object.fromEntries(Object.entries(answers).filter(([, answer]) => text(answer)).map(([key, answer]) => [key, text(answer)]));
  const journal = text(value.journalContent);
  const verses = [...new Set([...(value.favoriteVerses || []), value.verseInput || ''].map(text).filter(Boolean))];
  return { kind, id, answers: meaningfulAnswers, journal, verses,
    empty: Object.keys(meaningfulAnswers).length === 0 && !journal && verses.length === 0 };
}

export function compareStudyDrafts(inventory, { progress = [], journals = [], recoveries = [], lessons = [], completedCount }) {
  let confirmed = 0, empty = 0;
  const pending = [];
  for (const draft of inventory.drafts) {
    if (draft.empty) { empty++; continue; }
    const sameAccount = row => row.user_id === inventory.owner;
    const progressRow = progress.find(row => sameAccount(row) && row.lesson_id === draft.id);
    const journalRow = journals.find(row => sameAccount(row) && row.lesson_id === draft.id);
    const recovery = recoveries.find(row => sameAccount(row) && row.id === draft.id);
    const remote = draft.kind === 'study' ? progressRow : recovery;
    const answersMatch = Object.entries(draft.answers).every(([key, answer]) => answer === text(remote?.answers?.[key]));
    const journalMatches = (!draft.journal || draft.journal === text(journalRow?.content))
      && draft.verses.every(verse => Array.isArray(journalRow?.favorite_verses) && journalRow.favorite_verses.some(saved => text(saved) === verse));
    const saved = draft.kind === 'study'
      ? progressRow?.completed === true && answersMatch && journalMatches
      : ['pending', 'approved', 'rejected'].includes(recovery?.status) && answersMatch;
    if (saved) { confirmed++; continue; }
    const lesson = lessons.find(row => row.id === draft.id);
    const title = draft.kind === 'study' ? text(lesson?.title) : text(recovery?.snapshot?.title);
    pending.push({ kind: draft.kind, id: draft.id,
      title: title || (draft.kind === 'study' ? 'Estudio sin título disponible' : 'Repaso de recuperación'),
      reason: draft.kind === 'study' && progressRow?.completed
        ? 'La lección está completada, pero hay respuestas o notas locales diferentes.'
        : draft.kind === 'recovery' && recovery?.status !== 'draft' && recovery?.status
          ? 'El repaso ya fue enviado, pero sus respuestas locales son diferentes.'
          : 'Estas respuestas no están confirmadas en tu cuenta.' });
  }
  return { owner: inventory.owner, signature: inventory.signature, completedCount, confirmed, empty, pending };
}

// Read only the signed-in account. Capture its JWT so a session switch cannot mix results.
export async function readMigrationStudies(client, owner, inventory, signal) {
  if (inventory.error || inventory.owner !== owner) throw new Error('Invalid inventory');
  const { data, error } = await client.auth.getSession();
  if (error || signal.aborted || data.session?.user.id !== owner) throw new Error('Session changed');
  const authorize = query => query.setHeader('Authorization', `Bearer ${data.session.access_token}`).abortSignal(signal);
  const countResult = await authorize(client.from('user_progress').select('lesson_id', { count: 'exact', head: true })
    .eq('user_id', owner).eq('completed', true));
  if (countResult.error || !Number.isSafeInteger(countResult.count) || countResult.count < 0) throw new Error('Unconfirmed study count');
  const drafts = inventory.drafts.filter(draft => !draft.empty && uuid.test(draft.id));
  const studyIds = drafts.filter(draft => draft.kind === 'study').map(draft => draft.id);
  const journalIds = drafts.filter(draft => draft.kind === 'study' && (draft.journal || draft.verses.length)).map(draft => draft.id);
  const recoveryIds = drafts.filter(draft => draft.kind === 'recovery').map(draft => draft.id);
  async function rows(table, columns, ids, idColumn, own = true) {
    const results = [];
    for (let index = 0; index < ids.length; index += 50) {
      const batch = ids.slice(index, index + 50);
      results.push(...await collectPages(async (from, to) => {
        if (signal.aborted) throw new Error('Review cancelled');
        let query = client.from(table).select(columns).in(idColumn, batch).order(idColumn).range(from, to);
        if (own) query = query.eq('user_id', owner);
        const result = await authorize(query);
        if (result.error) throw result.error;
        if (!Array.isArray(result.data)) throw new Error('Invalid study response');
        return result;
      }, 50));
    }
    return results;
  }
  const progress = await rows('user_progress', 'user_id,lesson_id,completed,answers', studyIds, 'lesson_id');
  const journals = await rows('journal_entries', 'user_id,lesson_id,content,favorite_verses', journalIds, 'lesson_id');
  const recoveries = await rows('study_streak_recoveries', 'user_id,id,status,answers,snapshot', recoveryIds, 'id');
  const lessons = await rows('study_lessons', 'id,title', studyIds, 'id', false);
  if (signal.aborted) throw new Error('Review cancelled');
  return compareStudyDrafts(inventory, { progress, journals, recoveries, lessons, completedCount: countResult.count });
}

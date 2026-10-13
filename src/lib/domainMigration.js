import { cleanFavorite, guestFavoritesKey } from './bibleFavorites.js';
import { favoriteKey } from './bibleVerses.js';
import { inspectStudyDraft } from './domainStudyReview.js';

export const OLD_APP_ORIGIN = 'https://ujeladeast.vercel.app';
export const NEW_APP_ORIGIN = 'https://www.ujeladea.org';
export const MIGRATION_ARRIVAL_PATH = '/?traslado=llegada';
export const MIGRATION_REVIEW_PATH = '/?traslado=revisar';
export const MIGRATION_DESTINATION = `${NEW_APP_ORIGIN}${MIGRATION_ARRIVAL_PATH}`;

export function migrationNoticeAvailable({ origin, search = '', development = false }) {
  const preview = ['revisar', 'piloto'].includes(new URLSearchParams(search).get('traslado'));
  const local = development && preview && ['http://localhost:5177', 'http://127.0.0.1:5177'].includes(origin);
  return origin === OLD_APP_ORIGIN || local;
}

const readingKeys = ['position', 'readingPositions', 'fontFamily', 'fontSize', 'theme', 'backgrounds', 'redLetters'].map(key => `bible:${key}`);

// Read only this account's draft/queue keys and explicitly shared Bible preferences.
// Never export storage, read auth tokens, or examine another account's draft contents.
export function inspectMigrationData(storage, owner) {
  const result = { owner, drafts: [], studyDrafts: 0, recoveryDrafts: 0, pendingFavorites: 0, guestFavorites: [], chapters: 0, readingSettings: false, error: '' };
  if (!owner) return { ...result, error: 'Inicia sesión para revisar tus datos.' };
  const studyPrefix = `ujeladea:study-draft:v1:${owner}:`;
  const recoveryPrefix = `ujeladea:recovery:v1:${owner}:`;
  const cacheKey = `bible:favorites:${owner}`;
  const queuePrefix = `${cacheKey}:op:`;
  const signatures = [];
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean).sort();
    for (const key of keys) {
      if (key.startsWith(queuePrefix)) { result.pendingFavorites++; continue; }
      if (!key.startsWith(studyPrefix) && !key.startsWith(recoveryPrefix)
        && key !== guestFavoritesKey && key !== cacheKey && key !== 'bible:bookmarks' && !readingKeys.includes(key)) continue;
      const raw = storage.getItem(key);
      if (raw === null) continue;
      signatures.push([key, raw]);
      const value = JSON.parse(raw);
      if (key.startsWith(studyPrefix) || key.startsWith(recoveryPrefix)) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid draft');
        const kind = key.startsWith(studyPrefix) ? 'study' : 'recovery';
        result.drafts.push(inspectStudyDraft(kind, key.slice(kind === 'study' ? studyPrefix.length : recoveryPrefix.length), value));
        if (key.startsWith(studyPrefix)) result.studyDrafts++;
        else result.recoveryDrafts++;
      } else if (key === guestFavoritesKey || key === cacheKey) {
        const list = key === cacheKey ? value?.favorites : value;
        if (!Array.isArray(list) || list.some(entry => !cleanFavorite(entry))) throw new Error('Invalid favorites');
        if (key === guestFavoritesKey) result.guestFavorites = [...new Map(list.map(entry => [favoriteKey(entry), cleanFavorite(entry)])).values()];
      } else if (key === 'bible:bookmarks') {
        if (!Array.isArray(value)) throw new Error('Invalid bookmarks');
        result.chapters = value.length;
      } else result.readingSettings = true;
    }
    // The signature stays in memory; it only detects edits between review and departure.
    return { ...result, signature: JSON.stringify([signatures, result.pendingFavorites]) };
  } catch {
    return { ...result, signature: '', error: 'No pudimos revisar todos los datos locales. No borres la app anterior ni los datos del navegador.' };
  }
}

export function migrationReadiness(inventory, favorites, online, downloads, studies) {
  const owned = new Set((favorites.favorites || []).map(favoriteKey));
  const guestMissing = inventory.guestFavorites.filter(entry => !owned.has(favoriteKey(entry))).length;
  const ready = Boolean(online && !inventory.error && downloads.status === 'ready'
    && favorites.ready && favorites.status === 'synced' && !favorites.error
    && favorites.pending === 0 && inventory.pendingFavorites === 0
    && studies?.status === 'ready' && studies.owner === inventory.owner
    && studies.signature === inventory.signature && guestMissing === 0);
  const pending = ready ? studies.pending.length : 0;
  // Consent covers the exact local inventory and the server comparison shown to the user.
  const consentKey = ready ? JSON.stringify([inventory.owner, inventory.signature, studies.completedCount, studies.confirmed, studies.pending]) : '';
  return { ready, guestMissing, pending, consentKey };
}

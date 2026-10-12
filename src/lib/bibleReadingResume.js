import { bookmarkKey, readPreference, selection, writePreference } from './bibleModel.js';

export function validReadingPoint(value) {
  if (!value || !Number.isInteger(value.verse) || value.verse < 1 || value.verse > 999
    || !Number.isFinite(value.fraction) || value.fraction < 0 || value.fraction >= 1) return null;
  return { verse: value.verse, fraction: value.fraction,
    ...(Number.isFinite(value.intro) && value.intro >= 0 && value.intro <= 1 ? { intro: value.intro } : {}) };
}
export function readReadingPoint(current) {
  const saved = readPreference('readingPositions', {});
  const entry = saved && typeof saved === 'object' ? saved[bookmarkKey(current)] : null;
  const last = readPreference('position', {});
  return validReadingPoint(entry) || (last && bookmarkKey(selection(last)) === bookmarkKey(current) ? validReadingPoint(last) : null);
}
export function rememberReadingPoint(current, point) {
  const clean = validReadingPoint(point);
  if (!clean) return false;
  const location = selection(current), key = bookmarkKey(location);
  const raw = readPreference('readingPositions', {});
  const previous = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const entries = Object.entries(previous).filter(([entryKey, entry]) => entryKey !== key && validReadingPoint(entry) && Number.isFinite(entry.savedAt))
    .sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 59);
  const saved = { ...location, ...clean, savedAt: Date.now() };
  const lastWritten = writePreference('position', saved);
  const positionsWritten = writePreference('readingPositions', { [key]: saved, ...Object.fromEntries(entries) });
  return lastWritten && positionsWritten;
}

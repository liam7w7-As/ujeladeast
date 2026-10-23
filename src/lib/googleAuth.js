import { authReturnPath } from './authMessages.js';

const ATTEMPT_KEY = 'ujeladea:google-auth:v1';
const ATTEMPT_MAX_AGE = 20 * 60 * 1000;

export function googleCallbackUrl(origin) {
  const url = new URL(origin);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid auth origin');
  return `${url.origin}/auth/callback`;
}

export function rememberGoogleAttempt(storage, { path, userId = null }, now = Date.now()) {
  try { storage?.setItem(ATTEMPT_KEY, JSON.stringify({ path: authReturnPath(path), userId, startedAt: now })); }
  catch { /* Authentication still works when browser storage is unavailable. */ }
}

export function readGoogleAttempt(storage, now = Date.now()) {
  try {
    const attempt = JSON.parse(storage?.getItem(ATTEMPT_KEY) || 'null');
    if (!attempt || !Number.isFinite(attempt.startedAt) || now - attempt.startedAt > ATTEMPT_MAX_AGE || now < attempt.startedAt) return null;
    return { path: authReturnPath(attempt.path), userId: typeof attempt.userId === 'string' ? attempt.userId : null };
  } catch { return null; }
}

export function clearGoogleAttempt(storage) {
  try { storage?.removeItem(ATTEMPT_KEY); } catch { /* Private browsing may block storage. */ }
}

export function googleCallbackError(search = '', hash = '') {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return query.get('error_code') || fragment.get('error_code') || query.get('error') || fragment.get('error') || null;
}

export function hasGoogleIdentity(user) {
  return user?.identities?.some(identity => identity.provider === 'google') || user?.app_metadata?.providers?.includes('google') || user?.app_metadata?.provider === 'google' || false;
}

export function needsGoogleProfile(user, profile) {
  return hasGoogleIdentity(user) && (!profile?.full_name?.trim() || !profile?.church_name?.trim() || !profile?.avatar_url);
}

export async function checkGoogleProvider(url, key, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Network request failed');
    const settings = await response.json();
    if (!settings.external?.google) throw Object.assign(new Error('Google disabled'), { code: 'google_disabled' });
  } finally { clearTimeout(timer); }
}

export async function startGoogleAuth(client, { origin, path, storage, userId, online = true, checkProvider = async () => {} }) {
  if (!online) throw Object.assign(new Error('Offline'), { code: 'offline' });
  await checkProvider();
  const options = { redirectTo: googleCallbackUrl(origin), skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } };
  const { data, error } = userId
    ? await client.auth.linkIdentity({ provider: 'google', options })
    : await client.auth.signInWithOAuth({ provider: 'google', options });
  if (error) throw error;
  if (!data?.url) throw new Error('Missing OAuth URL');
  rememberGoogleAttempt(storage, { path, userId });
  return data.url;
}

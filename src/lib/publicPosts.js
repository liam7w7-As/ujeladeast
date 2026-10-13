import { POST_ID, safeImage } from './seo.js';

const fields = 'id,content,image_url,category,created_at,profiles(full_name)';
export function publicDatabaseConfig(env) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key || !/^https:\/\//.test(url)) throw new Error('Public database configuration unavailable');
  // Never allow an elevated key into an anonymous, publicly cached response.
  if (!key.startsWith('sb_publishable_')) {
    let role;
    try { role = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))).role; } catch { /* Reject malformed keys below. */ }
    if (role !== 'anon') throw new Error('An anonymous database key is required');
  }
  return { url: new URL(url).origin, key };
}
export function sanitizePublicPost(row) {
  if (!row || !POST_ID.test(row.id)) return null;
  return {
    id: row.id.toLowerCase(), content: String(row.content || ''),
    image_url: safeImage(row.image_url), category: String(row.category || ''),
    created_at: Number.isFinite(Date.parse(row.created_at)) ? new Date(row.created_at).toISOString() : null,
    profiles: { full_name: typeof row.profiles?.full_name === 'string' ? row.profiles.full_name : null },
  };
}
async function query(config, parameters, fetcher) {
  const url = new URL('/rest/v1/posts', config.url);
  url.search = new URLSearchParams(parameters).toString();
  const headers = { apikey: config.key, Accept: 'application/json' };
  if (!config.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.key}`;
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Public posts temporarily unavailable');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid public posts response');
  return rows;
}
export async function getPublicPost(config, id, fetcher = fetch) {
  if (!POST_ID.test(id || '')) return null;
  const rows = await query(config, { select: fields, id: `eq.${id}`, limit: '1' }, fetcher);
  return sanitizePublicPost(rows[0]);
}
export async function getPublicPostIds(config, fetcher = fetch) {
  const ids = new Set();
  for (let offset = 0; offset <= 50000;) {
    const rows = await query(config, { select: 'id', order: 'id.asc', limit: '500', offset: String(offset) }, fetcher);
    for (const row of rows) if (POST_ID.test(row.id || '')) ids.add(row.id.toLowerCase());
    if (ids.size > 50000) throw new Error('Sitemap requires partitioning');
    if (!rows.length) return [...ids];
    offset += rows.length;
  }
  throw new Error('Sitemap requires partitioning');
}

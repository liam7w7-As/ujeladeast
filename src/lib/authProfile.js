import { selectedAvatar, PROFILE_AVATARS } from './avatars.js';

export async function loadUserProfile(client, user) {
  const read = () => client.from('profiles').select('*').eq('id', user.id).maybeSingle();
  let { data, error } = await read();
  if (error) throw error;
  const metadata = user.user_metadata || {};
  const avatar = selectedAvatar(metadata.avatar_id) || selectedAvatar(metadata.avatar_url) || PROFILE_AVATARS[metadata.gender] || null;
  if (!data) {
    // Ignore conflicts: another tab may have already created a complete profile.
    const inserted = await client.from('profiles').upsert({
      id: user.id, full_name: String(metadata.full_name || metadata.name || '').slice(0, 120),
      church_name: String(metadata.church_name || '').slice(0, 160), avatar_url: avatar,
    }, { onConflict: 'id', ignoreDuplicates: true }).select('*').maybeSingle();
    if (inserted.error) throw inserted.error;
    const result = inserted.data ? inserted : await read();
    data = result.data; error = result.error;
    if (error || !data) throw error || new Error('Profile unavailable');
  }
  if (!data.avatar_url && avatar) {
    const saved = await client.from('profiles').update({ avatar_url: avatar }).eq('id', user.id).is('avatar_url', null).select('*').maybeSingle();
    if (saved.error) throw saved.error;
    if (saved.data) data = saved.data;
    else {
      const latest = await read();
      if (latest.error) throw latest.error;
      data = latest.data || data;
    }
  }
  return data;
}

export function profileChanges({ fullName, churchName, avatar }, current) {
  const full_name = String(fullName || '').trim();
  const church_name = String(churchName || '').trim();
  const avatar_url = selectedAvatar(avatar) || (avatar === current?.avatar_url ? current.avatar_url : null);
  if (!full_name || full_name.length > 120 || !church_name || church_name.length > 160 || !avatar_url) throw new Error('Completa tu nombre, iglesia y avatar.');
  return { full_name, church_name, avatar_url };
}

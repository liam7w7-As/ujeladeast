export const PROFILE_AVATARS = {
  hombre: '/avatars/hombre.webp',
  mujer: '/avatars/mujer.webp',
};

export function profileAvatar(profile, metadata) {
  return profile?.avatar_url || metadata?.avatar_url || PROFILE_AVATARS[metadata?.gender] || null;
}

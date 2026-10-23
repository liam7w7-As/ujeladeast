export const PROFILE_AVATARS = {
  hombre: '/avatars/hombre.webp',
  mujer: '/avatars/mujer.webp',
};

export const AVATAR_CHOICES = [
  { id: 'hombre', label: 'Hombre', src: PROFILE_AVATARS.hombre },
  { id: 'mujer', label: 'Mujer', src: PROFILE_AVATARS.mujer },
  ...[1, 2, 3, 4, 5, 6, 7, 10].map(number => ({
    id: `personaje-${number}`, label: `Personaje ${number === 10 ? 8 : number}`,
    src: `/avatars/personaje-${number}-v1.webp`,
  })),
];

export function selectedAvatar(value) {
  return AVATAR_CHOICES.find(avatar => avatar.id === value || avatar.src === value)?.src || null;
}

export function profileAvatar(profile, metadata) {
  return profile?.avatar_url || selectedAvatar(metadata?.avatar_id) || metadata?.avatar_url || PROFILE_AVATARS[metadata?.gender] || null;
}

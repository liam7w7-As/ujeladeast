export const FEED_FILTERS = [
  { id: 'Todos', label: 'Todas' },
  { id: 'Reflexiones', label: 'Reflexiones' },
  { id: 'Devocionales', label: 'Devocionales' },
  { id: 'Anuncios', label: 'Anuncios' },
];

export function postCategory(value) {
  const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (['devocional', 'devocionales'].includes(normalized)) return { id: 'devocional', label: 'Devocional' };
  if (['anuncio', 'anuncios'].includes(normalized)) return { id: 'anuncio', label: 'Anuncio' };
  if (['reflexion', 'reflexiones'].includes(normalized)) return { id: 'reflexion', label: 'Reflexión' };
  return { id: 'otro', label: value || 'Comunidad' };
}

export function postTime(value, now = Date.now()) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)} h`;
  if (minutes < 2880) return 'Ayer';
  return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', ...(date.getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}) });
}

const destinations = new Set(['/', '/feed', '/estudios', '/himnario', '/sociedades', '/recursos', '/chat']);

export function notificationLink(value) {
  if (!value || typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://ujeladea.invalid');
    return url.origin === 'https://ujeladea.invalid' && destinations.has(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch { return null; }
}

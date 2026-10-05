export const BEFORE_APP_UPDATE = 'ujeladea:before-update';

export function appUpdateBlocker(target = window) {
  const event = new CustomEvent(BEFORE_APP_UPDATE, { cancelable: true, detail: { reason: '' } });
  target.dispatchEvent(event);
  return event.defaultPrevented ? event.detail.reason || 'Termina de guardar antes de actualizar.' : '';
}

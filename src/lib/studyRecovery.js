import { missingStudyRpc } from './studyApi.js';

export const recoveryLabels = { draft: 'Repaso en curso', pending: 'En revisión', approved: 'Recuperación aprobada', rejected: 'Repaso no aprobado' };
export const recoveryDraftKey = (userId, requestId) => `ujeladea:recovery:v1:${userId}:${requestId}`;
export const answerLength = value => [...String(value || '').replace(/\s/g, '')].length;
export const validRecoveryAnswers = values => Array.isArray(values) && values.length === 3
  && values.every(value => typeof value === 'string' && answerLength(value) >= 40 && [...value].length <= 2000);
export const recoveryDate = value => value ? new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00Z`)) : '';
export const recoveryDeadline = value => new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export function recoveryError(error) {
  if (missingStudyRpc(error) || error?.code === '42P01') return 'La recuperación aún no está habilitada. El administrador debe activar la migración.';
  if (error?.code === 'P0004' || error?.code === '22023') return error.message;
  if (error?.code === '42501') return 'Tu cuenta no tiene permiso para realizar esta acción.';
  return 'No pudimos confirmar la operación. Tus respuestas se conservan; revisa la conexión y vuelve a intentarlo.';
}
export function readRecoveryDraft(userId, request) {
  if (request.status !== 'draft') return { answers: request.answers || ['', '', ''], read: true };
  try {
    const raw = JSON.parse(localStorage.getItem(recoveryDraftKey(userId, request.id)));
    return { answers: [0, 1, 2].map(i => typeof raw?.answers?.[i] === 'string' ? raw.answers[i].slice(0, 2000) : ''), read: raw?.read === true };
  } catch { return { answers: ['', '', ''], read: false }; }
}

// Source lessons may contain HTML. Recovery screens render extracted text only.
export function recoveryText(value) {
  const document = new DOMParser().parseFromString(String(value || ''), 'text/html');
  document.querySelectorAll('script,style,iframe,object,template').forEach(node => node.remove());
  document.querySelectorAll('p,div,li,br,h1,h2,h3,blockquote').forEach(node => node.prepend(document.createTextNode('\n')));
  return document.body.textContent.trim();
}

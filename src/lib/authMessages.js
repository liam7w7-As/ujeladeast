export function authErrorMessage(error) {
  const code = error?.code;
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(error?.message || '')) return 'El correo o la contraseña no son correctos.';
  if (code === 'email_not_confirmed') return 'Confirma tu correo antes de iniciar sesión.';
  if (code === 'user_already_exists' || code === 'email_exists') return 'Ya existe una cuenta con ese correo. Puedes iniciar sesión.';
  if (code === 'weak_password') return 'La contraseña no cumple los requisitos. Elige una más larga y segura.';
  if (error?.status === 429 || code === 'over_email_send_rate_limit') return 'Espera unos minutos antes de volver a intentarlo.';
  if (/fetch|network/i.test(error?.message || '')) return 'No pudimos conectarnos. Revisa tu conexión e intenta otra vez.';
  return 'No pudimos completar la solicitud. Intenta nuevamente.';
}

export function authReturnPath(value) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !value.includes('\\') && !/^\/(login|register|recuperar)([/?#]|$)/.test(value) ? value : '/feed';
}

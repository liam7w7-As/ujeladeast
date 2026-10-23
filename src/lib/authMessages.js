export function authErrorMessage(error) {
  const code = error?.code;
  if (code === 'google_disabled' || code === 'provider_disabled') return 'El acceso con Google todavía no está habilitado. Puedes entrar con tu correo y contraseña.';
  if (code === 'manual_linking_disabled') return 'La vinculación con Google todavía no está habilitada. Tu acceso actual sigue funcionando.';
  if (code === 'identity_already_exists') return 'Esa cuenta de Google ya está vinculada a otra cuenta. No hemos combinado ni cambiado tus datos.';
  if (code === 'access_denied') return 'Cancelaste el acceso con Google. Puedes volver a intentarlo o entrar con tu correo.';
  if (code === 'offline') return 'Necesitas conexión a internet para iniciar sesión con Google.';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(error?.message || '')) return 'El correo o la contraseña no son correctos.';
  if (code === 'email_not_confirmed') return 'Confirma tu correo antes de iniciar sesión.';
  if (code === 'user_already_exists' || code === 'email_exists') return 'Ya existe una cuenta con ese correo. Puedes iniciar sesión.';
  if (code === 'weak_password') return 'La contraseña no cumple los requisitos. Elige una más larga y segura.';
  if (error?.status === 429 || code === 'over_email_send_rate_limit') return 'Espera unos minutos antes de volver a intentarlo.';
  if (/fetch|network/i.test(error?.message || '')) return 'No pudimos conectarnos. Revisa tu conexión e intenta otra vez.';
  return 'No pudimos completar la solicitud. Intenta nuevamente.';
}

export function authReturnPath(value) {
  if (typeof value !== 'string' || !/^\/(?!\/)/.test(value) || value.includes('\\') || Array.from(value).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return '/feed';
  try {
    const url = new URL(value, 'https://return.invalid');
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://return.invalid' || path.startsWith('//') || path.includes('\\') || /^\/(login|register|recuperar|auth|completar-perfil)([/?#]|$)/i.test(path)) return '/feed';
    return url.pathname + url.search + url.hash;
  } catch { return '/feed'; }
}

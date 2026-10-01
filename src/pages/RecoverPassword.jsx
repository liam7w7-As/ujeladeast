import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Mail, MailCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import AuthLayout from '../components/layout/AuthLayout';
import AuthField from '../components/ui/AuthField';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { authErrorMessage } from '../lib/authMessages';

export default function RecoverPassword() {
  const [params] = useSearchParams();
  const updating = params.get('actualizar') === '1';
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const lock = useRef(false);
  const reduced = useReducedMotion();
  const submit = async event => {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    if (updating && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    lock.current = true; setBusy(true);
    try {
      const result = updating
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/recuperar?actualizar=1` });
      if (result.error) throw result.error;
      setSuccess(true); setPassword(''); setConfirmation('');
    } catch (err) { setError(authErrorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <AuthLayout title={updating ? 'Tu nueva contraseña' : 'Recupera tu acceso'} subtitle={updating ? 'Vuelve a tu comunidad con tranquilidad.' : 'Te enviaremos un enlace a tu correo.'}>
    <div className="mt-7">
      {success ? <section role="status" className="auth-success">{updating ? <CheckCircle2 size={38} /> : <MailCheck size={38} />}<h2>{updating ? 'Contraseña actualizada' : 'Revisa tu correo'}</h2><p>{updating ? 'Tu nueva contraseña ya está lista.' : 'Si existe una cuenta con ese correo, recibirás el enlace de recuperación. Revisa también la carpeta de spam.'}</p><Link to={updating ? '/feed' : '/login'} className="auth-submit">{updating ? 'Ir a la comunidad' : 'Volver al acceso'}<ArrowRight size={18} /></Link></section>
        : updating && loading ? <p role="status">Verificando el enlace...</p>
          : updating && !user ? <section className="auth-success"><h2>El enlace ya no es válido</h2><p>Solicita otro enlace para recuperar tu cuenta.</p><Link to="/recuperar" className="auth-submit">Solicitar otro enlace</Link></section>
            : <form onSubmit={submit} className="auth-form" aria-label="Recuperar acceso">
              {updating ? <><AuthField id="password" label="Nueva contraseña" icon={LockKeyhole} type="password" autoComplete="new-password" required minLength={6} hint="Mínimo 6 caracteres." value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /><AuthField id="confirmPassword" label="Confirmar contraseña" icon={LockKeyhole} type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} /></>
                : <AuthField id="email" label="Correo electrónico" icon={Mail} type="email" inputMode="email" autoCapitalize="none" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" disabled={busy} />}
              {error && <p role="alert" className="auth-error"><AlertCircle size={17} />{error}</p>}
              <motion.button type="submit" className="auth-submit" disabled={busy} whileTap={reduced ? undefined : { scale: 0.98 }}>{busy ? <><LoaderCircle size={18} className="animate-spin" />Enviando...</> : <>{updating ? 'Guardar contraseña' : 'Enviar enlace'}<ArrowRight size={18} /></>}</motion.button>
              <Link className="auth-step-back" to="/login">Volver a iniciar sesión</Link>
            </form>}
    </div>
  </AuthLayout>;
}

import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import AuthLayout from '../components/layout/AuthLayout';
import AuthField from '../components/ui/AuthField';
import { useAuth } from '../hooks/useAuth';
import { authErrorMessage, authReturnPath } from '../lib/authMessages';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const submit = async event => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await login(email.trim(), password);
      navigate(authReturnPath(location.state?.from), { replace: true });
    } catch (err) { setError(authErrorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <AuthLayout title="Qué bueno verte de nuevo" subtitle="Tu comunidad está aquí." active="login">
    <form onSubmit={submit} className="auth-form" aria-label="Iniciar sesión">
      <AuthField id="email" label="Correo electrónico" icon={Mail} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" disabled={busy} />
      <AuthField id="password" label="Contraseña" icon={LockKeyhole} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" disabled={busy} />
      <Link to="/recuperar" className="auth-forgot">¿Olvidaste tu contraseña?</Link>
      {error && <motion.p role="alert" className="auth-error" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}><AlertCircle size={17} />{error}</motion.p>}
      <motion.button type="submit" className="auth-submit" disabled={busy} whileTap={reduced ? undefined : { scale: 0.98 }}>{busy ? <><LoaderCircle size={19} className="animate-spin" />Entrando...</> : <>Iniciar sesión<ArrowRight size={18} /></>}</motion.button>
    </form>
  </AuthLayout>;
}

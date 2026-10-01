import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, Church, LoaderCircle, LockKeyhole, Mail, MailCheck, UserRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PROFILE_AVATARS } from '../lib/avatars';
import { authErrorMessage } from '../lib/authMessages';
import AuthLayout from '../components/layout/AuthLayout';
import AuthField from '../components/ui/AuthField';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [gender, setGender] = useState('');
  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);
  const submit = async event => {
    event.preventDefault(); setError('');
    if (step === 0) {
      if (!fullName.trim() || !churchName.trim() || !gender) { setError('Completa tu nombre, iglesia y avatar.'); return; }
      setStep(1);
      return;
    }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const data = await register(email.trim(), password, fullName.trim(), churchName.trim(), gender);
      if (data.session) navigate('/feed', { replace: true });
      else { setSuccess(true); setPassword(''); setConfirmPassword(''); }
    } catch (err) { setError(authErrorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <AuthLayout title="Un lugar para ti" subtitle="Comencemos por conocernos." active="register">
    {success ? <motion.section role="status" className="auth-success" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <MailCheck size={38} /><h2>Revisa tu correo</h2><p>Enviamos un enlace de confirmación a <strong>{email}</strong>. Tu avatar ya está seleccionado.</p><Link to="/login" className="auth-submit">Ir a iniciar sesión<ArrowRight size={18} /></Link>
    </motion.section> : <>
      <div className="auth-progress" aria-label={`Paso ${step + 1} de 2`}><span>{step === 0 ? '1. Tu perfil' : '2. Tu acceso'}</span><div aria-hidden="true"><i data-done="true" /><i data-done={step === 1} /></div></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.form key={step} onSubmit={submit} className="auth-form" aria-label={step === 0 ? 'Tu perfil' : 'Datos de acceso'} initial={reduced ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: -10 }} transition={{ duration: 0.16 }}>
          {step === 0 ? <>
            <fieldset className="auth-avatar-choices"><legend>Tu avatar</legend><div>{Object.entries(PROFILE_AVATARS).map(([value, avatar]) => <motion.label key={value} className="auth-avatar-option" whileTap={reduced ? undefined : { scale: 0.97 }}>
              <input type="radio" required name="gender" value={value} checked={gender === value} onChange={() => setGender(value)} /><img src={avatar} alt="" /><span>{value === 'hombre' ? 'Hombre' : 'Mujer'}</span>
            </motion.label>)}</div></fieldset>
            <AuthField id="fullName" label="Nombre completo" icon={UserRound} required autoComplete="name" maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Tu nombre y apellido" />
            <AuthField id="churchName" label="Iglesia" icon={Church} required maxLength={160} value={churchName} onChange={event => setChurchName(event.target.value)} placeholder="Nombre de tu iglesia" />
          </> : <>
            <button type="button" className="auth-step-back" onClick={() => { setStep(0); setError(''); }} disabled={busy}><ArrowLeft size={16} />Volver a tu perfil</button>
            <AuthField id="email" label="Correo electrónico" icon={Mail} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" disabled={busy} />
            <AuthField id="password" label="Contraseña" icon={LockKeyhole} type="password" autoComplete="new-password" required minLength={6} hint="Mínimo 6 caracteres." value={password} onChange={event => setPassword(event.target.value)} placeholder="Crea una contraseña" disabled={busy} />
            <AuthField id="confirmPassword" label="Confirmar contraseña" icon={LockKeyhole} type="password" autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repite tu contraseña" disabled={busy} />
          </>}
          {error && <p role="alert" className="auth-error"><AlertCircle size={17} />{error}</p>}
          <motion.button type="submit" className="auth-submit" disabled={busy} whileTap={reduced ? undefined : { scale: 0.98 }}>{busy ? <><LoaderCircle size={19} className="animate-spin" />Creando cuenta...</> : <>{step === 0 ? 'Continuar' : 'Crear cuenta'}<ArrowRight size={18} /></>}</motion.button>
        </motion.form>
      </AnimatePresence>
    </>}
  </AuthLayout>;
}

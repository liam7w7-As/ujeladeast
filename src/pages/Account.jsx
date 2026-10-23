import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Church, LoaderCircle, RefreshCw, Save, UserRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authErrorMessage, authReturnPath } from '../lib/authMessages';
import { hasGoogleIdentity } from '../lib/googleAuth';
import AuthLayout from '../components/layout/AuthLayout';
import AuthField from '../components/ui/AuthField';
import AvatarPicker from '../components/ui/AvatarPicker';
import GoogleButton from '../components/ui/GoogleButton';
import ProfileAvatar from '../components/ui/ProfileAvatar';

export default function Account({ onboarding = false }) {
  const auth = useAuth();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try { await auth.refreshProfile(); } catch { /* Existing data must load before editing. */ }
    finally { setRetrying(false); }
  };
  if (!auth.loading && !auth.user) return <Navigate to="/login" replace state={{ from: '/cuenta' }} />;
  return <AuthLayout showGuest={false} title={onboarding ? 'Un último paso para conocerte' : 'Mi cuenta'} subtitle={onboarding ? 'Completa tu perfil y ya eres parte.' : 'Tu lugar en la comunidad.'}>
    {auth.loading ? <div role="status" className="auth-callback"><LoaderCircle className="animate-spin" />Cargando tu cuenta...</div>
      : auth.profileError || !auth.profile ? <section className="auth-callback"><p role="alert" className="auth-error"><AlertCircle size={18} />No pudimos cargar tu perfil. Reintenta con conexión; no se ha cambiado ningún dato.</p><button type="button" className="auth-submit" onClick={retry} disabled={retrying}><RefreshCw size={18} />Reintentar</button></section>
        : <AccountForm key={auth.user.id} auth={auth} onboarding={onboarding} returnPath={authReturnPath(location.state?.from)} />}
  </AuthLayout>;
}

function AccountForm({ auth, onboarding, returnPath }) {
  const { user, profile, saveProfile, linkGoogle } = auth;
  const location = useLocation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [churchName, setChurchName] = useState(profile.church_name || '');
  const [avatar, setAvatar] = useState(profile.avatar_url || '');
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState(() => location.state?.authError ? authErrorMessage({ code: location.state.authError }) : '');
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const dirty = fullName !== (profile.full_name || '') || churchName !== (profile.church_name || '') || avatar !== (profile.avatar_url || '');
  const submit = async event => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setSaved(false);
    try {
      const result = await saveProfile({ fullName, churchName, avatar });
      setFullName(result.full_name); setChurchName(result.church_name); setAvatar(result.avatar_url);
      if (onboarding) navigate(returnPath, { replace: true });
      else setSaved(true);
    } catch { setError('No pudimos guardar tu perfil. Tus cambios siguen aquí para reintentar.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const connect = async () => {
    if (lock.current) return;
    lock.current = true; setLinking(true); setLinkError('');
    try { await linkGoogle(); }
    catch (err) { setLinkError(authErrorMessage(err)); }
    finally { lock.current = false; setLinking(false); }
  };
  return <>
    <div className="account-summary"><ProfileAvatar profile={profile} className="h-14 w-14" /><div><strong>{profile.full_name || user.user_metadata?.full_name || 'Tu perfil'}</strong><span>{user.email}</span></div></div>
    <form className="auth-form" aria-label="Editar mi perfil" onSubmit={submit} onChange={() => setSaved(false)}>
      <fieldset className="auth-fields" disabled={busy || linking}>
        <AvatarPicker value={avatar} onChange={setAvatar} currentAvatar={profile.avatar_url} />
        <AuthField id="fullName" label="Nombre completo" icon={UserRound} required autoComplete="name" maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} />
        <AuthField id="churchName" label="Iglesia" icon={Church} required maxLength={160} value={churchName} onChange={event => setChurchName(event.target.value)} />
        {error && <p role="alert" className="auth-error"><AlertCircle size={18} />{error}</p>}
        <button type="submit" className="auth-submit" disabled={busy || (!onboarding && !dirty)}>{busy ? <LoaderCircle size={19} className="animate-spin" /> : onboarding ? <ArrowRight size={18} /> : <Save size={18} />}{busy ? 'Guardando...' : onboarding ? 'Entrar a la comunidad' : 'Guardar cambios'}</button>
        {saved && <p role="status" className="account-saved"><Check size={18} />Perfil actualizado</p>}
      </fieldset>
    </form>
    {!onboarding && <section className="account-access" aria-label="Acceso a tu cuenta"><h2>Acceso a tu cuenta</h2>
      {hasGoogleIdentity(user) ? <p className="account-saved"><Check size={18} />Google vinculado</p> : <>
        <p>Vincula tu cuenta desde aquí para conservar tus estudios y tu racha, aunque uses otro correo de Google.</p>
        {dirty && <p className="auth-hint">Guarda tus cambios antes de vincular Google.</p>}
        <GoogleButton label="Vincular Google" onClick={connect} busy={linking} disabled={busy || dirty} />
        {linkError && <p role="alert" className="auth-error account-link-error"><AlertCircle size={18} />{linkError}</p>}
      </>}
      <Link to="/feed" className="auth-guest">Volver a la comunidad<ArrowRight size={16} /></Link>
    </section>}
  </>;
}

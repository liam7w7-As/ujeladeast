import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/layout/AuthLayout';
import { clearGoogleAttempt, googleCallbackError, hasGoogleIdentity, needsGoogleProfile, readGoogleAttempt } from '../lib/googleAuth';

export default function AuthCallback() {
  const { user, profile, loading, profileError, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [callback] = useState(() => {
    let storage;
    try { storage = window.sessionStorage; } catch { /* Browser storage is optional. */ }
    return { attempt: readGoogleAttempt(storage), error: googleCallbackError(window.location.search, window.location.hash), storage };
  });
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (callback.error) {
      clearGoogleAttempt(callback.storage);
      navigate(callback.attempt?.userId ? '/cuenta' : '/login', { replace: true, state: { authError: callback.error, from: callback.attempt?.path } });
      return;
    }
    if (loading || !user || profileError) return;
    if (callback.attempt?.userId && (callback.attempt.userId !== user.id || !hasGoogleIdentity(user))) return;
    clearGoogleAttempt(callback.storage);
    const path = callback.attempt?.path || '/feed';
    navigate(needsGoogleProfile(user, profile) ? '/completar-perfil' : path, {
      replace: true, state: { from: path, googleLinked: !!callback.attempt?.userId },
    });
  }, [callback, user, profile, profileError, loading, navigate]);
  const failed = timedOut || profileError || (!loading && !user) || (!loading && callback.attempt?.userId && (callback.attempt.userId !== user?.id || !hasGoogleIdentity(user)));
  const retry = async () => {
    setRetrying(true);
    try { await refreshProfile(); } catch { /* Keep the recoverable error visible. */ }
    finally { setRetrying(false); }
  };
  return <AuthLayout showGuest={false} title={failed ? 'No pudimos completar el acceso' : 'Un momento, ya estás llegando'} subtitle="Tu cuenta de UJELADEA.">
    {failed ? <section className="auth-callback">
      <p role="alert" className="auth-error"><AlertCircle size={18} />{profileError ? 'No pudimos cargar tu perfil. Tus datos siguen guardados; vuelve a intentarlo.' : 'No se completó la conexión con Google. Vuelve a tu cuenta para intentarlo otra vez.'}</p>
      {profileError && user && <button type="button" className="auth-submit" onClick={retry} disabled={retrying}><RefreshCw size={18} />Reintentar</button>}
      <Link to={user ? '/cuenta' : '/login'} replace className="auth-guest">{user ? 'Volver a mi cuenta' : 'Volver a iniciar sesión'}<ArrowRight size={17} /></Link>
    </section> : <div role="status" className="auth-callback"><LoaderCircle size={28} className="animate-spin" />Comprobando tu cuenta...</div>}
  </AuthLayout>;
}

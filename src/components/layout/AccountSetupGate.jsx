import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { needsGoogleProfile } from '../../lib/googleAuth';
import { authReturnPath } from '../../lib/authMessages';

export default function AccountSetupGate({ children }) {
  const { user, profile, loading, profileError } = useAuth();
  const location = useLocation();
  const accountRoute = /^\/(auth|completar-perfil|cuenta|login|register|recuperar|privacidad)(\/|$)/.test(location.pathname);
  if (!accountRoute && !loading && !profileError && needsGoogleProfile(user, profile)) {
    return <Navigate to="/completar-perfil" replace state={{ from: authReturnPath(location.pathname + location.search + location.hash) }} />;
  }
  return children;
}

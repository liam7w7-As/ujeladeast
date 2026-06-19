import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#27272a] border-t-[#8f1937] rounded-full animate-spin"></div>
        <p className="text-[#a1a1aa] mt-4 font-body-md text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#27272a] border-t-[#8f1937] rounded-full animate-spin"></div>
        <p className="text-[#a1a1aa] mt-4 font-body-md text-sm">Verificando permisos...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">gpp_bad</span>
        <h1 className="text-3xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-on-surface-variant max-w-md mb-6">
          No tienes permisos de administrador para acceder a esta sección.
        </p>
        <a href="/" className="px-6 py-2 bg-primary-container text-white rounded-xl hover:bg-primary-container/80 transition-colors">
          Volver al Inicio
        </a>
      </div>
    );
  }

  return children;
}

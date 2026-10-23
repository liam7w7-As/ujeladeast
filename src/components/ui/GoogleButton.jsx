import { LoaderCircle } from 'lucide-react';

export default function GoogleButton({ onClick, disabled, busy, label = 'Continuar con Google' }) {
  return <button type="button" className="auth-google" onClick={onClick} disabled={disabled || busy}>
    {busy ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <img src="/icons/google.svg" alt="" width="20" height="20" />}
    <span>{busy ? 'Conectando con Google...' : label}</span>
  </button>;
}

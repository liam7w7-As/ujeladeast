import { Download, LoaderCircle } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import './pwa-install.css';

export default function InstallButton({ iconOnly = false, className = '', onSelect }) {
  const { status, install } = usePwaInstall();
  if (status === 'installed') return null;
  const waiting = status === 'pending' || status === 'prompting';
  const label = status === 'pending' ? 'Instalación en curso' : status === 'unconfirmed' ? 'Comprobar instalación' : 'Instalar UJELADEA';
  const Icon = waiting ? LoaderCircle : Download;
  return <button type="button" className={`pwa-install-entry ${iconOnly ? 'pwa-install-icon' : ''} ${className}`} title={label} aria-label={label} disabled={status === 'prompting'} onClick={() => { onSelect?.(); void install(); }}>
    <Icon size={20} aria-hidden="true" className={waiting ? 'pwa-install-spin' : undefined} />
    {!iconOnly && <span>{label}</span>}
  </button>;
}

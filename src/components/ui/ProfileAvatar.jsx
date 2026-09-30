import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { profileAvatar } from '../../lib/avatars';

export default function ProfileAvatar({ profile, metadata, className = 'h-11 w-11' }) {
  const src = profileAvatar(profile, metadata);
  const [failedSource, setFailedSource] = useState(null);
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#253a38] text-[#a8d5ca] ${className}`}>
    {src && src !== failedSource ? <img src={src} alt={`Avatar de ${profile?.full_name || metadata?.full_name || 'usuario'}`} className="h-full w-full object-cover" onError={() => setFailedSource(src)} />
      : <UserRound aria-label="Perfil sin avatar seleccionado" className="h-1/2 w-1/2" strokeWidth={1.7} />}
  </span>;
}

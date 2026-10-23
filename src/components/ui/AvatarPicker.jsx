import { Check, UserRound } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { AVATAR_CHOICES } from '../../lib/avatars';

export default function AvatarPicker({ value, onChange, disabled = false, currentAvatar }) {
  const reduced = useReducedMotion();
  const choices = currentAvatar && !AVATAR_CHOICES.some(item => item.src === currentAvatar)
    ? [{ id: currentAvatar, label: 'Avatar actual', src: currentAvatar }, ...AVATAR_CHOICES] : AVATAR_CHOICES;
  const selected = choices.find(avatar => avatar.src === value);
  return <fieldset className="auth-avatar-choices" disabled={disabled}>
    <legend>Tu avatar</legend>
    <div className="auth-avatar-preview" aria-live="polite">
      <div className="auth-avatar-portrait">{selected ? <motion.img key={selected.id} src={selected.src} alt="" width="60" height="60" initial={reduced ? false : { opacity: 0, scale: .82, rotate: -7 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }} /> : <UserRound size={28} aria-hidden="true" />}</div>
      <div><strong>{selected?.label || 'Tu perfil'}</strong><span>Somos uno en Cristo.</span></div>
    </div>
    <div className="auth-avatar-grid">{choices.map(avatar => <motion.label key={avatar.id} className="auth-avatar-option" title={avatar.label} whileHover={reduced ? undefined : { y: -2 }} whileTap={reduced ? undefined : { scale: .96 }}>
      <input type="radio" required name="avatar" value={avatar.src} checked={value === avatar.src} onChange={() => onChange(avatar.src)} aria-label={avatar.label} />
      <img src={avatar.src} alt="" width="64" height="64" />
      <Check className="auth-avatar-check" size={15} aria-hidden="true" />
    </motion.label>)}</div>
  </fieldset>;
}

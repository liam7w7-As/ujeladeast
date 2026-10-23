import { Check } from 'lucide-react';
import { AVATAR_CHOICES } from '../../lib/avatars';

export default function AvatarPicker({ value, onChange, disabled = false, currentAvatar }) {
  const choices = currentAvatar && !AVATAR_CHOICES.some(item => item.src === currentAvatar)
    ? [{ id: currentAvatar, label: 'Avatar actual', src: currentAvatar }, ...AVATAR_CHOICES] : AVATAR_CHOICES;
  return <fieldset className="auth-avatar-choices" disabled={disabled}>
    <legend>Tu avatar</legend>
    <div>{choices.map(avatar => <label key={avatar.id} className="auth-avatar-option" title={avatar.label}>
      <input type="radio" required name="avatar" value={avatar.src} checked={value === avatar.src} onChange={() => onChange(avatar.src)} aria-label={avatar.label} />
      <img src={avatar.src} alt="" width="64" height="64" />
      <Check className="auth-avatar-check" size={15} aria-hidden="true" />
    </label>)}</div>
  </fieldset>;
}

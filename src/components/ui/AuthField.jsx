import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthField({ id, label, icon: Icon, type = 'text', hint, ...props }) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap">
      {Icon && <Icon size={19} aria-hidden="true" />}
      <input id={id} name={id} type={password && visible ? 'text' : type} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {password && <button type="button" title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(value => !value)}><EyeIcon visible={visible} /></button>}
    </div>
    {hint && <p id={`${id}-hint`} className="auth-hint">{hint}</p>}
  </div>;
}

function EyeIcon({ visible }) { return visible ? <EyeOff size={19} /> : <Eye size={19} />; }

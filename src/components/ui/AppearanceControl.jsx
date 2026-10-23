import { useId } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance } from '../../hooks/useAppearance';

export function AppearanceToggle() {
  const { theme, setPreference } = useAppearance();
  const label = theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro';
  return <button type="button" className="appearance-toggle" title={label} aria-label={label} onClick={() => setPreference(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}</button>;
}

export function AppearanceSettings() {
  const { preference, setPreference } = useAppearance();
  const name = useId();
  return <fieldset className="appearance-settings"><legend>Apariencia</legend><div className="appearance-options">{[{ id: 'light', label: 'Claro', Icon: Sun }, { id: 'dark', label: 'Oscuro', Icon: Moon }, { id: 'system', label: 'Dispositivo', Icon: Monitor }].map(({ id, label, Icon }) => <label key={id}><input type="radio" name={name} value={id} checked={preference === id} onChange={() => setPreference(id)} /><Icon size={18} aria-hidden="true" /><span>{label}</span></label>)}</div></fieldset>;
}

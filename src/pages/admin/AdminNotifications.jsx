import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { collectPages } from '../../lib/studyTracking';

const input = 'mt-1 block w-full rounded-lg border border-surface-border bg-surface-container px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-50';
const destinations = [['', 'Sin enlace'], ['/feed', 'Comunidad'], ['/estudios', 'Estudios bíblicos'], ['/himnario', 'Himnario'], ['/sociedades', 'Sociedades'], ['/recursos', 'Recursos'], ['/chat', 'Chat']];
const errorMessage = error => ['PGRST202', '42883'].includes(error.code)
  ? 'El envío de avisos aún no está habilitado. Contacta al administrador del sistema.'
  : error.code === '42501' ? 'Tu cuenta no tiene permiso para enviar avisos.'
    : 'No se pudo confirmar el envío. Puedes reintentar el mismo aviso sin duplicarlo.';

export default function AdminNotifications() {
  const [profiles, setProfiles] = useState([]);
  const [profilesError, setProfilesError] = useState('');
  const [audience, setAudience] = useState('user');
  const [recipient, setRecipient] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState({ key: '', items: [], error: '' });
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const pending = useRef(null);
  const submitting = useRef(false);
  const key = `${page}:${reload}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await collectPages((from, to) => supabase.from('profiles').select('id,full_name,church_name').order('id').range(from, to));
        if (!cancelled) { setProfiles(data); setProfilesError(''); }
      } catch { if (!cancelled) setProfilesError('No se pudieron cargar los destinatarios.'); }
    }
    load();
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase.rpc('admin_notification_history').range(page * 10, page * 10 + 10);
      if (!cancelled) setHistory({ key, items: data || [], error: error ? errorMessage(error) : '' });
    }
    load().catch(() => { if (!cancelled) setHistory({ key, items: [], error: 'No se pudo cargar el historial de envíos.' }); });
    return () => { cancelled = true; };
  }, [page, reload, key]);

  const churches = [...new Set(profiles.map(profile => profile.church_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const recipients = profiles.filter(profile => audience === 'all' || (audience === 'user' ? profile.id === recipient : profile.church_name === recipient));
  const send = async event => {
    event.preventDefault();
    if (submitting.current || !recipients.length || !title.trim() || !message.trim()) return;
    const payload = { p_title: title.trim(), p_message: message.trim(), p_user_id: audience === 'user' ? recipient : null,
      p_church_name: audience === 'church' ? recipient : null, p_action_url: actionUrl || null };
    const signature = JSON.stringify(payload);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    submitting.current = true;
    setSending(true); setError(''); setSuccess('');
    try {
      const { data, error } = await supabase.rpc('admin_send_notification', { ...payload, p_request_id: pending.current.id });
      if (error) throw error;
      if (!data || !Number.isInteger(data.recipient_count) || data.recipient_count < 1) throw new Error('Invalid response');
      setSuccess(`Aviso enviado a ${data.recipient_count} ${data.recipient_count === 1 ? 'destinatario' : 'destinatarios'}.`);
      pending.current = null;
      setTitle(''); setMessage(''); setActionUrl(''); setPage(0); setReload(value => value + 1);
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (err) { setError(errorMessage(err)); }
    finally { submitting.current = false; setSending(false); }
  };

  return <div className="space-y-7 min-w-0">
    <header className="flex justify-between items-start gap-3"><h1 className="text-2xl font-bold">Notificaciones</h1><button type="button" onClick={() => setReload(value => value + 1)} disabled={sending} aria-label="Actualizar avisos" title="Actualizar avisos" className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40"><RefreshCw size={18} /></button></header>
    <form onSubmit={send} className="space-y-4 max-w-3xl">
      <h2 className="font-semibold">Nuevo aviso</h2>
      <fieldset disabled={sending} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm text-on-surface-variant">Destinatarios<select className={input} value={audience} onChange={event => { setAudience(event.target.value); setRecipient(''); setSuccess(''); }}><option value="user">Un joven</option><option value="church">Una iglesia</option><option value="all">Todos los usuarios</option></select></label>
          {audience !== 'all' && <label className="text-sm text-on-surface-variant">{audience === 'user' ? 'Joven' : 'Iglesia'}<select required className={input} value={recipient} onChange={event => setRecipient(event.target.value)}><option value="">Seleccionar...</option>{audience === 'user' ? [...profiles].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'es')).map(profile => <option key={profile.id} value={profile.id}>{profile.full_name || 'Sin nombre'}{profile.church_name ? ` · ${profile.church_name}` : ''}</option>) : churches.map(church => <option key={church}>{church}</option>)}</select></label>}
        </div>
        {profilesError && <p role="alert" className="text-sm text-red-300">{profilesError}</p>}
        <label className="block text-sm text-on-surface-variant">Título<input required maxLength={120} className={input} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label className="block text-sm text-on-surface-variant">Mensaje<textarea required maxLength={2000} rows={5} className={`${input} resize-y`} value={message} onChange={event => setMessage(event.target.value)} /></label>
        <label className="block text-sm text-on-surface-variant">Destino al abrir<select className={input} value={actionUrl} onChange={event => setActionUrl(event.target.value)}>{destinations.map(([path, label]) => <option key={path} value={path}>{label}</option>)}</select></label>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2"><span className="text-xs text-on-surface-variant">{recipients.length} destinatarios seleccionados</span><button type="submit" disabled={sending || !!profilesError || !recipients.length || !title.trim() || !message.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-container text-white px-4 py-2.5 text-sm font-medium disabled:opacity-40"><Send size={16} />{sending ? 'Enviando...' : 'Enviar aviso'}</button></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-300">{success}</p>}
    </form>
    <section className="border-t border-surface-border pt-6 space-y-4">
      <h2 className="font-semibold">Avisos enviados</h2>
      {history.key !== key ? <p role="status" className="text-sm text-on-surface-variant">Cargando envíos...</p>
        : history.error ? <p role="alert" className="text-sm text-red-300">{history.error}</p>
          : !history.items.length ? <p className="text-sm text-on-surface-variant">No hay envíos registrados en esta página.</p>
            : <ul className="divide-y divide-surface-border">{history.items.slice(0, 10).map(item => <li key={item.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium break-words min-w-0">{item.title}</h3><time className="text-xs text-on-surface-variant">{new Date(item.created_at).toLocaleString('es-BO')}</time></div><p className="mt-2 text-sm text-on-surface-variant whitespace-pre-wrap break-words">{item.message}</p><p className="mt-2 text-xs text-on-surface-variant break-words">{item.audience_label} · {item.recipient_count} destinatarios</p></li>)}</ul>}
      <div className="flex justify-end gap-2"><button type="button" aria-label="Envíos anteriores" disabled={!page} onClick={() => setPage(value => value - 1)} className="p-2 rounded-lg border border-surface-border disabled:opacity-40"><ChevronLeft size={18} /></button><button type="button" aria-label="Más envíos" disabled={history.key !== key || history.items.length <= 10} onClick={() => setPage(value => value + 1)} className="p-2 rounded-lg border border-surface-border disabled:opacity-40"><ChevronRight size={18} /></button></div>
    </section>
  </div>;
}

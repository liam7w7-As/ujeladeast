import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import ContentIcon from '../components/ui/ContentIcon';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import ujeladitoAvatar from '../assets/ujeladito-avatar.png';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const RISK_WORDS = [
  'suicidio', 'suicidarme', 'quitarme la vida', 'quiero morir', 'no quiero vivir',
  'hacerme dano', 'autolesion', 'cortarme', 'lastimarme', 'desaparecer para siempre',
  'mejor estaria muerto', 'mejor sin mi', 'no vale la pena seguir'
];

function detectRisk(text) {
  return RISK_WORDS.some(w => text.toLowerCase().includes(w));
}

const CTX_ICONS = { general: 'chat_bubble', sos: 'volunteer_activism', estudio: 'menu_book', consejeria: 'psychology' };
const CTX_LABELS = { general: 'General', sos: 'Apoyo', estudio: 'Estudio bíblico', consejeria: 'Consejería' };

function MessageBubble({ message }) {
  const isBot = message.role === 'assistant';
  return (
    <div className={`flex items-end gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <img src={ujeladitoAvatar} alt="UJELADITO"
          className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-ink/10 shadow-sm" />
      )}
      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
        isBot
          ? 'bg-surface border border-ink/8 text-on-surface rounded-bl-sm'
          : 'bg-gradient-to-br from-[#8f1937] to-[#7a1530] text-on-brand rounded-br-sm'
      }`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isBot ? 'text-muted' : 'text-on-brand/80'}`}>
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <img src={ujeladitoAvatar} alt="UJELADITO"
        className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-ink/10" />
      <div className="bg-surface border border-ink/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-ink/40 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink/40 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink/40 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function Chat() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const {
    sessions, currentSession, messages, loading, sending, error,
    getSessions, createSession, switchSession, sendMessage, deleteSession, setError
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [showRiskBanner, setShowRiskBanner] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    getSessions();
  }, [user]);

  // Auto-scroll — solo dentro del contenedor de mensajes, nunca la página entera
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  const handleNewChat = async () => {
    await createSession('general');
    await getSessions();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;
    setInputValue('');
    if (detectRisk(text)) setShowRiskBanner(true);
    await sendMessage(text, currentSession?.context_type || 'general', '');
    getSessions();
  };

  // Fix: preventDefault evita que Enter haga scroll de página
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    await deleteSession(deleteConfirm.id);
    await getSessions();
    setDeleteConfirm(null);
  };

  return (
    <PageShell activeItem="chat" withFooter={false}>
      {/*
        Layout: página = 100dvh, sin overflow de página.
        El contenido es un flex row centrado con ancho máximo.
      */}
      <div
        className="chat-page-frame fixed inset-0 top-0 flex flex-col bg-background"
        style={{ paddingTop: '72px' }}  /* altura navbar */
      >
        <div className="flex-1 flex min-h-0 max-w-[1100px] mx-auto w-full">

          {/* ── Sidebar ── */}
          <aside className="w-64 shrink-0 flex-col border-r border-ink/6 bg-background hidden md:flex">
            {/* Header sidebar */}
            <div className="p-4 border-b border-ink/6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <img src={ujeladitoAvatar} alt="UJELADITO"
                  className="w-7 h-7 rounded-full object-cover border border-[#8f1937]/40" />
                <span className="font-bold text-on-surface text-sm tracking-tight">UJELADITO</span>
              </div>
              <button
                onClick={handleNewChat}
                className="w-7 h-7 rounded-lg bg-[#8f1937]/15 hover:bg-[#8f1937]/30 border border-[#8f1937]/25 flex items-center justify-center text-primary transition-colors"
                title="Nueva conversación"
              >
                <ContentIcon name="edit_note" className="text-[16px]" />
              </button>
            </div>

            {/* Lista de sesiones */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {loading && sessions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border border-ink/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <p className="text-muted text-xs">Sin conversaciones aún</p>
                  <button onClick={handleNewChat} className="mt-2 text-primary text-xs hover:underline">
                    Iniciar una →
                  </button>
                </div>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-start gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all mb-0.5 ${
                      currentSession?.id === session.id
                        ? 'bg-[#8f1937]/12 border border-[#8f1937]/25 text-on-surface'
                        : 'hover:bg-ink/4 border border-transparent text-muted hover:text-on-surface'
                    }`}
                    onClick={() => switchSession(session)}
                  >
                    <ContentIcon name={CTX_ICONS[session.context_type] || 'chat_bubble'} className="text-[14px] shrink-0 mt-0.5 opacity-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{session.title}</p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(session); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-red-400/50 hover:text-red-400 transition-all shrink-0"
                    >
                      <ContentIcon name="delete" className="text-[13px]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ── Área de chat ── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">

            {!currentSession ? (
              /* Estado vacío — pantalla de bienvenida */
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                <img src="/images/ui/chat-welcome-v1.webp" alt="" width="120" height="120" className="h-28 w-28 object-contain" />
                <div className="text-center max-w-sm">
                  <h2 className="text-xl font-bold text-on-surface mb-1.5">
                    ¡Hola{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!
                  </h2>
                  <p className="text-muted text-sm leading-relaxed">
                    Soy UJELADITO, tu asistente espiritual de UJELADEA. ¿Sobre qué quieres conversar hoy?
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                  {[
                    { icon: 'menu_book', label: 'Estudio bíblico', ctx: 'estudio' },
                    { icon: 'volunteer_activism', label: 'Apoyo SOS', ctx: 'sos' },
                    { icon: 'psychology', label: 'Consejería', ctx: 'consejeria' },
                    { icon: 'chat_bubble', label: 'Conversación', ctx: 'general' },
                  ].map(item => (
                    <button
                      key={item.ctx}
                      onClick={() => createSession(item.ctx).then(() => getSessions())}
                      className="flex items-center gap-2 p-3 bg-surface border border-ink/8 rounded-xl text-muted hover:text-on-surface hover:border-ink/15 hover:bg-ink/5 transition-all text-xs font-medium"
                    >
                      <ContentIcon name={item.icon} className="text-[16px] text-primary" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Header del chat */}
                <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-ink/6 bg-background">
                  <img src={ujeladitoAvatar} alt="UJELADITO"
                    className="w-8 h-8 rounded-full object-cover border border-ink/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface font-semibold text-sm truncate">{currentSession.title}</p>
                    <p className="text-muted text-xs flex items-center gap-1.5">
                      <ContentIcon name={CTX_ICONS[currentSession.context_type] || 'chat_bubble'} className="text-[11px]" />
                      {sending ? 'escribiendo...' : CTX_LABELS[currentSession.context_type] || 'General'}
                    </p>
                  </div>
                </div>

                {/* Banner riesgo */}
                {showRiskBanner && (
                  <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-start gap-3">
                    <ContentIcon name="warning" className="text-amber-400 shrink-0 text-[18px]" />
                    <div className="flex-1">
                      <p className="text-amber-300 text-xs font-semibold">¿Necesitas ayuda urgente?</p>
                      <p className="text-amber-200/60 text-xs mt-0.5">
                        Habla con tu líder de sociedad, pastor o un adulto de confianza. No estás solo/a.
                      </p>
                    </div>
                    <button onClick={() => setShowRiskBanner(false)} className="text-amber-400/40 hover:text-amber-400 shrink-0">
                      <ContentIcon name="close" className="text-[15px]" />
                    </button>
                  </div>
                )}

                {/* Mensajes — overflow solo aquí */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 min-h-0">
                  {loading ? (
                    <div className="flex items-center justify-center flex-1">
                      <div className="w-5 h-5 border border-ink/15 border-t-white/50 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center flex-1">
                      <p className="text-muted text-sm">Escribe tu primer mensaje para comenzar</p>
                    </div>
                  ) : (
                    messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
                  )}
                  {sending && <TypingIndicator />}
                  {error && (
                    <div className="text-center">
                      <p className="text-red-400/80 text-xs bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-2 inline-block">
                        {error}
                      </p>
                      <br />
                      <button onClick={() => setError(null)} className="text-[10px] text-muted mt-1 hover:text-muted">
                        Cerrar
                      </button>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input — fijo al fondo del contenedor */}
                <div className="shrink-0 px-5 py-4 border-t border-ink/6 bg-background">
                  <div className="flex items-end gap-2 bg-surface border border-ink/10 rounded-2xl px-4 py-3 focus-within:border-[#8f1937]/40 transition-colors">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={e => {
                        setInputValue(e.target.value);
                        // Auto-resize
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribe tu mensaje..."
                      disabled={sending}
                      className="flex-1 bg-transparent text-on-surface text-sm placeholder:text-muted resize-none outline-none leading-relaxed disabled:opacity-50 overflow-hidden"
                      style={{ minHeight: '22px', maxHeight: '96px', height: '22px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !inputValue.trim()}
                      className="w-8 h-8 rounded-xl bg-[#8f1937] flex items-center justify-center disabled:opacity-35 hover:bg-[#a61c3f] transition-colors shrink-0"
                    >
                      {sending ? (
                        <span className="w-3.5 h-3.5 border border-white/25 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ContentIcon name="send" className="text-on-brand text-[18px]" />
                      )}
                    </button>
                  </div>
                  <p className="text-center text-muted text-[10px] mt-2">
                    Enter para enviar &nbsp;·&nbsp; Shift+Enter nueva línea
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal eliminar sesión */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 bg-background border border-ink/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <ContentIcon name="delete_forever" className="text-3xl text-red-400 block mb-3" />
            <h3 className="font-bold text-on-surface text-base mb-1.5">¿Eliminar conversación?</h3>
            <p className="text-muted text-sm mb-5">
              Se eliminará <strong className="text-muted">"{deleteConfirm.title}"</strong> y todos sus mensajes.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl border border-ink/10 text-muted hover:text-on-surface text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/25 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

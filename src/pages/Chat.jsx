import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
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
          className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-white/10 shadow-sm" />
      )}
      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
        isBot
          ? 'bg-[#18181c] border border-white/8 text-white/90 rounded-bl-sm'
          : 'bg-gradient-to-br from-[#8f1937] to-[#7a1530] text-white rounded-br-sm'
      }`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isBot ? 'text-white/20' : 'text-white/35'}`}>
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
        className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-white/10" />
      <div className="bg-[#18181c] border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
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
        className="fixed inset-0 top-0 flex flex-col bg-[#09090b]"
        style={{ paddingTop: '72px' }}  /* altura navbar */
      >
        <div className="flex-1 flex min-h-0 max-w-[1100px] mx-auto w-full">

          {/* ── Sidebar ── */}
          <aside className="w-64 shrink-0 flex-col border-r border-white/6 bg-[#0a0a0d] hidden md:flex">
            {/* Header sidebar */}
            <div className="p-4 border-b border-white/6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <img src={ujeladitoAvatar} alt="UJELADITO"
                  className="w-7 h-7 rounded-full object-cover border border-[#8f1937]/40" />
                <span className="font-bold text-white/90 text-sm tracking-tight">UJELADITO</span>
              </div>
              <button
                onClick={handleNewChat}
                className="w-7 h-7 rounded-lg bg-[#8f1937]/15 hover:bg-[#8f1937]/30 border border-[#8f1937]/25 flex items-center justify-center text-[#8f1937] transition-colors"
                title="Nueva conversación"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
              </button>
            </div>

            {/* Lista de sesiones */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {loading && sessions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <p className="text-white/25 text-xs">Sin conversaciones aún</p>
                  <button onClick={handleNewChat} className="mt-2 text-[#8f1937] text-xs hover:underline">
                    Iniciar una →
                  </button>
                </div>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-start gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all mb-0.5 ${
                      currentSession?.id === session.id
                        ? 'bg-[#8f1937]/12 border border-[#8f1937]/25 text-white'
                        : 'hover:bg-white/4 border border-transparent text-white/60 hover:text-white/80'
                    }`}
                    onClick={() => switchSession(session)}
                  >
                    <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5 opacity-50">
                      {CTX_ICONS[session.context_type] || 'chat_bubble'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{session.title}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">
                        {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(session); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-red-400/50 hover:text-red-400 transition-all shrink-0"
                    >
                      <span className="material-symbols-outlined text-[13px]">delete</span>
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
                <div className="relative">
                  <img src={ujeladitoAvatar} alt="UJELADITO"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#8f1937]/50 shadow-[0_0_40px_rgba(143,25,55,0.25)]" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#09090b]" />
                </div>
                <div className="text-center max-w-sm">
                  <h2 className="text-xl font-bold text-white mb-1.5">
                    ¡Hola{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!
                  </h2>
                  <p className="text-white/40 text-sm leading-relaxed">
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
                      className="flex items-center gap-2 p-3 bg-[#18181c] border border-white/8 rounded-xl text-white/50 hover:text-white hover:border-white/15 hover:bg-white/5 transition-all text-xs font-medium"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#8f1937]">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Header del chat */}
                <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/6 bg-[#0a0a0d]">
                  <img src={ujeladitoAvatar} alt="UJELADITO"
                    className="w-8 h-8 rounded-full object-cover border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 font-semibold text-sm truncate">{currentSession.title}</p>
                    <p className="text-white/35 text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[11px]">
                        {CTX_ICONS[currentSession.context_type] || 'chat_bubble'}
                      </span>
                      {sending ? 'escribiendo...' : CTX_LABELS[currentSession.context_type] || 'General'}
                    </p>
                  </div>
                </div>

                {/* Banner riesgo */}
                {showRiskBanner && (
                  <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-400 shrink-0 text-[18px]">warning</span>
                    <div className="flex-1">
                      <p className="text-amber-300 text-xs font-semibold">¿Necesitas ayuda urgente?</p>
                      <p className="text-amber-200/60 text-xs mt-0.5">
                        Habla con tu líder de sociedad, pastor o un adulto de confianza. No estás solo/a.
                      </p>
                    </div>
                    <button onClick={() => setShowRiskBanner(false)} className="text-amber-400/40 hover:text-amber-400 shrink-0">
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  </div>
                )}

                {/* Mensajes — overflow solo aquí */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 min-h-0">
                  {loading ? (
                    <div className="flex items-center justify-center flex-1">
                      <div className="w-5 h-5 border border-white/15 border-t-white/50 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center flex-1">
                      <p className="text-white/25 text-sm">Escribe tu primer mensaje para comenzar</p>
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
                      <button onClick={() => setError(null)} className="text-[10px] text-white/25 mt-1 hover:text-white/50">
                        Cerrar
                      </button>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input — fijo al fondo del contenedor */}
                <div className="shrink-0 px-5 py-4 border-t border-white/6 bg-[#0a0a0d]">
                  <div className="flex items-end gap-2 bg-[#18181c] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#8f1937]/40 transition-colors">
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
                      className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 resize-none outline-none leading-relaxed disabled:opacity-50 overflow-hidden"
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
                        <span className="material-symbols-outlined text-white text-[18px]">send</span>
                      )}
                    </button>
                  </div>
                  <p className="text-center text-white/15 text-[10px] mt-2">
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
          <div className="relative z-10 bg-[#0e0e12] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <span className="material-symbols-outlined text-3xl text-red-400 block mb-3">delete_forever</span>
            <h3 className="font-bold text-white text-base mb-1.5">¿Eliminar conversación?</h3>
            <p className="text-white/45 text-sm mb-5">
              Se eliminará <strong className="text-white/65">"{deleteConfirm.title}"</strong> y todos sus mensajes.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors"
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

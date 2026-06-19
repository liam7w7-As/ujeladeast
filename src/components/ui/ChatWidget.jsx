import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import ujeladitoAvatar from '../../assets/ujeladito-avatar.png';

// Palabras de riesgo para detección en modo SOS
const RISK_WORDS = [
  'suicidio', 'suicidarme', 'quitarme la vida', 'quiero morir', 'no quiero vivir',
  'hacerme daño', 'autolesión', 'cortarme', 'lastimarme', 'desaparecer para siempre',
  'mejor estaría muerto', 'mejor sin mí', 'no vale la pena seguir'
];

function detectRisk(text) {
  const lower = text.toLowerCase();
  return RISK_WORDS.some(word => lower.includes(word));
}

function MessageBubble({ message, isBot }) {
  return (
    <div className={`flex items-end gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <img
          src={ujeladitoAvatar}
          alt="UJELADITO"
          className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-white/10"
        />
      )}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isBot
            ? 'bg-[#1a1a1f] border border-white/8 text-white/90 rounded-bl-sm'
            : 'bg-[#8f1937] text-white rounded-br-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <img
        src={ujeladitoAvatar}
        alt="UJELADITO"
        className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-white/10"
      />
      <div className="bg-[#1a1a1f] border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
        <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function ChatWidget({ contextType: externalContextType, extraContext }) {
  const { user, profile } = useAuth();
  const { messages, sending, error, createSession, sendMessage, currentSession, setError } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showRiskBanner, setShowRiskBanner] = useState(false);
  const [activeContextType, setActiveContextType] = useState('general');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll al último mensaje
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, isOpen]);

  // Cuando se abre, inicializar sesión si no hay una
  useEffect(() => {
    if (isOpen && user && !initialized) {
      const ctx = externalContextType || 'general';
      setActiveContextType(ctx);
      createSession(ctx);
      setInitialized(true);
    }
  }, [isOpen, user, initialized, externalContextType, createSession]);

  // Si cambia el contexto externo (desde BibleStudy), reiniciar
  useEffect(() => {
    if (externalContextType && externalContextType !== activeContextType) {
      setActiveContextType(externalContextType);
      setInitialized(false);
    }
  }, [externalContextType]);

  // Escuchar evento global desde BibleStudy (botón "Preguntar a UJELADITO")
  useEffect(() => {
    const handler = (e) => {
      const { contextType: ct, extraContext: ec } = e.detail || {};
      if (ct) setActiveContextType(ct);
      setIsOpen(true);
      if (!initialized && user) {
        createSession(ct || 'estudio');
        setInitialized(true);
      }
    };
    window.addEventListener('ujeladito:open', handler);
    return () => window.removeEventListener('ujeladito:open', handler);
  }, [initialized, user, createSession]);

  // Foco al input al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending || !user) return;

    setInputValue('');
    if (detectRisk(text)) {
      setShowRiskBanner(true);
    }
    await sendMessage(text, activeContextType, extraContext || '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Botón flotante ── */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-[0_4px_24px_rgba(143,25,55,0.45)] transition-all duration-300 overflow-hidden border-2 border-[#8f1937]/60 hover:scale-110 hover:shadow-[0_4px_32px_rgba(143,25,55,0.65)] ${isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100'}`}
        title="Hablar con UJELADITO"
        aria-label="Abrir chatbot UJELADITO"
      >
        <img src={ujeladitoAvatar} alt="UJELADITO" className="w-full h-full object-cover" />
      </button>

      {/* ── Panel del widget ── */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[360px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0e0e12] transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{ height: '520px' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#8f1937] shrink-0">
          <img src={ujeladitoAvatar} alt="UJELADITO" className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">UJELADITO</p>
            <p className="text-white/70 text-xs">
              {sending ? '✦ escribiendo...' : 'Asistente espiritual de UJELADEA'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/chat"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white/80"
              title="Abrir chat completo"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_full</span>
            </Link>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white/80"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Banner de riesgo */}
        {showRiskBanner && (
          <div className="shrink-0 bg-amber-500/20 border-b border-amber-500/30 px-4 py-3 flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-400 text-[20px] shrink-0 mt-0.5">warning</span>
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 text-xs font-semibold">¿Estás en una situación difícil?</p>
              <p className="text-amber-200/80 text-xs mt-0.5">Si necesitas ayuda urgente, por favor habla con tu líder de sociedad o un adulto de confianza. No estás solo/a.</p>
            </div>
            <button onClick={() => setShowRiskBanner(false)} className="text-amber-400/60 hover:text-amber-400 shrink-0">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Cuerpo */}
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <img src={ujeladitoAvatar} alt="UJELADITO" className="w-16 h-16 rounded-full object-cover opacity-70" />
            <div>
              <p className="text-white font-semibold mb-1">¡Hola! Soy UJELADITO 👋</p>
              <p className="text-white/50 text-sm">Inicia sesión para poder acompañarte espiritualmente.</p>
            </div>
            <Link
              to="/login"
              className="px-5 py-2 bg-[#8f1937] text-white rounded-xl text-sm font-medium hover:bg-[#a61c3f] transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && !sending && (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                  <img src={ujeladitoAvatar} alt="UJELADITO" className="w-12 h-12 rounded-full object-cover" />
                  <p className="text-white/50 text-sm text-center">
                    ¡Hola{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}! ¿En qué puedo ayudarte hoy?
                  </p>
                </div>
              )}
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} isBot={msg.role === 'assistant'} />
              ))}
              {sending && <TypingIndicator />}
              {error && (
                <div className="text-center">
                  <p className="text-red-400/80 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
                  <button onClick={() => setError(null)} className="text-xs text-white/40 mt-1 hover:text-white/60">Cerrar</button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-white/8 p-3 bg-[#0e0e12]">
              <div className="flex items-end gap-2 bg-[#1a1a1f] border border-white/10 rounded-xl px-3 py-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje..."
                  rows={1}
                  disabled={sending}
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none outline-none max-h-24 leading-relaxed disabled:opacity-50"
                  style={{ minHeight: '24px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !inputValue.trim()}
                  className="w-8 h-8 rounded-lg bg-[#8f1937] flex items-center justify-center disabled:opacity-40 hover:bg-[#a61c3f] transition-colors shrink-0"
                >
                  {sending ? (
                    <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-white text-[18px]">send</span>
                  )}
                </button>
              </div>
              <p className="text-center text-white/20 text-[10px] mt-1.5">Enter para enviar · Shift+Enter nueva línea</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

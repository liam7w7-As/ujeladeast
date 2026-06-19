import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { sendToOpenRouter } from '../lib/openrouter';
import { useAuth } from './useAuth';

export function useChat() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // ──────────────────────────────────────────
  // Crear nueva sesión de chat
  // ──────────────────────────────────────────
  const createSession = useCallback(async (contextType = 'general', title = null) => {
    if (!user) return null;
    try {
      setLoading(true);
      const sessionTitle = title || (
        contextType === 'sos' ? 'Apoyo espiritual' :
        contextType === 'estudio' ? 'Estudio bíblico' :
        contextType === 'consejeria' ? 'Consejería' :
        'Nueva conversación'
      );

      const { data, error: err } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: sessionTitle,
          context_type: contextType,
        })
        .select()
        .single();

      if (err) throw err;
      setCurrentSession(data);
      setMessages([]);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ──────────────────────────────────────────
  // Listar sesiones del usuario
  // ──────────────────────────────────────────
  const getSessions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (err) throw err;
      setSessions(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ──────────────────────────────────────────
  // Obtener mensajes de una sesión
  // ──────────────────────────────────────────
  const getMessages = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (err) throw err;
      setMessages(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ──────────────────────────────────────────
  // Cambiar sesión activa
  // ──────────────────────────────────────────
  const switchSession = useCallback(async (session) => {
    setCurrentSession(session);
    await getMessages(session.id);
  }, [getMessages]);

  // ──────────────────────────────────────────
  // Enviar mensaje — el núcleo del chatbot
  // ──────────────────────────────────────────
  const sendMessage = useCallback(async (content, contextType = 'general', extraContext = '') => {
    if (!user || !content.trim()) return;

    setError(null);
    setSending(true);

    // Si no hay sesión activa, crear una
    let activeSession = currentSession;
    if (!activeSession) {
      activeSession = await createSession(contextType);
      if (!activeSession) {
        setSending(false);
        return;
      }
    }

    const sessionId = activeSession.id;

    // Mensaje del usuario para estado local (optimistic)
    const userMsg = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 1. Guardar mensaje del usuario en Supabase
      const { data: savedUserMsg, error: userErr } = await supabase
        .from('chat_messages')
        .insert({ session_id: sessionId, role: 'user', content: content.trim() })
        .select()
        .single();

      if (userErr) throw userErr;

      // Reemplazar mensaje temporal con el guardado
      setMessages(prev =>
        prev.map(m => m.id === userMsg.id ? savedUserMsg : m)
      );

      // 2. Preparar historial para OpenRouter (últimos mensajes)
      const historyForAI = [
        ...messages.filter(m => !m.id.toString().startsWith('temp-')),
        savedUserMsg
      ].map(m => ({ role: m.role, content: m.content }));

      // 3. Llamar a OpenRouter
      const userName = profile?.full_name?.split(' ')[0] || '';
      const aiResponse = await sendToOpenRouter(
        historyForAI,
        contextType,
        extraContext,
        userName
      );

      // 4. Guardar respuesta del asistente
      const { data: assistantMsg, error: assistantErr } = await supabase
        .from('chat_messages')
        .insert({ session_id: sessionId, role: 'assistant', content: aiResponse })
        .select()
        .single();

      if (assistantErr) throw assistantErr;
      setMessages(prev => [...prev, assistantMsg]);

      // 5. Actualizar updated_at de la sesión
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      // 6. Actualizar título automático si es el primer mensaje
      if (messages.length === 0) {
        const autoTitle = content.trim().slice(0, 40) + (content.length > 40 ? '...' : '');
        await supabase
          .from('chat_sessions')
          .update({ title: autoTitle })
          .eq('id', sessionId);
        setCurrentSession(prev => ({ ...prev, title: autoTitle }));
      }

    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar tu mensaje. Inténtalo de nuevo.');
      // Remover mensaje temporal si hubo error
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  }, [user, currentSession, messages, profile, createSession]);

  // ──────────────────────────────────────────
  // Eliminar sesión
  // ──────────────────────────────────────────
  const deleteSession = useCallback(async (sessionId) => {
    try {
      const { error: err } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (err) throw err;
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [currentSession]);

  return {
    sessions,
    currentSession,
    messages,
    loading,
    sending,
    error,
    createSession,
    getSessions,
    getMessages,
    switchSession,
    sendMessage,
    deleteSession,
    setCurrentSession,
    setMessages,
    setError,
  };
}

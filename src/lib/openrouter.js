import { UJELADITO_SYSTEM_PROMPT, getContextAddition } from './ujeladitoPrompt';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Modelo gratuito confirmado en OpenRouter — llama 3.3 70B, excelente en español
const MODEL = 'openai/gpt-oss-120b:free';

/**
 * Envía una conversación a OpenRouter y retorna la respuesta de UJELADITO.
 * @param {Array} messages - Historial [{role, content}]
 * @param {string} contextType - 'general' | 'sos' | 'estudio' | 'consejeria'
 * @param {string} extraContext - Contexto adicional (ej: contenido de lección)
 * @param {string} userName - Nombre del usuario para personalizar
 * @returns {Promise<string>} - Texto de respuesta del asistente
 */
export async function sendToOpenRouter(messages, contextType = 'general', extraContext = '', userName = '') {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || apiKey === 'tu_key_aqui') {
    throw new Error('API key de OpenRouter no configurada. Agrega VITE_OPENROUTER_API_KEY en tu .env');
  }

  // Construir system prompt completo
  let systemContent = UJELADITO_SYSTEM_PROMPT;
  if (userName) {
    systemContent += `\nEl nombre del usuario es: ${userName}. Úsalo con naturalidad en la conversación.`;
  }
  const contextAddition = getContextAddition(contextType, extraContext);
  if (contextAddition) {
    systemContent += contextAddition;
  }

  // Limitar historial a últimos 12 mensajes para no gastar contexto
  const limitedHistory = messages.slice(-12);

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemContent },
      ...limitedHistory,
    ],
    temperature: 0.7,
    max_tokens: 600,
  };

  let response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'UJELADEA',
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    // Error de red real (sin conexión, DNS, CORS, etc.)
    throw new Error(`Error de red al contactar OpenRouter: ${networkErr.message}`);
  }

  // La petición llegó al servidor — verificar status HTTP
  if (!response.ok) {
    let errorBody = {};
    try { errorBody = await response.json(); } catch (_) { }
    const msg = errorBody?.error?.message || String(errorBody?.error || '') || `HTTP ${response.status}`;

    if (response.status === 401) {
      throw new Error('API key inválida o expirada. Verifica VITE_OPENROUTER_API_KEY.');
    }
    if (response.status === 429) {
      throw new Error('Límite de solicitudes alcanzado. Espera un momento e intenta de nuevo.');
    }
    if (response.status === 400) {
      throw new Error(`Solicitud inválida: ${msg}`);
    }
    if (response.status >= 500) {
      throw new Error('El servidor de IA no está disponible. Inténtalo en unos minutos.');
    }
    throw new Error(`Error de OpenRouter (${response.status}): ${msg}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('La respuesta del asistente llegó vacía. Inténtalo de nuevo.');
  }

  return content.trim();
}

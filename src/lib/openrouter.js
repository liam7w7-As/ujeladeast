import { UJELADITO_SYSTEM_PROMPT, getContextAddition } from './ujeladitoPrompt';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const APP_URL = 'https://ujeladeast.vercel.app';

// Modelos gratuitos activos en OpenRouter con fallback automático en cascada
const FREE_MODELS = [
  'liquid/lfm-2.5-2.6b:free',
  'dots-studio/dots-3-note-preview:free',
  'inclusionai/ling-3.0-flash-sante:free',
  'poolside/laguna-s-2.1:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

/**
 * Limpia el texto de respuesta quitando etiquetas de razonamiento o pensando interno.
 * @param {string} text
 * @returns {string}
 */
function cleanResponseText(text) {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

/**
 * Envía una conversación a OpenRouter y retorna la respuesta de UJELADITO.
 * Implementa rotación y reintento automático entre modelos gratuitos disponibles.
 * 
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

  // Limitar historial a últimos 12 mensajes para no sobrecargar contexto
  const limitedHistory = messages.slice(-12);

  const requestMessages = [
    { role: 'system', content: systemContent },
    ...limitedHistory,
  ];

  let lastErrorMsg = '';

  // Intentar con cada modelo en cascada
  for (const model of FREE_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': APP_URL,
          'X-Title': 'UJELADEA',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: requestMessages,
          temperature: 0.7,
          max_tokens: 650,
        }),
      });

      clearTimeout(timeoutId);

      // Si la API key es inválida (401), fallar de inmediato
      if (response.status === 401) {
        throw new Error('API key inválida o expirada. Verifica VITE_OPENROUTER_API_KEY.');
      }

      // Si el modelo da error de cuota/no disponibilidad (404, 429, 500, etc.), probar siguiente
      if (!response.ok) {
        let errorBody = {};
        try { errorBody = await response.json(); } catch (_) {}
        const msg = errorBody?.error?.message || `HTTP ${response.status}`;
        console.warn(`[UJELADITO] Modelo ${model} respondió con error: ${msg}. Probando siguiente modelo...`);
        lastErrorMsg = msg;
        continue;
      }

      const data = await response.json();

      // Si vino un error en el payload JSON (algunos proveedores upstream devuelven 200 con { error })
      if (data.error) {
        console.warn(`[UJELADITO] Error upstream en ${model}:`, data.error);
        lastErrorMsg = data.error.message || 'Error upstream';
        continue;
      }

      const rawContent = data.choices?.[0]?.message?.content;
      const cleaned = cleanResponseText(rawContent);

      if (cleaned) {
        return cleaned;
      }

      console.warn(`[UJELADITO] Modelo ${model} devolvió respuesta vacía. Probando siguiente modelo...`);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[UJELADITO] Modelo ${model} agotó el tiempo de espera (14s). Probando siguiente...`);
      } else if (err.message.includes('API key inválida')) {
        throw err;
      } else {
        console.warn(`[UJELADITO] Excepción al consultar ${model}:`, err.message);
      }
      lastErrorMsg = err.message;
    }
  }

  // Si ninguno de los modelos respondió satisfactoriamente
  throw new Error(
    `Los servidores de IA están temporalmente saturados (${lastErrorMsg || 'sin respuesta'}). Por favor, intenta enviar tu mensaje nuevamente en unos segundos.`
  );
}

import { dailyBibleFact, parseDailyQuestion } from '../src/lib/dailyBibleFact.js';

export function createDailyFactHandler({ env, createClient, fetch: request = fetch, now = () => new Date() }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Metodo no permitido' }); }
    let fact = dailyBibleFact(now());
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    if (!url || !env.SUPABASE_SERVICE_ROLE_KEY || !env.OPENROUTER_API_KEY || !env.OPENROUTER_DAILY_MODEL) {
      return res.status(200).json(fact);
    }
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Inicia sesion' });
    try {
      const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: auth, error: authError } = await db.auth.getUser(token);
      if (authError || !auth?.user) return res.status(401).json({ error: 'Sesion no valida' });
      const { data: slot, error: claimError } = await db.rpc('claim_daily_bible_fact');
      if (claimError || !slot) return res.status(200).json(fact);
      fact = dailyBibleFact(slot.day);
      if (!slot.claimed) return res.status(200).json({ ...fact, ...(slot.status === 'ready' && slot.question ? { question: slot.question, ai: true } : {}) });
      let question = null;
      try {
        const response = await request('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(12_000),
          headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'UJELADEA - Dato diario' },
          body: JSON.stringify({ model: env.OPENROUTER_DAILY_MODEL, max_tokens: 150, temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: 'Escribe UNA pregunta de reflexion en espanol para jovenes de 17 a 28 anos basada SOLO en el dato recibido. No agregues hechos, fechas, citas, interpretaciones doctrinales ni consejos medicos. Tono cercano, sin culpa ni presion. Maximo 180 caracteres. Devuelve JSON: {"question":"..."}.' },
              { role: 'user', content: `${fact.reference}: ${fact.text}` }] }),
        });
        if (response.ok) question = parseDailyQuestion((await response.json()).choices?.[0]?.message?.content);
      } catch { /* At most one attempt per day, including timeouts. */ }
      const { error: saveError } = await db.from('daily_bible_facts').update({ status: question ? 'ready' : 'failed', question }).eq('day', slot.day);
      return res.status(200).json({ ...fact, ...(!saveError && question ? { question, ai: true } : {}) });
    } catch { return res.status(200).json(fact); }
  };
}

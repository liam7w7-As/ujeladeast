import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dailyBibleFact } from '../../lib/dailyBibleFact';
import ujeladitoAvatar from '../../assets/ujeladito-avatar.png';

let pending;
let lastFetch = 0;
function loadFact() {
  if (!pending || Date.now() - lastFetch > 60_000) {
    lastFetch = Date.now();
    pending = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      const response = await fetch('/api/daily-bible-fact', { headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: AbortSignal.timeout(18_000) });
      if (!response.ok) return null;
      return response.json();
    })().catch(() => null);
  }
  return pending;
}

export default function DailyBibleFact() {
  const [fact, setFact] = useState(() => dailyBibleFact());
  useEffect(() => {
    let active = true;
    let loadedDay = '';
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      const fallback = dailyBibleFact();
      loadedDay = fallback.day;
      setFact(previous => previous.day === fallback.day ? previous : fallback);
      if (!navigator.onLine) return;
      const result = await loadFact();
      if (active && result?.day === dailyBibleFact().day && typeof result.question === 'string') {
        setFact({ ...dailyBibleFact(result.day), question: result.question, ai: result.ai === true });
      }
    };
    refresh();
    const timer = window.setInterval(() => { if (loadedDay !== dailyBibleFact().day) refresh(); }, 60_000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return <section className="study-daily" aria-label="Dato bíblico del día">
    <div className="study-section-label"><Lightbulb size={18} /><h2>Un descubrimiento de hoy</h2></div>
    <h3>{fact.title}</h3><p>{fact.text}</p>
    <Link to={`/biblia?version=RVR1960&book=${fact.book}&chapter=${fact.chapter}`}>{fact.reference}<ArrowUpRight size={16} /></Link>
    <div className="study-daily-question"><img src={ujeladitoAvatar} alt="" /><div><span>{fact.ai ? 'Pregunta de Ujeladito · IA' : 'Para pensar'}</span><p>{fact.question}</p></div></div>
  </section>;
}

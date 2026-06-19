import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import StreakCard from '../components/ui/StreakCard';
import XPBar from '../components/ui/XPBar';
import ProgressRing from '../components/ui/ProgressRing';
import LessonCard from '../components/ui/LessonCard';
import WeekCard from '../components/ui/WeekCard';
import JournalEntry from '../components/ui/JournalEntry';
import CelebrationModal from '../components/ui/CelebrationModal';

import { useStudy } from '../hooks/useStudy';
import { useStreak } from '../hooks/useStreak';
import { useJournal } from '../hooks/useJournal';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import ujeladitoAvatar from '../assets/ujeladito-avatar.png';

const SOS_RISK_WORDS = [
  'suicidio', 'suicidarme', 'quitarme la vida', 'quiero morir', 'no quiero vivir',
  'hacerme dano', 'autolesion', 'cortarme', 'lastimarme', 'desaparecer para siempre',
  'mejor estaria muerto', 'mejor sin mi', 'no vale la pena seguir'
];
function detectRisk(text) {
  return SOS_RISK_WORDS.some(w => text.toLowerCase().includes(w));
}

export default function BibleStudy() {
  const { user, profile } = useAuth();
  const location = useLocation();
  
  // Hooks
  const { plan, weeks, getCurrentPlan, getWeeks, getTodayLesson, completeLesson, getUserProgress, loading: studyLoading } = useStudy();
  const { streakData, getStreak, updateStreak, checkStreakLost } = useStreak();
  const { entries, getRecentEntries, saveEntry, error: journalError } = useJournal();
  const { messages: sosMessages, sending: sosSending, error: sosError, createSession: createSosSession, sendMessage: sendSosMessage, currentSession: sosSession, setError: setSosError } = useChat();
  
  // State
  const [activeView, setActiveView] = useState('dashboard'); // dashboard | plan | lesson | journal | sos
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeWeek, setActiveWeek] = useState(null);
  const [annualProgress, setAnnualProgress] = useState(0);
  const [sosInput, setSosInput] = useState('');
  const [showRiskBanner, setShowRiskBanner] = useState(false);
  const sosEndRef = useRef(null);
  const sosInputRef = useRef(null);
  
  // Auto-scroll en SOS
  useEffect(() => {
    sosEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sosMessages, sosSending]);

  // Abrir SOS si viene del Navbar
  useEffect(() => {
    if (location.state?.openSOS) {
      handleOpenSOS();
      window.history.replaceState({}, '');
    }
  }, [location.state]);
  
  // Lesson specific state
  const [answers, setAnswers] = useState({});
  const [journalContent, setJournalContent] = useState('');
  const [favoriteVerses, setFavoriteVerses] = useState([]);
  const [newVerse, setNewVerse] = useState('');
  const [completing, setCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);

  const handleOpenSOS = async () => {
    setActiveView('sos');
    if (!sosSession && user) {
      const session = await createSosSession('sos');
      if (session) {
        // Mensaje inicial de bienvenida pre-cargado
        await sendSosMessage(
          'Hóla, acabo de abrir esta sección. Por favor presenta el módulo SOS con tu saludo de bienvenida empático.',
          'sos',
          ''
        );
      }
    }
  };

  // Initial Load
  useEffect(() => {
    if (user) {
      checkStreakLost();
      getStreak();
      getRecentEntries(3);
      getCurrentPlan();
    }
  }, [user]);

  useEffect(() => {
    if (plan) {
      getWeeks(plan.id);
      getUserProgress(plan.id).then(setAnnualProgress);
    }
  }, [plan]);

  const handleStartTodayLesson = async () => {
    if (!plan) return;
    const lesson = await getTodayLesson(plan.id);
    if (lesson) {
      setActiveLesson(lesson);
      setActiveView('lesson');
      // Reset forms
      setAnswers({});
      setJournalContent('');
      setFavoriteVerses([]);
    }
  };

  const handleAddVerse = (e) => {
    if (e.key === 'Enter' && newVerse.trim() !== '') {
      e.preventDefault();
      setFavoriteVerses([...favoriteVerses, newVerse.trim()]);
      setNewVerse('');
    }
  };

  const handleRemoveVerse = (index) => {
    setFavoriteVerses(favoriteVerses.filter((_, i) => i !== index));
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson) return;
    try {
      setCompleting(true);
      // Guardar progreso y respuestas
      await completeLesson(activeLesson.id, answers);
      
      // Guardar diario si hay contenido o versos
      if (journalContent.trim() || favoriteVerses.length > 0) {
        await saveEntry(activeLesson.id, journalContent, favoriteVerses);
      }
      
      // Calcular XP Base
      let xp = 10;
      if (journalContent.trim()) xp += 5;
      if (favoriteVerses.length > 0) xp += 2;
      
      // Actualizar Racha y XP Total
      const { streak: newStreak, addedXP } = await updateStreak(xp);
      
      setCelebrationData({ xp: addedXP, streak: newStreak.current_streak });
      setShowCelebration(true);
      
      // Actualizar data
      if (plan) {
        getWeeks(plan.id);
        getUserProgress(plan.id).then(setAnnualProgress);
      }
      getRecentEntries(3);

    } catch (err) {
      alert("Hubo un error al guardar tu progreso.");
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    setActiveView('dashboard');
  };

  if (!user) {
    return (
      <PageShell activeItem="bible-studies">
        <div className="flex-grow flex items-center justify-center pt-32 pb-section-gap px-margin-mobile">
          <div className="glass-card p-8 rounded-2xl text-center max-w-md">
            <span className="material-symbols-outlined text-4xl text-primary mb-4 block">lock</span>
            <h2 className="text-xl font-bold text-white mb-2">Inicia Sesión</h2>
            <p className="text-on-surface-variant mb-6">Debes iniciar sesión para acceder al módulo de Estudios Bíblicos y guardar tu progreso.</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell activeItem="bible-studies">
      <main className="flex-grow pt-[120px] pb-section-gap px-margin-mobile md:px-gutter max-w-container-max mx-auto w-full relative z-10">
        
        {/* Top Navigation / Tabs */}
        <div className="flex gap-4 border-b border-surface-border mb-8 overflow-x-auto no-scrollbar">
          <button 
            className={`pb-3 px-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeView === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`pb-3 px-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeView === 'plan' || activeView === 'week' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
            onClick={() => setActiveView('plan')}
          >
            Plan Anual
          </button>
          <button 
            className={`pb-3 px-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeView === 'journal' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
            onClick={() => { setActiveView('journal'); getRecentEntries(50); }}
          >
            Mi Diario
          </button>
          <button 
            className={`pb-3 px-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeView === 'sos' ? 'border-amber-400 text-amber-400' : 'border-transparent hover:text-white'}`}
            style={{ color: activeView === 'sos' ? '#c9a84c' : undefined }}
            onClick={handleOpenSOS}
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">volunteer_activism</span>
              Apoyo SOS
            </span>
          </button>
          {activeView === 'lesson' && (
            <button className="pb-3 px-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 border-primary text-primary">
              Lección Actual
            </button>
          )}
        </div>

        {/* --- VIEW: DASHBOARD --- */}
        {activeView === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold text-white mb-2">¡Hola, {profile?.full_name?.split(' ')[0] || 'Estudiante'}!</h1>
            <p className="text-on-surface-variant mb-8">Continúa creciendo en la Palabra de Dios hoy.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column */}
              <div className="md:col-span-8 flex flex-col gap-6">
                
                {/* Hero / Today's Lesson */}
                <div className="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 border-primary/20 bg-primary-container/5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 blur-[80px] rounded-full -z-10"></div>
                  <div className="flex-1">
                    <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full mb-4 inline-block tracking-wider uppercase">Lección de Hoy</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{plan?.title || 'Plan Anual'}</h2>
                    <p className="text-on-surface-variant mb-6 max-w-md">Tu lección diaria está lista. Abre la Biblia, prepara tu corazón y comencemos.</p>
                    <button 
                      onClick={handleStartTodayLesson}
                      className="bg-primary-container hover:bg-inverse-primary text-white font-medium py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(143,25,55,0.3)] flex items-center gap-2 w-fit"
                    >
                      <span className="material-symbols-outlined">menu_book</span>
                      Empezar Estudio
                    </button>
                  </div>
                  <div className="hidden md:flex justify-center items-center">
                    <ProgressRing percentage={annualProgress} />
                  </div>
                </div>

                {/* Progress / Streaks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <StreakCard streak={streakData?.current_streak} lastStudy={streakData?.last_study_date} />
                  <XPBar xp={streakData?.total_xp} />
                </div>
              </div>

              {/* Right Column */}
              <div className="md:col-span-4 flex flex-col gap-6">
                
                {/* Quick Stats or Junta */}
                <div className="glass-card rounded-2xl p-6 border-surface-border">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">calendar_month</span>
                    Sesión Trimestral
                  </h3>
                  <div className="bg-surface-container rounded-xl p-4">
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Tu progreso y avances serán revisados oficialmente en la próxima sesión trimestral de UJELADEA.
                    </p>
                  </div>
                </div>

                {/* Recent Journals Mini */}
                <div className="glass-card rounded-2xl p-6 border-surface-border flex-grow">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">auto_stories</span>
                      Mi Diario
                    </h3>
                    <button onClick={() => setActiveView('journal')} className="text-xs text-primary hover:text-white">Ver todo</button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {entries.length === 0 ? (
                      <p className="text-sm text-on-surface-variant italic">No has escrito nada recientemente.</p>
                    ) : (
                      entries.slice(0,3).map(entry => (
                        <div key={entry.id} className="bg-surface-container rounded-lg p-3 cursor-pointer hover:bg-surface-container-high transition-colors">
                          <p className="text-xs text-white line-clamp-2">{entry.content}</p>
                          <span className="text-[10px] text-on-surface-variant mt-2 block">{new Date(entry.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: PLAN ANUAL --- */}
        {activeView === 'plan' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Plan Anual de Estudio</h1>
              <p className="text-on-surface-variant">Un camino de 52 semanas a través de las Escrituras.</p>
            </div>
            
            {studyLoading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {weeks.map(week => (
                  <WeekCard 
                    key={week.id} 
                    week={week} 
                    onClick={(w) => {
                      setActiveWeek(w);
                      setActiveView('week');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- VIEW: SEMANA (LESSONS) --- */}
        {activeView === 'week' && activeWeek && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <button 
              onClick={() => setActiveView('plan')}
              className="mb-6 flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Volver al Plan
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Semana {activeWeek.week_number}: {activeWeek.title}</h2>
            <p className="text-on-surface-variant mb-8">Elige la lección del día para comenzar tu estudio.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeWeek.study_lessons?.map(lesson => (
                <LessonCard 
                  key={lesson.id} 
                  lesson={lesson} 
                  onClick={(l) => {
                    setActiveLesson(l);
                    setActiveView('lesson');
                    setAnswers({});
                    setJournalContent('');
                    setFavoriteVerses([]);
                  }} 
                />
              ))}
            </div>
          </div>
        )}

        {/* --- VIEW: LECCIÓN --- */}
        {activeView === 'lesson' && activeLesson && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-3xl mx-auto">
            <button 
              onClick={() => setActiveView('dashboard')}
              className="mb-8 flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Salir del estudio
            </button>

            {/* Versículo Base */}
            <div className="mb-12 text-center">
              <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-full mb-6 inline-block tracking-widest uppercase border border-surface-border">
                Día {activeLesson.day_number}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-sora">{activeLesson.title}</h1>
              <h3 className="text-primary font-semibold text-lg">{activeLesson.scripture_ref}</h3>
            </div>

            {/* Texto Bíblico o Enseñanza */}
            <div className="glass-card rounded-3xl p-8 mb-8 border-surface-border prose prose-invert max-w-none font-inter text-on-surface/90 leading-loose">
              {activeLesson.scripture_text ? (
                <div dangerouslySetInnerHTML={{ __html: activeLesson.scripture_text }} />
              ) : (
                <p className="italic opacity-70">Lee el pasaje correspondiente en tu Biblia antes de continuar con la reflexión.</p>
              )}
              {activeLesson.teaching && (
                <div className="mt-6 border-t border-surface-border pt-6" dangerouslySetInnerHTML={{ __html: activeLesson.teaching }} />
              )}
            </div>

            {/* Botón Preguntar a UJELADITO */}
            <div className="mb-8 p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl flex items-center gap-4">
              <img src={ujeladitoAvatar} alt="UJELADITO" className="w-10 h-10 rounded-full object-cover border border-amber-500/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm font-medium">¿Tienes dudas sobre esta lección?</p>
                <p className="text-white/40 text-xs">UJELADITO puede ayudarte a profundizar.</p>
              </div>
              <button
                onClick={() => {
                  const extraCtx = `Lección: "${activeLesson.title}"\nReferencia: ${activeLesson.scripture_ref || 'N/A'}\nEnseñanza: ${activeLesson.teaching?.replace(/<[^>]*>/g, '') || 'Ver en la lección'}`.slice(0, 800);
                  // Abrir el widget flotante con contexto de estudio
                  // Disparamos un evento personalizado que ChatWidget escucha
                  window.dispatchEvent(new CustomEvent('ujeladito:open', { detail: { contextType: 'estudio', extraContext: extraCtx } }));
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap shrink-0"
                style={{ color: '#c9a84c', borderColor: 'rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.1)' }}
              >
                Preguntar a UJELADITO
              </button>
            </div>

            {/* Preguntas */}
            {activeLesson.questions && activeLesson.questions.length > 0 && (
              <div className="mb-8 flex flex-col gap-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">help</span>
                  Preguntas de Reflexión
                </h3>
                {activeLesson.questions.map((q, idx) => (
                  <div key={idx} className="bg-surface-container rounded-2xl p-6">
                    <p className="text-white font-medium mb-4">{q.text}</p>
                    <textarea 
                      className="w-full bg-surface-container-high border border-surface-border rounded-xl p-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[100px] resize-y"
                      placeholder="Escribe tu respuesta aquí..."
                      value={answers[idx] || ''}
                      onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                    ></textarea>
                  </div>
                ))}
              </div>
            )}

            {/* Diario y Versículos Favoritos */}
            <div className="mb-12 flex flex-col gap-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_stories</span>
                Diario Personal
              </h3>
              
              <div className="glass-card rounded-2xl p-6 border-primary/30 bg-primary-container/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-primary h-full"></div>
                <p className="text-sm text-on-surface-variant mb-4">Escribe lo que Dios te habló hoy, una oración, o una reflexión final.</p>
                <textarea 
                  className="w-full bg-surface-container border border-surface-border rounded-xl p-4 text-white placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[150px] resize-y mb-6"
                  placeholder="Querido Dios, hoy aprendí que..."
                  value={journalContent}
                  onChange={(e) => setJournalContent(e.target.value)}
                ></textarea>

                {/* Favoritos */}
                <div>
                  <p className="text-sm text-on-surface-variant mb-2">Versículos que impactaron hoy:</p>
                  <div className="flex items-center gap-2 mb-3">
                    <input 
                      type="text" 
                      className="flex-1 bg-surface-container border border-surface-border rounded-lg p-2 text-sm text-white focus:border-secondary outline-none"
                      placeholder="Ej. Juan 3:16"
                      value={newVerse}
                      onChange={(e) => setNewVerse(e.target.value)}
                      onKeyDown={handleAddVerse}
                    />
                    <button 
                      onClick={() => handleAddVerse({ key: 'Enter', preventDefault: ()=>{} })}
                      className="bg-surface-container-high text-on-surface border border-surface-border p-2 rounded-lg hover:bg-white/10"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {favoriteVerses.map((verse, idx) => (
                      <span key={idx} className="pl-3 pr-1 py-1 bg-surface-container border border-surface-border rounded-full text-xs text-white flex items-center gap-1 group">
                        <span className="material-symbols-outlined text-[14px] text-secondary">bookmark</span>
                        {verse}
                        <button onClick={() => handleRemoveVerse(idx)} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-error/20 text-on-surface-variant hover:text-error transition-colors ml-1">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Completar Botón */}
            <div className="flex justify-end pb-8">
              <button 
                onClick={handleCompleteLesson}
                disabled={completing}
                className="bg-primary-container hover:bg-inverse-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-12 rounded-xl transition-all shadow-[0_0_20px_rgba(143,25,55,0.4)] flex items-center gap-2 text-lg"
              >
                {completing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined">done_all</span>
                    Completar y Guardar
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* --- VIEW: MI DIARIO --- */}
        {activeView === 'journal' && (
          <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Mi Diario Personal</h1>
                <p className="text-on-surface-variant">Tus reflexiones y aprendizajes guardados.</p>
              </div>
              <div className="relative w-full md:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar en el diario..." 
                  className="w-full bg-surface-container border border-surface-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {journalError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-sm">
                  <span className="font-bold">Error de Diario:</span> {journalError}
                </div>
              )}
              {entries.length === 0 ? (
                <div className="text-center p-12 glass-card rounded-2xl">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-4">auto_stories</span>
                  <p className="text-on-surface-variant">Aún no tienes entradas en tu diario.</p>
                  <p className="text-sm text-on-surface-variant/70 mt-1">Completa una lección y escribe una reflexión para verla aquí.</p>
                </div>
              ) : (
                entries.map(entry => (
                  <JournalEntry key={entry.id} entry={entry} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: APOYO SOS ── */}
        {activeView === 'sos' && (
          <div className="animate-in fade-in duration-400 max-w-2xl mx-auto w-full">
            <div className="flex flex-col rounded-2xl overflow-hidden border border-amber-500/20 bg-[#0d0d10]" style={{ height: '600px' }}>
              {/* Header SOS */}
              <div className="shrink-0 flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-900/30 to-amber-700/10 border-b border-amber-500/20">
                <img src={ujeladitoAvatar} alt="UJELADITO" className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/30" />
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">UJELADITO — Apoyo Espiritual</p>
                  <p className="text-amber-300/70 text-xs">
                    {sosSending ? 'Escribiendo...' : 'Un espacio seguro para hablar sin juicio'}
                  </p>
                </div>
                <span className="material-symbols-outlined text-amber-400/60 text-[22px]">volunteer_activism</span>
              </div>

              {/* Banner de riesgo */}
              {showRiskBanner && (
                <div className="shrink-0 bg-amber-500/15 border-b border-amber-500/25 px-5 py-3 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-400 shrink-0 text-[20px]">warning</span>
                  <div className="flex-1">
                    <p className="text-amber-300 text-sm font-semibold">¿Necesitas ayuda urgente?</p>
                    <p className="text-amber-200/70 text-xs mt-0.5">Habla con tu líder de sociedad, pastor o un adulto de confianza. No tienes que pasar por esto solo/a.</p>
                  </div>
                  <button onClick={() => setShowRiskBanner(false)} className="text-amber-400/50 hover:text-amber-400 shrink-0">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              {/* Mensajes SOS */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                {sosMessages.length === 0 && !sosSending && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                    <img src={ujeladitoAvatar} alt="UJELADITO" className="w-12 h-12 rounded-full object-cover" />
                    <p className="text-white/40 text-sm text-center">Iniciando sesión de apoyo...</p>
                  </div>
                )}
                {sosMessages.filter(m => !m.content.startsWith('H\u00f3la, acabo de abrir')).map(msg => (
                  <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    {msg.role === 'assistant' && (
                      <img src={ujeladitoAvatar} alt="UJELADITO" className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-amber-500/20" />
                    )}
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-amber-950/40 border border-amber-500/15 text-white/90 rounded-bl-sm'
                        : 'bg-[#8f1937] text-white rounded-br-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {sosSending && (
                  <div className="flex items-end gap-2">
                    <img src={ujeladitoAvatar} alt="UJELADITO" className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-amber-500/20" />
                    <div className="bg-amber-950/40 border border-amber-500/15 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-amber-400/50 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-amber-400/50 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-amber-400/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                {sosError && (
                  <p className="text-red-400/80 text-xs text-center bg-red-500/10 px-3 py-2 rounded-xl">{sosError}</p>
                )}
                <div ref={sosEndRef} />
              </div>

              {/* Input SOS */}
              <div className="shrink-0 p-4 border-t border-amber-500/15 bg-[#0a0a0d]">
                <div className="flex items-end gap-2 bg-[#1a1a1f] border border-amber-500/15 rounded-xl px-4 py-2.5 focus-within:border-amber-500/40 transition-colors">
                  <textarea
                    ref={sosInputRef}
                    value={sosInput}
                    onChange={e => setSosInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!sosInput.trim() || sosSending) return;
                        const text = sosInput.trim();
                        setSosInput('');
                        if (detectRisk(text)) setShowRiskBanner(true);
                        sendSosMessage(text, 'sos', '');
                      }
                    }}
                    placeholder="Cuéntame cómo te sientes..."
                    rows={1}
                    disabled={sosSending}
                    className="flex-1 bg-transparent text-white placeholder:text-amber-200/20 resize-none outline-none max-h-24 text-sm leading-relaxed disabled:opacity-50"
                    style={{ minHeight: '24px' }}
                  />
                  <button
                    onClick={() => {
                      if (!sosInput.trim() || sosSending) return;
                      const text = sosInput.trim();
                      setSosInput('');
                      if (detectRisk(text)) setShowRiskBanner(true);
                      sendSosMessage(text, 'sos', '');
                    }}
                    disabled={sosSending || !sosInput.trim()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
                    style={{ background: 'rgba(201,168,76,0.25)', border: '1px solid rgba(201,168,76,0.35)' }}
                  >
                    {sosSending ? (
                      <span className="w-3.5 h-3.5 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-amber-400 text-[18px]">send</span>
                    )}
                  </button>
                </div>
                <p className="text-center text-white/15 text-[10px] mt-1.5">Este espacio es privado y confidencial</p>
              </div>
            </div>
          </div>
        )}

      </main>

      <CelebrationModal 
        show={showCelebration} 
        data={celebrationData} 
        onClose={handleCelebrationClose} 
      />
    </PageShell>
  );
}

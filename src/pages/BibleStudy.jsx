import { useState, useEffect, useEffectEvent, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, CalendarDays, NotebookPen, LoaderCircle, RotateCw } from 'lucide-react';
import ContentIcon from '../components/ui/ContentIcon';
import PageShell from '../components/layout/PageShell';
import StudyDashboard from '../components/ui/StudyDashboard';
import LessonCard from '../components/ui/LessonCard';
import WeekCard from '../components/ui/WeekCard';
import JournalEntry from '../components/ui/JournalEntry';
import StudySession from '../components/ui/StudySession';

import { useStudy } from '../hooks/useStudy';
import { useStreak } from '../hooks/useStreak';
import { useJournal } from '../hooks/useJournal';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { journeyWeeks, lessonRevision } from '../lib/studyJourney';
import './study.css';
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
  const { user } = useAuth();
  return <BibleStudyContent key={user?.id || 'guest'} />;
}

function BibleStudyContent() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Hooks
  const { plan, weeks, lessons, getLessons, getCurrentPlan, getWeeks, getJourney, getLesson, completeLesson, loading: studyLoading, error: studyError } = useStudy();
  const { streakData, getStreak, updateStreak, acceptStatus, loading: streakLoading, error: streakError } = useStreak();
  const { entries, getRecentEntries, saveEntry, error: journalError } = useJournal();
  const { messages: sosMessages, sending: sosSending, error: sosError, createSession: createSosSession, sendMessage: sendSosMessage, currentSession: sosSession } = useChat();
  
  // State
  const [activeView, setActiveView] = useState('dashboard'); // dashboard | plan | lesson | journal | sos
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeWeek, setActiveWeek] = useState(null);
  const [journey, setJourney] = useState(null);
  const [journeyError, setJourneyError] = useState('');
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [openingLesson, setOpeningLesson] = useState(false);
  const [lessonError, setLessonError] = useState('');
  const [journalSearch, setJournalSearch] = useState('');
  const [sosInput, setSosInput] = useState('');
  const [showRiskBanner, setShowRiskBanner] = useState(false);
  const sosEndRef = useRef(null);
  const sosInputRef = useRef(null);
  const unlockedWeeks = journeyWeeks(journeyError ? null : journey, weeks);
  const journalMatches = entries.filter(entry => `${entry.content || ''} ${entry.study_lessons?.title || ''}`.toLocaleLowerCase().includes(journalSearch.toLocaleLowerCase()));

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [activeView]);
  
  // Auto-scroll en SOS
  useEffect(() => {
    sosEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sosMessages, sosSending]);

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

  const openRequestedSOS = useEffectEvent(() => { handleOpenSOS(); });
  useEffect(() => {
    if (location.state?.openSOS && user) {
      // Consume an explicit navigation request from the shared mobile menu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openRequestedSOS();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, user, navigate]);

  useEffect(() => {
    if (!user) return;
    getStreak();
    getRecentEntries(3);
    getCurrentPlan();
  }, [user, getStreak, getRecentEntries, getCurrentPlan]);

  useEffect(() => {
    let active = true;
    if (!plan || !user) return;
    getWeeks(plan.id);
    getJourney(plan.id).then(data => {
      if (active) { setJourney(data); setJourneyError(''); }
    }).catch(() => {
      if (active) setJourneyError('No pudimos cargar tu recorrido. Tu avance se conserva.');
    }).finally(() => { if (active) setJourneyLoading(false); });
    return () => { active = false; };
  }, [plan, user, getWeeks, getJourney]);

  const refreshJourney = async () => {
    setJourneyLoading(true);
    try { const refreshed = await getJourney(plan.id); setJourney(refreshed); setJourneyError(''); return refreshed; }
    catch { setJourneyError('No pudimos cargar tu recorrido. Tu avance se conserva.'); }
    finally { setJourneyLoading(false); }
  };
  const openWeek = async week => {
    if (!week.canOpen || openingLesson) return;
    setOpeningLesson(true);
    try {
      const loaded = await getLessons(week.id);
      if (!loaded) throw new Error('Week unavailable');
      setLessonError(''); setActiveWeek(week); setActiveView('week');
    } catch { setLessonError('No se pudieron cargar las lecciones de esta semana. Intenta de nuevo.'); }
    finally { setOpeningLesson(false); }
  };
  const openJournal = () => { setActiveView('journal'); getRecentEntries(50); };
  const openLesson = async lessonId => {
    if (openingLesson) return;
    const item = journey?.items.find(item => item.id === lessonId);
    if (journeyError || !item || item.locked) {
      setLessonError('Completa las semanas anteriores antes de abrir esta lección.');
      return;
    }
    setOpeningLesson(true); setLessonError('');
    try {
      const lesson = await getLesson(lessonId);
      if (!lesson) throw new Error('Missing lesson');
      setActiveLesson(lesson);
      setActiveView('lesson');
    } catch { setLessonError('No se pudo abrir la lección. Intenta de nuevo.'); }
    finally { setOpeningLesson(false); }
  };
  const handleCompleteLesson = async ({ answers, journalContent, favoriteVerses }) => {
    const latest = await getLesson(activeLesson.id);
    if (latest.user_progress?.completed) {
      await getStreak();
      await refreshJourney();
      getWeeks(plan.id);
      return { notice: 'Esta lección ya estaba completada. Sus respuestas anteriores se conservaron.' };
    }
    if (lessonRevision(latest) !== lessonRevision(activeLesson)) {
      const error = new Error('La lección cambió durante tu estudio. Vuelve a abrirla para revisar la actualización; tu borrador se conserva.');
      error.code = 'study_content_changed';
      throw error;
    }
    // Save the optional journal first so a failed write leaves the study draft retryable.
    if (journalContent.trim() || favoriteVerses.length) await saveEntry(activeLesson.id, journalContent, favoriteVerses);
    const progress = await completeLesson(activeLesson.id, answers, lessonRevision(activeLesson));
    let notice = '';
    if (progress?.status?.atomic) {
      acceptStatus(progress.status);
      if (progress.already_completed) notice = 'Este estudio ya estaba guardado. Tu racha está confirmada, sin duplicar puntos.';
    } else if (progress) {
      try { await updateStreak(10); }
      catch { notice = 'El estudio está guardado, pero no se pudo actualizar la racha y el XP.'; }
    } else notice = 'Esta lección ya estaba completada. Tu avance se conserva.';
    const refreshed = await refreshJourney();
    const completedWeek = journey?.items.find(item => item.id === activeLesson.id)?.study_weeks?.week_number;
    const nextWeek = refreshed?.nextLesson?.study_weeks?.week_number;
    if (nextWeek && Number(nextWeek) > Number(completedWeek)) {
      notice = [notice, `¡Semana ${nextWeek} desbloqueada! Completaste la semana ${completedWeek}.`].filter(Boolean).join(' ');
    }
    getWeeks(plan.id);
    getRecentEntries(3);
    return { notice };
  };

  if (!user) {
    return (
      <PageShell activeItem="bible-studies">
        <div className="flex-grow flex items-center justify-center pt-32 pb-section-gap px-margin-mobile">
          <div className="py-10 text-center max-w-md">
            <BookOpen size={38} className="mx-auto text-emerald-200 mb-5" />
            <h1 className="text-2xl font-bold text-white mb-3">Un momento con la Palabra</h1>
            <p className="text-sm leading-7 text-on-surface-variant mb-6">Inicia sesión para continuar tus estudios y guardar tu progreso.</p>
            <Link to="/login" state={{ from: '/estudios' }} className="inline-flex items-center gap-3 rounded-lg bg-primary-container px-6 py-3 text-sm text-white">Iniciar sesión<ArrowRight size={18} /></Link>
            <Link to="/register" className="block mt-5 text-sm text-primary">Crear una cuenta</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell activeItem="bible-studies" withFooter={activeView !== 'lesson'} ambient={false} className={`study-page ${activeView === 'lesson' ? 'study-session-page' : ''}`}>
      <main className="study-main">
        
        {activeView !== 'lesson' && <nav className="study-tabs" aria-label="Secciones del estudio">
          <button type="button" aria-current={activeView === 'dashboard' ? 'page' : undefined} onClick={() => setActiveView('dashboard')}><BookOpen />Mi estudio</button>
          <button type="button" aria-current={['plan', 'week'].includes(activeView) ? 'page' : undefined} onClick={() => setActiveView('plan')}><CalendarDays />Plan Anual</button>
          <button type="button" aria-current={activeView === 'journal' ? 'page' : undefined} onClick={openJournal}><NotebookPen />Mi Diario</button>
        </nav>}
        {lessonError && <p role="alert" className="study-notice">{lessonError}</p>}

        {activeView === 'dashboard' && <StudyDashboard
          name={profile?.full_name?.split(' ')[0] || 'Estudiante'} plan={plan} journey={journey} weeks={unlockedWeeks}
          loading={journeyLoading} error={journeyError} planError={studyError} planLoading={studyLoading}
          retryPlan={getCurrentPlan} retryJourney={refreshJourney} openingLesson={openingLesson}
          openLesson={openLesson} openWeek={openWeek} openPlan={() => setActiveView('plan')}
          streak={streakData} streakLoading={streakLoading} streakError={streakError} retryStreak={getStreak}
          entries={entries} openJournal={openJournal} openSOS={handleOpenSOS}
        />}

        {activeView === 'plan' && <section>
          <header className="study-view-heading"><h1>Plan Anual de Estudio</h1><p>Una semana a la vez. La siguiente se abre al completar las anteriores.</p></header>
          {studyLoading || (plan && journeyLoading) ? <p role="status" className="study-loading"><LoaderCircle size={20} className="animate-spin" />Cargando semanas...</p>
            : journeyError || studyError ? <><p role="alert" className="study-notice">{journeyError || 'No pudimos cargar todas las semanas.'}</p><button type="button" className="study-primary" onClick={() => { if (!plan) { getCurrentPlan(); return; } refreshJourney(); getWeeks(plan.id); }}><RotateCw size={17} />Reintentar</button></>
            : !plan || !journey?.total ? <p className="study-loading">Este plan todavía no tiene lecciones publicadas.</p>
            : <div className="study-weeks-grid">{unlockedWeeks.map(week => <WeekCard key={week.id} week={week} onClick={openWeek} disabled={openingLesson} />)}</div>}
        </section>}

        {/* --- VIEW: SEMANA (LESSONS) --- */}
        {activeView === 'week' && activeWeek && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <button 
              onClick={() => setActiveView('plan')}
              className="mb-6 flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors text-sm"
            >
              <ContentIcon className="text-[18px]" name="arrow_back" />
              Volver al Plan
            </button>
            <header className="study-view-heading"><h2>Semana {activeWeek.week_number}: {activeWeek.title}</h2><p>{activeWeek.locked ? 'Tus estudios anteriores siguen disponibles para releer.' : `${activeWeek.completed} de ${activeWeek.total} estudios completados`}</p></header>

            <div className="study-lesson-grid">
              {lessons.map(lesson => (
                <LessonCard 
                  key={lesson.id} 
                  lesson={lesson} 
                  onClick={lesson => openLesson(lesson.id)}
                  disabled={openingLesson}
                  locked={journey?.items.find(item => item.id === lesson.id)?.locked ?? true}
                />
              ))}
            </div>
          </div>
        )}

        {activeView === 'lesson' && activeLesson && <StudySession
          key={`${user.id}:${activeLesson.id}`}
          userId={user.id}
          lesson={activeLesson}
          ordinal={journey?.items.find(item => item.id === activeLesson.id)?.ordinal}
          total={journey?.total}
          onExit={() => { setActiveView('dashboard'); setActiveLesson(null); }}
          onComplete={handleCompleteLesson}
        />}

        {/* --- VIEW: MI DIARIO --- */}
        {activeView === 'journal' && (
          <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Mi Diario Personal</h1>
                <p className="text-on-surface-variant">Tus reflexiones y aprendizajes guardados.</p>
              </div>
              <div className="relative w-full md:w-64">
                <ContentIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" name="search" />
                <input 
                  type="text" 
                  placeholder="Buscar en el diario..."
                  aria-label="Buscar en mi diario"
                  value={journalSearch}
                  onChange={event => setJournalSearch(event.target.value)}
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
                <div className="text-center py-12 border-t border-surface-border">
                  <ContentIcon className="text-4xl text-on-surface-variant/50 mb-4" name="auto_stories" />
                  <p className="text-on-surface-variant">Aún no tienes entradas en tu diario.</p>
                  <p className="text-sm text-on-surface-variant/70 mt-1">Completa una lección y escribe una reflexión para verla aquí.</p>
                </div>
              ) : (
                journalMatches.length ? journalMatches.map(entry => (
                  <JournalEntry key={entry.id} entry={entry} />
                )) : <p role="status" className="text-sm text-on-surface-variant py-8">No hay reflexiones que coincidan con tu búsqueda.</p>
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
                <ContentIcon className="text-amber-400/60 text-[22px]" name="volunteer_activism" />
              </div>

              {/* Banner de riesgo */}
              {showRiskBanner && (
                <div className="shrink-0 bg-amber-500/15 border-b border-amber-500/25 px-5 py-3 flex items-start gap-3">
                  <ContentIcon className="text-amber-400 shrink-0 text-[20px]" name="warning" />
                  <div className="flex-1">
                    <p className="text-amber-300 text-sm font-semibold">¿Necesitas ayuda urgente?</p>
                    <p className="text-amber-200/70 text-xs mt-0.5">Habla con tu líder de sociedad, pastor o un adulto de confianza. No tienes que pasar por esto solo/a.</p>
                  </div>
                  <button onClick={() => setShowRiskBanner(false)} className="text-amber-400/50 hover:text-amber-400 shrink-0">
                    <ContentIcon className="text-[16px]" name="close" />
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
                      <ContentIcon className="text-amber-400 text-[18px]" name="send" />
                    )}
                  </button>
                </div>
                <p className="text-center text-white/15 text-[10px] mt-1.5">Este espacio es privado y confidencial</p>
              </div>
            </div>
          </div>
        )}

      </main>

    </PageShell>
  );
}

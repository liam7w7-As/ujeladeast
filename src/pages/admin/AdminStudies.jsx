import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminStudies() {
  const [plans, setPlans] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [expandedWeeks, setExpandedWeeks] = useState({});

  // Form State para nueva lección
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    scripture_ref: '',
    scripture_text: '',
    teaching: '',
    questions: [],
    day_number: 1
  });

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('study_plans').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeksAndLessons = async (planId) => {
    try {
      setLoading(true);
      const { data: weeksData, error: wError } = await supabase
        .from('study_weeks')
        .select('*')
        .eq('plan_id', planId)
        .order('week_number', { ascending: true });
      if (wError) throw wError;
      
      const { data: lessonsData, error: lError } = await supabase
        .from('study_lessons')
        .select('*')
        .in('week_id', weeksData.map(w => w.id))
        .order('day_number', { ascending: true });
      if (lError) throw lError;

      setWeeks(weeksData || []);
      setLessons(lessonsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      loadWeeksAndLessons(selectedPlan.id);
    }
  }, [selectedPlan]);

  const toggleWeek = (weekId) => {
    setExpandedWeeks(prev => ({ ...prev, [weekId]: !prev[weekId] }));
  };

  const handleOpenEditLesson = (week, lesson = null) => {
    setSelectedWeek(week);
    if (lesson) {
      setIsEditingLesson(true);
      setEditingLessonId(lesson.id);
      setLessonForm({
        title: lesson.title || '',
        scripture_ref: lesson.scripture_ref || '',
        scripture_text: lesson.scripture_text || '',
        teaching: lesson.teaching || '',
        questions: lesson.questions || [],
        day_number: lesson.day_number || 1
      });
    } else {
      setIsEditingLesson(true);
      setEditingLessonId(null);
      // Auto-calc next day number
      const currentLessons = lessons.filter(l => l.week_id === week.id);
      const nextDay = currentLessons.length > 0 ? Math.max(...currentLessons.map(l => l.day_number)) + 1 : 1;
      
      setLessonForm({
        title: '',
        scripture_ref: '',
        scripture_text: '',
        teaching: '',
        questions: [],
        day_number: nextDay
      });
    }
  };

  const handleSaveLesson = async () => {
    try {
      setLoading(true);
      const lessonData = {
        week_id: selectedWeek.id,
        ...lessonForm
      };

      if (editingLessonId) {
        const { error } = await supabase.from('study_lessons').update(lessonData).eq('id', editingLessonId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('study_lessons').insert([lessonData]);
        if (error) throw error;
      }

      await loadWeeksAndLessons(selectedPlan.id);
      setIsEditingLesson(false);
    } catch (err) {
      alert("Error al guardar lección: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta lección? Esta acción no se puede deshacer.")) return;
    try {
      const { error } = await supabase.from('study_lessons').delete().eq('id', lessonId);
      if (error) throw error;
      setLessons(lessons.filter(l => l.id !== lessonId));
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const addQuestion = () => {
    setLessonForm({
      ...lessonForm,
      questions: [...lessonForm.questions, { text: '', type: 'open' }]
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQs = [...lessonForm.questions];
    newQs[index][field] = value;
    setLessonForm({ ...lessonForm, questions: newQs });
  };

  const removeQuestion = (index) => {
    setLessonForm({
      ...lessonForm,
      questions: lessonForm.questions.filter((_, i) => i !== index)
    });
  };

  const handleCreatePlan = async () => {
    const title = window.prompt("Nombre del nuevo Plan de Estudio (ej. Plan Anual 2026):");
    if (!title || !title.trim()) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('study_plans').insert([{ title: title.trim() }]);
      if (error) throw error;
      await loadPlans();
    } catch (err) {
      alert("Error al crear plan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWeek = async () => {
    if (!selectedPlan) return;
    const currentWeeks = weeks.length;
    const title = window.prompt(`Título para la Semana ${currentWeeks + 1}:`);
    if (!title || !title.trim()) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('study_weeks').insert([{
        plan_id: selectedPlan.id,
        week_number: currentWeeks + 1,
        title: title.trim()
      }]);
      if (error) throw error;
      await loadWeeksAndLessons(selectedPlan.id);
    } catch (err) {
      alert("Error al crear semana: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">Gestión de Estudios Bíblicos</h1>
        <p className="text-on-surface-variant text-sm">Administra los planes anuales, semanas y lecciones de estudio.</p>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          Error: {error}
        </div>
      )}

      {!isEditingLesson ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Columna Izquierda: Planes */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-white">Planes de Estudio</h2>
                <button onClick={handleCreatePlan} className="text-primary hover:text-white transition-colors" title="Crear Plan">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                </button>
              </div>
              
              {loading && !selectedPlan ? (
                <p className="text-sm text-on-surface-variant">Cargando...</p>
              ) : (
                <ul className="space-y-2">
                  {plans.map(plan => (
                    <li key={plan.id}>
                      <button 
                        onClick={() => setSelectedPlan(plan)}
                        className={`w-full text-left p-3 rounded-xl transition-colors border ${
                          selectedPlan?.id === plan.id 
                            ? 'bg-primary/10 border-primary text-white' 
                            : 'bg-surface-container border-surface-border text-on-surface-variant hover:text-white hover:border-white/20'
                        }`}
                      >
                        <p className="font-medium text-sm">{plan.title}</p>
                      </button>
                    </li>
                  ))}
                  {plans.length === 0 && <p className="text-sm text-on-surface-variant">No hay planes creados.</p>}
                </ul>
              )}
            </div>
          </div>

          {/* Columna Derecha: Semanas y Lecciones */}
          <div className="md:col-span-8 flex flex-col gap-4">
            {selectedPlan ? (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white">{selectedPlan.title}</h2>
                  <button onClick={handleCreateWeek} className="text-xs bg-surface-container hover:bg-white/10 px-3 py-1.5 rounded-lg border border-surface-border text-on-surface-variant transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">add</span> Nueva Semana
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
                ) : (
                  <div className="space-y-3">
                    {weeks.map(week => {
                      const weekLessons = lessons.filter(l => l.week_id === week.id);
                      const isExpanded = expandedWeeks[week.id];
                      return (
                        <div key={week.id} className="border border-surface-border rounded-xl bg-surface-container/30 overflow-hidden">
                          <button 
                            onClick={() => toggleWeek(week.id)}
                            className="w-full flex items-center justify-between p-4 bg-surface-container hover:bg-surface-container-high transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-on-surface-variant transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>chevron_right</span>
                              <span className="font-semibold text-white text-sm">Semana {week.week_number}: {week.title}</span>
                            </div>
                            <span className="text-xs text-on-surface-variant bg-black/20 px-2 py-1 rounded-md">{weekLessons.length} lecciones</span>
                          </button>
                          
                          {isExpanded && (
                            <div className="p-4 bg-black/20">
                              <div className="space-y-2">
                                {weekLessons.map(lesson => (
                                  <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-border/50 bg-surface-container hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                      <span className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">{lesson.day_number}</span>
                                      <div>
                                        <p className="text-sm font-medium text-white">{lesson.title}</p>
                                        <p className="text-xs text-on-surface-variant">{lesson.scripture_ref}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleOpenEditLesson(week, lesson)} className="w-8 h-8 rounded bg-surface-container-high hover:bg-secondary/20 hover:text-secondary flex items-center justify-center text-on-surface-variant transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                      </button>
                                      <button onClick={() => handleDeleteLesson(lesson.id)} className="w-8 h-8 rounded bg-surface-container-high hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-on-surface-variant transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <button 
                                  onClick={() => handleOpenEditLesson(week)}
                                  className="w-full p-3 rounded-lg border border-dashed border-surface-border text-on-surface-variant hover:text-white hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm mt-2"
                                >
                                  <span className="material-symbols-outlined text-[18px]">add</span> Añadir Lección
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {weeks.length === 0 && <p className="text-sm text-on-surface-variant text-center p-4">No hay semanas creados en este plan.</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4 block">menu_book</span>
                <p className="text-on-surface-variant">Selecciona un plan a la izquierda para ver y editar sus lecciones.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Formulario Creador/Editor de Lecciones */
        <div className="glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-surface-border">
            <h2 className="text-xl font-bold text-white">
              {editingLessonId ? 'Editar Lección' : 'Crear Nueva Lección'} <span className="text-on-surface-variant text-sm font-normal ml-2">(Semana {selectedWeek?.week_number})</span>
            </h2>
            <button onClick={() => setIsEditingLesson(false)} className="text-on-surface-variant hover:text-white flex items-center gap-1 text-sm">
              <span className="material-symbols-outlined text-[18px]">close</span> Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><span className="material-symbols-outlined">menu_book</span> Contenido Principal</h3>
              <div className="flex gap-4">
                <div className="w-24">
                  <label className="block text-xs text-on-surface-variant mb-1">Día #</label>
                  <input type="number" min="1" max="7" value={lessonForm.day_number} onChange={e => setLessonForm({...lessonForm, day_number: e.target.value})} className="w-full bg-surface-container border border-surface-border rounded-xl p-2.5 text-sm text-white focus:border-primary outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-on-surface-variant mb-1">Título de la lección</label>
                  <input type="text" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} placeholder="Ej. El Principio de la Sabiduría" className="w-full bg-surface-container border border-surface-border rounded-xl p-2.5 text-sm text-white focus:border-primary outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Referencia Bíblica Central</label>
                <input type="text" value={lessonForm.scripture_ref} onChange={e => setLessonForm({...lessonForm, scripture_ref: e.target.value})} placeholder="Ej. Proverbios 1:7" className="w-full bg-surface-container border border-surface-border rounded-xl p-2.5 text-sm text-white focus:border-primary outline-none" />
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Texto del Versículo (Opcional - Soporta HTML/negritas)</label>
                <textarea rows="3" value={lessonForm.scripture_text} onChange={e => setLessonForm({...lessonForm, scripture_text: e.target.value})} placeholder="El principio de la sabiduría es el temor de Jehová..." className="w-full bg-surface-container border border-surface-border rounded-xl p-2.5 text-sm text-white focus:border-primary outline-none font-serif leading-relaxed"></textarea>
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Enseñanza / Comentario (Soporta HTML básico)</label>
                <textarea rows="6" value={lessonForm.teaching} onChange={e => setLessonForm({...lessonForm, teaching: e.target.value})} placeholder="Desarrollo de la lección..." className="w-full bg-surface-container border border-surface-border rounded-xl p-2.5 text-sm text-white focus:border-primary outline-none"></textarea>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-secondary flex items-center gap-2"><span className="material-symbols-outlined">help</span> Preguntas de Reflexión</h3>
                <button onClick={addQuestion} className="text-xs bg-secondary/20 text-secondary hover:bg-secondary/30 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  + Agregar Pregunta
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {lessonForm.questions.map((q, idx) => (
                  <div key={idx} className="bg-surface-container/50 border border-surface-border rounded-xl p-4 relative group">
                    <button onClick={() => removeQuestion(idx)} className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                    
                    <div className="mb-3">
                      <label className="block text-[10px] uppercase text-on-surface-variant mb-1">Pregunta {idx + 1}</label>
                      <input type="text" value={q.text} onChange={(e) => updateQuestion(idx, 'text', e.target.value)} placeholder="¿Qué significa este pasaje para ti?" className="w-full bg-black/20 border border-surface-border/50 rounded-lg p-2 text-sm text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                ))}
                {lessonForm.questions.length === 0 && (
                  <div className="text-center p-8 bg-surface-container/20 border border-dashed border-surface-border rounded-xl">
                    <p className="text-sm text-on-surface-variant">No has añadido preguntas.<br/>Las lecciones sin preguntas solo tendrán Diario Personal.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-surface-border flex justify-end gap-3">
            <button onClick={() => setIsEditingLesson(false)} className="px-6 py-2.5 rounded-xl border border-surface-border text-on-surface-variant hover:text-white transition-colors text-sm font-medium">Cancelar</button>
            <button onClick={handleSaveLesson} disabled={loading} className="px-6 py-2.5 rounded-xl bg-primary hover:bg-inverse-primary text-white transition-colors text-sm font-bold flex items-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[18px]">save</span>}
              Guardar Lección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

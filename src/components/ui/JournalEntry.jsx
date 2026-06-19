export default function JournalEntry({ entry }) {
  const { created_at, content, favorite_verses, study_lessons } = entry;
  const date = new Date(created_at).toLocaleDateString('es-ES', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-4">
      <div className="flex justify-between items-start border-b border-surface-border pb-4">
        <div>
          <h4 className="text-lg font-semibold text-white capitalize">{date}</h4>
          <span className="text-sm text-primary">
            {study_lessons?.title} • {study_lessons?.scripture_ref}
          </span>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">auto_stories</span>
      </div>

      <div className="text-on-surface-variant whitespace-pre-wrap leading-relaxed">
        {content || <span className="italic opacity-50">Sin reflexión escrita...</span>}
      </div>

      {favorite_verses && favorite_verses.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {favorite_verses.map((verse, idx) => (
            <span key={idx} className="px-3 py-1 bg-surface-container-high border border-surface-border rounded-full text-xs text-white flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-secondary">bookmark</span>
              {verse}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

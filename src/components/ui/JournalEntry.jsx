import { Bookmark, NotebookPen } from 'lucide-react';

export default function JournalEntry({ entry }) {
  const { created_at, content, favorite_verses, study_lessons } = entry;
  const date = new Date(created_at).toLocaleDateString('es-ES', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <article className="border-t border-surface-border py-6 flex flex-col gap-4 min-w-0">
      <div className="flex justify-between items-start border-b border-surface-border pb-4">
        <div>
          <h4 className="text-lg font-semibold text-white capitalize">{date}</h4>
          <span className="text-sm text-primary">
            {study_lessons?.title} • {study_lessons?.scripture_ref}
          </span>
        </div>
        <NotebookPen size={20} className="text-on-surface-variant shrink-0" />
      </div>

      <div className="text-on-surface-variant whitespace-pre-wrap break-words text-sm leading-relaxed">
        {content || <span className="italic opacity-50">Sin reflexión escrita...</span>}
      </div>

      {favorite_verses && favorite_verses.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {favorite_verses.map((verse, idx) => (
            <span key={idx} className="px-3 py-2 border border-surface-border rounded-md text-xs text-white flex items-center gap-2 break-words min-w-0">
              <Bookmark size={14} className="shrink-0 text-secondary" />
              {verse}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

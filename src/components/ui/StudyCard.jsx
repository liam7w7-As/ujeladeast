export default function StudyCard({ title, passage, author, date }) {
  return (
    <div className="glass-card rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 transition-colors group">
      <div className="flex-grow pr-4">
        <h4 className="font-headline-md text-headline-md text-on-surface mb-1 group-hover:text-primary transition-colors">{title}</h4>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <span className="inline-flex items-center text-on-surface-variant font-label-sm text-label-sm border border-surface-border px-2 py-1 rounded bg-surface-container-lowest">
            <span className="material-symbols-outlined text-[14px] mr-1">menu_book</span>
            {passage}
          </span>
          <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center">
            <span className="material-symbols-outlined text-[14px] mr-1">person</span>
            {author}
          </span>
          <span className="text-surface-variant font-label-sm text-label-sm flex items-center">
            <span className="material-symbols-outlined text-[14px] mr-1">calendar_today</span>
            {date}
          </span>
        </div>
      </div>
      <div className="mt-4 md:mt-0 flex shrink-0">
        <button className="flex items-center justify-center w-10 h-10 rounded-full border border-surface-border text-on-surface-variant hover:text-secondary hover:border-secondary hover:bg-secondary/10 transition-colors" title="Descargar PDF">
          <span className="material-symbols-outlined">download</span>
        </button>
      </div>
    </div>
  )
}

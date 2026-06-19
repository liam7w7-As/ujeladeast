export default function HymnCard({ hymn, onClick }) {
  return (
    <article 
      onClick={onClick}
      className="bg-glass-bg border border-surface-border rounded-xl p-6 backdrop-blur-xl hover:border-[#8f1937] hover:shadow-[0_0_15px_rgba(143,25,55,0.15)] transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="font-headline-md text-xl text-on-surface group-hover:text-primary transition-colors leading-tight flex-1 pr-4">
          {hymn.titulo_es || 'Sin Título'}
        </h3>
        <span className="text-3xl font-bold text-primary opacity-80 leading-none">
          {hymn.numero}
        </span>
      </div>
      
      {hymn.titulo_ay && (
        <p className="font-body-md text-sm text-on-surface-variant italic mb-6 relative z-10 flex-grow">
          {hymn.titulo_ay}
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-4 border-t border-surface-border/50 relative z-10">
        {hymn.tonalidad && (
          <span className="px-2 py-1 bg-surface-container border border-surface-border rounded text-[10px] uppercase tracking-wider font-medium text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">music_note</span>
            {hymn.tonalidad}
          </span>
        )}
        {hymn.categoria && (
          <span className="px-2 py-1 bg-[#8f1937]/10 border border-[#8f1937]/20 rounded text-[10px] uppercase tracking-wider font-medium text-[#8f1937] ml-auto">
            {hymn.categoria}
          </span>
        )}
      </div>
    </article>
  )
}

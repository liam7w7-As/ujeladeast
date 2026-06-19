export default function SeriesCard({ title, episodes, bgImage, icon }) {
  return (
    <div className="snap-start shrink-0 w-72 glass-card rounded-lg overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
      <div className={`h-40 relative overflow-hidden ${!bgImage ? 'bg-surface-container' : ''}`}>
        {bgImage ? (
          <>
            <img alt={`${title} Cover`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-luminosity opacity-70" src={bgImage} />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center text-surface-variant">
              <span className="material-symbols-outlined text-6xl">{icon}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
          </>
        )}
      </div>
      <div className="p-6 relative">
        <h4 className="font-headline-md text-headline-md text-on-surface mb-2 truncate">{title}</h4>
        <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center">
          <span className="material-symbols-outlined text-[16px] mr-2">library_books</span>
          {episodes} Episodios
        </p>
      </div>
    </div>
  )
}

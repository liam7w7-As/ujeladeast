export default function SocietyCard({ society, viewMode = 'grid', onClick }) {
  const { name, zone, president_name, photo_url, maps_link } = society;

  if (viewMode === 'list') {
    return (
      <div className="glass-card rounded-2xl p-5 flex items-center gap-5 cursor-pointer group">
        {/* Foto */}
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center border border-surface-border">
          {photo_url ? (
            <img src={photo_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-3xl text-on-surface-variant">church</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base truncate group-hover:text-primary transition-colors">{name}</h3>
          {zone && <p className="text-xs text-on-surface-variant mt-0.5">{zone}</p>}
          {president_name && (
            <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-secondary">person</span>
              {president_name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {maps_link && (
            <a
              href={maps_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container border border-surface-border hover:border-primary/50 hover:text-primary text-on-surface-variant transition-colors"
              title="Ver ubicación"
            >
              <span className="material-symbols-outlined text-[18px]">location_on</span>
            </a>
          )}
          <button
            onClick={() => onClick(society)}
            className="px-4 py-2 rounded-lg bg-primary-container/20 border border-primary-container/30 hover:bg-primary-container/40 text-primary text-xs font-medium transition-colors"
          >
            Ver más
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="glass-card rounded-2xl overflow-hidden cursor-pointer group flex flex-col">
      {/* Foto */}
      <div className="w-full h-44 bg-surface-container-high flex items-center justify-center overflow-hidden relative">
        {photo_url ? (
          <img src={photo_url} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex flex-col items-center justify-center text-on-surface-variant gap-2 w-full h-full bg-gradient-to-b from-surface-container to-surface-container-high">
            <span className="material-symbols-outlined text-5xl opacity-30">church</span>
          </div>
        )}
        {zone && (
          <span className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold text-secondary border border-secondary/50 bg-surface/80 backdrop-blur-sm uppercase tracking-wider">
            {zone}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col gap-4 flex-grow">
        <div>
          <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{name}</h3>
          {president_name && (
            <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary">person</span>
              {president_name}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          {maps_link && (
            <a
              href={maps_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-surface-border hover:border-primary/50 text-on-surface-variant hover:text-primary text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              <span>Ubicación</span>
            </a>
          )}
          <button
            onClick={() => onClick(society)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-container/20 border border-primary-container/40 hover:bg-primary-container/60 text-primary text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>Ver más</span>
          </button>
        </div>
      </div>
    </div>
  );
}

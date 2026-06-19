export default function ChurchCard({ name, pastor, zone, viewMode = 'grid' }) {
  if (viewMode === 'list') {
    return (
      <div className="glass-card rounded-xl p-4 flex flex-row items-center group hover:border-surface-variant transition-colors gap-4">
         <div className="w-16 h-16 bg-surface-container rounded-lg flex items-center justify-center border border-surface-border relative overflow-hidden flex-shrink-0">
           <span className="material-symbols-outlined text-2xl text-on-surface-variant z-10">church</span>
         </div>
         <div className="flex-grow flex justify-between items-center">
           <div>
             <span className="inline-block px-2 py-1 rounded border border-secondary text-secondary font-label-sm text-[10px] mb-1">{zone}</span>
             <h3 className="font-headline-md text-[18px] text-on-surface mb-0 line-clamp-1">{name}</h3>
             <p className="font-body-md text-[14px] text-on-surface-variant flex items-center gap-2 mt-1">
               <span className="material-symbols-outlined text-sm">person</span> {pastor}
             </p>
           </div>
           <div className="flex gap-2">
             <button className="px-4 py-2 bg-primary-container text-white font-label-sm text-label-sm rounded-lg flex items-center gap-2 hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all">
                <span className="material-symbols-outlined text-sm">location_on</span>
             </button>
             <button className="px-4 py-2 border border-surface-border hover:border-secondary text-secondary font-label-sm text-label-sm rounded-lg transition-colors hidden sm:block">
                Ver
             </button>
           </div>
         </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 flex flex-col group hover:border-surface-variant transition-colors">
      <div className="w-full h-32 bg-surface-container rounded-lg mb-4 flex items-center justify-center border border-surface-border relative overflow-hidden">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant z-10">church</span>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      <div className="mb-4 flex-grow">
        <span className="inline-block px-2 py-1 rounded border border-secondary text-secondary font-label-sm text-label-sm mb-2">{zone}</span>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-1 line-clamp-1">{name}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">person</span> {pastor}
        </p>
      </div>
      <div className="flex gap-3 mt-auto">
        <button className="flex-1 bg-primary-container hover:bg-primary-container/80 text-white font-label-sm text-label-sm py-2 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(201,168,76,0.3)]">
          <span className="material-symbols-outlined text-sm">location_on</span> Ver ubicación
        </button>
        <button className="px-4 border border-surface-border hover:border-secondary text-secondary font-label-sm text-label-sm rounded-lg transition-colors">
          Ver más
        </button>
      </div>
    </div>
  )
}

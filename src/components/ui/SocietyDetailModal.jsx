import { useEffect } from 'react';
import { extractCoordsFromMapsLink, buildOSMEmbedUrl } from '../../lib/mapsHelper';

export default function SocietyDetailModal({ society, onClose }) {
  if (!society) return null;

  const { name, zone, president_name, schedule, description, photo_url, maps_link } = society;
  const coords = extractCoordsFromMapsLink(maps_link);
  const osmUrl = coords ? buildOSMEmbedUrl(coords) : null;

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full md:max-w-2xl bg-surface-container-high border border-surface-border rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">

        {/* Foto Header */}
        <div className="relative w-full h-52 shrink-0 bg-surface-container-high overflow-hidden">
          {photo_url ? (
            <img src={photo_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-surface-container to-surface-container-high">
              <span className="material-symbols-outlined text-7xl text-on-surface-variant opacity-20">church</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high/90 via-transparent to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          {/* Zone badge */}
          {zone && (
            <span className="absolute bottom-4 left-4 px-3 py-1 rounded-full text-xs font-bold text-secondary border border-secondary/50 bg-surface/80 backdrop-blur-sm uppercase tracking-wider">
              {zone}
            </span>
          )}
        </div>

        {/* Content scrollable */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6 no-scrollbar">

          {/* Name & President */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
            {president_name && (
              <p className="text-secondary flex items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-[16px]">person</span>
                Presidente de Jóvenes: <span className="font-medium text-white ml-1">{president_name}</span>
              </p>
            )}
          </div>

          {/* Schedule */}
          {schedule && (
            <div className="bg-surface-container rounded-2xl p-4 border border-surface-border">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                Horario de reuniones
              </h4>
              <p className="text-on-surface text-sm leading-relaxed whitespace-pre-line">{schedule}</p>
            </div>
          )}

          {/* Description */}
          {description && (
            <div>
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Descripción</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">{description}</p>
            </div>
          )}

          {/* Map */}
          {osmUrl ? (
            <div>
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                Ubicación
              </h4>
              <div className="rounded-2xl overflow-hidden border border-surface-border">
                <iframe
                  src={osmUrl}
                  width="100%"
                  height="240"
                  loading="lazy"
                  title={`Mapa de ${name}`}
                  className="block"
                  style={{ border: 0 }}
                />
              </div>
            </div>
          ) : coords === null && maps_link && (
            <div className="bg-surface-container rounded-xl p-4 border border-surface-border text-sm text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
              No se pudo extraer el mapa embebido, pero puedes abrirlo directamente.
            </div>
          )}

          {/* Maps button */}
          {maps_link && (
            <a
              href={maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl bg-primary-container hover:bg-primary-container/80 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(143,25,55,0.3)] hover:shadow-[0_0_28px_rgba(143,25,55,0.5)]"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Abrir en Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Configuración de íconos y colores por tipo de archivo
const FILE_CONFIG = {
  PDF:         { icon: 'picture_as_pdf',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  DOC:         { icon: 'description',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  DOCX:        { icon: 'description',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  XLS:         { icon: 'table_chart',     color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  XLSX:        { icon: 'table_chart',     color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  PPT:         { icon: 'co_present',      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  PPTX:        { icon: 'co_present',      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  VIDEO:       { icon: 'smart_display',   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  AUDIO:       { icon: 'music_note',      color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20' },
  IMAGEN:      { icon: 'image',           color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
  ZIP:         { icon: 'folder_zip',      color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  FORMULARIO:  { icon: 'assignment',      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  PRESENTACIÓN:{ icon: 'co_present',      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  DOCUMENTO:   { icon: 'description',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
};

function getFileConfig(type) {
  return FILE_CONFIG[type?.toUpperCase()] || { icon: 'attach_file', color: 'text-on-surface-variant', bg: 'bg-surface-container', border: 'border-surface-border' };
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  return `Hace ${Math.floor(months / 12)} año(s)`;
}

export default function ResourceCard({ resource }) {
  const { title, category, file_type, file_size, file_url, created_at, is_featured } = resource;
  const cfg = getFileConfig(file_type || category);

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 group relative overflow-hidden">
      {is_featured && (
        <span className="absolute top-3 right-3 text-[10px] font-bold text-secondary border border-secondary/40 px-2 py-0.5 rounded-full bg-surface/80 backdrop-blur-sm uppercase tracking-wider">
          Destacado
        </span>
      )}

      {/* File icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
        <span className={`material-symbols-outlined text-2xl ${cfg.color}`}>{cfg.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
          {category && (
            <span className={`font-medium ${cfg.color}`}>{category}</span>
          )}
          {file_type && category !== file_type && (
            <span className="uppercase">{file_type}</span>
          )}
          {file_size && <span>{file_size}</span>}
          {created_at && <span>{timeAgo(created_at)}</span>}
        </div>
      </div>

      {/* Download button */}
      {file_url ? (
        <a
          href={file_url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-container/20 border border-primary-container/40 hover:bg-primary-container hover:shadow-[0_0_15px_rgba(143,25,55,0.4)] text-primary hover:text-white text-sm font-medium transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Descargar
        </a>
      ) : (
        <div className="w-full py-2.5 rounded-xl bg-surface-container border border-surface-border text-on-surface-variant text-sm text-center">
          Sin enlace
        </div>
      )}
    </div>
  );
}

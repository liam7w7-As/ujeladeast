import { useState, useRef } from 'react';
import { useResources } from '../../hooks/useResources';

const CATEGORIES = ['DOCUMENTO', 'FORMULARIO', 'PRESENTACIÓN', 'VIDEO', 'AUDIO', 'OTRO'];

const FILE_CONFIG = {
  PDF:    { icon: 'picture_as_pdf', color: 'text-red-400' },
  DOC:    { icon: 'description',    color: 'text-blue-400' },
  DOCX:   { icon: 'description',    color: 'text-blue-400' },
  PPTX:   { icon: 'co_present',     color: 'text-orange-400' },
  VIDEO:  { icon: 'smart_display',  color: 'text-purple-400' },
  AUDIO:  { icon: 'music_note',     color: 'text-pink-400' },
};

function formatDateShort(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ResourcesAdmin() {
  const { resources, loading, uploading, uploadProgress, error,
          getResources, uploadResource, deleteResource, toggleFeatured } = useResources();

  const [form, setForm] = useState({ title: '', category: 'DOCUMENTO', isFeatured: false });
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'link'
  const [selectedFile, setSelectedFile] = useState(null);
  const [externalLink, setExternalLink] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  // Cargar al montar
  useState(() => { getResources('Todos'); }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const validateLink = (url) => {
    try {
      const parsed = new URL(url);
      const validDomains = ['drive.google.com', 'docs.google.com', 'onedrive.live.com', '1drv.ms', 'dropbox.com', 'mega.nz', 'mediafire.com'];
      return validDomains.some(d => parsed.hostname.includes(d)) || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUpload = async () => {
    setFormError('');
    if (!form.title.trim()) { setFormError('El título es obligatorio'); return; }

    if (uploadMode === 'file') {
      if (!selectedFile) { setFormError('Selecciona un archivo para subir'); return; }
      try {
        setSaveStatus(null);
        await uploadResource({ file: selectedFile, title: form.title, category: form.category, isFeatured: form.isFeatured });
        setSaveStatus('success');
        setForm({ title: '', category: 'DOCUMENTO', isFeatured: false });
        setSelectedFile(null);
        await getResources('Todos');
      } catch (err) {
        setSaveStatus('error');
        setFormError(err.message);
      }
    } else {
      // Link mode — insert directly into DB without uploading to storage
      if (!externalLink.trim()) { setFormError('Pega el link del archivo'); return; }
      if (!validateLink(externalLink)) { setFormError('Pega un link HTTPS válido (Drive, OneDrive, Dropbox, etc.)'); return; }
      try {
        setSaveStatus(null);
        const { supabase } = await import('../../lib/supabase');
        const { error } = await supabase.from('resources').insert([{
          title: form.title.trim(),
          category: form.category,
          file_url: externalLink.trim(),
          file_path: null,
          file_type: 'LINK',
          file_size: 'Externo',
          is_featured: form.isFeatured,
        }]);
        if (error) throw error;
        setSaveStatus('success');
        setForm({ title: '', category: 'DOCUMENTO', isFeatured: false });
        setExternalLink('');
        await getResources('Todos');
      } catch (err) {
        setSaveStatus('error');
        setFormError(err.message);
      }
    }
  };

  const handleDelete = async (resource) => {
    try {
      await deleteResource(resource);
      setDeleteConfirm(null);
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const cfg = (type) => FILE_CONFIG[type?.toUpperCase()] || { icon: 'attach_file', color: 'text-on-surface-variant' };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-bold text-white">Gestión de Recursos</h2>
        <p className="text-sm text-on-surface-variant mt-1">Sube, organiza y administra los archivos del distrito</p>
      </div>

      {/* Upload Form */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border-primary-container/20">
        <h3 className="font-semibold text-white text-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-secondary">upload_file</span>
          Subir nuevo recurso
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mode selector */}
          <div className="md:col-span-2 flex rounded-2xl overflow-hidden border border-surface-border">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                uploadMode === 'file' ? 'bg-primary-container/30 text-primary' : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Subir archivo
            </button>
            <div className="w-px bg-surface-border" />
            <button
              type="button"
              onClick={() => setUploadMode('link')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                uploadMode === 'link' ? 'bg-primary-container/30 text-primary' : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
              Link externo (Drive, OneDrive…)
            </button>
          </div>

          {/* File upload */}
          {uploadMode === 'file' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-8 transition-all min-h-[160px] ${
                dragging ? 'border-primary bg-primary-container/10 scale-105'
                : selectedFile ? 'border-green-500/50 bg-green-500/5'
                : 'border-surface-border hover:border-primary/50 hover:bg-white/2'
              }`}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files[0])} />
              {selectedFile ? (
                <>
                  <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
                  <p className="text-sm font-medium text-green-400 text-center">{selectedFile.name}</p>
                  <p className="text-xs text-on-surface-variant">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs text-red-400 hover:underline">Quitar archivo</button>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">cloud_upload</span>
                  <p className="text-sm text-on-surface-variant text-center">
                    <span className="text-primary font-medium">Haz clic</span> o arrastra un archivo aquí
                  </p>
                  <p className="text-xs text-on-surface-variant/60">PDF, DOCX, PPTX, MP4 · Máx 20MB</p>
                </>
              )}
            </div>
          )}

          {/* External link */}
          {uploadMode === 'link' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">link</span>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://drive.google.com/... o https://onedrive.live.com/..."
                  className="w-full bg-surface-container border border-surface-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60 transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['Google Drive', 'OneDrive', 'Dropbox', 'Mega', 'MediaFire'].map(service => (
                  <span key={service} className="px-2 py-1 rounded-lg bg-surface-container border border-surface-border text-xs text-on-surface-variant">
                    ✓ {service}
                  </span>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/60 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[14px] mt-0.5">info</span>
                Asegúrate de que el link sea público y tenga permisos de "cualquier persona con el link puede ver".
              </p>
            </div>
          )}

          {/* Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Título <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Manual del Líder 2026"
                className="bg-surface-container border border-surface-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Categoría</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full appearance-none bg-surface-container border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/60 transition-all cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.isFeatured ? 'bg-primary-container' : 'bg-surface-container-high'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.isFeatured ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-on-surface-variant group-hover:text-white transition-colors">
                Marcar como recurso destacado
              </span>
            </label>
          </div>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="mt-6">
            <div className="flex justify-between text-xs text-on-surface-variant mb-1">
              <span>Subiendo archivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {formError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {formError}
          </div>
        )}

        {saveStatus === 'success' && (
          <div className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            ¡Recurso subido exitosamente!
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploading || (uploadMode === 'file' ? !selectedFile : !externalLink.trim())}
            className="flex items-center gap-2 px-8 py-3 bg-primary-container hover:bg-primary-container/80 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-all shadow-[0_0_15px_rgba(143,25,55,0.3)]"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">upload</span>
            )}
            {uploading ? 'Subiendo...' : 'Subir Recurso'}
          </button>
        </div>
      </div>

      {/* Resource list */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-surface-border flex justify-between items-center">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">folder_open</span>
            Recursos ({resources.length})
          </h3>
          <button onClick={() => getResources('Todos')} className="text-on-surface-variant hover:text-white transition-colors" title="Recargar">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-3">folder_open</span>
            <p className="text-sm text-on-surface-variant">No hay recursos aún. Sube el primero arriba.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border/50">
            {resources.map(r => {
              const c = cfg(r.file_type);
              return (
                <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container border border-surface-border shrink-0">
                    <span className={`material-symbols-outlined text-[20px] ${c.color}`}>{c.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{r.title}</p>
                    <p className="text-xs text-on-surface-variant flex gap-2 mt-0.5">
                      <span>{r.category}</span>
                      {r.file_size && <span>· {r.file_size}</span>}
                      <span>· {formatDateShort(r.created_at)}</span>
                    </p>
                  </div>

                  {/* Featured toggle */}
                  <button
                    onClick={() => toggleFeatured(r.id, !r.is_featured)}
                    className={`shrink-0 text-xs px-2 py-1 rounded-lg border transition-colors ${
                      r.is_featured
                        ? 'border-secondary/50 text-secondary bg-secondary/10'
                        : 'border-surface-border text-on-surface-variant hover:border-secondary/30 hover:text-secondary'
                    }`}
                    title={r.is_featured ? 'Quitar destacado' : 'Destacar'}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {r.is_featured ? 'star' : 'star_border'}
                    </span>
                  </button>

                  <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
                        title="Ver/descargar"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </a>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(r)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 glass-card rounded-2xl p-6 max-w-sm w-full">
            <span className="material-symbols-outlined text-4xl text-red-400 block mb-4">delete_forever</span>
            <h3 className="font-bold text-white text-lg mb-2">¿Eliminar recurso?</h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Esto eliminará <strong className="text-white">"{deleteConfirm.title}"</strong> del almacenamiento y la base de datos. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-surface-border text-on-surface-variant hover:text-white transition-colors text-sm">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 font-semibold text-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { isValidMapsLink } from '../../lib/mapsHelper';

const EMPTY_FORM = {
  name: '',
  zone: '',
  president_name: '',
  schedule: '',
  description: '',
  photo_url: '',
  maps_link: '',
};

function FormField({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-on-surface-variant/60">{hint}</p>}
    </div>
  );
}

function InputField({ value, onChange, placeholder, type = 'text', error }) {
  return (
    <>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-surface-container border rounded-xl px-4 py-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none transition-all ${
          error ? 'border-red-500/60 focus:border-red-500' : 'border-surface-border focus:border-primary/60'
        }`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </>
  );
}

export default function SocietiesAdmin({ onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [societies, setSocieties] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Photo upload state
  const [photoMode, setPhotoMode] = useState('url'); // 'url' | 'file'
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Upload photo to Supabase storage
  const uploadPhoto = async () => {
    if (!photoFile) return form.photo_url;
    try {
      setUploading(true);
      const ext = photoFile.name.split('.').pop();
      const fileName = `society-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('society-images')
        .upload(fileName, photoFile, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('society-images')
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      throw new Error('Error al subir la foto: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Cargar lista
  const loadSocieties = async () => {
    setListLoading(true);
    const { data } = await supabase.from('societies').select('*').order('name');
    setSocieties(data || []);
    setListLoading(false);
  };

  useEffect(() => {
    loadSocieties();
  }, []);

  // Abrir formulario para nueva
  const handleNew = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setErrors({});
    setSaveStatus(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoMode('url');
    setShowForm(true);
    loadSocieties();
  };

  // Abrir formulario para editar
  const handleEdit = (society) => {
    setForm({
      name: society.name || '',
      zone: society.zone || '',
      president_name: society.president_name || '',
      schedule: society.schedule || '',
      description: society.description || '',
      photo_url: society.photo_url || '',
      maps_link: society.maps_link || '',
    });
    setEditing(society);
    setErrors({});
    setSaveStatus(null);
    setPhotoFile(null);
    setPhotoPreview(society.photo_url || null);
    setPhotoMode(society.photo_url ? 'url' : 'url');
    setShowForm(true);
  };

  // Validar
  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (form.maps_link && !isValidMapsLink(form.maps_link)) {
      newErrors.maps_link = 'El link debe contener "google.com/maps" o "maps.app.goo.gl"';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Guardar
  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      setSaveStatus(null);

      // Si hay archivo seleccionado, subirlo primero
      let finalPhotoUrl = form.photo_url;
      if (photoMode === 'file' && photoFile) {
        finalPhotoUrl = await uploadPhoto();
      }

      const payload = {
        name: form.name.trim(),
        zone: form.zone.trim() || null,
        president_name: form.president_name.trim() || null,
        schedule: form.schedule.trim() || null,
        description: form.description.trim() || null,
        photo_url: finalPhotoUrl || null,
        maps_link: form.maps_link.trim() || null,
      };

      let error;
      if (editing) {
        ({ error } = await supabase.from('societies').update(payload).eq('id', editing.id));
      } else {
        ({ error } = await supabase.from('societies').insert([payload]));
      }

      if (error) throw error;

      setSaveStatus('success');
      setForm(EMPTY_FORM);
      setPhotoFile(null);
      setPhotoPreview(null);
      setEditing(null);
      setShowForm(false);
      loadSocieties();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar
  const handleDelete = async (id) => {
    try {
      setSaving(true);
      const { error } = await supabase.from('societies').delete().eq('id', id);
      if (error) throw error;
      setDeleteConfirm(null);
      loadSocieties();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    error: errors[key],
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header de sección */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Gestión de Sociedades</h2>
          <p className="text-sm text-on-surface-variant mt-1">Agrega, edita o elimina las sociedades del distrito</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-container hover:bg-primary-container/80 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(143,25,55,0.3)]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Sociedad
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="glass-card rounded-2xl border-primary-container/30 bg-primary-container/5 p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-white text-lg">
              {editing ? `Editando: ${editing.name}` : 'Nueva Sociedad'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-on-surface-variant hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Nombre de la sociedad" required>
              <InputField placeholder="Ej: Emanuel" {...field('name')} />
            </FormField>

            <FormField label="Zona / Barrio">
              <InputField placeholder="Ej: Zona Norte, Villa Adela" {...field('zone')} />
            </FormField>

            <FormField label="Presidente de Jóvenes">
              <InputField placeholder="Ej: Juan Carlos Mamani" {...field('president_name')} />
            </FormField>

            <FormField
              label="Link de foto"
              hint="URL directa a la imagen (Google Drive, Imgur, etc.)"
            >
              {/* Mode selector */}
              <div className="flex rounded-xl overflow-hidden border border-surface-border mb-2">
                <button
                  type="button"
                  onClick={() => { setPhotoMode('url'); setPhotoFile(null); setPhotoPreview(form.photo_url || null); }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    photoMode === 'url' ? 'bg-primary-container/30 text-primary' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => { setPhotoMode('file'); }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    photoMode === 'file' ? 'bg-primary-container/30 text-primary' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  Subir archivo
                </button>
              </div>

              {/* URL mode */}
              {photoMode === 'url' && (
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, photo_url: e.target.value }));
                    setPhotoPreview(e.target.value);
                  }}
                  placeholder="https://..."
                  className="w-full bg-surface-container border border-surface-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60 transition-all"
                />
              )}

              {/* File mode */}
              {photoMode === 'file' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-surface-border hover:border-primary/50 rounded-xl py-6 flex flex-col items-center gap-2 text-on-surface-variant hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    <span className="text-sm">{photoFile ? photoFile.name : 'Toca para elegir imagen'}</span>
                    <span className="text-xs opacity-60">JPG, PNG, WebP · Máx 5MB</span>
                  </button>
                </div>
              )}

              {/* Preview */}
              {photoPreview && (
                <div className="relative mt-2 rounded-xl overflow-hidden h-28 bg-surface-container border border-surface-border">
                  <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                      setForm((f) => ({ ...f, photo_url: '' }));
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/70 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-full text-white/80">Vista previa</span>
                </div>
              )}
            </FormField>

            <FormField label="Horario de reuniones" hint="Ej: Viernes 19:00 - Estudio Bíblico de Jóvenes">
              <textarea
                value={form.schedule}
                onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                placeholder="Describe el horario de reuniones de la sociedad..."
                rows={3}
                className="w-full bg-surface-container border border-surface-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60 transition-all resize-y"
              />
            </FormField>

            <FormField label="Descripción">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Breve descripción de la sociedad..."
                rows={3}
                className="w-full bg-surface-container border border-surface-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60 transition-all resize-y"
              />
            </FormField>

            {/* Maps Link - Ancho completo */}
            <div className="md:col-span-2">
              <FormField
                label="Link de Google Maps"
                hint='Pega aquí el link de Google Maps de la sociedad. Debe contener "google.com/maps" o "maps.app.goo.gl"'
              >
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">location_on</span>
                  <input
                    type="url"
                    value={form.maps_link}
                    onChange={(e) => setForm((f) => ({ ...f, maps_link: e.target.value }))}
                    placeholder="https://maps.app.goo.gl/... o https://www.google.com/maps/place/..."
                    className={`w-full bg-surface-container border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-on-surface-variant/50 focus:outline-none transition-all ${
                      errors.maps_link ? 'border-red-500/60' : 'border-surface-border focus:border-primary/60'
                    }`}
                  />
                </div>
                {errors.maps_link && <p className="text-xs text-red-400 mt-1">{errors.maps_link}</p>}
              </FormField>
            </div>
          </div>

          {/* Status feedback */}
          {saveStatus === 'success' && (
            <div className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              ¡Sociedad guardada exitosamente!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              Hubo un error al guardar. Verifica que tengas permisos de admin.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-surface-border">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 rounded-xl border border-surface-border text-on-surface-variant hover:text-white hover:border-white/20 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center gap-2 px-8 py-2.5 bg-primary-container hover:bg-primary-container/80 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(143,25,55,0.3)]"
            >
              {(saving || uploading) ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {uploading ? 'Subiendo foto...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {editing ? 'Guardar cambios' : 'Crear Sociedad'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista de sociedades */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-surface-border flex justify-between items-center">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">church</span>
            Sociedades registradas
          </h3>
          <button
            onClick={loadSocieties}
            className="text-on-surface-variant hover:text-white transition-colors"
            title="Recargar"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>

        {listLoading ? (
          <div className="flex justify-center p-10">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : societies.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-3">church</span>
            <p className="text-sm text-on-surface-variant">No hay sociedades aún. Crea la primera con el botón de arriba.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border/50">
            {societies.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors group">
                {/* Foto miniatura */}
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-surface-container flex items-center justify-center border border-surface-border">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-xl text-on-surface-variant/50">church</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{s.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 flex flex-wrap gap-x-3">
                    {s.zone && <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">location_on</span>{s.zone}</span>}
                    {s.president_name && <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">person</span>{s.president_name}</span>}
                    {s.maps_link && <span className="text-secondary flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">map</span>Con mapa</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(s)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(s)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 glass-card rounded-2xl p-6 max-w-sm w-full border-red-500/20 bg-red-500/5">
            <span className="material-symbols-outlined text-4xl text-red-400 block mb-4">delete_forever</span>
            <h3 className="font-bold text-white text-lg mb-2">¿Eliminar sociedad?</h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Estás a punto de eliminar <strong className="text-white">"{deleteConfirm.name}"</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-surface-border text-on-surface-variant hover:text-white transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 font-semibold transition-colors text-sm"
              >
                {saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

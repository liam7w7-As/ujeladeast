import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Detecta tipo legible por extensión
function detectFileType(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  const map = {
    pdf: 'PDF', doc: 'DOC', docx: 'DOCX',
    xls: 'XLS', xlsx: 'XLSX',
    ppt: 'PPT', pptx: 'PPTX',
    mp4: 'VIDEO', mov: 'VIDEO', avi: 'VIDEO', mkv: 'VIDEO',
    mp3: 'AUDIO', wav: 'AUDIO',
    jpg: 'IMAGEN', jpeg: 'IMAGEN', png: 'IMAGEN', webp: 'IMAGEN',
    zip: 'ZIP', rar: 'ZIP',
  };
  return map[ext] || ext.toUpperCase() || 'ARCHIVO';
}

// Convierte bytes a texto legible
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function useResources() {
  const [resources, setResources] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const getResources = useCallback(async (category = 'Todos') => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (category && category !== 'Todos') {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      setResources(data || []);
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getFeaturedResource = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      setFeatured(data || null);
      return data || null;
    } catch (err) {
      setFeatured(null);
      return null;
    }
  }, []);

  const uploadResource = useCallback(async ({ file, title, category, isFeatured = false }) => {
    if (!file) throw new Error('No se seleccionó ningún archivo');
    if (file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite de 20MB');

    try {
      setUploading(true);
      setUploadProgress(10);
      setError(null);

      // Upload to Storage
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resource-files')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resource-files')
        .getPublicUrl(filePath);

      setUploadProgress(85);

      // Insert DB record
      const { data, error: dbError } = await supabase.from('resources').insert([{
        title: title.trim(),
        category: category || 'DOCUMENTO',
        file_url: publicUrl,
        file_path: filePath, // guardamos path para poder borrar del storage
        file_type: detectFileType(file.name),
        file_size: formatFileSize(file.size),
        is_featured: isFeatured,
      }]).select().single();

      if (dbError) throw dbError;
      setUploadProgress(100);

      // Refresh list
      await getResources();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  }, [getResources]);

  const deleteResource = useCallback(async (resource) => {
    try {
      setError(null);
      // Delete from storage if we have the path
      if (resource.file_path) {
        await supabase.storage.from('resource-files').remove([resource.file_path]);
      }
      // Delete from DB
      const { error } = await supabase.from('resources').delete().eq('id', resource.id);
      if (error) throw error;
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
      if (featured?.id === resource.id) setFeatured(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [featured]);

  const toggleFeatured = useCallback(async (id, value) => {
    try {
      // Unfeature others if featuring this one
      if (value) {
        await supabase.from('resources').update({ is_featured: false }).eq('is_featured', true);
      }
      const { error } = await supabase.from('resources').update({ is_featured: value }).eq('id', id);
      if (error) throw error;
      setResources((prev) => prev.map((r) => ({
        ...r,
        is_featured: value ? r.id === id : (r.id === id ? false : r.is_featured),
      })));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    resources, featured, loading, uploading, uploadProgress, error,
    getResources, getFeaturedResource, uploadResource, deleteResource, toggleFeatured,
  };
}

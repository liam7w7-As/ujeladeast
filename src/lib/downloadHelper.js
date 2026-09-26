/**
 * Descarga un archivo de manera forzada usando un Blob o enlace directo.
 * Maneja enlaces locales, Supabase Storage y servicios en la nube.
 * 
 * @param {string} fileUrl - URL del archivo
 * @param {string} title - Nombre legible para el archivo descargado
 * @param {string} fileType - Tipo o extensión esperada (ej: PDF, DOCX)
 */
export async function downloadResourceFile(fileUrl, title, fileType = '') {
  if (!fileUrl) return;

  // Si es un enlace de Google Drive o visor que no permite CORS
  const isCloudDrive = fileUrl.includes('drive.google.com') ||
                       fileUrl.includes('dropbox.com') ||
                       fileUrl.includes('1drv.ms') ||
                       fileUrl.includes('onedrive.live.com');

  if (isCloudDrive) {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error('Fetch status not ok');
    
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const ext = fileType ? `.${fileType.toLowerCase().replace('.', '')}` : '';
    let fileName = (title || 'recurso').trim().replace(/[/\\?%*:|"<>]/g, '-');
    if (ext && !fileName.toLowerCase().endsWith(ext)) {
      fileName += ext;
    }

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch {
    // Fallback: abrir en nueva ventana o mediante enlace con atributo download
    const fallbackLink = document.createElement('a');
    fallbackLink.href = fileUrl;
    fallbackLink.target = '_blank';
    fallbackLink.rel = 'noopener noreferrer';
    fallbackLink.download = title || 'recurso';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
}

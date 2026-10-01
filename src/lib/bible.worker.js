self.onmessage = async ({ data: asset }) => {
  try {
    const response = await fetch(asset.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo descargar. Revisa tu conexión e intenta otra vez.');
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > asset.unpackedBytes + 1048576) throw new Error('El archivo recibido tiene un tamaño inesperado.');
      chunks.push(value);
      self.postMessage({ type: 'progress', value: Math.min(95, Math.round(received / asset.bytes * 95)) });
    }
    let buffer = await new Blob(chunks).arrayBuffer();
    const magic = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
    if (magic[0] === 31 && magic[1] === 139) {
      if (!self.DecompressionStream) throw new Error('Actualiza tu navegador para abrir esta Biblia.');
      buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const checksum = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    if (buffer.byteLength !== asset.unpackedBytes || checksum !== asset.sha256) throw new Error('La descarga está incompleta o dañada. Inténtalo nuevamente.');
    self.postMessage({ type: 'result', value: JSON.parse(new TextDecoder().decode(buffer)) });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof TypeError ? 'No se pudo leer la descarga. Revisa tu conexión e inténtalo otra vez.' : error.message || 'No se pudo abrir la Biblia.' });
  }
};

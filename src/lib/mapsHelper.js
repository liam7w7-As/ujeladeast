/**
 * Intenta extraer coordenadas lat/lng de un link de Google Maps.
 * Soporta formatos:
 *   - @lat,lng  (ej: @-16.5006,−68.1564)
 *   - ?q=lat,lng
 *   - /place/lat+lng  (maps.app.goo.gl redirige a uno de los anteriores)
 * @param {string} link
 * @returns {{ lat: number, lng: number } | null}
 */
export function extractCoordsFromMapsLink(link) {
  if (!link) return null;

  try {
    // Formato 1: @-16.5006,-68.1564 (el más común en URLs largas de Google Maps)
    const atMatch = link.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Formato 2: ?q=-16.5006,-68.1564
    const qMatch = link.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    // Formato 3: !3d-16.5006!4d-68.1564 (URLs con datos de lugar)
    const placeMatch = link.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Valida si un link es un link válido de Google Maps.
 * @param {string} link
 * @returns {boolean}
 */
export function isValidMapsLink(link) {
  if (!link) return false;
  return link.includes('google.com/maps') || link.includes('maps.app.goo.gl') || link.includes('goo.gl/maps');
}

/**
 * Genera la URL del iframe de OpenStreetMap dado unas coordenadas.
 * @param {{ lat: number, lng: number }} coords
 * @returns {string}
 */
export function buildOSMEmbedUrl({ lat, lng }) {
  const delta = 0.008;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

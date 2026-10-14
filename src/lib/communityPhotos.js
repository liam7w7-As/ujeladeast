export const coverPhoto = {
  name: 'comunidad', title: 'Somos UJELADEA',
  alt: 'J\u00f3venes de UJELADEA reunidos en una fotograf\u00eda de grupo dentro de una iglesia.',
  width: 1600, height: 900,
};
export const communityPhotos = [
  { name: 'encuentro', title: 'La alegr\u00eda de encontrarnos', alt: 'Grupo de UJELADEA en la iglesia Arca de Jes\u00fas, en Senkata, El Alto.', width: 1600, height: 900 },
  { name: 'oracion', title: 'Unidos en oraci\u00f3n', alt: 'J\u00f3venes reunidos en un momento de oraci\u00f3n dentro de una iglesia.', width: 1600, height: 900 },
  { name: 'palabra', title: 'Alrededor de la Palabra', alt: 'Encuentro de UJELADEA con un mensaje desde el p\u00falpito y el nombre de la organizaci\u00f3n al frente.', width: 900, height: 1600 },
  { name: 'unidad', title: 'Una misma fe', alt: 'Comunidad reunida en un c\u00edrculo, tomada de las manos durante la oraci\u00f3n.', width: 1600, height: 900 },
];
export const photoSrc = (photo, width = photo.width) => `/images/community/${photo.name}-${width}.webp`;
export const photoSrcSet = photo => (photo.width === 900 ? [480, 900] : [640, 960, 1600]).map(width => `${photoSrc(photo, width)} ${width}w`).join(', ');

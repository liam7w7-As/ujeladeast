import { studyDay } from './studyTracking.js';

const facts = [
  ['Un nombre que nació en comunidad', 'En Antioquía se llamó cristianos a los discípulos por primera vez.', 'Hechos 11:26', 'ACT', 11, '¿Qué comunica tu forma de vivir sobre tu fe?'],
  ['Fe y trabajo cotidiano', 'Pablo compartía con Aquila y Priscila el oficio de hacer tiendas.', 'Hechos 18:3', 'ACT', 18, '¿Cómo puedes vivir tu fe en lo que haces cada día?'],
  ['Servir también es liderar', 'Jesús se levantó de la cena y lavó los pies de sus discípulos.', 'Juan 13:4-5', 'JHN', 13, '¿A quién podrías servir hoy con un gesto sencillo?'],
  ['Leer para comprender', 'En el camino a Emaús, Jesús explicó a dos discípulos lo que las Escrituras decían acerca de él.', 'Lucas 24:27', 'LUK', 24, '¿Qué pregunta te gustaría explorar al leer la Biblia?'],
  ['Entender lo que leemos', 'Al leer la ley al pueblo, también se explicaba su sentido para ayudar a comprender la lectura.', 'Nehemías 8:8', 'NEH', 8, '¿Qué cambia cuando te detienes a comprender un pasaje?'],
  ['También hay espacio para preguntar', 'A los doce años, Jesús estaba en el templo escuchando a los maestros y haciéndoles preguntas.', 'Lucas 2:46', 'LUK', 2, '¿Qué duda te gustaría conversar con alguien de confianza?'],
  ['Una ayuda que llega a casa', 'Rut recogió espigas y compartió con Noemí lo que había conseguido.', 'Rut 2:17-18', 'RUT', 2, '¿Qué podrías compartir hoy con tu familia?'],
  ['Una amistad que se mueve', 'Cuatro personas llevaron a un hombre paralítico ante Jesús y abrieron el techo para acercarlo a él.', 'Marcos 2:3-4', 'MRK', 2, '¿Cómo puedes acompañar a un amigo que necesita ayuda?'],
  ['Una mujer que escuchó', 'Lidia era comerciante de telas de púrpura; en Filipos escuchó el mensaje que compartía Pablo.', 'Hechos 16:14', 'ACT', 16, '¿Qué te ayuda a escuchar con atención?'],
  ['Buscar un encuentro', 'Zaqueo se subió a un árbol para poder ver a Jesús cuando pasara por allí.', 'Lucas 19:4', 'LUK', 19, '¿Qué pequeño paso puedes dar para acercarte a Jesús?'],
  ['Llamada por su nombre', 'María Magdalena reconoció a Jesús resucitado cuando él la llamó por su nombre.', 'Juan 20:16', 'JHN', 20, '¿Qué significa para ti ser escuchado y reconocido?'],
  ['Una fe que examina', 'Los de Berea examinaban las Escrituras cada día para comprobar el mensaje que habían recibido.', 'Hechos 17:11', 'ACT', 17, '¿Qué puedes hacer para profundizar en lo que aprendes?'],
];

export function dailyBibleFact(now = new Date()) {
  const day = studyDay(now);
  const index = ((day % facts.length) + facts.length) % facts.length;
  const [title, text, reference, book, chapter, question] = facts[index];
  return { day: new Date(day * 86400000).toISOString().slice(0, 10), title, text, reference, book, chapter, question, ai: false };
}

export function parseDailyQuestion(content) {
  try {
    const value = JSON.parse(content).question;
    return typeof value === 'string' && value.trim().length >= 15 && value.length <= 240 && !/[<>]|https?:\/\//i.test(value) ? value.trim() : null;
  } catch { return null; }
}

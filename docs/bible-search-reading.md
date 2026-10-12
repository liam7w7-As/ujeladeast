# Buscador biblico y lectura exacta

## Activacion

No requiere SQL, otra API, variables en Vercel ni una cuenta. Desplegar el
frontend y aceptar la actualizacion de la PWA con conexion. No borrar los datos
del sitio: las versiones ya descargadas se reutilizan.

La lupa del lector abre el buscador. Ejemplos: `Juan 3:16`, `Salmo 23`,
`1 Juan 1:9`, `Filipenses 4:6-7` o `nada me faltara`.

## Busqueda

- Citas: abre libros, capitulos y rangos dentro del mismo capitulo. Una cita
  invalida muestra un error, no se cambia silenciosamente por otro capitulo.
- Palabras: busca todas las palabras en un mismo versiculo o grupo original.
  Omite diferencias de acentos y mayusculas, no hace busqueda semantica con IA.
- Frase exacta: conserva el orden y la proximidad de las palabras, ignorando
  puntuacion. Permite filtrar por libro y elegir la version.
- Los resultados conservan completos los grupos de traducciones como TLA.
  Se muestran hasta 40 por pagina; abrir uno resalta el pasaje en el lector.
- Para buscar en todo el texto se requiere descargar explicitamente esa version,
  tanto en linea como sin conexion. El buscador muestra el tamano y la descarga.
  Una cita en linea solo necesita cargar el libro correspondiente.
- Sin conexion, las citas y las palabras funcionan en las versiones descargadas.
  La busqueda no envia el texto a Supabase, OpenRouter ni otro servicio.
- Se aceptan consultas de 2 a 180 caracteres. No se soportan varias citas
  separadas ni rangos que crucen capitulos en una misma consulta.

## Retomar lectura

- Al volver a `/biblia`, retoma la ultima version, libro, capitulo, versiculo
  y fraccion leida dentro de ese versiculo. No depende de un desplazamiento
  absoluto en pixeles, que cambiaria al ajustar la tipografia o la pantalla.
- Los enlaces que indican un versiculo tienen prioridad al abrirse. Elegir
  otro capitulo inicia su lectura; cambiar de version dentro del mismo capitulo
  o entrar y salir de la comparacion conserva el lugar.
- El cambio de conexion, las fuentes, el tamano de pantalla y la navegacion
  atras/adelante no deben volver a aplicar una posicion inicial antigua.
- Guarda las ultimas 60 posiciones en `localStorage`, cada 250 ms mientras se
  desplaza el lector y al ocultar o salir de la pagina. No sincroniza posiciones
  entre dispositivos o cuentas: es una preferencia de lectura de este navegador.
- Si el navegador bloquea el almacenamiento, muestra un aviso y permite leer.
  Borrar datos del sitio elimina posiciones y descargas locales.
- No marca estudios como completados y no cambia rachas ni criterios del campamento.

## Implementacion y verificacion

Las citas usan el modulo espanol de
[Bible Passage Reference Parser](https://github.com/openbibleinfo/Bible-Passage-Reference-Parser).
El indice usa [MiniSearch](https://github.com/lucaong/minisearch) en un Web Worker:
lee los 66 libros desde IndexedDB, valida los datos y conserva una sola version
en memoria. Cerrar el buscador termina el worker; reabrirlo vuelve a preparar
el indice. No modifica el formato ni el esquema de las descargas.

El service worker incluye el buscador y su worker en la precache de la app.
La primera instalacion/actualizacion de la app necesita internet; despues no
se requiere red para estas funciones con versiones descargadas.

- `node --test tests/*.test.mjs`: incluye las cuatro versiones reales, citas,
  rangos, frases, filtros, paginacion y almacenamiento acotado.
- `tests/bibleSearchResume.browser.mjs`: Chrome, movil/escritorio, persistencia,
  tipografia, comparacion, cambios de conexion, historial, descarga, busqueda
  offline y recarga en frio de la PWA sin peticiones a los archivos biblicos.
- Las pruebas de navegador usan `BIBLE_TEST_URL` (por defecto, la nueva prueba
  usa `http://127.0.0.1:5178`). Para validar offline se necesita el build de
  produccion servido con `vite preview`, no el servidor de desarrollo.

# Preparacion de Biblias

## Alcance

Se prepararon RVR1960, NTV, NVI y TLA. Los originales externos no se modifican.
Los paquetes fuente preparados estan en `data/bible/prepared`, fuera de
`public` y del bundle de React. El lector publico esta en `/biblia` y utiliza
una segunda representacion segura en `public/bibles`, generada a partir del
HTML conservado. Ninguna Biblia completa se descarga automaticamente al
instalar la PWA. No requiere cuenta ni cambios en Supabase.

## Resultado

Tamanos en MB decimales. El espacio descomprimido no es el consumo de memoria
ni el espacio final de IndexedDB; ambos pueden ser mayores.

| Version | Original | Paquete gzip | Descomprimido | Notas |
| --- | ---: | ---: | ---: | ---: |
| RVR1960 | 23.00 | 2.65 | 17.75 | 3784 |
| NTV | 28.86 | 3.37 | 23.31 | 4851 |
| NVI | 27.84 | 3.12 | 21.87 | 2686 |
| TLA | 27.20 | 3.03 | 21.62 | 481 |

Total comprimido: 12.17 MB. Cada paquete contiene 66 libros y 1189 capitulos.
La estimacion previa de 6.28 MB para las cuatro versiones excluia el HTML;
no se utiliza porque perderia informacion que aun no tiene un equivalente
completo en `items`.

## HTML y preservacion

El HTML contiene notas, referencias cruzadas, tablas, disposicion poetica y
marcas de palabras de Jesus. Se conserva literalmente en cada capitulo.
`items`, `rlw_lines`, `np`, los grupos de versiculos y los metadatos editoriales
tambien permanecen intactos. Las notas se extraen adicionalmente como texto
estructurado para facilitar el futuro lector; su formato original sigue en HTML.

Se eliminaron exclusivamente capitulos con el mismo identificador y contenido
completo identico: Abdias, Filemon, 2 Juan, 3 Juan y Judas en RVR1960 y TLA.
Un duplicado con cualquier diferencia detiene el proceso. No se eliminan
versiculos repetidos: pueden ser fragmentos distintos de un mismo versiculo.

La comparacion entre texto de elementos HTML `.verse` y texto de `items` de
tipo `verse` encuentra diferencias en 44 capitulos RVR1960, 44 NTV, 40 NVI y
1 TLA despues de retirar duplicados. Es un diagnostico, no una declaracion de
texto incorrecto: ambos formatos distribuyen encabezados, tablas y fragmentos
de manera distinta. Incluso una coincidencia no demuestra que puedan borrarse
notas, estilos u otros elementos fuera de `.verse`. Los identificadores quedan
en `audit.json`; el HTML se conserva en TODOS los capitulos.

No insertar el HTML fuente directamente con `dangerouslySetInnerHTML`.
El preparador lo analiza con DOMParser en una pagina sin acceso a red y no
ejecuta scripts, pero NO lo sanitiza para su futura visualizacion. El publicador
adicional convierte el DOM en nodos estructurados y comprueba que todo el texto
coincide exactamente. Solo acepta etiquetas de texto y tablas. No conserva
eventos, estilos inline, URLs ni atributos arbitrarios. El lector crea elementos
React con otra lista explicita de etiquetas y muestra las cadenas como texto.

## Formato

Cada archivo `.json.gz` es gzip real, no una respuesta HTTP ya configurada.
Al descomprimirlo se obtiene:

```text
{
  schemaVersion: 1,
  bible: { ...metadatos originales, books: [...] },
  notes: {
    "GEN.1": [{ id, reference, kind, marker, text }, ...]
  }
}
```

`reference` conserva el `data-usfm` completo, incluidos grupos; si una nota
no pertenece a un versiculo, se vincula al capitulo. `id` distingue varias
notas de un mismo versiculo. Las notas no son HTML y deben mostrarse como texto.

`catalog.json` registra tamanos exactos, conteos y SHA-256 del paquete y del
archivo original. `audit.json` registra duplicados, notas, tablas, poesia,
marcas de palabras de Jesus y diferencias de la comparacion diagnostica.

## Reproducir

Requiere Node, Google Chrome y Playwright resoluble por Node, igual que las
pruebas de navegador existentes del proyecto. Playwright no se incluye en el
bundle de produccion. En entornos con runtime externo se puede usar NODE_PATH.

```powershell
node scripts/prepare-bibles.mjs 'RUTA_A_LA_CARPETA_DE_JSON'
node --test tests/bibleData.test.mjs
node tests/bibleData.browser.mjs
```

El preparador valida las cuatro versiones antes de escribir resultados.
Comprueba la descompresion completa y compara cada capitulo original con su
equivalente preparado mediante igualdad profunda. Regenerar sobrescribe solo
los seis archivos generados en `data/bible/prepared`.

## Lector y publicacion

`scripts/publish-bibles.mjs` lee los cuatro paquetes preparados y genera:

- 264 archivos gzip por libro para lectura bajo demanda.
- Cuatro archivos gzip con versiones completas para descarga explicita.
- `src/lib/bibleCatalog.json`: titulos, atribuciones, capitulos, tamanos y hashes.

Los archivos publicados son nodos seguros de lectura, no el HTML original ni
una segunda copia de `items`. Asi se conservan las notas y tablas del HTML sin
duplicar todo el texto. Cada nodo contiene etiqueta, clases de formato,
referencia, hijos y, opcionalmente, dimensiones de celdas. Una etiqueta fuente
desconocida detiene la generacion. Todas las cadenas se comparan con textContent
del DOM original en los 4756 capitulos. Los nodos de notas se muestran en un
dialogo; las tablas permiten desplazamiento horizontal.

| Version | Descarga completa (MB) | JSON descomprimido (MB) |
| --- | ---: | ---: |
| RVR1960 | 1.75 | 8.76 |
| NTV | 2.21 | 12.11 |
| NVI | 2.05 | 11.41 |
| TLA | 2.02 | 11.91 |

Los nombres incluyen hash de contenido. El catalogo se carga con la ruta lazy
del lector. Los `.gz` no estan incluidos en el precache del service worker ni
en la cache de himnarios. Los assets del lector y de su worker SI se precachean
para permitir arranque offline de la PWA.

```powershell
node scripts/publish-bibles.mjs
node --test tests/bibleReader.test.mjs
```

Los resultados generados se versionan. Vercel solo necesita el build habitual:
no ejecuta Chrome ni Playwright. Al regenerar, los archivos de hashes anteriores
se conservan; revisar su uso antes de retirarlos para no romper clientes antiguos.

## Descargas y almacenamiento

Un Web Worker descarga, descomprime y verifica SHA-256 antes de entregar datos.
La cabecera magica identifica gzip: tambien admite respuestas que el navegador
ya haya descomprimido via Content-Encoding. El hash se verifica sobre el JSON
descomprimido. La cancelacion termina el worker y la peticion.

IndexedDB `ujeladea-bible` separa `books` y `versions`. La descarga escribe los
66 libros y el indicador de disponibilidad en una unica transaccion. Un fallo
o falta de espacio revierte ambos. Solo se anuncia disponibilidad al finalizar
la transaccion. El borrado de una version tambien es atomico. Una descarga
anterior no se pierde si falla una actualizacion.

Marcadores, posicion y ajustes son locales al dispositivo, no se sincronizan
con la cuenta. Borrar una version no borra marcadores ni datos de estudios.
Se solicita almacenamiento persistente tras descargar, pero el navegador puede
denegarlo o el usuario puede borrar datos: no se promete permanencia absoluta.
La lectura online mantiene como maximo tres libros en memoria, no guarda una
version completa sin accion del usuario.

## Verificacion del lector

Con un build de produccion servido por Vite preview en el puerto 5181:

```powershell
node tests/bibleReader.browser.mjs
```

`BIBLE_TEST_URL` y `BIBLE_TEST_OUTPUT` permiten cambiar servidor y capturas.
Se verifican 320/390/768/1440 px, selector de version, notas, ajustes, marcadores,
descarga, arranque offline en un libro no visitado, borrado, archivos corruptos,
cancelacion/reintento, tablas, poesia y rollback por falta de espacio.
El chequeo de datos verifica los 264 libros contra sus paquetes completos.

Compatibilidad: se requiere un navegador con Web Workers, Web Crypto,
IndexedDB y DecompressionStream para gzip. La app informa errores de descarga
o almacenamiento; la lectura online sigue disponible si IndexedDB esta bloqueado.

## Favoritos y comparacion

Cada versiculo empieza en un bloque nuevo. Se mantienen las continuaciones,
la poesia y las tablas del documento; los fragmentos vacios no generan filas.
Las opciones aparecen una vez por referencia. Para copiar o guardar se juntan
todos los fragmentos de esa referencia, sin numeros incrustados, notas ni
encabezados de tablas. Los rangos propios de una traduccion (por ejemplo 1-3)
se conservan juntos y nunca se dividen inventando correspondencias.

`bible:verseFavorites` conserva hasta 500 favoritos por dispositivo, incluyendo
texto, version y referencia. `bible:bookmarks` sigue conservando los marcadores
de capitulos anteriores. No hay migracion destructiva ni sincronizacion de
favoritos con Supabase. El dialogo de marcadores separa versiculos y capitulos;
abrir un favorito salta a su referencia y la destaca. La copia incluye cita y
version. Si el portapapeles esta bloqueado, ofrece texto seleccionable y no
anuncia un exito falso. Los fallos de almacenamiento tambien son visibles.

Se pueden comparar dos o tres versiones. Cada columna tiene carga, errores y
scroll independientes; el libro y capitulo se cambian juntos. En pantallas de
hasta 1000 px se navega entre columnas mediante pestanas o desplazamiento
horizontal, manteniendo el scroll vertical de cada una. Cambiar de capitulo
reinicia los paneles. La comparacion funciona offline con versiones descargadas;
una version ausente no bloquea las demas. Los favoritos de versiones diferentes
se guardan por separado aunque tengan el mismo numero de versiculo.

Pruebas adicionales:

```powershell
node --test tests/bibleVerses.test.mjs
node tests/bibleExperience.browser.mjs
```

Se verifican fragmentos, rangos, celdas de tablas, cita copiada, persistencia y
salto a favoritos, scroll independiente, anchos moviles, cambios de capitulo,
errores de portapapeles/almacenamiento y comparacion offline parcial y completa.

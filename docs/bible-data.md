# Preparacion de Biblias

## Alcance

Se prepararon RVR1960, NTV, NVI y TLA. Los originales externos no se modifican.
Los paquetes estan en `data/bible/prepared`, fuera de `public` y del bundle de
React. Este cambio no incorpora un lector, no publica los paquetes como rutas
de la app y no descarga Biblias automaticamente al instalar la PWA.

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
ejecuta scripts, pero NO lo sanitiza para su futura visualizacion. El lector
debera renderizar campos estructurados como texto de React o emplear un
sanitizador mantenido con una lista explicita de etiquetas y atributos.

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

## Integracion pendiente

Antes de crear el lector: resolver la representacion de tablas y poesia,
validar visualmente los capitulos diagnosticados y decidir el reparto por
libros o capitulos. Conservar siempre notas y atribuciones.

La descarga offline debera ser explicita por version, con progreso, checksum,
almacenamiento transaccional y posibilidad de eliminar una version. Evitar
cargar todos los paquetes al iniciar la app. Configurar por separado si el
servidor entrega gzip como archivo o como Content-Encoding para no intentar
descomprimir dos veces una respuesta que el navegador ya haya decodificado.

# Favoritos de la Biblia: activacion

## Un unico paso en Supabase

Ejecutar completo, una sola vez, en el SQL Editor del proyecto:

`supabase/migrations/202610100001_bible_favorites.sql`

No requiere otra API key, variables nuevas en Vercel ni volver a ejecutar las
migraciones de estudios. Usa la sesion de Supabase ya configurada. Esta migracion
no cambia las rachas, el plan anual ni los registros de estudio.

La migracion crea dos tablas con RLS y la funcion `sync_bible_favorites`.
Los clientes no pueden escribir directamente en las tablas; la funcion identifica
al usuario mediante `auth.uid()`, nunca mediante un ID enviado por el cliente.
Los recibos de operaciones evitan que un reintento antiguo restaure un favorito
que ya se elimino. La migracion se puede repetir sin borrar favoritos.

La migracion fue probada en PostgreSQL local. El despliegue del frontend no la
ejecuta automaticamente en produccion.

## Comprobacion tras activarla

1. Entrar con una cuenta y guardar un versiculo o un rango.
2. Abrir Biblia > Marcadores > Versiculos: debe indicar que esta sincronizado.
3. Abrir la misma cuenta en otro dispositivo y comprobar el favorito.
4. Sin internet, guardar o eliminar otro favorito. Se muestra como pendiente.
5. Al reconectar, la cola se envia. Tambien se puede pulsar Sincronizar favoritos.

Si ya se habia abierto la nueva version antes de ejecutar el SQL, basta con
pulsar Sincronizar favoritos o volver a abrir la Biblia. No se borra la cache.
Mientras falta la funcion, guardar funciona localmente y se muestra el aviso
de que la sincronizacion todavia no esta habilitada.

## Comportamiento y privacidad

- Invitados: favoritos en este dispositivo, sin peticiones de sincronizacion.
- Cuentas: cache y cola independientes por usuario; se conserva el uso offline.
- Los favoritos antiguos del dispositivo no se suben automaticamente porque
  podrian pertenecer a otra persona. La opcion Importar favoritos de este
  dispositivo los copia a la cuenta actual y conserva la copia original.
- Limite: 500 favoritos por cuenta o invitado. Un rango cuenta como un favorito.
- Los rangos pertenecen a un solo capitulo y version. Los grupos originales de
  traducciones como TLA se conservan completos.
- Los marcadores de capitulos siguen siendo locales; solo se sincronizan los
  favoritos de versiculos y rangos.
- La lista se actualiza al abrir el lector, regresar a la ventana, reconectar
  o pulsar Sincronizar. No requiere sondeo continuo ni Supabase Realtime.
- Si dos dispositivos cambian el mismo favorito sin conexion, prevalece la
  ultima operacion nueva que reciba el servidor. Reintentar una operacion ya
  confirmada no vuelve a aplicarla.
- No borrar los datos del sitio mientras existan cambios pendientes: aun no
  estan en el servidor. La PWA no necesita borrar datos para actualizarse.
- Las fotos propias se procesan solo en el navegador, hasta 12 MB y 25 MP,
  reducidas a un maximo de 1920 px. No se suben a Supabase ni a servicios de IA.
  La foto elegida se descarta al cerrar el editor; el PNG descargado permanece.

## Verificacion tecnica

- `node --test tests/*.test.mjs`
- `tests/bibleFavorites.sql.mjs`: PostgreSQL aislado mediante PGlite.
- `tests/biblePassages.browser.mjs`: rangos, imagen propia, formatos y pantallas.
- `tests/bibleFavoriteSync.browser.mjs`: sesiones simuladas, importacion,
  sincronizacion entre dispositivos, cola offline y ausencia de migracion.
- Pruebas existentes del lector, comparacion, imagenes y PWA sin conexion.

Los scripts de navegador usan Playwright y Chrome. Se puede indicar el servidor
con `BIBLE_TEST_URL`; por defecto es `http://127.0.0.1:5177`.

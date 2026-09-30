# Seguimiento de estudios

## Avisos del administrador

Ejecutar tambien `migrations/202609300002_admin_notifications.sql` en el SQL
Editor para habilitar el envio de avisos y su historial. Es independiente del
seguimiento de estudios. Vercel tampoco ejecuta este archivo.

Los avisos son notificaciones dentro de la aplicacion, no correo ni push del
navegador. La campana usa la tabla `notifications` existente, actualiza al abrir,
al volver a la ventana y cada minuto mientras esta visible, ademas de Realtime
cuando esta habilitado en Supabase. Conserva las politicas de esa tabla: cada
usuario debe poder leer sus avisos y marcar los propios como leidos.

La funcion de envio comprueba el rol admin y resuelve los destinatarios en el
servidor. La insercion de todo el lote y del historial es atomica. Reintentar el
mismo formulario sin modificarlo reutiliza el identificador y evita duplicados
si se pierde una respuesta; cambiarlo o recargar la pagina inicia otra solicitud.
La tabla de lotes tiene RLS y no se accede directamente desde el navegador.
Probar en Supabase que usuarios normales y anonimos no pueden ejecutar las
funciones administrativas. No se enviaron avisos reales durante el desarrollo.

La busqueda del admin consulta usuarios por nombre, publicaciones por contenido,
recursos y planes por titulo y sociedades por nombre. No necesita SQL nuevo.
`node tests/adminTools.browser.mjs` verifica estos flujos con respuestas simuladas,
con la misma configuracion de Playwright descrita al final de este documento.
`node tests/adminNotifications.sql.mjs` prueba el SQL en PostgreSQL/WASM aislado;
requiere `@electric-sql/pglite` disponible mediante `NODE_PATH`. Comprueba los
permisos, los destinatarios, los reintentos y la reversibilidad de un lote fallido.
No sustituye la comprobacion del esquema y las politicas de Supabase real.

## Activar seguimiento

Ejecutar `migrations/202609300001_admin_study_tracking.sql` en el SQL Editor
del proyecto Supabase de produccion antes de usar `/admin/seguimiento`.
El despliegue de Vercel no ejecuta este SQL automaticamente.

La funcion comprueba `auth.uid()` y el rol en `profiles` en cada llamada.
Devuelve perfiles, rachas generales y fechas de lecciones completadas del plan
seleccionado. No devuelve respuestas, diarios ni conversaciones.
No cambia las politicas existentes ni concede lectura directa de otras tablas.
Requiere que las politicas de `profiles` impidan a usuarios normales cambiar su
propio rol; esa proteccion ya es necesaria para todo el panel de administracion.

Verificacion en produccion:

1. Un administrador puede abrir el seguimiento, elegir un plan y ver tambien
   los perfiles que aun no lo iniciaron.
2. Un usuario sin rol admin recibe un error de permisos al invocar la funcion.
3. La llamada anonima no tiene permiso de ejecucion.
4. Comparar un perfil con sus lecciones completadas y fechas en Supabase.

La racha usa dias de calendario de America/La_Paz. El porcentaje usa el numero
real de lecciones publicadas en cada plan. Cambiar el contenido del plan puede
cambiar su porcentaje. La ultima actividad mostrada es una finalizacion de
leccion, no una visita o inicio de sesion.

No se reconstruyen fechas historicas ya sobrescritas ni XP duplicado anterior.
La finalizacion conserva la primera fecha registrada y evita repetir XP desde
el flujo de la app. Progreso, diario y racha siguen siendo escrituras separadas:
una transaccion de servidor seria necesaria para garantizar su atomicidad ante
fallos de red o clientes externos.

## Pruebas locales

- `node --test tests/studyTracking.test.mjs`: fechas, rachas, porcentajes,
  planes, estados y paginacion.
- `node tests/adminStudyTracking.browser.mjs`: navegador con respuestas
  simuladas de Supabase. Requiere Vite en `http://127.0.0.1:5173`, Playwright
  disponible mediante `NODE_PATH` y Chrome instalado. Se puede configurar
  `TRACKING_TEST_URL`, `TRACKING_TEST_BROWSER` y `TRACKING_TEST_OUTPUT`.
  Verifica listado, filtros, detalle, movil, errores de permisos y
  finalizacion repetida. No escribe datos en Supabase real ni verifica las
  politicas o la funcion SQL en produccion.

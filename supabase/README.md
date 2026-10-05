# Seguimiento de estudios

## Activar el guardado atomico (5 de octubre de 2026)

El frontend detecta `get_study_status` y `complete_study_lesson`. Antes de
instalar el SQL conserva temporalmente el flujo anterior, con sus limitaciones
de guardado separado. No se debe dar por resuelta la racha en produccion hasta
aplicar y verificar `migrations/202610050001_atomic_study.sql` en Supabase.
Un push a Vercel NO ejecuta esa migracion. No hay credenciales de produccion
en este repositorio y las pruebas SQL usan un esquema aislado.

Orden de despliegue:
1. Desplegar este frontend compatible y comprobar que Vercel finaliza.
2. Revisar una copia/backup del esquema y datos. La migracion requiere IDs UUID,
   `user_progress.completed_at` timestamptz, claves unicas user/lesson y user en
   `user_streaks`, y las columnas existentes de lecciones/notificaciones/perfiles.
   Rechaza fechas sin zona horaria: no convierte historia ambigua automaticamente.
3. Ejecutar el SQL completo en el SQL Editor. Es transaccional y repetible.
4. Recargar la app/PWA en los dispositivos: clientes antiguos ya no pueden escribir
   progreso/racha directamente. El nuevo frontend usa las RPC al detectarlas.
5. Con dos cuentas de prueba, verificar lectura propia, preguntas requeridas,
   guardar/reintentar la misma leccion, fallo de red, racha y XP. Comprobar que
   el REST directo no permite escribir/borrar/truncar progreso ni modificar XP.

La finalizacion bloquea por usuario dentro de una transaccion. Fecha, racha y
XP son del servidor; la misma leccion conserva su primera fecha/respuestas y
no vuelve a premiarse. Diferentes lecciones del mismo dia dan XP, no dias extra.
Se mantienen bonos de 7 y 30 dias. El diario opcional sigue siendo independiente,
guardado antes del estudio: si falla, se conserva el borrador para reintentar.
No hay envio automatico offline: se requiere conexion al confirmar, y las
respuestas permanecen en el borrador local si no se recibe confirmacion.

La racha visible del joven y del administrador se calcula de fechas reales de
`user_progress`, agrupadas por America/La_Paz, sin reinicio semanal. Se ignoran
filas sin fecha o futuras. La lectura no modifica respuestas, fechas ni XP
historicos. No se inventan dias perdidos ni se reasignan XP antiguos; revisar
esos casos por separado antes de usar el contador para los premios. El record
tambien se deriva de la historia, y puede diferir de contadores antiguos.
Las politicas existentes deben impedir editar roles propios o lecciones como
usuario normal. La funcion administrativa conserva su control de rol admin.

Si la RPC falla por red/permisos, NO se intenta un guardado alternativo. Solo
una RPC inexistente permite la compatibilidad previa a la migracion. Un fallo
de lectura oculta el contador sin mostrar un cero falso y permite reintentar.
Se refresca al reconectar, volver a la ventana y cada minuto visible.

Pruebas:
- `node tests/studyAtomic.sql.mjs` con PGlite en NODE_PATH: rollback, reintento,
  permisos, validacion, bonos, historia, medianoche y fin de semana. El motor
  aislado serializa consultas: no sustituye una prueba de carga concurrente
  contra un proyecto Supabase de staging con el esquema real.
- `STUDY_ATOMIC_TEST=1 node tests/studyJourney.browser.mjs`: RPC simuladas,
  error de lectura, error de guardado y respuesta perdida sin doble XP.
- Sin esa variable, la misma suite verifica compatibilidad pre-migracion.

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

En el flujo anterior a la migracion atomica no se reconstruyen fechas historicas ya sobrescritas ni XP duplicado anterior.
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

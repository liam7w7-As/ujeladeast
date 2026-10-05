# Seguimiento de estudios

## Activar semanas y dato diario (rediseño del 5 de octubre)

El guardado atomico anterior ya debe estar instalado. Para este rediseño:

1. Ejecutar completo `migrations/202610050002_study_week_unlocks.sql` en el
   SQL Editor. Impide completar una semana si quedan lecciones anteriores del
   mismo plan. No cambia respuestas, fechas, XP ni rachas guardadas. La interfaz
   tambien bloquea las semanas, pero el SQL es necesario para imponer la regla
   a clientes antiguos. No hace falta volver a ejecutar `atomic_study`.
2. Ejecutar completo `migrations/202610050003_daily_bible_fact.sql`. Crea la
   cache diaria con RLS y una reserva exclusiva por fecha. Solo `service_role`
   puede reservar/generar; los usuarios no escriben preguntas ni eligen fechas.
3. En Vercel, variables de entorno de Production, configurar:
   - `SUPABASE_URL`: URL del proyecto (tambien admite la existente `VITE_SUPABASE_URL`).
   - `SUPABASE_SERVICE_ROLE_KEY`: clave privada del servidor, NUNCA con prefijo VITE.
   - `OPENROUTER_API_KEY`: clave privada para este endpoint, sin prefijo VITE.
   - `OPENROUTER_DAILY_MODEL`: identificador de un modelo de OpenRouter que admita
     `response_format: json_object`. Elegir el modelo/cuota en la cuenta del propietario.
4. Volver a desplegar en Vercel al cambiar variables. La primera visita autenticada
   del dia genera la pregunta; todos los demas leen la misma cache. No hay cron
   ni llamadas a IA cuando nadie visita. Si faltan variables o falla el modelo,
   se muestra el dato y pregunta editoriales, sin bloquear el estudio.

Limite: un intento por dia boliviano, con 150 tokens maximos de salida y espera
de 12 segundos al proveedor. Un timeout no se reintenta durante ese dia para
evitar consumos duplicados; la base editorial sigue disponible. No se envia
informacion personal al modelo. Los hechos y referencias son editoriales;
la IA solo propone una pregunta, que puede ser imperfecta y aparece identificada.

La IA del chat anterior todavia usa `VITE_OPENROUTER_API_KEY`, que se incluye
en el JavaScript publico. El nuevo endpoint no usa esa variable ni resuelve
la exposicion preexistente del chat. Migrar ese chat al servidor y rotar la
clave expuesta requiere un cambio separado; no reutilizar una clave privada
de Supabase como variable VITE ni compartirla en el chat.

No se ejecutaron estas migraciones en produccion ni llamadas reales a la IA.
Las pruebas usan PostgreSQL/PGlite aislado y proveedores simulados. Verificar
despues en produccion con dos cuentas que la semana se desbloquea, que existe
una unica fila diaria y que los usuarios normales no pueden modificarla.

Referencias de implementacion: [Vercel Node runtime](https://vercel.com/docs/functions/runtimes/node-js)
y [OpenRouter chat completions](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request).

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
   `user_progress.completed_at` timestamp (UTC) o timestamptz, claves unicas user/lesson y user en
   `user_streaks`, y las columnas existentes de lecciones/notificaciones/perfiles.
   Produccion tiene timestamp sin zona: el propietario confirmo que no hubo
   importaciones y todos los registros proceden de Date.toISOString() de la app.
   Por eso se convierten explicitamente con AT TIME ZONE 'UTC', conservando el
   instante original. No usar esa conversion para datos importados en hora local.
   `user_streaks.last_study_date` puede seguir siendo date; no se cambia su tipo.
3. Ejecutar SOLO `202610050001_atomic_study.sql` completo y actualizado en el SQL
   Editor para esta mejora. Ya incluye admin_study_tracking: no requiere ejecutar
   primero la migracion administrativa anterior. Es transaccional y repetible;
   si ya hay timestamptz, no vuelve a convertirlo. El error de tipo de la primera
   version detuvo la ejecucion antes de cambiar tablas o funciones.
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
- Repetir con `STUDY_LEGACY_SCHEMA=1` para el esquema real timestamp sin zona +
  date: comprueba la conversion UTC, precision, medianoche boliviana y reejecucion
  sin desplazamientos, incluso con otra zona horaria de sesion.
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

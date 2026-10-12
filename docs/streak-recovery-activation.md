# Recuperacion de racha: activacion

## Un paso en Supabase

El guardado atomico de estudios ya debe estar instalado. Ejecutar completo en
el SQL Editor, una sola vez:

`supabase/migrations/202610120001_streak_recovery.sql`

No volver a ejecutar las migraciones antiguas de rachas: reemplazarian la
version ampliada de `get_study_status`. La nueva migracion es transaccional y
se puede repetir sin borrar solicitudes. No requiere claves nuevas, OpenRouter,
cron ni variables en Vercel. El push NO ejecuta SQL en Supabase.

Antes de la migracion, el estudio y las rachas siguen funcionando como antes.
El joven no ve una recuperacion sin soporte del servidor; admin muestra un
aviso de activacion si abre la seccion. Despues del SQL, actualizar la PWA o
volver a Mi estudio; la racha tambien se refresca al regresar a la ventana.

## Reglas

- Un solo dia perdido, con actividad el dia anterior. Dos dias consecutivos
  sin actividad no se pueden recuperar con este procedimiento.
- El dia debe haber terminado en America/La_Paz. Se puede enviar durante las
  48 horas siguientes a su cierre: si falta el 10, se envia el 11 o el 12,
  antes de las 00:00 del 13. El reloj del telefono no decide el plazo.
- Una recuperacion aprobada por cada 30 dias de calendario, medidos entre los
  dias recuperados. No se puede abrir otra mientras haya una revision pendiente.
- Hay una solicitud por usuario y dia. Empezar no gasta la recuperacion;
  un borrador caducado no se envia. Un repaso rechazado no se reabre para ese dia.
- Se asigna el primer estudio pendiente del plan que el joven estaba siguiendo
  al comenzar el dia perdido. Puede ser una leccion que completo despues de ese
  dia. Si ya termino ese plan, se repasa su ultima leccion completada.
- Tres preguntas abiertas: idea central, evidencia en el pasaje y aplicacion
  personal. Cada respuesta requiere 40 caracteres sin espacios y hasta 2000
  caracteres totales. La longitud NO demuestra comprension: revisa un admin.
- No se usa IA para evaluar ni se aprueba automaticamente. Admin debe revisar
  las respuestas y dejar una observacion, tanto al aprobar como al rechazar.
- La solicitud debe enviarse dentro del plazo; admin puede revisarla despues.
  Seguir estudiando mientras se espera mantiene la continuidad. La aprobacion
  no cubre nuevos dias omitidos durante esa espera.

## Dos contadores distintos

La racha personal puede incluir dias recuperados aprobados, identificados en
el calendario. La racha real, la usada por el seguimiento y el campamento, se
calcula exclusivamente con las fechas reales de estudios completados.

La recuperacion no reescribe `user_progress.completed_at`, no cambia respuestas
anteriores, no marca la leccion como completada, no desbloquea semanas y no da
XP ni bonos. Para avanzar el plan se sigue completando el estudio normal.
Un fallo tecnico comprobado requiere una auditoria separada; este repaso no
es un mecanismo para corregir fechas historicas ni conceder premios.

## Recorrido y privacidad

1. Joven: Mi estudio > Recuperar un dia. Releer y responder; se guarda borrador
   en este navegador, separado por usuario y solicitud.
2. Enviar a revision con conexion. Ante una respuesta perdida, reintentar es
   seguro: no crea otra solicitud ni reemplaza las respuestas ya recibidas.
3. Admin: Seguimiento > Recuperaciones > En revision. Abrir, revisar y aprobar
   o rechazar. Los estados aprobados/rechazados conservan el historial.
4. Joven: recibe una notificacion dentro de la app y puede consultar la
   observacion. Mi estudio muestra la racha personal y la real por separado.

Los borradores no se sincronizan entre dispositivos y no se envian solos al
reconectar. Una sesion ya abierta conserva lo escrito al perder conexion.
Abrir el repaso y confirmar el envio requieren internet. Si se bloquea el
almacenamiento local, se avisa antes de cerrar y se bloquea la actualizacion
de la PWA hasta resolver los cambios sin guardar.

Solo el propietario puede leer su solicitud por REST; solo administradores
pueden consultar las de otros y decidir. Las respuestas del repaso se comparten
con admin de forma explicita, nunca el diario privado. Un administrador no
puede aprobar su propia solicitud. Se guardan la copia del contenido, respuestas,
dia perdido, envio, decision, observacion, responsable y fecha de revision.

## Verificacion

- `node --test tests/*.test.mjs`.
- `tests/studyRecovery.sql.mjs`, con PGlite en `NODE_PATH`: reglas temporales,
  RLS/permisos, repeticiones, decisiones concurrentes incompatibles, rollback,
  conservacion de fechas/respuestas/XP y seguimiento real del campamento.
- `tests/studyRecovery.browser.mjs`, con Playwright en `NODE_PATH`: joven/admin,
  movil/escritorio, borradores, fallo de red, respuesta perdida, actualizacion
  PWA, revision y compatibilidad antes de instalar la migracion.
- Las pruebas SQL usan una base aislada y las de navegador simulan Supabase.
  No se aplico la migracion ni se modificaron datos de produccion desde Codex.
  PGlite serializa consultas; probar concurrencia real en staging si se dispone
  de ese entorno. Las RPC bloquean por usuario y cada decision es transaccional.

Tras activar, verificar con una cuenta elegible y otra admin: enviar, revisar,
ver la notificacion y confirmar que el seguimiento conserva la racha real.

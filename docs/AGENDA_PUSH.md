# Notificaciones de agenda

Cada usuario activa cada dispositivo desde Contactos → Agenda. Los avisos se envían
al creador (`lead_notes.created_by`) de una actividad abierta de su propio negocio,
24 horas, 30 minutos y 10 minutos antes. Las actividades creadas por los demás flujos
del portal usan la misma agenda y también participan. No se envían a los clientes.

## Puesta en servicio

1. Instalar las dependencias y ejecutar la migración normal con `npm run db:migrate`.
2. Generar una sola pareja VAPID: `node -e "console.log(require('web-push').generateVAPIDKeys())"`.
   Guardar `publicKey` en `AGENDA_PUSH_VAPID_PUBLIC_KEY` y `privateKey` en
   `AGENDA_PUSH_VAPID_PRIVATE_KEY`, como variables secretas del servidor.
   Nunca subir la clave privada al repositorio. Conservarlas entre despliegues.
3. Configurar `AGENDA_PUSH_VAPID_SUBJECT=mailto:contacto@gosqori.com`.
4. Mantener un proceso Node activo. El servidor revisa la agenda cada 30 segundos.
   Un servicio Render que se suspende por inactividad no garantiza los horarios.
   Si se despliega un worker separado, importar `startAgendaPushWorker`, y establecer
   `AGENDA_PUSH_WORKER_ENABLED=false` en los procesos web que no deben procesar avisos.
5. Servir el portal por HTTPS. En cada dispositivo: Activar → permitir → Enviar prueba.
   En iOS/iPadOS 16.4 o posterior: añadir primero el portal a la pantalla de inicio
   desde Safari y abrir ese icono. Las notificaciones dependen de los permisos, la
   conexión y los ajustes del sistema (por ejemplo, No molestar).

## Comportamiento y límites

- Si Brave muestra «Registration failed - push service error» al activar, revisar
  Configuración → Privacidad y seguridad → Usar servicios de Google para mensajería
  push. Es una preferencia del usuario; el portal no puede cambiarla. Volver a pulsar
  Activar después de habilitarla. Este error ocurre antes de registrar el dispositivo
  en el servidor y no se resuelve con otro despliegue de Supabase o Render.

- Enviar prueba distingue la aceptación del proveedor de la recepción en el navegador.
  Durante doce segundos consulta la notificación de prueba de esta cuenta y comprueba
  su fecha local de recepción; una prueba antigua no sirve como confirmación nueva.
  «Prueba recibida por este navegador» significa que el navegador registró el aviso,
  no que el usuario haya visto un banner: No molestar y los ajustes del sistema pueden
  ocultarlo. Validar visualmente en un computador y un celular reales.
- Los avisos se calculan con `timestamptz`; 24 horas significa exactamente 24 horas
  antes, no el día calendario anterior. No se usa un temporizador de la página.
- Si se crea la actividad o se activa el dispositivo después del horario de un
  recordatorio, ese recordatorio se omite. Se mantienen los avisos futuros.
- La recuperación y los reintentos tienen una ventana de cinco minutos. Después se
  descartan para evitar avisos atrasados. El proveedor puede retrasar la entrega.
- Antes de enviar se vuelve a revisar fecha, estado, negocio, usuario y dispositivo.
  Una modificación posterior a la aceptación por el proveedor no puede retirar
  un aviso que ya está en tránsito.
- Hay registro único por actividad, dispositivo, fecha y anticipación; leases y
  `SKIP LOCKED` evitan procesamiento concurrente. Un fallo entre aceptación del
  proveedor y confirmación en BD puede ocasionar reintento; la etiqueta estable
  reemplaza la notificación en el dispositivo. No se promete entrega exactamente una vez.
- Un cambio de contraseña invalida el dispositivo hasta volver a activarlo. Los
  usuarios o negocios inactivos no reciben avisos. Salir desactiva el dispositivo;
  cerrar la pestaña o vencer la sesión no lo desactiva.
- Las tablas tienen RLS y ningún acceso para `anon`/`authenticated`. Solo el backend
  usa la conexión PostgreSQL privilegiada existente, con filtros de usuario/negocio.
- El service worker no guarda páginas, contactos, credenciales ni respuestas API.
  Solo guarda el identificador de cuenta que puede recibir notificaciones y filtra
  avisos de otras cuentas en dispositivos compartidos.

## Verificación local

`node --test test/agendaPush.test.js test/agendaPushBrowser.test.js test/agendaPushHttp.test.js`

Las pruebas de integración requieren `AGENDA_PUSH_TEST_DATABASE_URL` apuntando
exclusivamente a un PostgreSQL local descartable. Crean un esquema temporal con
fixtures, ejecutan la migración y lo eliminan al terminar. No envían push reales.

Verificado el 29 de septiembre de 2026: 24 pruebas aprobadas, incluyendo PostgreSQL
local, procesamiento concurrente, cambios de estado/fecha/cuenta, reintentos,
revocación y rutas HTTP protegidas. Panel revisado en navegador con los estilos
reales del portal en una vista aislada; a 390 × 844 no hay desbordamiento horizontal.
La entrega real en computador y celular queda pendiente de la puesta en servicio.

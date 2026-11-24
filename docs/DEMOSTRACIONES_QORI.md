# Qori - Ideas para tu negocio

Módulo publicado el 24 de noviembre de 2026, con migración aplicada. La habilitación de reservas es una decisión separada que se guarda desde Administración. No se enviaron correos o WhatsApp reales durante las pruebas.

## Accesos

Vista previa local preparada: **http://127.0.0.1:4877/qa**. Tiene una base independiente `qori_demonstrations_preview_qa`, un reloj fijo al 4 de enero de 2027 y enlaces de acceso a cuentas ficticias de Seller/Admin. Estos accesos existen solo en el servidor de pruebas vinculado a `127.0.0.1`, no en `app.js` ni en el servidor productivo. Para reiniciarlo con esa base ya preparada:

```powershell
& '.\.local-tools\node-v22.23.5-win-x64\node.exe' scripts/preview-demonstrations-local.cjs
```

- Embajador: `/seller/` → **Demostraciones**. En **Mi CRM**, cada contacto abierto tiene **Invitar a demostración**.
- Administrador: `/admin/#demostraciones`. Acceso **Demostraciones · agenda** en la barra superior y en Cuentas Qori; abre directamente el módulo. También disponible al entrar a Seller con la cuenta superadmin.
- Invitación pública: `/demostraciones/?i=<identificador aleatorio>`. Se obtiene desde Seller; no construir el enlace con un UUID de embajador.
- Confirmación privada: `/demostraciones/#reserva=<acceso privado>`. El fragmento no se envía como parte de la URL al servidor ni a Meet. No compartirlo.

El prospecto reserva sin cuenta ni compra. La confirmación incluye el Meet de su ocurrencia y **Ver planes y suscribirme**, que usa el mecanismo firmado existente `prospect_ref` y `advisor`. Si ya existe negocio vinculado, ofrece entrar a su cuenta. Un conflicto ambiguo conserva la reserva y solicita resolución administrativa antes de ofrecer una suscripción atribuida.

## Agenda desde diciembre de 2026

Por instrucción expresa del responsable, la migración `20261124150438_qori_demo_december_open_agenda` cambia el inicio al **1 de diciembre de 2026**, elimina la fecha final y habilita la configuración existente. Conserva cupo, anticipación, canales y reservas previas; no confirma automáticamente los Meet pendientes. La ventana de reservas avanza diariamente, por lo que no representa una fecha de cierre. La actualización `20261124173537_qori_demo_fifteen_day_booking_window` la establece en **15 días** por solicitud expresa, sin alterar reservas existentes ni las demás opciones. El cambio queda auditado.

Cada embajador comparte **un único enlace estable**. Compartir desde CRM o desde una sesión devuelve el mismo formulario. Los enlaces anteriores siguen siendo válidos. En el formulario, el prospecto elige jornada, día y hora; el selector solo muestra ocurrencias disponibles y conserva los datos escritos al cambiar la selección.

En Seller, **Selector rápido de sesión** filtra la agenda y los inscritos.

## Configuración administrativa

1. Abrir `/admin/#demostraciones` y pulsar **Configurar y habilitar**.
2. Revisar modalidad, cupo, primera fecha, anticipación y días visibles. Correo y otras opciones están plegadas.
3. Marcar **He revisado las opciones y apruebo esta configuración**.
4. Pulsar **Guardar y habilitar reservas**. **Guardar sin habilitar** conserva la agenda cerrada.
5. En **Revisar horarios y Meet**, confirmar las dos franjas pendientes si corresponde y usar **Actualizar fechas sin inscritos**. Las otras diez franjas pueden habilitarse antes.

**Ver agenda** muestra fechas e inscritos; **Pausar nuevas reservas** conserva las reservas existentes.

La migración original dejó `approved=false`, `enabled=false` y el canal automático apagado. La migración de diciembre habilita las reservas por la nueva instrucción expresa; los canales conservan su estado. La configuración se muestra como propuesta. Admin debe revisarla, marcar aceptación explícita y guardar antes de publicar horarios.

Propuestas editables: grupal, ocho cupos, dos horas de anticipación, 15 días desde ahora, confirmación al completar el formulario, correo, recordatorios a 24 y una hora, asistencia por Admin/anfitrión autorizado, seguimiento a 24 horas, ventana de conversión de 30 días. El correo requiere además configuración de servidor. WhatsApp automático permanece deshabilitado; **Abrir WhatsApp con texto preparado** es una acción manual.

Las recurrencias empiezan el **1 de diciembre de 2026**, martes, miércoles y jueves. No se adelantan para llenar el horizonte. Duración inicial: 60 minutos. Todos los cálculos y etiquetas usan `America/Bogota`.

| Hora de Colombia | Meet canónico | Estado inicial |
| --- | --- | --- |
| 08:00–09:00 | https://meet.google.com/apc-mdfv-pjz | Confirmado los tres días |
| 10:00–11:00 | https://meet.google.com/hmm-bwho-vxy | Martes confirmado; miércoles y jueves pendientes |
| 14:00–15:00 | https://meet.google.com/djh-wqny-ggd | Confirmado los tres días |
| 16:00–17:00 | https://meet.google.com/xpt-jroa-aec | Confirmado los tres días |

Para las dos franjas pendientes: **Revisar franja**, verificar Meet, marcar confirmación y guardar con motivo; luego **Actualizar fechas sin inscritos**. Esta operación excluye ocurrencias con reservas o historial. Las sesiones existentes con reservas se gestionan individualmente. Una plantilla no modifica silenciosamente sus Meet, cupos ni fechas.

Cambiar Meet de una sesión actualiza su confirmación y prepara aviso. Cambiar fecha/hora conserva el evento anterior y deja las reservas pendientes de aceptación; pueden aceptar, elegir otra sesión o cancelar. Cancelar una sesión impide nuevas reservas; sus asistentes pueden trasladar la reserva a otra disponible. Retirar Meet exige cerrar la sesión o dejarla en borrador. Nunca se reduce su capacidad por debajo de reservas activas.

## Operación del embajador

1. Preguntar qué necesita el negocio: atracción, seguimiento o recompra.
2. Abrir **Demostraciones**, elegir una fecha disponible y **Compartir formulario**, o generar un QR general. Desde CRM se conserva el contexto del contacto sin publicar sus datos.
3. El prospecto completa sus propios datos, elige fecha y obtiene su invitación. El embajador no necesita crearle una cuenta ni pedir contraseñas.
4. Consultar **Mis prospectos inscritos**, filtrar fecha o asistencia y abrir CRM. Las listas no muestran inscritos de otros embajadores.
5. Registrar necesidad, notas y fecha acordada en **Próxima acción**. Se actualizan las notas y `next_contact_at` del CRM existente.
6. Ante una negativa, registrar **No desea contacto posterior**. No se debe seguir invitando desde ese contacto.

La asistencia la registra Admin o un anfitrión elegido expresamente. Un anfitrión ve solo nombre/negocio y estado para esa función; no obtiene acceso global a correos, CRM ni comunicaciones. No se marca ausencia por el mero transcurso del horario.

## Arquitectura y seguridad

- Backend Express, `authRequired`, roles existentes y aprobación de Seller; endpoints privados bajo `/api/seller/demonstrations`. Admin se verifica en cada operación administrativa.
- API pública `/api/demonstrations`: invitación, reserva, recuperación y gestión por secreto. Limitadores de IP y correo; los identificadores de embajador enviados como campos extra son rechazados.
- Se reutilizan `qori_sales_prospects`, `qori_sales_accounts`, `commercialContactSyncService`, auditoría comercial, `prospectReferralService` y el validador de pagos del cierre comercial. No hay otro CRM ni otro ledger de ventas/comisiones.
- `prospectReferralService.referral` admite ahora un cliente transaccional opcional; los llamadores existentes conservan su comportamiento. Esto permite emitir el referido del prospecto nuevo antes de confirmar la transacción.
- Diez tablas privadas `qori_demo_*`: configuración, plantillas, ocurrencias, invitaciones, reservas, accesos, visitas, eventos, incidencias y mensajes. RLS habilitada y sin concesiones directas a `PUBLIC`, `anon` o `authenticated`, conforme al patrón del repositorio y a la [documentación de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Ocurrencia única por plantilla/fecha. Capacidad y traslado se validan con una transacción y bloqueo de agenda compartido, antes de ocupar cupo. Los índices únicos parciales impiden reservas activas duplicadas por correo o prospecto en la misma sesión.
- El bloqueo global de agenda prioriza consistencia para doce sesiones semanales. El envío se serializa con cambios de reserva; un proveedor lento puede demorar la operación hasta su timeout de 15 segundos. Revisar este límite antes de escalar volumen.
- El formulario guarda sus datos y consentimientos en la reserva; no sobrescribe registros existentes. Una coincidencia única de correo normalizado reutiliza el prospecto. Coincidencias ambiguas quedan sin vínculo, visibles solo para Admin, hasta revisión.
- Un origen distinto de invitación nunca reasigna al prospecto. La incidencia conserva origen y propietario. La reasignación continúa en el flujo comercial autorizado, con motivo y auditoría. Si cartera y prospecto dejan de coincidir, se oculta el contacto a ambos embajadores hasta resolverlo.
- Tokens aleatorios de 256 bits, hash para búsqueda, copia cifrada AES-GCM para correo. Gestión inicial: 180 días; recuperación: siete días. El token no sirve como inicio de sesión, token de pago ni acceso a CRM. Los secretos no aparecen en la lista de Seller.
- La idempotencia usa un secreto de solicitud independiente; repetir el mismo correo con otro secreto no devuelve una reserva existente ni sus accesos.
- Las visitas conservan asistencia de sesiones anteriores. El denominador esperado se fija al llegar el inicio, antes de cualquier cambio posterior. Las acciones quedan auditadas.

## Correo, recordatorios y recuperación

Se reutiliza el adaptador Resend de `sellerWelcomeMailService`, sus errores seguros y claves de idempotencia. Los mensajes se registran transaccionalmente en una bandeja específica del módulo. No se usa el correo de un negocio ajeno ni sus credenciales de WhatsApp.

Se necesitan ambas habilitaciones:

1. Admin guarda `email_enabled=true`.
2. Servidor con `QORI_DEMO_EMAIL_ENABLED=true`, `RESEND_API_KEY`, `MARKETING_MAIL_FROM`, `CONTACT_RECIPIENT_EMAIL` y `PUBLIC_APP_URL` correctos. Mantener estable `SELLER_DOCUMENT_ENCRYPTION_KEY` (o el secreto de servidor usado como respaldo).

El worker se integra en `server.js`, ejecuta cada minuto y se detiene ordenadamente. Por defecto no inicia envíos. En pruebas se inyecta un adaptador simulado: ningún destinatario real.

Máximo cinco intentos, espera creciente, clave estable por mensaje y ventana de 23 horas de reintento. Se conserva la carga cifrada durante reintentos. Si el estado de la reserva cambia, se cancelan los pendientes obsoletos y se preparan mensajes nuevos con revisión distinta. Recordatorios cuyo momento ya pasó no se crean. No se envían recordatorios de sesiones canceladas, sin Meet o ya iniciadas.

**Aceptado por proveedor** no acredita entrega ni lectura. Un fallo de correo no deshace una reserva. Admin/embajador pueden consultar incidencias y el prospecto conserva el acceso privado en pantalla. La corrección segura del correo de entrega exige dicho acceso y no cambia su correo de identidad en CRM.

Sin correo operativo, la recuperación por dirección no es posible: la página lo explica y pide guardar el enlace. No se concede acceso manual solo por conocer un correo. Para operación real es recomendable configurar y verificar el canal antes de habilitar la agenda.

## Métricas

Admin puede seleccionar cohorte por fecha original de reserva. Se excluyen reenvíos y reprogramaciones del total de reservas nuevas. Las visitas esperadas de sesiones terminadas son el denominador de asistencia/ausencia; pendientes se muestran aparte. Se separan cambios y cancelaciones del prospecto de los administrativos.

La conversión deduplica por `prospect.business_id`; sin ese vínculo no se inventa identidad por nombre o correo. Reutiliza el validador del cierre comercial para compras de suscripción aprobadas, con monto positivo y `credited_at`, y comprueba el plan comprado y el tipo de orden. Una expiración posterior no borra la conversión; una orden anulada o sin abono no cuenta. La ventana comienza en la primera reserva o asistencia de ese negocio en la cohorte. Se muestran negocios sin identificación y ventanas aún incompletas. Es correlación, no atribución de comisión.

El seguimiento usa la acción vigente de cada reserva y las notas/fecha del CRM. El indicador muestra acciones vencidas completadas dentro de su fecha; no pretende medir todas las tareas comerciales ajenas al módulo.

## Migración y validación local

Archivo idéntico en `database/migrations/20261124131815_qori_commercial_demonstrations.sql` y `supabase/migrations/20261124131815_qori_commercial_demonstrations.sql`. Fue generado con la CLI de Supabase y aplicado únicamente a PostgreSQL local.

Las pruebas usan `127.0.0.1:55441/qori_demonstrations_qa`; necesitan el esquema base actual de Qori. La base de regresión `qori_customer_qa` también es local y separada. No usar `.env` de producción para migrar o ejecutar pruebas.

```powershell
# Verifica o aplica SOLO esta migración a una base QA local con el esquema Qori existente.
& '.\.local-tools\node-v22.23.5-win-x64\node.exe' scripts/verify-demonstrations-local.cjs --apply

# Ejecutar secuencialmente: la primera suite prepara las fixtures para la segunda.
& '.\.local-tools\node-v22.23.5-win-x64\node.exe' --test --test-concurrency=1 test/demonstrations.integration.test.js test/demonstrations.ui.integration.test.js

# Regresiones de mecanismos reutilizados (otra base QA local).
& '.\.local-tools\node-v22.23.5-win-x64\node.exe' --test --test-concurrency=1 test/prospectReferral.integration.test.js test/sellerReferralQr.integration.test.js test/commercialClosure.integration.test.js
```

El verificador rechaza hosts remotos y bases sin nombre `qori_*qa`; no lee `DATABASE_URL` productiva. La migración no debe aplicarse dos veces manualmente: el runner del repositorio conserva el historial en un despliegue posterior.

## Pruebas y límites de evidencia

### Selector de agenda por fecha y hora

En Seller y Administración, selecciona **Fecha de Colombia** para consultar un día. **Hora de inicio** permite acotar una franja o consultar todas las horas. **Solo disponibles para reservar** utiliza la disponibilidad validada por el servidor; no considera reservable una sesión únicamente por estar habilitada. El selector rápido y los prospectos inscritos siguen estos filtros. Cambiar fecha u hora elimina una selección de sesión anterior que impediría ver resultados. **Actualizar agenda** conserva los filtros; **Limpiar fecha y hora** vuelve a mostrar todas las sesiones.

Corrección del selector: 34 pruebas aprobadas, incluyendo fecha/hora tras seleccionar otra sesión, inscritos correspondientes, conservación al actualizar, disponibilidad y resultados vacíos. Revisión en Chrome a 1440, 390 y 320 px con zona Pacific/Auckland y presentación Colombia, sin desplazamiento horizontal. Sin migraciones nuevas ni envíos a prospectos reales.

Resultado final: **31/31** pruebas del módulo e integración de interfaz; **21/21** regresiones de referido, QR y cierre comercial. La migración también se aplicó desde cero sobre el esquema Qori en `qori_demonstrations_schema_qa`: diez tablas con RLS, cero concesiones públicas directas, doce franjas y dos pendientes. Las pruebas no cubren toda la suite histórica del repositorio.

Las suites cubren recurrencias, los cuatro Meet, aprobación pendiente, zona de servidor distinta, límites de fechas, cupo concurrente, idempotencia, conflictos y ambigüedad, referidos, aislamiento, reprogramación y rollback, cancelación, cambios de Meet/fecha, recuperación, fallos/reintentos y recordatorios, asistencia histórica, seguimiento, RLS y conversión con pago verificado. UI con JSDOM usa HTTP y PostgreSQL reales locales: formulario, error conservando datos, confirmación, enlace de suscripción, cambio de sesión, navegación Seller y navegación Admin.

Revisión visual en Chrome con superficies de 390 y 320 px: landing y formulario; reserva completa realizada a 390 px, confirmación con Meet y suscripción visibles en el árbol de accesibilidad. Se corrigió la fecha seleccionada para mostrarla completa fuera del selector y el desplazamiento al inicio de la confirmación. No es prueba en un teléfono físico. La reprogramación se verificó por UI automatizada/HTTP, no mediante un teléfono físico. No se entró a las reuniones Meet ni se verificó correo real.

## Procedimiento de publicación

1. Revisar y preparar los cambios acotados; el checkout contiene trabajo previo ajeno al módulo.
2. Ejecutar migración por el procedimiento habitual y verificar permisos, sin habilitar la agenda automáticamente.
3. Publicar los assets y las rutas, verificar SHA y salud mediante el procedimiento de Qori.
4. Revisar configuración, dos franjas pendientes, enlaces y capacidad; guardar aprobación.
5. Configurar correo y probar únicamente con destinatarios autorizados; revisar entrega y recuperación.
6. Ejecutar recorrido móvil publicado y luego habilitar agenda. La publicación del módulo no aprueba la configuración ni activa los canales de comunicación.


## Inscripción directa o acompañada · ventana de 15 días

El embajador conserva un único enlace y QR. En **Seller → Demostraciones**, **Copiar enlace** permite enviarlo al prospecto; **Abrir mi formulario** abre ese mismo formulario para completar sus datos con su autorización. Se eligen jornada, día y hora entre las sesiones que devuelve el servidor. El formulario muestra el límite exacto en hora de Colombia. Deben utilizarse el nombre y correo del prospecto, nunca los del embajador por comodidad.

Verificación de esta actualización: 36 pruebas aprobadas. Los recorridos directo y acompañado usan HTTP y PostgreSQL locales; se comprobó la agenda del propietario, el Meet elegido, la asociación de suscripción y el formulario vacío para la siguiente persona. Chrome a 1440, 390 y 320 px, zona Pacific/Auckland: sin desbordamiento horizontal, reserva ficticia completa y confirmación correcta. Sin destinatarios reales ni prueba en teléfono físico.

Al guardar, la confirmación muestra el Meet de la sesión y el acceso de gestión. El embajador debe entregar este acceso al prospecto; el estado del correo se muestra por separado. **Inscribir a otro prospecto** abre un formulario vacío sin modificar la reserva anterior. Seller conserva los inscritos en su fecha y hora y la asociación comercial habitual.

Administración: la migración auditada cambia únicamente `horizon_days` a 15. No cancela ni elimina reservas posteriores ya existentes, no cambia los Meet pendientes y no activa canales. El horizonte es móvil: ahora + 15 días; el servidor también rechaza solicitudes directas fuera de esa ventana. Continúa el inicio del 1 de diciembre de 2026 sin fecha final. Validación local: `node scripts/verify-demonstrations-local.cjs --apply` sobre una base QA local, seguido de las suites de demostraciones. Publicación mediante el runner de migraciones existente.


### Invitación única visible en Seller

La tarjeta superior muestra un único enlace y QR permanentes por embajador. **Abrir mi formulario** sirve para inscribir al prospecto con su autorización; **Copiar enlace** y **Compartir enlace** usan exactamente ese mismo acceso. **Compartir QR** abre las opciones del dispositivo cuando admite imágenes; **Descargar QR** permite guardarlo y adjuntarlo manualmente. Si no se admite compartir enlaces, se ofrece la copia; si no se admiten imágenes, se indica la descarga. Cerrar el selector de compartir no se presenta como un envío completado.

Se retiraron los botones de invitación repetidos dentro de sesiones e inscritos de Demostraciones. El acceso contextual desde CRM conserva sus controles de autorización. No hay nuevos enlaces por fecha: el formulario elige entre las sesiones disponibles de los próximos 15 días. No se cambian reservas ni configuración administrativa.

Validación: 37 pruebas aprobadas. Compartir archivo/enlace, cancelación y alternativas se verificaron con adaptadores del navegador simulados; la interfaz real y apertura del formulario se revisaron en Chrome a 1440, 390 y 320 px, sin desbordamiento horizontal y con QR cargado. No se enviaron mensajes ni archivos a contactos reales; el selector nativo de aplicaciones depende del dispositivo.


### Cuenta administrativa dentro de Seller

La tarjeta personal de invitación se muestra en `/seller/#demostraciones` también cuando la cuenta tiene permisos de administrador. El rol administrativo ya no la oculta. Se conserva el enlace de la cuenta autenticada, validado por el servicio existente, y los controles administrativos siguen disponibles. En `/admin/#demostraciones` se mantiene la vista de administración global. Esta distinción es de presentación y no cambia permisos ni atribución.

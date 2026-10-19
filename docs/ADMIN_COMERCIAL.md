# Admin comercial de Qori

Acceso: `/admin/`. El superadmin puede conservar su rol y negocio anteriores: el permiso de plataforma se evalúa desde la base de datos y se activa solo en las rutas administrativas.

## Operación

1. **Equipo:** crear vendedores definiendo su nombre, correo de acceso, contraseña inicial (mínimo 10 caracteres) y confirmación. Entregarles las credenciales mostradas una sola vez. Desactivar o archivar impide el acceso y conserva su historial. El vendedor puede cambiar su contraseña desde el admin.
2. **Beneficios autorizados:** definir planes, porcentaje y duración del descuento, días de prueba, tickets, módulos y cupos adicionales. Cada autorización tiene vencimiento y puede asignarse a un vendedor o a todo el equipo. No hay descuentos preautorizados por defecto.
3. **Prospectos:** registrar contacto, etapa, notas y próxima gestión. Crear una oferta, usando una autorización para cargar sus condiciones. El vendedor puede reducirlas o solicitar una excepción.
4. **Ofertas y excepciones:** las ofertas de nuevos clientes que respetan una autorización vigente se aprueban automáticamente. Las excepciones y cambios de clientes existentes requieren aprobación individual del superadmin. Aplicar una oferta crea el negocio y su propietario, o actualiza el cliente existente. Las credenciales nuevas se muestran una sola vez.
5. **Clientes:** consultar suscripciones, asignar cartera, suspender/reactivar y revocar beneficios con motivo. Las operaciones avanzadas conservan la administración existente de planes, negocios y convenios.
6. **Ficha e historial:** desde Equipo, abrir **Ver ficha e historial** para consultar contacto, estado, fechas de acceso comercial, prospectos por etapa, seguimientos vencidos, ofertas y clientes. Sus accesos directos filtran las listas y el historial por vendedor, incluidos los dados de baja. El selector **Ver trabajo de** permite cambiar de vendedor o consultar todo el equipo. El vendedor dispone de **Mi ficha** y **Mi historial**, limitados a su cartera actual.

### Usuarios del portal con acceso al admin

En **Equipo de ventas → Habilitar usuario existente**, el superadmin busca el correo exacto, revisa el nombre y negocio de la cuenta y define una nueva contraseña con confirmación. Inicialmente recibe **Vendedor Qori**, con permisos para registrar prospectos, inscribir Descubre y preparar/aplicar ofertas autorizadas. Después el superadmin puede personalizar estas acciones desde **Roles y permisos**.

Se conservan el ID, correo, negocio, sede y rol original del portal. Admin y Portal empresa comparten la cuenta y la contraseña: asignar una nueva cierra las sesiones anteriores. Desde **Gestionar** también se puede definir otra contraseña o conservar la actual.

Suspender o dar de baja el permiso comercial de un usuario existente retira solo su acceso al admin. Su cuenta del portal sigue activa. Los cambios de acceso comercial quedan en el historial sin contraseñas.

### Roles y permisos

En **Equipo de ventas → Roles y permisos**, solo un superadministrador puede elegir **Superadministrador**, **Vendedor con permisos configurables** o **Sin acceso al admin**. El superadministrador tiene acceso completo, incluida la gestión de otros administradores y las operaciones avanzadas. Para crear uno nuevo, primero crea o habilita su cuenta y después cambia su rol.

Los vendedores admiten tres permisos de acción: gestionar sus prospectos, inscribir Descubre y gestionar sus ofertas. Siempre consultan exclusivamente su trabajo y cartera asignada. Consultar o administrar todo el equipo, gestionar autorizaciones y clientes, aprobar excepciones y consultar el historial global exige el rol Superadministrador. Las concesiones globales antiguas guardadas para vendedores se ignoran en cada petición; no amplían su acceso.

Los vendedores no pueden administrar otros usuarios ni modificar roles. Un superadmin no puede cambiar su propio acceso. Los cambios de roles se serializan y vuelven a comprobar al actor para impedir que dos superadmins se degraden simultáneamente y dejen el sistema sin administrador.

Guardar un cambio de acceso exige motivo, conserva la contraseña, cierra sesiones anteriores e invalida enlaces pendientes para restablecerla. El servidor consulta los permisos actuales en cada petición; no confía en los roles ni permisos enviados por el navegador o en claims antiguos del token. `admin_permissions = null` conserva el vendedor estándar anterior; `[]` retira todas las acciones configurables. El usuario mantiene acceso de consulta a su cartera y a los enlaces públicos de venta.

## Reglas

### Muestra Descubre

En el inicio del admin, **Inscribir gratis · Descubre** registra directamente al negocio y a su propietario con los mismos datos de la inscripción pública. Empresa es opcional para persona natural. El vendedor debe registrar la aceptación del titular de los términos y privacidad. La clave se define durante la inscripción y nunca se guarda en el historial comercial.

El acceso inicia inmediatamente y vence a los **30 días**, sin cobro automático ni días de gracia. Incluye todos los módulos, **25 tickets iniciales de entrega única, 10 afiliados, 10 Gift Cards totales y 100 MB**. La muestra permite **hasta 10 programas de sellos, con tarjetas ilimitadas en cada programa**; el resto de módulos conserva cupos pequeños definidos en el catálogo canónico. Los límites se validan en el servidor. Reintentar la misma inscripción no duplica negocio, usuario o tickets.

**Una sola muestra por NIT o cédula, para siempre.** `qori_descubre_documents` conserva el documento normalizado (sin espacios, puntos ni guiones, en minúsculas), el negocio original y la fecha de otorgamiento. La reserva se registra en la misma transacción que el alta: solicitudes simultáneas con correos diferentes solo pueden obtener una muestra. El historial es privado, tiene RLS y no concede acceso a `PUBLIC`, `anon` o `authenticated`; no se elimina en cascada al borrar un negocio. Cambiar correo, nombre, documento de facturación, estado o plan no libera el documento original.

La migración incorpora negocios que ya tienen Descubre o antecedentes en sus metadatos/auditoría, incluidos los que pasaron a un plan de pago. Ni vendedores ni superadmins pueden reasignar o renovar Descubre desde el cambio genérico de plan; las primeras muestras se crean exclusivamente desde **Inscribir gratis · Descubre**. Reintentar la misma solicitud devuelve la cuenta original con su vencimiento original, incluso si ya expiró. La conversión al plan pagado conserva el negocio y sus datos.

El negocio queda en la cartera del vendedor y su prospecto se marca como inscrito. El titular entra en `/empresa/` con el email y la clave definidos; el primer acceso abre Tarjetas de sellos. Al terminar la muestra conserva sus datos y puede elegir un plan y pagar desde Cuenta mediante el checkout existente de Mercado Pago.

**Vender suscripción** ofrece enlaces de inscripción para los cuatro planes pagados con el vendedor identificado. El cliente queda asociado a su cartera, pero su acceso pagado solo se activa cuando se aprueba el pago. Un cliente ya inscrito en Descubre debe pagar desde su cuenta para conservar el negocio y sus datos. Las ofertas, descuentos y excepciones continúan sujetos a las autorizaciones del superadmin.

Pruebas integrales adicionales: `test/descubre.integration.test.js` y `test/existingSeller.integration.test.js`, con la misma base local aislada y bandera de QA descritas abajo. Simulan pagos sin llamadas externas y comprueban el rol de negocio, el permiso comercial, la retirada del acceso y el aislamiento entre clientes.

- Cada vendedor solo consulta y opera sus prospectos, ofertas y clientes asignados. Los filtros, identificadores y permisos enviados por el navegador no pueden ampliar ese alcance. El historial incluye también las gestiones del supervisor sobre su cartera actual.
- Reasignar un cliente retira inmediatamente el acceso del vendedor anterior, incluidos prospectos convertidos, ofertas y reintentos de inscripción. Las ofertas pendientes del cliente se cancelan; para reasignar un prospecto es necesario cerrar sus ofertas pendientes primero. El superadmin conserva el historial, con el responsable anterior y el nuevo en las nuevas reasignaciones.
- Las nuevas ediciones de prospectos y vendedores registran los campos modificados con su valor anterior y nuevo. Los registros anteriores muestran los datos que se guardaron en su momento; no se reconstruyen cambios que nunca se auditaron. Nunca se muestran contraseñas ni hashes en la ficha o historial.
- Cambiar o desactivar una autorización invalida las ofertas pendientes de aplicación que dependían de su versión anterior. Los acuerdos ya aplicados se conservan hasta su vencimiento o revocación explícita.
- Los días de prueba vencen sin los días de gracia de una suscripción pagada. Sin prueba, el alta queda pendiente de pago.
- Los módulos y cupos se validan en el servidor y caducan. Las condiciones nuevas reemplazan las anteriores; no se acumulan automáticamente.
- Los descuentos temporales se aplican al precio real de renovación manual. Durante la promoción no se inicia un débito recurrente que pudiera perpetuar el descuento. Un cliente con débito automático autorizado debe desactivarlo antes de cambiar sus condiciones.
- Los convenios vitalicios se mantienen en la gestión avanzada. No se convierten automáticamente en suscripciones mensuales.
- No se envían correos ni se efectúan cobros al registrar una oferta.

## Alta de superadmin

Ejecutar `node scripts/create-qori-superadmin.js` con `DATABASE_URL`, `DB_SSL`, `QORI_SUPERADMIN_NAME`, `QORI_SUPERADMIN_EMAIL` y `QORI_SUPERADMIN_PASSWORD` definidos en el entorno. Para una cuenta existente, exigir `QORI_SUPERADMIN_UPGRADE_EXISTING=true`; conserva su identificador, rol de negocio e historial. Nunca guardar credenciales en Git.

## Verificación

Pruebas unitarias: `node --test test/commercialAuthorization.test.js test/subscriptionPlanEnforcement.test.js test/publicPlanMercadoPagoCheckout.test.js`.

La integración `test/commercialAdmin.integration.test.js` exige `QORI_COMMERCIAL_QA=true` y una base local aislada en `127.0.0.1:55439`. Crea datos exclusivamente de prueba y verifica aislamiento, autorizaciones, vencimientos, aplicación concurrente e idempotencia, roles y auditoría. No ejecutar contra producción.

`test/adminPermissions.integration.test.js` usa la misma base aislada y verifica permisos de acción, rechazo de concesiones globales a vendedores, promoción/degradación, revocación, conservación del portal, manipulación de tokens y degradación concurrente de administradores. `test/adminSellerScope.integration.test.js` comprueba fichas, filtros, conteos, historial propio paginado, cambios antes/después y pérdida de acceso tras reasignar prospectos o clientes, incluidos reintentos de Descubre.

`test/descubreEligibility.integration.test.js` comprueba bloqueo por documento, vencimiento, cambios de datos, concurrencia, recuperación del historial previo y conservación del antecedente tras eliminar el negocio. Ejecutar únicamente con la misma base local de QA.

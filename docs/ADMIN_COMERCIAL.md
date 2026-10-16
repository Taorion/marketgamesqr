# Admin comercial de Qori

Acceso: `/admin/`. El superadmin puede conservar su rol y negocio anteriores: el permiso de plataforma se evalúa desde la base de datos y se activa solo en las rutas administrativas.

## Operación

1. **Equipo:** crear vendedores definiendo su nombre, correo de acceso, contraseña inicial (mínimo 10 caracteres) y confirmación. Entregarles las credenciales mostradas una sola vez. Desactivar o archivar impide el acceso y conserva su historial. El vendedor puede cambiar su contraseña desde el admin.
2. **Beneficios autorizados:** definir planes, porcentaje y duración del descuento, días de prueba, tickets, módulos y cupos adicionales. Cada autorización tiene vencimiento y puede asignarse a un vendedor o a todo el equipo. No hay descuentos preautorizados por defecto.
3. **Prospectos:** registrar contacto, etapa, notas y próxima gestión. Crear una oferta, usando una autorización para cargar sus condiciones. El vendedor puede reducirlas o solicitar una excepción.
4. **Ofertas y excepciones:** las ofertas de nuevos clientes que respetan una autorización vigente se aprueban automáticamente. Las excepciones y cambios de clientes existentes requieren aprobación individual del superadmin. Aplicar una oferta crea el negocio y su propietario, o actualiza el cliente existente. Las credenciales nuevas se muestran una sola vez.
5. **Clientes:** consultar suscripciones, asignar cartera, suspender/reactivar y revocar beneficios con motivo. Las operaciones avanzadas conservan la administración existente de planes, negocios y convenios.
6. **Historial:** revisar quién creó, autorizó o aplicó cada cambio.

### Usuarios del portal con acceso al admin

En **Equipo de ventas → Habilitar usuario existente**, el superadmin o un usuario autorizado para crear vendedores busca el correo exacto, revisa el nombre y negocio de la cuenta y define una nueva contraseña con confirmación. Inicialmente recibe **Vendedor Qori**, con permisos para registrar prospectos, inscribir Descubre y preparar/aplicar ofertas autorizadas. Después el superadmin puede personalizar su acceso desde **Roles y permisos**.

Se conservan el ID, correo, negocio, sede y rol original del portal. Admin y Portal empresa comparten la cuenta y la contraseña: asignar una nueva cierra las sesiones anteriores. Desde **Gestionar** también se puede definir otra contraseña o conservar la actual.

Suspender o dar de baja el permiso comercial de un usuario existente retira solo su acceso al admin. Su cuenta del portal sigue activa. Los cambios de acceso comercial quedan en el historial sin contraseñas.

### Roles y permisos

En **Equipo de ventas → Roles y permisos**, solo un superadministrador puede elegir **Superadministrador**, **Vendedor con permisos configurables** o **Sin acceso al admin**. El superadministrador tiene acceso completo, incluida la gestión de otros administradores y las operaciones avanzadas. Para crear uno nuevo, primero crea o habilita su cuenta y después cambia su rol.

Los vendedores admiten 12 permisos independientes: gestionar prospectos, inscribir Descubre, gestionar ofertas, consultar equipo, crear vendedores, editar vendedores/contraseñas, suspender o dar de baja vendedores, gestionar autorizaciones comerciales, aprobar excepciones, gestionar clientes, trabajar con toda la cartera y consultar el historial global. Editar el estado desde Gestionar requiere tanto editar vendedores como suspender/dar de baja. Las acciones sobre prospectos, ofertas y clientes siguen restringidas a la cartera asignada salvo que se autorice toda la cartera. Poder consultar toda la cartera no concede las acciones de escritura.

Los gestores delegados solo pueden administrar vendedores sin permisos adicionales; nunca pueden modificar roles ni restablecer credenciales de usuarios privilegiados. Un superadmin no puede cambiar su propio acceso. Los cambios de roles se serializan y vuelven a comprobar al actor para impedir que dos superadmins se degraden simultáneamente y dejen el sistema sin administrador.

Guardar un cambio de acceso exige motivo, conserva la contraseña, cierra sesiones anteriores e invalida enlaces pendientes para restablecerla. El servidor consulta los permisos actuales en cada petición; no confía en los roles ni permisos enviados por el navegador o en claims antiguos del token. `admin_permissions = null` conserva el vendedor estándar anterior; `[]` retira todas las acciones configurables. El usuario mantiene acceso de consulta a su cartera y a los enlaces públicos de venta.

## Reglas

### Muestra Descubre

En el inicio del admin, **Inscribir gratis · Descubre** registra directamente al negocio y a su propietario con los mismos datos de la inscripción pública. Empresa es opcional para persona natural. El vendedor debe registrar la aceptación del titular de los términos y privacidad. La clave se define durante la inscripción y nunca se guarda en el historial comercial.

El acceso inicia inmediatamente y vence a los **30 días**, sin cobro automático ni días de gracia. Incluye todos los módulos, **25 tickets iniciales de entrega única, 10 afiliados, 10 Gift Cards totales y 100 MB**. La muestra permite **hasta 10 programas de sellos, con tarjetas ilimitadas en cada programa**; el resto de módulos conserva cupos pequeños definidos en el catálogo canónico. Los límites se validan en el servidor. Reintentar la misma inscripción no duplica negocio, usuario o tickets.

El negocio queda en la cartera del vendedor y su prospecto se marca como inscrito. El titular entra en `/empresa/` con el email y la clave definidos; el primer acceso abre Tarjetas de sellos. Al terminar la muestra conserva sus datos y puede elegir un plan y pagar desde Cuenta mediante el checkout existente de Mercado Pago.

**Vender suscripción** ofrece enlaces de inscripción para los cuatro planes pagados con el vendedor identificado. El cliente queda asociado a su cartera, pero su acceso pagado solo se activa cuando se aprueba el pago. Un cliente ya inscrito en Descubre debe pagar desde su cuenta para conservar el negocio y sus datos. Las ofertas, descuentos y excepciones continúan sujetos a las autorizaciones del superadmin.

Pruebas integrales adicionales: `test/descubre.integration.test.js` y `test/existingSeller.integration.test.js`, con la misma base local aislada y bandera de QA descritas abajo. Simulan pagos sin llamadas externas y comprueban el rol de negocio, el permiso comercial, la retirada del acceso y el aislamiento entre clientes.

- Por defecto cada vendedor solo consulta y opera sus prospectos, ofertas y clientes asignados. Los permisos adicionales se conceden expresamente; las operaciones avanzadas siguen siendo exclusivas del superadmin.
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

`test/adminPermissions.integration.test.js` usa la misma base aislada y verifica permisos separados, promoción/degradación, revocación, conservación del portal, manipulación de tokens, protección de credenciales privilegiadas y degradación concurrente de administradores.

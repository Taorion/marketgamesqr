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

En **Equipo de ventas → Habilitar usuario existente**, el superadmin busca el correo exacto, revisa el nombre y negocio de la cuenta y define una nueva contraseña con confirmación. El permiso adicional es siempre **Vendedor Qori**: no permite gestionar vendedores, aprobar excepciones ni acceder a operaciones avanzadas.

Se conservan el ID, correo, negocio, sede y rol original del portal. Admin y Portal empresa comparten la cuenta y la contraseña: asignar una nueva cierra las sesiones anteriores. Desde **Gestionar** también se puede definir otra contraseña o conservar la actual.

Suspender o dar de baja el permiso comercial de un usuario existente retira solo su acceso al admin. Su cuenta del portal sigue activa. Los cambios de acceso comercial quedan en el historial sin contraseñas, y solo el superadmin puede efectuarlos.

## Reglas

### Muestra Descubre

En el inicio del admin, **Inscribir gratis · Descubre** registra directamente al negocio y a su propietario con los mismos datos de la inscripción pública. Empresa es opcional para persona natural. El vendedor debe registrar la aceptación del titular de los términos y privacidad. La clave se define durante la inscripción y nunca se guarda en el historial comercial.

El acceso inicia inmediatamente y vence a los **30 días**, sin cobro automático ni días de gracia. Incluye todos los módulos, **25 tickets iniciales de entrega única, 10 afiliados, 10 Gift Cards totales y 100 MB**. La muestra permite **hasta 10 programas de sellos, con tarjetas ilimitadas en cada programa**; el resto de módulos conserva cupos pequeños definidos en el catálogo canónico. Los límites se validan en el servidor. Reintentar la misma inscripción no duplica negocio, usuario o tickets.

El negocio queda en la cartera del vendedor y su prospecto se marca como inscrito. El titular entra en `/empresa/` con el email y la clave definidos; el primer acceso abre Tarjetas de sellos. Al terminar la muestra conserva sus datos y puede elegir un plan y pagar desde Cuenta mediante el checkout existente de Mercado Pago.

**Vender suscripción** ofrece enlaces de inscripción para los cuatro planes pagados con el vendedor identificado. El cliente queda asociado a su cartera, pero su acceso pagado solo se activa cuando se aprueba el pago. Un cliente ya inscrito en Descubre debe pagar desde su cuenta para conservar el negocio y sus datos. Las ofertas, descuentos y excepciones continúan sujetos a las autorizaciones del superadmin.

Pruebas integrales adicionales: `test/descubre.integration.test.js` y `test/existingSeller.integration.test.js`, con la misma base local aislada y bandera de QA descritas abajo. Simulan pagos sin llamadas externas y comprueban el rol de negocio, el permiso comercial, la retirada del acceso y el aislamiento entre clientes.

- Cada vendedor solo consulta y opera sus prospectos, ofertas y clientes asignados. No accede a las operaciones avanzadas ni administra autorizaciones.
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

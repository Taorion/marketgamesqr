# Admin comercial de Qori

Acceso: `/admin/`. El superadmin puede conservar su rol y negocio anteriores: el permiso de plataforma se evalúa desde la base de datos y se activa solo en las rutas administrativas.

## Operación

1. **Equipo:** crear vendedores y entregarles las credenciales mostradas una sola vez. Desactivar o archivar impide el acceso y conserva su historial. El vendedor puede cambiar su contraseña desde el admin.
2. **Beneficios autorizados:** definir planes, porcentaje y duración del descuento, días de prueba, tickets, módulos y cupos adicionales. Cada autorización tiene vencimiento y puede asignarse a un vendedor o a todo el equipo. No hay descuentos preautorizados por defecto.
3. **Prospectos:** registrar contacto, etapa, notas y próxima gestión. Crear una oferta, usando una autorización para cargar sus condiciones. El vendedor puede reducirlas o solicitar una excepción.
4. **Ofertas y excepciones:** las ofertas de nuevos clientes que respetan una autorización vigente se aprueban automáticamente. Las excepciones y cambios de clientes existentes requieren aprobación individual del superadmin. Aplicar una oferta crea el negocio y su propietario, o actualiza el cliente existente. Las credenciales nuevas se muestran una sola vez.
5. **Clientes:** consultar suscripciones, asignar cartera, suspender/reactivar y revocar beneficios con motivo. Las operaciones avanzadas conservan la administración existente de planes, negocios y convenios.
6. **Historial:** revisar quién creó, autorizó o aplicó cada cambio.

## Reglas

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

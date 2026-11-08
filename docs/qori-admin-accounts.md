# Administración de cuentas Qori

El superadministrador encuentra el módulo **Cuentas Qori** en `/admin/`. Los vendedores y usuarios de empresas no pueden consultar sus endpoints ni modificar otras cuentas.

- **Vendedores:** búsqueda, acceso comercial, nombre y teléfono, expediente privado, revisión de documentos, comisiones pagadas y pendientes y acceso a la gestión existente de pagos.
- **Empresas y empresarios:** búsqueda por empresa, NIT, contacto o usuarios vinculados; filtros por acceso y plan del catálogo vigente; nombre, acceso, estado y vencimiento de suscripción; usuarios y gestión de sus accesos. El listado de usuarios se consulta por empresa para incluir cuentas anteriores al límite global del admin histórico.
- **Customer:** versión gratuita existente, nombre, identidad confirmada de consulta, suspensión/reactivación y cierre de sesiones. Los movimientos financieros privados no se incluyen en esta vista.

Los cambios de empresas y Customer requieren motivo y una versión actual de la ficha. Se guardan junto con su auditoría en una transacción. La suspensión de Customer revoca sesiones e impide emitir otras, incluidos los accesos con Google y Microsoft. Reactivar exige iniciar sesión nuevamente. Los ajustes de suscripción reutilizan las protecciones de Descubre y convenios vitalicios; no representan un pago ni generan comisiones o créditos.

## Migración

`20261107180519_qori_admin_accounts.sql` agrega `customer_accounts.is_active`, `admin_revision` y dos índices. Las copias en `database/migrations` y `supabase/migrations` son idénticas. Render aplica las migraciones antes de iniciar la aplicación. Se preservan las políticas RLS y permisos existentes.

## Validación

Pruebas locales con PostgreSQL aislado, sin escrituras de prueba en producción:

```text
node --test test/adminAccounts.integration.test.js test/adminAccountsUI.test.js test/adminAccountsBoot.integration.test.js test/customerPasswordOAuth.integration.test.js test/customerRegistrationGate.integration.test.js test/qoriSellerLaunch.integration.test.js
```

Cobertura: permisos, catálogo y filtros, paginación, búsqueda por empresario, usuarios antiguos, actualizaciones concurrentes, suspensión y revocación, OAuth, historial, protecciones de planes, escape de contenido y arranque del admin con sus recursos reales mediante JSDOM.

La revisión visual en navegador y móvil no pudo ejecutarse: el host del navegador y el runtime alternativo no estaban disponibles. JSDOM comprueba estructura e interacción, no apariencia. El asesor Supabase local no estaba disponible en el puerto estándar; se verificaron RLS y ACL directamente en la instancia PostgreSQL local utilizada para las pruebas.

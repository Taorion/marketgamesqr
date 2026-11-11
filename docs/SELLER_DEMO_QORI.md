# Demo Qori para vendedores

Implementación local del 11 de noviembre de 2026. No publicada todavía.

## Acceso

Un vendedor activo y aprobado encuentra **Entrar a Demo Qori** en Seller. También puede entrar por `/empresa/?demo=1` con el mismo correo y contraseña de Seller. La aprobación se verifica en cada petición: suspender la postulación, desactivar la cuenta o cambiar su contraseña invalida el acceso correspondiente. Se conserva la política existente de altas administrativas autorizadas; el acceso no certifica documentos ni habilita pagos de comisiones.

Todos comparten una empresa llamada **Demo Qori**. Cada vendedor tiene un actor interno independiente para conservar autoría. No se cambia su negocio, rol ni contraseña originales. Las sesiones del negocio real y de la demo usan claves distintas. Superadmin puede revisar la demostración.

## Precarga y uso

- Saldo inicial: **10.000 tickets y 1.000 emisiones de Gift Cards**. Los saldos se consumen al practicar y no se reinician al iniciar sesión. Las Gift Cards usan su propio saldo.
- 30 clientes ficticios, 20 ventas de ejemplo, seis productos, dos campañas, una sede y ocho tarjetas de sellos.
- Todas las funcionalidades del plan habilitadas, sin límites de plan ni vencimiento de suscripción.
- Aviso permanente dentro del contenido: empresa compartida, datos ficticios, sin valor comercial.
- La empresa queda fuera del directorio y de las publicaciones de Customer. Se bloquean cobros, envíos externos, conexiones y cambios de seguridad; esos botones muestran una explicación al intentar ejecutarlos. No se generan compras pagadas ni comisiones por la precarga.

Al ser compartida, los cambios de práctica de un vendedor son visibles a los demás. No se deben cargar datos de clientes reales.

## Instalación y validación

Aplicar `20261111213407_qori_seller_demo.sql` antes de iniciar el backend actualizado, después de las migraciones anteriores de Seller y contactos por sellos. El archivo está reflejado en `supabase/migrations` y `database/migrations`. La migración crea una sola cuenta y sus saldos iniciales; no debe ejecutarse manualmente por segunda vez.

Las pruebas de integración de `test/sellerDemo.integration.test.js` usan exclusivamente PostgreSQL local, puerto 55441, base `qori_customer_qa`. Cubren inicio de sesión, autorización y revocación, concurrencia, aislamiento por negocio, datos precargados, endpoints del portal, exclusión del directorio y consumo idempotente de Gift Cards. Las pruebas DOM cubren el botón Seller, la sesión separada y la identificación de la demo.

La revisión visual en navegador queda pendiente: el host de control de navegador no estuvo disponible. Estas pruebas locales no acreditan publicación ni funcionamiento en producción.

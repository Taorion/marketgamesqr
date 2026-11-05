# Recuperación de beneficios anteriores

Qori Customer permite recuperar tarjetas de sellos, afiliaciones, giftcards y tickets personales desde `#recover-benefits`, accesible en Mis tarjetas, Mis beneficios y Mi cuenta. El primer ingreso también ofrece registrar la cédula con autorización expresa.

La cédula normalizada identifica candidatos; cada beneficio debe coincidir además con un correo cuyo control fue verificado. Se usa el correo de acceso de Customer o un código específico enviado al correo histórico que el comprador escribe. No se revela el contacto almacenado. Sin acceso al correo, el negocio puede verificar el documento y proponer la conexión de historial; el comprador debe aceptarla.

## Identidad y propiedad

- `customer_recovered_benefits` relaciona recursos canónicos existentes con la cuenta. Conserva IDs, sellos, puntos, saldos y condiciones. No crea tarjetas ni consume créditos.
- La recuperación por correo es por recurso: no declara una identidad global ni acepta una relación que abra todas las compras o beneficios con la misma cédula.
- Un recurso solo puede tener un propietario recuperado. Se respetan relaciones aceptadas, invitaciones aceptadas, participaciones y destinatarios de regalos Customer existentes.
- Los regalos pagados de Customer, tickets pendientes de reclamar y premios derivados de sellos conservan sus reglas originales.
- No genera movimientos financieros ni altera ventas. Revocar una relación elimina las recuperaciones de ese negocio para esa cuenta.

## Seguridad y operación

La migración `20261105025853_qori_customer_benefit_recovery` se mantiene idéntica en `database/migrations` y `supabase/migrations`. Las tablas de recuperación tienen RLS y carecen de permisos para PUBLIC, anon y authenticated; solo se accede desde el backend autenticado.

Las búsquedas directas llevan identificador idempotente y máximo diez solicitudes por cuenta cada quince minutos. Los códigos duran diez minutos, permiten cinco intentos y están ligados a la cuenta solicitante. Se permiten cinco solicitudes de código por cuenta o correo cada quince minutos. Se almacena HMAC con dominio distinto al acceso; los códigos fallidos consumen intentos. Se vuelve a comprobar el contacto antes de asociar y se restringe la recuperación a los recursos presentes al solicitar el código.

## Validación

Pruebas HTTP sobre PostgreSQL local aislado: consentimiento, propiedad de cuatro tipos de beneficio, contactos históricos, reintentos concurrentes, límites de códigos, contactos modificados, ausencia de acceso a compras generales y protección de tablas. Pruebas DOM: formularios, consentimiento, reintento, escape de nombres y accesos desde el portal. Regresión: registro Customer, wallet y red Empresa/Customer.

Pantalla comprobada con datos ficticios en Chrome local a 1440, 390 y 360 px; sin desbordamiento horizontal. No constituye prueba en un dispositivo físico ni recuperación autenticada de una cuenta real.

La consulta del caso reportado de POLLIPUNTOS en Rey del sabor confirmó un registro elegible con correo histórico. No se asociaron cuentas reales ni se enviaron correos durante esta validación; la titular debe completar la verificación.

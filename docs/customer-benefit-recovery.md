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

## Cédula maestra y recuperación única

Desde la migración `20261105124802_qori_customer_master_document`, el primer registro requiere `document_id` y `document_confirmation` coincidentes al normalizar espacios, puntos y guiones. La cédula queda fijada aun cuando no se encuentren beneficios. No existe edición ni borrado del documento desde Customer. La base de datos también rechaza cambiar un documento ya registrado o reiniciar una recuperación completada.

La primera recuperación que obtiene beneficios fija `benefit_recovery_completed_at`. Solo se repite la respuesta de una solicitud ya procesada con la misma identidad; una nueva solicitud o un código pendiente no ejecutan una segunda recuperación. Si aún no hay resultados, se puede continuar verificando el correo histórico con la misma cédula. Nuevas invitaciones y regalos continúan funcionando; las conexiones con documento y las aceptaciones de giftcards deben respetar la cédula maestra. La primera aceptación que registra documento también exige doble escritura.

El bloqueo no sustituye la prueba de propiedad por correo ni convierte la cédula declarada en verificación oficial de identidad. Se conserva el alcance por recurso. Las cuentas anteriores conservan sus beneficios: documentos históricos contradictorios se marcan para revisión sin elegir uno automáticamente ni retirar recursos. Las verificaciones de correo pendientes anteriores a esta migración se invalidan para exigir el nuevo flujo.

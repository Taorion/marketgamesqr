# Agenda de pagos de Qori Customer

Acceso: **Finanzas → Agenda de pagos** (`/customer/#payments`).

- Obligaciones mensuales, semanales o anuales: concepto, categoría, moneda, primer vencimiento, estimado y anticipación del recordatorio.
- Cada periodo conserva su estimado original. El importe de la factura, su vencimiento y la nota pueden corregirse por separado.
- Confirmar un pago requiere valor real y fecha real. Se crea un único movimiento personal; reintentar la confirmación no duplica el gasto.
- Corregir el pago actualiza ese movimiento. Anular su registro lo retira del total y devuelve la obligación a pendiente, conservando la auditoría; no realiza devoluciones de dinero.
- Se puede omitir y restaurar un periodo. Pausar la obligación conserva facturas e historial.
- Resumen por moneda, pendientes anteriores, vencidos, búsqueda, exportación CSV compatible con Excel y calendario ICS.
- Los importes son registros del usuario, no un saldo bancario ni comprobación automática del pago.

## Recordatorios

Inicio muestra el número de obligaciones próximas o vencidas. La agenda muestra los recordatorios del periodo consultado. La anticipación se configura por obligación.

Las notificaciones del dispositivo son opcionales y se activan con permiso explícito del navegador. El servicio prepara un aviso diario después de las 09:00 en la zona horaria de la cuenta, si quedan obligaciones pendientes. Una sesión vencida o eliminada deja de recibir avisos. El worker vuelve a comprobar obligaciones y sesión antes de enviar; el service worker comprueba la cuenta activa antes de mostrar el aviso.

Se reutilizan las claves VAPID del despliegue cuando existen. Si no existen, se genera una identidad VAPID persistente en `customer_payment_push_config`, accesible solo al backend. La API devuelve únicamente la clave pública. `CUSTOMER_PAYMENT_PUSH_ENABLED=false` desactiva este servicio. No se incluyen conceptos ni valores de facturas en el aviso de pantalla bloqueada.

El funcionamiento depende del permiso, la sesión, el navegador y su servicio push. La entrega real a un dispositivo no queda demostrada por pruebas con un transportador simulado.

## Datos y verificación

Migración: `20261103224820_qori_customer_payment_agenda`, copiada sin diferencias entre `supabase/migrations` y `database/migrations`. Mantiene `customer_recurring` y `customer_recurring_posts`; añade ocurrencias, auditoría, suscripciones, entregas y configuración privada. Las cinco tablas nuevas usan RLS y revocan acceso de PUBLIC, anon y authenticated. Los accesos se realizan por API Customer autenticada, con propiedad comprobada en servidor.

Pruebas: `customerPaymentAgenda.integration.test.js` y `customerPaymentAgendaUI.test.js`, más regresiones de Finanzas y portal. La base de integración es exclusivamente `qori_customer_qa` local.

Pendiente de evidencia: revisión visual a 390×844 y notificación real en un dispositivo. La herramienta de navegador falla al crear una pestaña (`timeoutMs`).

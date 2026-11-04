# Avisos mensuales por obligación

En Finanzas → Agenda de pagos → Configurar, cada obligación mensual permite elegir un día de aviso del 1 al 31. El vencimiento de la factura no se modifica. Para una nueva obligación, el día de aviso se inicializa con el día del primer vencimiento.

Ejemplo: Seguridad social, primer vencimiento el 5, frecuencia mensual, aviso el día 5. El recordatorio se considera pendiente únicamente ese día y solo si hay una factura de ese mes sin pagar. Los avisos del dispositivo se procesan desde las 09:00 de la zona horaria del usuario, con permiso y sesión vigente. Si el mes no tiene el día elegido, se usa su último día.

Se conserva la modalidad anterior: avisar diariamente desde N días antes y hasta pagar. Las reglas existentes no cambian automáticamente. Pausar o desactivar los avisos los suprime; pagos realizados u omitidos no generan avisos.

El aviso del dispositivo muestra el nombre de hasta dos obligaciones, sin importes. El service worker consulta de nuevo la sesión y los pagos pendientes antes de mostrarlo. El servidor envía solo una referencia a la cuenta, sin nombres ni importes en el payload. Se mantiene una entrega diaria por dispositivo.

La migración añade únicamente reminder_day a customer_recurring, con rango 1–31 y restricción a frecuencia mensual. No modifica facturas, movimientos, permisos ni RLS.

Pruebas: día 5 entre meses, exclusión de otros días, pagos realizados/omitidos, meses cortos y bisiestos, paridad entre consulta SQL y agenda, aislamiento entre cuentas, edición del aviso sin alterar vencimiento, calendario y service worker. La entrega real en un dispositivo físico no se simula como prueba completada.

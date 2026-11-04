# Contabilidades de Qori Customer

El inicio del portal es **Mi dinero**. Cada comprador puede separar Personal, Casa, Ganado u otras actividades en contabilidades privadas. El selector superior permanece disponible al consultar movimientos, compras, presupuestos, metas y pagos.

## Primer uso

1. Definir el saldo disponible **antes de los movimientos del día de inicio**. No se asume cero cuando falta este dato.
2. Agendar ingresos periódicos que se esperan recibir. Solo se vuelven ingresos recibidos al confirmar el cobro.
3. Crear compromisos recurrentes, marcar los no negociables y configurar sus recordatorios.

Los datos anteriores a esta versión se conservan en Personal. Una contabilidad adicional empieza vacía. Se puede reclasificar un movimiento, una compra Qori o una obligación completa; esto cambia su ubicación, sin duplicarlo ni mover dinero bancario.

## Cálculos

- **Dinero registrado:** saldo inicial + ingresos recibidos − gastos pagados + traslados netos, desde la fecha inicial inclusive y hasta hoy, según la zona horaria del comprador.
- **Después de compromisos:** dinero registrado − obligaciones pendientes hasta fin de mes (incluidos vencidos) − compras Qori pendientes de pago.
- **Gasto proyectado:** gastos pagados este mes + obligaciones pendientes + compras planeadas hasta fin de mes o sin fecha + compras Qori pendientes.
- **Previsto al final del mes:** dinero registrado + ingresos periódicos pendientes − obligaciones pendientes − compras planeadas − compras Qori pendientes.

Cada moneda se calcula por separado. La moneda principal de la contabilidad se elige al crearla. Los movimientos en otras monedas siguen accesibles desde Análisis. Los ingresos esperados no son dinero disponible. La proyección no predice gastos o ingresos que el comprador no haya registrado o planeado.

Un traslado entre contabilidades de la misma moneda suma en una y resta en la otra; no genera un ingreso ni gasto. Requiere saldo inicial en ambos lados, confirmación de que ocurrió y una identidad de solicitud para evitar duplicados. Se puede anular conservando el registro.

## Modelo y acceso

`customer_finance_books` pertenece a `customer_accounts`, separado de las identidades Empresa. Movimientos manuales, obligaciones, planes, metas y presupuestos tienen `book_id` y una clave foránea compuesta que exige el mismo propietario. Cada comprador tiene una única contabilidad predeterminada.

Las ventas se siguen leyendo de `business_sales`. `customer_finance_allocations` únicamente ubica una venta o compra de giftcard en una contabilidad del comprador; no modifica el libro de ventas del negocio. Al reclasificar una venta, sus movimientos manuales vinculados y su plan de compra se trasladan en la misma transacción. Al reclasificar una obligación, también se trasladan sus pagos históricos y planes asociados.

La API valida `X-Qori-Book` (o `book_id` para consulta), comprueba propiedad y aplica el filtro a las consultas financieras. Los formularios conservan el contexto con el que se abrieron. El navegador solo recuerda el identificador seleccionado, separado por usuario; no guarda movimientos en almacenamiento local. Las tablas nuevas tienen RLS habilitado y acceso revocado a PUBLIC, anon y authenticated: las sesiones opacas de Customer pasan por el backend.

Los recordatorios abarcan todas las contabilidades y nombran la contabilidad correspondiente. Al abrir un aviso, el portal selecciona la contabilidad de su primer pendiente. La selección se vuelve a validar contra las contabilidades del usuario autenticado.

## Verificación

Pruebas de integración en PostgreSQL local aislado cubren separación por usuario y contabilidad, saldo desconocido, saldos iniciales, presupuestos repetidos, proyección, pagos, traslados concurrentes, correcciones, reclasificación de ventas canónicas, claves foráneas y exportación. Las pruebas DOM cubren inicio financiero, selector, formularios de ingresos, saldos y traslados. Estas pruebas no sustituyen una revisión visual en un dispositivo físico.

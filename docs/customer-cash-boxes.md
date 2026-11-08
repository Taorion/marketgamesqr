# Cajas dentro de los bolsillos de Customer

Cada bolsillo mantiene su contabilidad y contiene cajas con nombres elegidos por el usuario: Efectivo, Banco, Nequi, Daviplata u otros. En Mi dinero, el acceso Mis cajas permite crearlas, cambiar sus nombres, definir los saldos iniciales, asignar movimientos y registrar o anular traslados internos.

Entró dinero y Gasté dinero solicitan la caja cuando ya hay cajas creadas. Los gastos por artículos conservan el total automático. Los movimientos anteriores, compras automáticas y traslados entre bolsillos aparecen sin caja asignada hasta que el usuario los distribuya. El selector permite elegir explícitamente Sin caja asignada.

## Cálculo y alcance

- El saldo inicial del bolsillo es la suma de los saldos iniciales de sus cajas más el saldo inicial sin asignar. La fecha representa el comienzo del día, antes de los movimientos de esa fecha.
- Saldo de caja = saldo inicial + ingresos pagados asignados − gastos pagados asignados + traslados netos entre cajas.
- El total del bolsillo sigue utilizando el libro canónico existente. Sin caja asignada es la diferencia entre ese total y la suma de las cajas; no se crea otro ingreso ni gasto para ajustar el total.
- Un traslado entre cajas conserva el total del bolsillo y no altera los ingresos o gastos. Puede anularse conservando su historial.
- Una compra Qori vinculada a un gasto manual conserva la caja del gasto sin contar ambos movimientos. La asignación explícita de la venta reemplaza esa herencia. Ventas anuladas y devoluciones usan el importe canónico vigente.
- Al mover un registro a otro bolsillo se libera la caja anterior. Las cajas no mezclan monedas ni propietarios.
- Los saldos desconocidos permanecen por definir. Se permiten saldos negativos, para reflejar los registros y facilitar su corrección.
- Máximo 50 cajas por bolsillo. La lista de movimientos se pagina de 50 en 50. Se muestran los 50 traslados más recientes. Los saldos se calculan con todo el período desde la fecha inicial.

## Seguridad y persistencia

Las rutas `/api/customer/cash-boxes` requieren sesión, registro completo y bolsillo propio. Las escrituras bloquean el bolsillo y se ejecutan en transacción. Creación, entradas y traslados usan identificadores de solicitud para evitar duplicados. Los saldos iniciales y asignaciones tienen control de revisión. Las claves foráneas compuestas impiden asociar una caja de otro bolsillo o cuenta.

Las cuatro tablas privadas tienen RLS y carecen de permisos para PUBLIC, anon y authenticated. El servidor aplica autorización de propietario. El historial de cambios forma parte de la exportación de datos. La migración `20261108143705_qori_customer_cash_boxes.sql` está replicada en database y supabase; el arranque de Render la ejecuta mediante el migrador existente.

## Verificación

25 pruebas aprobadas entre customerCashBoxes.integration, customerCashBoxesUI, customerExpenseItemsUI y customerDailyBudgetUI. Incluyen PostgreSQL local aislado, propiedad, rollback, idempotencia concurrente, saldos, movimientos, traslados, compras canónicas, RLS, exportación y navegación autenticada con cambio de bolsillo mediante DOM.

Las suites antiguas customerFinanceBooksUI y customerFinanceDetailsUI conservan siete fallos también reproducidos contra HEAD anterior: fixtures sin SessionGuard y expectativas desactualizadas del flujo de mercado. No se modificaron estos módulos ajenos para ocultar esas fallas. La navegación visual no pudo comprobarse porque el host de acceso al navegador no estaba disponible; las pruebas DOM no prueban el diseño en un dispositivo físico.

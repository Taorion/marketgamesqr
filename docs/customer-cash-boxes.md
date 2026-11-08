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

## Billetera de efectivo

El modo `#cash-wallet`, accesible desde Mi dinero y Mis cajas, permite elegir una caja existente como billetera o crear una caja vacía para ese propósito. Cada bolsillo tiene una sola caja designada como billetera; cambiar su nombre conserva esa designación. La sección de tarjetas y beneficios mantiene su acceso original.

«Voy a salir: preparar efectivo» pide el total que se llevará, una caja de origen o devolución y confirmación del traslado físico. Solo se traslada la diferencia respecto al saldo vigente. Ejemplo: quedan 30.000 y se desea llevar 80.000; se trasladan 50.000. Una cantidad menor devuelve el sobrante a la caja elegida. Preparar efectivo nunca crea ingresos ni gastos, ni cambia el total del bolsillo. Requiere saldo inicial conocido y fondos suficientes en la caja de origen.

«Gasté de mi billetera» abre el formulario diario con la caja de billetera seleccionada. El gasto canónico se guarda una sola vez y disminuye tanto el efectivo de la billetera como el total real del bolsillo. Se conserva el total automático por artículos y el manejo de comprobantes. El efectivo restante no se reinicia al preparar otra salida.

La preparación se ejecuta bajo bloqueo del bolsillo, comprueba el saldo esperado y conserva un identificador de solicitud en el historial incluso cuando no hay traslado. Los reintentos no restauran un saldo anterior después de un gasto. La migración `20261108153035_qori_customer_cash_wallet.sql` agrega una marca privada e índices únicos; conserva la autorización y RLS de las tablas existentes. Los asesores del stack local no estuvieron disponibles en 54322; la validación se hizo directamente contra PostgreSQL de pruebas en 55441.

La extensión se prueba con casos de propiedad, billetera única, preparación concurrente, diferencias exactas, saldos insuficientes, devolución de sobrante y gasto posterior a un reintento sin cambios. Las pruebas DOM cubren configuración, elección de caja, gasto, confirmación, reintentos, cambios de bolsillo y navegación autenticada.

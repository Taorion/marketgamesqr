# Listas de mercado y desglose de créditos

## Lista de mercado

Acceso desde Mi dinero, Mis compras y #groceries. Cada lista pertenece a una contabilidad y su moneda. Permite título, fecha prevista, notas y hasta 200 artículos: nombre, unidad, cantidad, precio estimado, marca de compra, cantidad comprada y precio real.

Un precio vacío está pendiente de definir. Los totales estimados excluyen ese valor y muestran cuántos faltan. La proyección mensual incluye listas pendientes sin fecha o con fecha hasta fin de mes. Guardar, marcar o editar artículos no crea gastos.

Al confirmar la compra, Qori crea un solo gasto con el detalle de productos, o vincula un gasto o venta canónica recibida de Empresa. El importe y la moneda deben coincidir. Las confirmaciones concurrentes no crean gastos repetidos; las asociaciones comparten el control de duplicados con Mis compras. La venta de Empresa nunca se copia ni modifica.

La comparación usa únicamente los artículos marcados. Para compras parciales, el presupuesto comparable usa la menor entre cantidad prevista y cantidad comprada. El exceso de cantidad comprada cuenta como mayor gasto. Un precio estimado desconocido impide afirmar una diferencia total completa. Los artículos no comprados no son ahorro.

La opción de llevar pendientes a la próxima lista conserva los artículos sin comprar y las cantidades restantes. El historial completado conserva precios previstos y reales. Si el movimiento asociado cambia o se anula, la comparación queda por revisar. Al cambiar de contabilidad el movimiento, su lista completada lo acompaña; las listas de pendientes mantienen su ubicación.

Las listas usan sesiones Customer, controles de propietario y contabilidad, RLS y permisos públicos revocados. Se incluyen en la exportación de datos. No hay pagos bancarios automáticos.

## Cuotas de crédito

Doce categorías: libre inversión, vivienda/hipoteca, vehículo, tarjeta de crédito, libranza, educativo, microcrédito, negocio, préstamo personal/familiar, compra a cuotas, consolidación y otro crédito. La categoría organiza la información; no supone tasas, seguros obligatorios ni condiciones comerciales.

Cada cuota muestra capital, interés, seguros y otros cargos con importes y porcentajes sobre el pago total. Se reparte el redondeo porcentual para que sume 100,00 %. El simulador permite seleccionar el mes; el CSV incluye importes y porcentajes. El historial de pagos muestra el desglose realmente confirmado, separado de la estimación.

Hasta 20 seguros o cargos por crédito:
- FIXED: valor mensual mientras el crédito está vigente.
- BALANCE_PERCENT: porcentaje mensual del capital pendiente al inicio del periodo.
- SPREAD: importe pendiente de una prima/cargo repartido entre las cuotas indicadas, con ajuste de centésimas en la última. Si la deuda termina antes, el saldo se cobra o se deja de cobrar según la condición declarada.
- FINANCED: importe informativo que ya está dentro del capital. No se suma nuevamente.

SPREAD representa el saldo pendiente de ese cargo, sin un interés adicional propio. Una renovación futura requiere actualizarlo; un seguro anual completo financiado dentro del préstamo debe marcarse FINANCED. Las condiciones de liquidación se confirman con el acreedor. Registrar un pago reduce el saldo de cargos repartidos según sus importes efectivamente pagados; anular el último registro restaura capital y cargos.

El importe mensual antiguo se mantiene como «sin desglosar». Al detallar un cargo, hay que retirarlo de ese importe para evitar repetirlo. Los registros anteriores no se reinterpretan automáticamente como seguros.

Las simulaciones siguen suponiendo amortización mensual de tasa fija. No calculan UVR, variaciones futuras de tasa, nuevas compras de tarjeta, mora, seguros renovables futuros ni modelos con cuotas extraordinarias o pagos residuales. Las cuotas y ahorros se presentan como estimaciones.

Fuentes primarias de referencia:
- [CFPB: cómo se amortiza una hipoteca](https://www.consumerfinance.gov/ask-cfpb/how-does-paying-down-a-mortgage-work-en-1943/).
- [Fondo Nacional del Ahorro: trámites y seguros de crédito](https://www.fna.gov.co/atencion-ciudadana/tramites-y-servicios).

## Verificación

Pruebas dedicadas: customerFinanceDetails.test.js, customerFinanceDetails.integration.test.js y customerFinanceDetailsUI.test.js. Cubren importes, porcentajes, primas repartidas, costos ya financiados, pagos/anulaciones, listas por contabilidad, cantidades parciales, precios desconocidos, registro idempotente, vínculo con Empresa, privacidad y exportación. Se ejecutan además las regresiones de deudas, compras y contabilidades en la base local aislada.

La revisión visual en móvil y dispositivo físico sigue pendiente por la indisponibilidad de la herramienta de navegador. Las pruebas DOM no equivalen a esa revisión. El despliegue requiere SHA, salud, migraciones, rutas protegidas y archivos publicados coincidentes.

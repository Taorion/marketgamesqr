# Mis finanzas: deudas y simulador

Qori Customer reúne el capital pendiente y los pagos de cada deuda dentro de la contabilidad seleccionada. Las rutas del portal son `#debts` y `#debt-simulator`; se accede también desde Mi dinero, Mis finanzas y Agenda.

## Qué puede hacer el comprador

- Registrar nombre, acreedor, capital pendiente, fecha del saldo, tasa, tipo de tasa, plazo restante, cuota opcional, seguros/cargos y próximo vencimiento.
- Comparar seguir igual, abonar para reducir plazo, abonar para reducir cuota y liquidar hoy. Un deslizador y los botones 25/50/100 % permiten variar el abono; se puede añadir un extra mensual.
- Ver desembolso inicial, cuota, meses, intereses, costo total futuro y ahorro neto. La gráfica muestra el capital restante; la tabla descargable CSV separa capital, interés, cargos y saldo.
- Guardar escenarios privados por contabilidad. Guardarlos no registra pagos ni modifica deudas.
- Registrar pagos realmente realizados con desglose confirmado. Se crea un gasto o se vincula uno existente de igual importe, moneda, contabilidad y fecha.
- Consultar historial, actualizar el saldo con un extracto, archivar o restaurar deudas. Anular el último pago sin cambios posteriores restaura el saldo; solo elimina el gasto si Qori lo creó para ese pago.

## Modelo financiero

Motor compartido: `customer-web/debt-math.js`, utilizado por navegador y servidor.

Para tasa expresada como decimal:
- Efectiva anual: tasa mensual = `(1 + EA)^(1/12) - 1`.
- Efectiva mensual: se usa directamente.
- Nominal anual mes vencido: tasa mensual = `NAMV / 12`.

Cuota de capital e interés: `P*r / (1-(1+r)^(-n))`; sin interés, `P/n`. Importes internos en centésimas enteras. La cuota se redondea hacia arriba y, si el redondeo mensual de intereses deja residuo, se aumenta lo mínimo para amortizar dentro del plazo. La última cuota se ajusta al saldo. Si el comprador escribe una cuota propia, el plazo se deriva de ella. Se rechazan cuotas que no cubren intereses o no liquidan en 600 meses.

El abono se aplica hoy antes del siguiente periodo completo. Los intereses ya causados se pagan hoy en todos los escenarios. El cargo de prepago indicado se aplica una vez al abono inicial o liquidación; los cargos mensuales terminan con el préstamo. El ahorro neto compara todo el dinero por pagar desde hoy e incluye estos cargos, por lo que puede ser negativo.

Son estimaciones de cuotas mensuales a tasa fija. No se modelan tasa variable, UVR, mora, compras nuevas, interés diario, seguros variables ni condiciones particulares del acreedor. Reducir cuota supone que el acreedor reamortiza. La liquidación exacta debe confirmarse con la entidad.

Referencias primarias consultadas:
- [Superintendencia Financiera: conversión de tasas](https://www.superfinanciera.gov.co/publicaciones/61554/consumidor-financieroinformacion-generalsimulador-de-conversion-de-tasas-de-interes-61554/).
- [CFPB: amortización](https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/).
- [CFPB: capital e intereses](https://www.consumerfinance.gov/ask-cfpb/is-it-better-to-pay-off-the-interest-or-principal-on-my-auto-loan-en-845/).

## Contabilidad, privacidad e integridad

Registrar una deuda es una fotografía del saldo: no genera ingreso ni gasto. El capital adeudado se muestra separado del dinero disponible. Los pagos reales sí reducen el saldo disponible mediante un único movimiento de caja.

En modo AUTO las cuotas pendientes hasta fin de mes, incluidas vencidas, entran en la proyección de Mi dinero y Compras. EXTERNAL permite indicar que la obligación ya existe en Agenda y evita sumar nuevamente su estimación. Registrar el pago de una deuda no marca automáticamente una obligación de Agenda: si se pagó allí, se debe seleccionar ese gasto al registrar el pago de deuda.

La API aplica propietario y contabilidad a todos los recursos. Las tablas privadas tienen RLS, sin permisos para PUBLIC/anon/authenticated, y referencias compuestas de propietario. Los identificadores idempotentes evitan repetir registros; revisiones y bloqueos protegen pagos concurrentes. Un trigger impide cambiar importe, fecha, moneda, dueño, contabilidad, estado o asociación a venta de un gasto con un pago de deuda vigente. Primero se anula/desvincula ese pago.

No se modifican ventas canónicas de Qori Empresa ni se realizan movimientos bancarios. La exportación de datos incluye deudas, pagos, auditoría y escenarios.

## Verificación

Pruebas dedicadas:
- `test/customerDebtMath.test.js`: referencia independiente de cuota, conversiones, capital/interés reconciliados, tasa cero, abonos, liquidación, costos, rechazos e invariantes sobre distintos importes y plazos.
- `test/customerDebts.integration.test.js`: base local aislada; aislamiento, idempotencia concurrente, proyección, pago, anulación, vínculo con Agenda, historial, restricciones y exportación.
- `test/customerDebtsUI.test.js`: formularios, navegación por contabilidad, actualización local de escenarios, resultados inválidos, guardado explícito y desglose de pagos.

Las pruebas DOM no acreditan diseño visual ni uso en un dispositivo físico. La revisión visual móvil sigue pendiente por el fallo de la herramienta de navegador. El despliegue se verifica aparte con SHA oficial, salud, migración, controles privados y hashes de archivos públicos.

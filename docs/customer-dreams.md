# Sueños y metas de Qori Customer

Acceso: `/customer/#dreams`, menú Sueños, tarjeta en Mi dinero y pestaña de finanzas. Cada bolsillo conserva sus propias metas y moneda. Las metas sencillas anteriores de la misma moneda aparecen en este módulo.

El presupuesto de viaje incluye personas, noches, habitaciones, estadía total o por habitación/persona y noche, comida por persona y día, un importe total de gastos libres y hasta 100 planes adicionales con cantidades. Carro, vivienda y otras compras usan un importe base más gastos adicionales. El margen de imprevistos se aplica al subtotal. Las cuentas usan unidades monetarias menores y validan límites tanto en navegador como en servidor.

El simulador calcula dos alternativas: aporte mensual necesario para una fecha, o fecha de cumplimiento a partir de un aporte mensual. Los aportes futuros comienzan un mes después de la fecha actual del usuario; el último día de cada mes se ajusta sin perder el día de referencia. Una fecha anterior al primer aporte requiere separar de inmediato lo que falta. Un ahorro igual o superior al presupuesto muestra la meta cubierta. No se estiman rendimientos, inflación ni conversión de monedas; el horizonte es 100 años.

El plan compartido de cada bolsillo distribuye un único ahorro mensual siguiendo la prioridad de las metas. Usa el sobrante del mismo mes en la siguiente meta y omite las pausadas. El aporte individual del simulador no se suma al aporte compartido. Las flechas de prioridad funcionan con teclado y pantalla táctil.

Actualizar ahorro registra el saldo que el usuario declara tener separado, con fecha, nota e historial de cambios. No crea ingresos, gastos, traslados ni activos y no duplica el patrimonio. Permite corregir el importe a la baja. Archivar retira la meta del plan sin mover dinero. La exportación de la cuenta incluye la configuración del plan y el historial.

Persistencia: amplía `customer_goals`, conserva sus importes anteriores y añade `customer_dream_plans` y `customer_goal_events`. Sesión Customer, propiedad del bolsillo y moneda se comprueban en servidor. Los cambios se serializan por bolsillo; las revisiones evitan sobrescribir una edición concurrente. Creación y avance usan identidades idempotentes. RLS habilitado y sin permisos para PUBLIC, anon o authenticated; acceso exclusivamente mediante el backend autenticado.

Validación: pruebas de cálculo, DOM e integración HTTP sobre `qori_customer_qa`, incluidos separación de clientes/bolsillos, reintentos concurrentes, revisión obsoleta, historial y ausencia de movimientos contables extra. Revisión visual local de componentes en Chrome sin interfaz a 1440, 390 y 360 píxeles con datos ficticios. No equivale a una prueba en teléfono físico o en una sesión real del comprador.

# Inicio financiero sencillo de Qori Customer

El inicio conserva la lógica mensual de ingresos, egresos y saldo, con una guía que permanece mientras falten datos de saldo inicial, ingresos previstos o pagos. Cada paso depende de los registros de la contabilidad seleccionada, no de un indicador global en el navegador. Un saldo válido no hace desaparecer los demás pasos. Cuando están completos, la guía queda plegada y se puede consultar.

Las acciones distinguen un gasto ya realizado de un pago por hacer: recurrente o eventual. Los ingresos recibidos se registran aparte de los ingresos previstos.

## Clasificación

- Categoría: en qué se gastó (hogar, salud, alimentación, etc.).
- Frecuencia: recurrente, eventual o sin clasificar.
- Necesidad: obligatorio / necesario, prescindible / ajustable o sin clasificar en movimientos.
- Estado: pendiente, pagado u omitido en la agenda.

Una suscripción puede ser recurrente y ajustable; una reparación puede ser eventual y necesaria. El usuario decide la clasificación. La clasificación no cancela obligaciones ni representa ahorro realizado.

La agenda admite `frequency=once`: genera una sola ocurrencia, conserva vencidos y recordatorios por anticipación, y no vuelve a crear el pago en meses posteriores. Corregir o anular un pago conserva el historial. Los pagos toman la necesidad de su obligación al registrarse; ya no se fuerzan a esencial.

Los movimientos y notas privadas de ventas guardan `expense_pattern`. Las compras históricas desconocidas quedan sin clasificar; solo los pagos con vínculo explícito a una obligación reciben frecuencia en la migración. Un cliente antiguo que omite el nuevo campo conserva la clasificación existente al editar. Al vincular un gasto con una venta, se conserva en la anotación privada sin cambiar la venta canónica.

El inicio separa los gastos pagados clasificados, los pendientes necesarios y los ajustables. Las sumas siguen aisladas por propietario, contabilidad y moneda. La proyección existente sigue incluyendo todos los compromisos; marcar un pago como ajustable no lo elimina.

## Colores y proyección

Los gastos y compromisos usan rojo; los ingresos, verde. Los importes conservan signos y etiquetas para no depender del color. El saldo registrado usa un tratamiento neutro. La proyección de fin de mes aparece destacada: saldo registrado hoy + ingresos previstos - obligaciones - cuotas de deuda y cargos - compras pendientes - compras planeadas y mercado. Un faltante se muestra en rojo; un remanente estimado, en verde. Sin saldo inicial no se supone cero; si faltan precios se identifica la estimación como parcial.

La prueba combinada verifica que un pago pasa de pendiente a realizado sin descontarse dos veces y cubre un saldo final negativo. Una estimación favorable no se presenta como dinero disponible ni garantizado.

## Formulario

Preguntas directas, ejemplos editables sin importes precargados, moneda de la contabilidad y avisos en una sección desplegable. Filtros de frecuencia y necesidad en agenda e historial; exportaciones CSV con ambas dimensiones.

## Validación

Pruebas API en PostgreSQL local aislado: una sola ocurrencia, no registrar gasto al planear, idempotencia al pagar, reapertura, conservación de clasificación, aislamiento de usuario y contabilidad, conciliación de totales y vinculación con ventas canónicas. Pruebas DOM: guía incompleta, ejemplos, moneda, avisos, filtros y CSV. Sin cambios al Excel de referencia ni importación de sus importes.

La revisión visual en navegador y celular sigue pendiente: la herramienta de control devuelve `Cannot read properties of undefined (reading 'timeoutMs')`. Las pruebas DOM no acreditan ajuste visual.

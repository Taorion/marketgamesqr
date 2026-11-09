# Ahorro potencial en Qori Customer

El formulario diario Gasté dinero, incluido el acceso desde la billetera de efectivo, muestra la pregunta «¿Podías prescindir de este gasto?». Las opciones son Sin clasificar, Prescindible y Necesario. Al elegir Prescindible puede marcarse explícitamente como gasto hormiga. Un importe pequeño no se clasifica automáticamente. El editor avanzado y la clasificación privada de compras Qori permiten corregir estas marcas.

Mi dinero incorpora un resumen y el acceso a `#savings`. El panel muestra los prescindibles pagados del mes, la parte marcada como gastos hormiga, el potencial de cierre mensual, los doce meses del año seleccionado, el acumulado anual, los totales de cada año y el acumulado de todo el historial registrado. Los meses futuros y los meses sin registros tienen etiquetas distintas; no se presentan como ahorro realizado.

## Cálculo

La fuente es el historial canónico de movimientos, restringido a la cuenta, bolsillo y moneda. Solo se suman gastos PAID con prioridad FLEXIBLE hasta la fecha local actual. Ingresos, transferencias, pendientes, anulaciones, fechas futuras y otras monedas no se suman. Los gastos hormiga son un subconjunto explícito de los prescindibles, no un segundo importe adicional. Al vincular una entrada manual con una venta Qori se conserva la marca y se cuenta el gasto canónico una sola vez.

Los importes históricos se recalculan desde los registros: corregir, borrar, reclasificar o trasladar un gasto a otro bolsillo actualiza su potencial. La fecha inicial de saldo de una caja no recorta el historial de ahorro. El cálculo consulta registros desde 2000. No crea movimientos, no acredita ingresos y no modifica los saldos reales.

Para proyectar se usan los meses con gastos registrados dentro de los tres meses calendario cerrados más recientes. El promedio divide entre esos meses observados, incluyendo los que tienen gastos pero ningún prescindible. Un mes sin registros se excluye porque no demuestra gasto cero. Si no hay meses cerrados utilizables, se emplean los días transcurridos desde el primer gasto de este mes hasta hoy. Sin datos recientes no se fabrica una proyección. Se informa de una base limitada cuando hay menos de tres meses.

El cierre mensual potencial suma los prescindibles ya pagados y la estimación de los días restantes. El cierre anual suma los prescindibles pagados del año actual, los días restantes de este mes y los meses posteriores. Se calculan de forma separada las proyecciones futuras a 12 y 60 meses. Un control de reducción entre 0 y 100 % modifica únicamente los escenarios futuros, sin alterar los importes históricos. No incluye intereses, inflación ni rentabilidad. Los importes se calculan en unidades monetarias menores con redondeo entero por resultado; la moneda del bolsillo permanece explícita.

## Persistencia y seguridad

La migración `20261108230148_qori_customer_discretionary_savings.sql`, replicada en database y supabase, agrega `is_ant_expense` a las entradas y anotaciones privadas de venta. Conserva la RLS y permisos existentes. Las lecturas requieren sesión completa y pertenencia al bolsillo. Las marcas ajenas, monedas y bolsillos no se agregan. La clasificación de ventas solo modifica la nota privada del comprador, nunca la venta del negocio. El API mantiene compatibilidad con clientes que omiten la nueva marca.

## Verificación

Pruebas de aritmética, calendario bisiesto, redondeo, meses vacíos, base limitada, historial antiguo, acumulados, propiedad, correcciones y deduplicación canónica. Integración sobre PostgreSQL local aislado en 55441, sin escrituras de prueba en producción. Las pruebas DOM cubren gasto diario, clasificación avanzada, comprobantes, billetera, navegación autenticada entre bolsillos, historial anual y escenarios interactivos. Regresiones de cajas y gastos por artículos también comprobadas.

El host de acceso al navegador no estuvo disponible, por lo que no se afirma validación visual ni en dispositivo físico. Los asesores Supabase locales apuntan a 54322, que no está activo; las verificaciones de esquema y autorización se realizan sobre la base de pruebas y en solo lectura tras el despliegue.

# Customer: dinero, compras y beneficios

Customer permite planear una compra, revisar el presupuesto, buscar beneficios publicados y registrar el pago o vincular una compra que ya llegó desde Empresa.

## Recorrido

- Inicio prioriza gastos registrados, obligaciones pendientes y compras planeadas.
- Compras guarda intención, importe máximo, moneda, categoría, fecha opcional y notas.
- La previsión resta al presupuesto mensual total los gastos registrados, los pagos pendientes hasta fin de mes (incluidos vencidos) y las compras pendientes de este mes o sin fecha. Las monedas se calculan por separado. No es un saldo bancario.
- Buscar beneficios consulta publicaciones elegibles y negocios activos. Presenta precios publicados y condiciones; no inventa descuentos ni afirma tener el mejor precio del mercado.
- Registrar compra pagada crea un movimiento personal, previa confirmación de importe, comercio y fecha. Vincular compra registrada reutiliza un movimiento propio o una venta canónica recibida de Empresa.
- Se compara importe planeado con importe realmente registrado. Esa diferencia no se presenta como ahorro atribuible a una promoción.
- Reabrir o cancelar un plan no elimina movimientos ni ventas. Un movimiento eliminado, anulado o sin acceso produce un aviso de revisión.

## Datos y autorización

customer_purchase_plans pertenece exclusivamente a la cuenta Customer. Tiene RLS, sin permisos para PUBLIC, anon o authenticated; las rutas requieren sesión Customer y verifican propietario en cada operación. Se incluye en exportación y eliminación de la cuenta.

La creación es idempotente. Confirmaciones concurrentes se serializan por comprador y bloquean el plan. Se reutiliza customer_entries para gastos y business_sales para ventas; no hay un segundo libro contable.

## Descubrimiento de negocios

Los negocios activos con acceso vigente a Empresa son encontrables aunque aún no tengan ficha Customer. Se respetan perfiles expresamente ocultos; las cuentas internas no se publican automáticamente. Se permite abrir el perfil y seguirlo. Los beneficios mantienen su publicación explícita y sus reglas originales de elegibilidad.

## Validación

Pruebas de integración: aislamiento entre cuentas, presupuesto sin doble conteo, monedas separadas, confirmaciones concurrentes, reapertura, eliminación de movimientos, venta Empresa sin duplicación, RLS, exportación y eliminación de cuenta.

Pruebas DOM: creación con reintento idempotente, enlace a venta existente, ofertas con precio superior al plan, ausencia de presupuesto y navegación del inicio.

La ejecución conjunta final pasó 49 pruebas. El asesor Supabase no pudo completar su análisis en la instancia de QA porque esa instancia no tiene el rol anon; la prueba SQL de la tabla confirma RLS y ausencia de permisos públicos. No se modificaron roles de la instancia para ejecutar el asesor.

El navegador automatizado de esta sesión no permite seleccionar pestañas. Las pruebas DOM no sustituyen la validación visual en un celular físico.

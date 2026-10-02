# Tarjeta de sellos

Módulo en **Optimiza → Tarjeta de sellos**. Disponible para propietarios y gerentes con acceso activo al portal. Usa el logo vigente de Activos digitales; no requiere subirlo otra vez.

## Operación

1. Crear un programa: 2–50 sellos, premio/producto gratis, descuento porcentual, descuento en COP o beneficio personalizado. Configurar compra mínima, límite diario, vigencia de tarjeta/ticket, condiciones y costos estimados.
2. Entregar una tarjeta con nombre y documento del cliente y confirmar su autorización de datos. La inscripción repetida en un programa devuelve el mismo enlace. El enlace personal tiene 256 bits aleatorios y usa fragmento URL para evitar propagarlo como Referer.
3. Registrar compras pagadas en los flujos habituales de Qori usando el mismo documento. Un trigger sobre `business_sales` acredita los sellos; no se cuentan las copias de ventas atribuidas. No se acreditan compras anteriores a la inscripción, sin documento, no pagadas, sin valor positivo o por debajo del mínimo. La primera transición a PAID también puede acreditar; restaurar una venta anulada no acredita por segunda vez.
4. En «Configurar programa» el gerente activa o desactiva «Permitir sellos manuales». Solo cuando está activado aparece «Sellar visita» en las tarjetas vigentes e incompletas del programa activo. Este permiso aplica también a tarjetas ya entregadas; sus metas y beneficios no cambian. Registrar una visita no cambia esta configuración. Los programas nuevos dejan la opción desactivada hasta que el negocio la elija. Las visitas manuales exigen referencia única y motivo, no fabrican ingresos y respetan el límite diario.

«Eliminar» retira un programa de la lista operativa y detiene nuevas tarjetas y sellos. Requiere confirmar la acción y registra fecha y responsable. No permite reactivarlo mediante edición. Conserva tarjetas, historial, estadísticas y tickets; las tarjetas completas vigentes todavía pueden generar su beneficio con el débito habitual de un ticket. El filtro de programas incluye los eliminados para consultar sus datos. El enlace del cliente informa que el programa finalizó.
5. Al completar la tarjeta, el cliente pulsa **Generar mi beneficio**. La emisión y el consumo de **1 ticket Qori** son atómicos. Los reintentos y solicitudes concurrentes devuelven el mismo ticket. Sin saldo, todo se revierte y el derecho a reclamar sigue disponible hasta el vencimiento configurado.
6. Presentar el QR del beneficio en el Validador habitual. El documento del titular debe coincidir. El canje es único y se refleja en Redenciones y en las métricas de sellos.
7. El cliente inicia una nueva tarjeta después de generar el ticket o vencer su tarjeta. Conserva el mismo enlace y los beneficios anteriores. Las compras recibidas mientras una tarjeta está completa no acumulan sellos adicionales; esto se explica tanto al gerente como al cliente.

Pausar o archivar detiene nuevas tarjetas y sellos; se honran las tarjetas completas no vencidas. Cambios de reglas y premios se aplican a ciclos nuevos; cada tarjeta guarda sus condiciones originales.

## QR de identificación y sellado desde el Validador

Todas las tarjetas, incluidas las existentes, muestran «Mi QR de tarjeta» en su enlace personal. El QR contiene el ID de la inscripción y abre `/empresa/?view=validator&stamp_card=...`; no contiene el documento ni el enlace secreto para reclamar premios. Permanece igual al iniciar ciclos nuevos y no consume tickets Qori.

El Validador reconoce este QR tanto por cámara como al pegarlo y abre la ficha de la tarjeta del contacto: nombre, documento, programa, progreso y «Sellar tarjeta». El escaneo solo consulta. Un clic registra una visita manual, con referencia y responsable automáticos. Conserva la compra abierta en el Validador.

Propietarios, gerentes y validadores pueden consultar y sellar tarjetas de su propio negocio. Los validadores no adquieren permisos para configurar programas. El sellado exige permiso de sellos manuales, programa activo, ciclo vigente e incompleto, y respeta el límite diario. Las compras elegibles siguen sellándose automáticamente. Las solicitudes repetidas o simultáneas no duplican el sello; se rechaza una ficha desactualizada.

## Productos de inventario

En «Cómo se obtiene el sello» se puede elegir cualquier compra o una compra que incluya un producto específico del inventario activo del negocio. Se otorga un sello por compra elegible, independientemente de la cantidad de unidades. Se mantiene el mínimo de compra y el límite diario. Las ventas con varios productos y las importaciones se reconocen por el ID del producto, nunca solo por su nombre. Un regalo sin valor no cuenta como una compra del producto.

Con «Producto o servicio gratis» se puede seleccionar el producto del premio. El ID y nombre se conservan en el ticket y en el canje del Validador. También se pueden describir premios sin vincularlos al inventario. La selección no cambia el flujo existente de movimientos de stock del Validador.

Las tarjetas entregadas conservan el producto requerido y el premio originales, incluso al renombrar productos o editar el programa. Las nuevas condiciones aplican a nuevas tarjetas. Los sellos manuales siguen siendo una opción independiente del programa.

La migración `20261002115614_stamp_inventory_products.sql` agrega la regla opcional y reconoce la vinculación de productos posterior a la creación de ventas, conservando la idempotencia por venta y cliente.

## Métricas y auditoría

- Periodo de hasta un año y filtro por programa; clientes activos, visitas posteriores a la primera registrada, clientes recurrentes, ventas vinculadas, tarjetas completas, tickets emitidos y beneficios efectivamente canjeados.
- Una venta presente en varios programas se cuenta una sola vez en las ventas globales. Los clientes se agrupan por documento normalizado.
- Retorno **estimado**: `(ventas vinculadas - costos configurados) / costos configurados`. El costo de ticket se reconoce al emitir y el costo del premio al canjear. No mide causalidad, utilidad neta ni margen, y no se calcula cuando falta costo base.
- Historial paginado, búsqueda por cliente y CSV de la página visible. Las anulaciones conservan el registro, el motivo y el responsable.
- Anular una venta pagada revierte su sello. Si deja incompleta una tarjeta con ticket emitido, se cancela el ticket sin usar. Si ya fue canjeado se conserva la redención y se señala el caso para revisión. No se reintegran automáticamente créditos ya consumidos por emisión.

## Persistencia y validación

Migración `20261001194731_stamp_card_loyalty.sql`, en `database/migrations` y su espejo `supabase/migrations`. Cuatro tablas con RLS, sin acceso público/anon/authenticated; claves compuestas refuerzan pertenencia entre negocio, programa, cliente y ciclo. El backend usa transacciones y bloqueos por cliente para serializar sellos y reclamos.

Prueba local aislada (PostgreSQL en `127.0.0.1:55439`):

```text
node scripts/stamp-card-local-setup.js
STAMP_CARD_INTEGRATION=1 node --test test/stampCards.integration.test.js
node scripts/stamp-card-local-server.js
```

El setup recrea **únicamente** `stamp_cards_qa` en ese host/puerto fijo. No lee una URL de producción. El servidor local usa exclusivamente esa base y una cuenta ficticia. La suite cubre concurrencia, repetición, saldo insuficiente, identidad, separación de negocios, cambio de condiciones, anulaciones, API y canje real en Validador.

En PowerShell, establecer `$env:STAMP_CARD_INTEGRATION='1'` antes del comando de prueba. Sin esa variable, la prueba integrada se omite para que el resto de pruebas no dependa de PostgreSQL local.

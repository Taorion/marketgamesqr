# Tarjeta de sellos

Módulo en **Optimiza → Tarjeta de sellos**. Disponible para propietarios y gerentes con acceso activo al portal. Usa el logo vigente de Activos digitales; no requiere subirlo otra vez.

## Operación

1. Crear un programa: 2–50 sellos, premio/producto gratis, descuento porcentual, descuento en COP o beneficio personalizado. Configurar compra mínima, límite diario, vigencia de tarjeta/ticket, condiciones y costos estimados.
2. Entregar una tarjeta con nombre y documento del cliente y confirmar su autorización de datos. La inscripción repetida en un programa devuelve el mismo enlace. El enlace personal tiene 256 bits aleatorios y usa fragmento URL para evitar propagarlo como Referer.
3. Registrar compras pagadas en los flujos habituales de Qori usando el mismo documento. Un trigger sobre `business_sales` acredita los sellos; no se cuentan las copias de ventas atribuidas. No se acreditan compras anteriores a la inscripción, sin documento, no pagadas, sin valor positivo o por debajo del mínimo. La primera transición a PAID también puede acreditar; restaurar una venta anulada no acredita por segunda vez.
4. Si está habilitado, el gerente registra visitas manuales con referencia única y motivo. Estas visitas no fabrican ingresos y respetan el límite diario.
5. Al completar la tarjeta, el cliente pulsa **Generar mi beneficio**. La emisión y el consumo de **1 ticket Qori** son atómicos. Los reintentos y solicitudes concurrentes devuelven el mismo ticket. Sin saldo, todo se revierte y el derecho a reclamar sigue disponible hasta el vencimiento configurado.
6. Presentar el QR del beneficio en el Validador habitual. El documento del titular debe coincidir. El canje es único y se refleja en Redenciones y en las métricas de sellos.
7. El cliente inicia una nueva tarjeta después de generar el ticket o vencer su tarjeta. Conserva el mismo enlace y los beneficios anteriores. Las compras recibidas mientras una tarjeta está completa no acumulan sellos adicionales; esto se explica tanto al gerente como al cliente.

Pausar o archivar detiene nuevas tarjetas y sellos; se honran las tarjetas completas no vencidas. Cambios de reglas y premios se aplican a ciclos nuevos; cada tarjeta guarda sus condiciones originales.

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

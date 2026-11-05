# Regalos de productos: Empresa y Customer

El enlace «Descubrir productos para regalar» de la página pública abre `/customer/#gift-shop`. El catálogo consulta exclusivamente publicaciones PRODUCT disponibles, permite buscar por producto/negocio y ciudad, y conserva su paginación. No muestra productos de ejemplo como ofertas reales.

## Operación del negocio

En Empresa → Qori Customer:

1. **Productos para regalar** abre la publicación con tipo PRODUCT seleccionado. Se necesita perfil público, producto activo en COP, existencias, precio, instrucciones de pago, condiciones y vigencia.
2. **Pedidos de regalos** abre la bandeja de solicitudes: pendientes primero, búsqueda por referencia/comprador/destinatario y filtros de estado.
3. Tras comprobar el pago recibido, el negocio selecciona sede activa, medio y referencia de pago y confirma expresamente el importe. La transacción existente registra la venta canónica, descuenta stock, emite el ticket y crea la invitación. Se requieren los créditos de tickets y las existencias correspondientes.
4. El Validador entrega el producto ya pagado una sola vez. No vuelve a cobrar, crear otra venta ni descontar otra unidad.

El pedido pendiente no reserva inventario ni implica pago. Si el destinatario rechaza, el ticket vence o la venta se anula, la bandeja muestra ese estado; cualquier resolución de dinero se gestiona directamente con el negocio. Qori no realiza cobros ni reembolsos bancarios en este flujo.

## Comprador y destinatario

El comprador elige un producto, indica el correo completo o identificación Qori de otra cuenta Customer y puede escribir una dedicatoria. Si necesita registrarse, vuelve al producto elegido después de verificar el correo. El pedido muestra las instrucciones y su referencia; puede cancelarlo antes de pagar.

**Mis regalos** separa enviados y recibidos. Los recibidos solo aparecen después de la confirmación de Empresa. Desde ahí el destinatario revisa condiciones, acepta o rechaza y abre el ticket propio tras aceptar. También recibe la invitación en la bandeja general; el acceso y contador de invitaciones permanece visible en la cabecera del portal.

La entrega es dentro de Qori Customer. No se añade envío por WhatsApp, correo o push en este cambio. El usuario puede actualizar las listas para consultar estados. No se registran productos reales ni se publican precios o condiciones de un negocio sin que este los configure.

## Contratos y validación

`GET /api/customer/product-gifts` conserva `orders` para el comprador y añade `received` con regalos emitidos destinados a la cuenta autenticada. Solo el destinatario aceptado recibe `ticket_id`; el comprador no obtiene el QR. `GET /api/business/customer/product-gifts` añade sedes activas del negocio y prioriza pendientes. No cambia el esquema ni el proceso transaccional de confirmación.

Pruebas HTTP locales: publicación y aislamiento entre negocios, precio del servidor, ausencia de entrega antes del pago, confirmación concurrente, una sola venta y descuento, recepción/aceptación exclusiva, canje único, anulación y falta de existencias/créditos. Pruebas DOM: catálogo, filtros, aceptación, bandeja empresarial y alcance de sesión. Regresiones de acceso Customer, invitaciones y tarjetas.

Recorrido de navegador con datos ficticios en 1440, 390 y 360 px: registro desde producto, pedido, recepción y confirmación. Se comprueba ausencia de desbordamiento horizontal, desplazamiento interno y acceso a acciones inferiores. No equivale a una compra real ni a prueba en dispositivo físico.

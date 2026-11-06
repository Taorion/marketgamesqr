# Tickets de regalo desde Empresa

Acceso: **Activaciones → Crear ticket de regalo**. También está disponible desde Qori Customer en Empresa y Pedidos de regalos.

1. Buscar al beneficiario registrado por cédula o correo completo. Revisar el nombre encontrado.
2. Elegir un producto activo del inventario en COP, con existencias; indicar precio, condiciones y vigencia.
3. Identificar al comprador: nombre para una compra en caja, o cuenta Customer si autoriza recibir la compra y el comprobante.
4. Indicar sede, medio y referencia del pago recibido. Revisar el resumen y confirmar expresamente el pago antes de enviar.
5. El destinatario recibe una notificación y una invitación en Customer. Acepta o rechaza; al aceptar puede mostrar el QR para recibir el producto.
6. El Validador del negocio entrega el regalo ya pagado una sola vez, sin cobrar ni descontar existencias nuevamente.

Este flujo es para regalos de productos comprados. No realiza cobros electrónicos ni crea cuentas Customer. Las giftcards de saldo y los obsequios financiados por el negocio mantienen sus flujos existentes.

## Contrato y aislamiento

- `GET /api/business/customer/product-gifts/catalog`: inventario disponible y sedes del negocio autenticado.
- `POST /api/business/customer/product-gifts`: solicitud pendiente, producto y destinatario explícitos, precio y condiciones fijados. No requiere publicación pública.
- `POST /api/business/customer/product-gifts/:id/confirm-payment`: reutiliza la emisión canónica existente; venta, inventario, ticket, invitación y notificaciones dentro de la misma transacción.
- Solo propietario o administrador pueden crear y confirmar. Todas las consultas comerciales se restringen al negocio autenticado.
- La cédula se busca exactamente sobre el documento maestro declarado y bloqueado. Si más de una cuenta coincide, se exige buscar por correo; no se elige una cuenta arbitraria. La búsqueda no autoriza acceso a finanzas ni conecta historias automáticamente.
- Las solicitudes directas usan bloqueo transaccional e índice único por negocio y request_id. El mismo identificador con datos distintos se rechaza. Confirmar de nuevo una solicitud emitida devuelve la venta existente.
- El beneficiario nunca recibe el gasto ni el comprobante privado del comprador. Las ventas de regalos excluyen cualquier cuenta distinta del comprador explícito, incluso si existe otra relación de identidad.
- Si se pierde la respuesta del servidor, el formulario conserva el pedido y los datos para reintentar sin duplicados. Los pedidos pendientes también pueden revisarse en Pedidos de regalos.

## Migración y verificación

`20261105225037_qori_business_product_gifts.sql` permite publication_id nulo solo para pedidos iniciados por Empresa y agrega el índice de idempotencia. Conserva RLS y ausencia de permisos públicos. La copia en database/migrations se aplica al iniciar Render.

Verificación local sobre qori_customer_qa: 15 pruebas del nuevo flujo y regalos existentes; 26 de red, entrega de ventas y compras automáticas; 14 pruebas de interfaz. Incluyen concurrencia, retroceso ante falta de créditos, rechazo de otros negocios/cuentas, autorización del comprador, notificación, aceptación, comprobante y redención sin segundo descuento.

Navegador con API y base locales: recorrido real Empresa → Customer → aceptación → QR en 1440, 390 y 320 px. Diálogo con desplazamiento interno, sin desbordamiento y acciones inferiores accesibles. No equivale a una compra real en producción ni a una prueba en dispositivo físico.

El comando Supabase advisors se intentó, pero el stack Docker local en 54322 no está activo. La base QA de PostgreSQL en 55441 sí se verificó directamente: migración aplicada, RLS habilitado y sin permisos para anon, authenticated o PUBLIC en la tabla de pedidos. Los controles HTTP y de aislamiento se probaron contra esa base.

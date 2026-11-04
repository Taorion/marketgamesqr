# Registro diario y productos para presupuestar

El inicio ofrece Entró dinero y Gasté dinero antes del detalle financiero. El formulario usa el bolsillo activo y su moneda, solicita importe y concepto, propone hoy y deja categoría y nota como opcionales. Mantiene el identificador en reintentos. Los accesos a ingresos previstos, agenda e historial permiten confirmar movimientos existentes sin volver a anotarlos. El saldo y la proyección permanecen diferenciados y visibles juntos.

En una publicación PRODUCT de Empresa, Incluir en mi presupuesto calcula precio publicado por cantidad. Guarda una compra planeada privada, el negocio, producto, condiciones, fecha, moneda y precio de referencia; también guarda la publicación en favoritos. No registra gasto, pago, venta, ticket ni reserva de inventario. La referencia conserva su importe aunque la oferta cambie o se retire. Mis compras muestra cambios y permite recalcular explícitamente con el precio actual. Las monedas no se convierten ni se mezclan.

La migración añade una referencia opcional y una captura JSON a customer_purchase_plans. Mantiene RLS y acceso público revocado. El servidor valida la publicación y su precio, el propietario, el bolsillo, la revisión y los reintentos; el cliente no decide el precio publicado. El importe solo entra al gasto al confirmar un pago o vincular un movimiento existente.

Validación: 36 pruebas DOM/API en QA aislado, incluyendo idempotencia, proyecciones, cambios y eliminación de publicaciones, aislamiento, monedas, roles públicos y flujos de compras/regalos existentes. Verificación visual pendiente: la herramienta de navegador no estuvo disponible.

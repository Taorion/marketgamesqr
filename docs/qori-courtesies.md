# Cortesías y recargas de Gift Cards

Customer y Empresa pueden comprar cantidades de un producto publicado por un negocio Qori, sin elegir destinatarios. La solicitud permanece pendiente hasta que el comercio confirma el importe completo recibido. La confirmación registra una sola venta canónica, reserva existencias y consume un ticket operativo por unidad. Cada unidad se entrega después a un beneficiario, sin repetir la venta ni el descuento de inventario o tickets.

En Empresa, **Ofrece → Cortesías** permite comprar a otros negocios, preparar productos propios, consultar reservas, entregar unidades y confirmar pedidos recibidos. Las cortesías propias reservan inventario y tickets; se registran con ingreso cero y el costo del producto. No generan un cobro al beneficiario.

La entrada de Empresa es **Ventas y despacho**. «Crear y enviar ticket vendido» abre el flujo existente de venta con destinatario y confirmación del pago. «Ver pedidos de tickets individuales» permite despachar pedidos ya creados sin duplicarlos. Los paquetes sin destinatario aparecen en la misma pantalla: al confirmar su pago se habilitan en la cuenta del comprador, quien posteriormente asigna cada unidad. El negocio entrega el producto físico mediante el validador. «Regalar mis productos» corresponde a cortesías financiadas por el propio comercio.

El contenido de Empresa se renderiza en un Shadow DOM con hoja de estilos propia, para evitar que las reglas generales del portal estrechen encabezados y controles. Su contenedor ocupa todas las columnas del área de trabajo. La navegación y los formularios usan una sola columna en móvil. Las pruebas de integración de la interfaz cubren los accesos a venta, pedidos, publicación y validador, además de respuestas de solicitudes antiguas que llegan al cambiar de pestaña.

La entrega exige confirmación explícita del destinatario. El beneficiario entra o crea su Customer gratis y acepta el beneficio antes del canje. La vigencia comienza al entregar cada unidad. Una unidad asignada no vuelve al saldo por rechazo o vencimiento. El comprador conserva el comprobante y el enlace para compartir; la entrega se encola por el mecanismo de correo existente.

## Pensé en ti

- 20 tickets iniciales, una sola vez. Sin emisiones de Gift Card ni programa de sellos incluido; sellos y activaciones son programas gratuitos separados.
- Hasta cinco productos y un programa de sellos; el programa conserva las reglas de emisión y canje existentes.
- Recargas de Gift Card a COP 2.500 por emisión: 50 (125.000), 200 (500.000), 600 (1.500.000), 2.000 (5.000.000) y 6.000 (15.000.000).
- El precio compra capacidad de emisión, no saldo para consumir en el comercio.
- Los pagos de paquetes requieren aprobación verificada e idempotente. No generan comisiones Seller por giftcards.
- La migración añade solo las 15 emisiones de diferencia a cuentas existentes; no repone las ya gastadas. Los antiguos pagos pendientes GF5 conservan su liquidación original, sin ofrecer nuevos GF5.

## Integridad y validación

Los propietarios se resuelven desde la sesión. La tabla de reservas tiene RLS y carece de permisos públicos; solo accede el backend. Bloqueos de fila e idempotencia impiden pagos, asignaciones y consumos duplicados. La compra aparece una sola vez en las finanzas del Customer comprador; el beneficiario no hereda ese gasto. Al aceptar, se vincula la identidad confirmada del beneficiario y se reutiliza su contacto canónico.

Pruebas locales: customerCourtesy.integration, customerCourtesyUI, giftcardPackages.integration, businessProductGift.integration, customerProductGift.integration, qoriSellerLaunch.integration y qoriPlanMatrix. Usan PostgreSQL local aislado; no hacen escrituras de prueba en producción. Las pruebas DOM no constituyen evidencia visual móvil ni de dispositivo físico. El host de automatización del navegador no estuvo disponible para la revisión visual de esta entrega.

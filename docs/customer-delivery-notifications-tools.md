# Entregas Customer, avisos y herramientas financieras

Qori Empresa → Qori Customer permite buscar una cuenta y elegir **Entregar beneficios existentes**. El operador verifica la cédula maestra y elige una tarjeta, afiliación, giftcard o ticket de su negocio. Las invitaciones para programas nuevos y activaciones conservan el flujo previo.

La entrega conserva el recurso original y nunca crea una venta ni otorga acceso general al historial financiero. Una coincidencia aislada de cédula no concede propiedad: se comprueban documento, correo y conflictos de titularidad. Si falta el correo, una entrega explícita del negocio puede completar el contacto con el de la cuenta elegida. Un correo diferente requiere revisión del registro original.

Un negocio nuevo produce una invitación pendiente, visible desde Mis tarjetas y Avisos. Tras aceptación, las entregas compatibles de ese negocio pueden incorporarse automáticamente. La recuperación inicial sigue siendo única y la cédula no cambia. Rechazos, bloqueos y revocaciones no se eluden con reintentos.

Las notificaciones persistentes cubren invitaciones, tarjetas, afiliaciones, puntos, giftcards, tickets, sellos y anulaciones de sellos. Los eventos se capturan en la misma transacción que el registro comercial y un worker los procesa cada 15 segundos. La consulta del tarjetero también reconcilia beneficios anteriores sin duplicar recursos. El portal actualiza el indicador de avisos cada 20 segundos mientras está visible.

Los avisos al dispositivo reutilizan las suscripciones web del usuario, requieren permiso y una sesión vigente, respetan la preferencia de beneficios y los negocios bloqueados. Las entregas tienen reintentos, arrendamiento y deduplicación por notificación/dispositivo. El service worker vuelve a comprobar la cuenta antes de mostrar información. No se envían correos o WhatsApp desde este módulo.

Migración: `20261105133514_qori_customer_benefit_delivery_notifications`, reflejada en database y supabase. Las tres tablas nuevas tienen RLS y acceso público revocado; la función de captura tiene search_path vacío y no concede ejecución a PUBLIC/anon/authenticated.

En Mi dinero, **Todos mis movimientos** y **Calculadora** aparecen encima de Entró/Gasté. El historial consulta todo el tiempo registrado cuando no hay fechas, conserva el bolsillo seleccionado, pagina los resultados y filtra por búsqueda, fechas, moneda, categoría, origen, tipo, estado, necesidad, frecuencia, medio de pago e importes. Los totales corresponden al conjunto filtrado, no al saldo inicial. Orden estable por fecha, nombre o importe. La consulta usa las fuentes canónicas y las reglas de autorización existentes.

La calculadora no escribe datos financieros. Incluye operaciones básicas, cuotas con capital/intereses/seguros/cargos, ahorro para una meta, interés compuesto, tasas equivalentes, descuentos/impuestos y división de cuentas. Supone cuotas y aportes al final del mes; tasa y cargos constantes; redondeo a centavos en amortización y reparto. No representa una cotización bancaria. El simulador existente de deudas conserva las comparaciones de abonos.

Validación: integración en PostgreSQL local aislado, pruebas de fórmulas y DOM, navegador local en 1440/390/360 px. Push probado con emisor simulado, no equivale a recepción en un dispositivo físico.

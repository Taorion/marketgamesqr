# Lanzamiento Pensé en ti y Gana con Qori

## Propuesta y circuito de crecimiento

La cuenta gratuita abre la conversación: un comercio vende un café, una comida o un postre para regalar; confirma el pago; el comprador obtiene comprobante y enlace para compartir; la persona destinataria crea o inicia su Customer gratuito, acepta y visita el negocio. El comercio ve una venta y una visita verificables. El Embajador gana cuando ese comercio compra tickets o paga su plan.

Mensajes listos:
- Comercio: «Pensé en tu negocio. ¿Y si tus clientes pudieran regalar uno de tus productos a alguien especial? Qori te deja empezar gratis con 20 tickets, hasta 5 productos y 5 emisiones de Gift Card».
- Comprador: «Elige el detalle y el correo de quien lo recibe. Después del pago te entregamos el comprobante y tu enlace para compartir».
- Destinatario: «Alguien pensó en ti. Entra o crea Qori Customer gratis con este correo, descubre tu regalo y acéptalo. También puedes organizar tus ingresos y gastos».
- Embajador: «Presenta Qori a negocios interesados. Recibe el 10% de cada pago confirmado de plan y cada compra de paquetes de tickets atribuida a ti. Sin comisión por abrir una cuenta gratuita ni por reclutar vendedores».

## Ejecución de 90 días

Son objetivos de trabajo propuestos; no resultados ni ingresos garantizados. La participación del Embajador conserva autonomía, sin cuotas u horarios laborales impuestos.

Días 1–14: piloto en un barrio con cafeterías, restaurantes y postres. Invitar primero a relaciones propias que acepten conocer la propuesta. Por cada alta, acompañar cinco productos reales con precio y existencias, una demostración completa de pago/aceptación/canje y una próxima conversación consentida en el CRM. Registrar objeciones, errores y abandono. No comprar bases ni extraer datos masivamente.

Días 15–30: repetir la demostración en los comercios activados; cada local puede invitar a comercios vecinos interesados. Compartir el enlace individual del Embajador para conservar atribución. Publicar historias reales solo con permiso, sin cifras inventadas. Optimizar primero el porcentaje de negocios que emiten su primer regalo, antes de aumentar las inscripciones.

Días 31–60: organizar cohortes por semana de alta y tipo de negocio; comparar primera emisión, aceptación, canje y primera recarga. Invitar a conocer planes pagos cuando el negocio necesite más productos o módulos. No presionar a comprar para mantener una cuenta gratuita.

Días 61–90: ampliar únicamente las zonas y canales donde los regalos efectivamente se aceptan y canjean. Medir repetición de compra y costo de soporte. Usar una parte del ingreso cobrado disponible, después de comisión, impuestos y costos, para evaluar campañas pagas; sin comprometer anticipadamente presupuestos ni prometer rentabilidad.

## Indicadores con definiciones

- Alta atribuida: qori_free_enrollments unida a qori_sales_accounts. No es venta.
- Negocio activado: al menos un customer_product_gift_orders ISSUED con business_sales PAID.
- Aceptación: invitación explícita ACCEPTED. No equivale a canje.
- Canje: qr_codes REDEEMED y redención canónica del comercio.
- Primera recarga y recompra: órdenes aprobadas y acreditadas, excluyendo reversos.
- Conversión a pago: negocios de una cohorte con primera compra / negocios inscritos en esa cohorte.
- Comisión pendiente/pagada: libro qori_seller_commissions; transferencia y retenciones en qori_seller_payouts.
- Correos: qori_gift_mail_outbox sent_at indica aceptación del proveedor, no lectura ni entrega garantizada en bandeja.

Revisión semanal: detectar altas sin productos, regalos pendientes de pago, invitaciones sin aceptar, saldo próximo a agotarse y correos agotados en reintentos. El contacto posterior debe respetar consentimiento y solicitudes de no contacto.

## Reglas publicadas

- /pense-en-ti/: gratuito permanente; una entrega de 20 tickets por documento; hasta cinco productos no eliminados; cinco emisiones iniciales de Gift Card; validador.
- Los tickets de producto y las emisiones de Gift Card son saldos separados. El valor monetario de una Gift Card pertenece a la operación del comercio y no lo financia Qori.
- GF5 vende cinco emisiones por COP 7.500, tomando la tarifa base vigente de COP 1.500 por emisión en packageCatalog.js. No comisiona: la instrucción comercial concede comisión por planes y paquetes de tickets.
- Los saldos gratuitos no se recargan por tiempo. Cada período de plan efectivamente pagado reemplaza el saldo incluido no consumido; conserva tickets comprados.
- /seller/: 10% de cada pago de plan y de cada paquete de tickets. Atribución congelada al crear la orden; no al enviar datos desde el navegador. Alta gratis no comisiona.
- Corte miércoles 23:59 America/Bogota; pago los jueves. Se registra transferencia real, no se ejecuta banca ni se marca pagado automáticamente.
- Contrato descargable HTML imprimible, firma manuscrita, autenticación notarial y carga de cuatro documentos. Aprobar requiere Superadmin y verificaciones expresas.
- Solicitudes nuevas no acceden al CRM hasta aprobación. Vendedores comerciales preexistentes conservan acceso, pero deben completar expediente aprobado antes de registrar pagos de este programa.

## Seguridad y operación

Migraciones espejo en database/migrations y supabase/migrations:
20261107140715_qori_pense_en_ti_seller.sql
20261107142911_qori_gift_delivery.sql

Tablas privadas con RLS y sin permisos anon/authenticated; acceso solo desde servidor. Documentos cifrados AES-256-GCM, tamaño máximo 8 MB, descarga autenticada y auditada. Configurar SELLER_DOCUMENT_ENCRYPTION_KEY estable; si no existe usa una derivación de JWT_SECRET. No cambiar la clave utilizada sin migrar/re-cifrar documentos y preservar recuperación de respaldos. Nunca incluir secretos en repositorio.

El trabajador de correo usa RESEND_API_KEY y CONTACT_MAIL_FROM/MARKETING_MAIL_FROM, solo en producción. Cola transaccional con idempotencia, lease y hasta ocho intentos. Monitorizar last_error/attempts y resolver configuración antes de reintentar manualmente. No incluye reenvíos masivos ni exportación de documentos.

Administración: /seller/#admin con cuenta QORI_SUPERADMIN; existe acceso desde /admin/. Revisar los cuatro documentos, CIIU 7310 — Publicidad en el RUT para la actividad promocional, firma autenticada y titularidad bancaria. El código puede figurar como principal, secundario u otra actividad según ingresos y actividad real. Registrar motivos de corrección/rechazo/suspensión y soporte bancario del pago. Fundamento y tratamiento de expedientes anteriores: [CIIU de Qori Seller](qori-seller-ciiu.md).

Contrato: Orbital Innovation S.A.S., NIT 9021022727, representante Sandra Lizeth Casallas Regalado, domicilio y teléfono confirmados por la usuaria. El documento no garantiza inmunidad frente a reclamaciones ni excluye una relación laboral o agencia si los hechos configuran sus elementos. Debe mantenerse coherencia entre operación real y condiciones, y obtener revisión profesional colombiana antes de usarlo como política contractual definitiva.

Fuentes legales consultadas:
- Código Sustantivo del Trabajo, art. 23: https://www.cancilleria.gov.co/normograma/compilacion/docs/codigo_sustantivo_trabajo.htm
- Ley 1581 de 2012: https://normograma.dian.gov.co/dian/compilacion/docs/ley_1581_2012.htm

## Verificación y límites

Pruebas con PostgreSQL aislado en 127.0.0.1:55441/qori_customer_qa. Nunca ejecutar los fixtures contra producción. Cubren aprobación, autorización, documentos, límites concurrentes, Gift Cards, pago idempotente de regalo, recepción posterior, privacidad, comisiones, reversos, renovación de saldo y registro de transferencias.

La herramienta de computadora interrumpió la revisión visual al no poder identificar la URL de Chrome. No hay validación visual desktop/móvil ni prueba en dispositivo físico de este lanzamiento. Los tests DOM verifican comportamientos, no geometría.

La acreditación de pasarela se prueba con eventos simulados y reglas de servidor; no se realiza una compra bancaria real ni se afirma que el pago llegue a una cuenta. Desplegar exige comparar el SHA exacto en /api/version y comprobar /api/health, rutas, activos y contrato público.

Resultado local: 40 comprobaciones automatizadas aprobadas entre integración, permisos y DOM. Checkout GF5/QR50 simulado confirma importes canónicos, reintentos idempotentes y ausencia de crédito/comisión antes del pago. Sintaxis verificada en 39 archivos; migraciones espejo idénticas y SQL de recuperación de cortesías históricas validado en transacción local.

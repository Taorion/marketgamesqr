# Cotizaciones con fotos y beneficio QR

Entrada: **Opera → Cotizaciones**. Requiere acceso al portal y Productos; vincular Contactos, activaciones o registrar ventas respeta además los permisos de esos módulos. Solo propietarios, administradores y gerentes autorizados pueden operar.

1. Crear un borrador con un contacto existente o un destinatario escrito, hasta 30 productos activos en COP, cantidades enteras, precios, descuentos e impuestos adicionales.
2. Seleccionar opcionalmente una activación vigente del mismo negocio. Su acceso puede estar disponible desde la emisión o después del pago registrado. Se conservan las reglas y el consumo de tickets de la activación original.
3. Revisar y emitir. La marca, las fotos y las condiciones quedan conservadas; para cambiarlas se crea una nueva versión. Se puede descargar PDF y compartir el enlace desde WhatsApp, correo o el menú del dispositivo. Estos botones preparan el envío; el portal no lo envía automáticamente.
4. El cliente consulta y acepta o rechaza la propuesta. Aceptar no crea ingresos.
5. Registrar el pago total crea una venta canónica y descuenta inventario, de forma transaccional e idempotente. Se conserva el vendedor del contacto. Anular una venta bloquea el beneficio condicionado a ese pago.

Los borradores y cotizaciones anuladas no tienen acceso público. Los enlaces usan tokens aleatorios de 256 bits; los documentos no se indexan y se sirven sin caché. Una propuesta vencida no admite aceptación ni conversión. La activación debe seguir vigente al abrir el beneficio. El enlace es compartible: no sustituye las reglas de identidad o límites de participación de la activación.

El logo cargado y las fotos JPG/PNG/WebP se normalizan al guardar. Los logos anteriores guardados como URL HTTPS pública se descargan sin redirecciones, con límites de tamaño y tiempo y validación de dirección para evitar acceso a redes privadas. Si no hay foto se muestra «Sin foto». La cotización no es una factura ni un comprobante de pago.

Persistencia: `business_quotes`, migración `20261030170832_business_quotes` en ambos directorios utilizados por el proyecto. RLS habilitado y permisos de Data API revocados; solo rutas autenticadas y vistas públicas con token. La migración oficial se ejecuta por el comando de inicio de Render.

Verificación: `QUOTES_INTEGRATION=1 node --test test/quotes.integration.test.js`. La prueba fuerza la base local `quotes_qa` en `127.0.0.1:55439`, que debe contener el esquema del portal y la nueva migración. Nunca usa el `DATABASE_URL` del entorno para acceder a producción. Las muestras visuales se generan en `tmp/quotes-qa` y no se publican.

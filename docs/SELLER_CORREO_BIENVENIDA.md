# Bienvenida de embajadores por correo

Implementación del 11 de noviembre de 2026. La revisión en clientes de correo reales requiere un envío autorizado y comprobar su recepción.

En Admin → Cuentas Qori → Vendedores → Administrar aparece **Enviar bienvenida**. Abre una vista previa del correo, el destinatario y los últimos envíos. El administrador debe pulsar **Enviar bienvenida por correo**; crear o aprobar una cuenta no envía mensajes automáticamente.

El mensaje celebra la admisión y confirma la verificación documental. Por eso el servidor exige cuenta activa, perfil Seller, estado APPROVED, modo DOCUMENTS y los siete documentos. ADMIN_OVERRIDE no permite enviar esta bienvenida. Las cuentas manuales pueden completar la revisión y aprobación antes del primer ingreso, sin inventar una aceptación electrónica. La cuenta y sus pagos siguen bloqueados hasta que el titular cree su contraseña y acepte las condiciones.

Para una cuenta pendiente, el correo genera un nuevo enlace de activación de siete días y un solo uso; sustituye el enlace anterior. Para una cuenta activada, el botón abre Seller y conserva su contraseña. El destinatario procede de la cuenta; no se admiten destinatarios arbitrarios.

Diseño HTML con estilos inline, tablas de presentación, adaptación móvil, botón compatible con Outlook, versión de texto, enlace alternativo y acceso a Demo Qori. No requiere imágenes remotas para entender el mensaje. La vista previa no contiene un token de activación real.

El envío usa la configuración Resend existente: RESEND_API_KEY y MARKETING_MAIL_FROM (o CONTACT_MAIL_FROM). Los reintentos conservan el mismo contenido cifrado y la misma clave de idempotencia. Después de confirmar el envío se elimina el contenido cifrado con el enlace. Las solicitudes SENT no vuelven a enviarse; una nueva bienvenida requiere una acción nueva y al menos un minuto de separación. Los reintentos de un intento incierto se limitan a 23 horas, dentro de la ventana de idempotencia del proveedor. Si cambian el correo, el enlace, la activación o la aprobación, se cancela el reintento. No hay trabajador que envíe correos por su cuenta.

La tabla privada de envíos tiene RLS y carece de permisos para anon/authenticated. Aplicar una sola copia de `20261111224800_qori_seller_welcome_email.sql` antes del backend nuevo. Los ensayos usan PostgreSQL local y un proveedor simulado; no acreditan entrega en una bandeja real.

Consulta [Expediente de embajadores](SELLER_EXPEDIENTE.md) para los requisitos vigentes, el bloqueo de reemplazos del embajador y la revisión tras cambios de Admin.

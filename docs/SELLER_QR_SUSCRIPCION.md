# QR de inscripción del embajador

En **Qori Seller → Mi espacio → Mis enlaces de embajador**, cada uno de los ocho planes actuales tiene **Mostrar QR**. El embajador puede presentarlo en pantalla o descargar un PNG de 1024 píxeles.

Al escanear un QR personal, el cliente abre el formulario del plan elegido. Los programas gratuitos usan `/pense-en-ti/?seller=…&program=…#freeForm`; los planes pagos usan `/paquetes/?advisor=…&plan=…#signupSection`. El formulario de pago ya selecciona el plan recibido por URL. Se conserva el embajador y las comprobaciones de atribución vigentes.

En **Mi CRM → Compartir suscripción**, primero se elige un plan y después **Mostrar QR del plan**. Este QR pertenece al contacto y conserva el token de seguimiento, el correo requerido y el vencimiento original del enlace. Si se cambia de plan, se retira la imagen anterior para evitar mostrar otro formulario.

Los enlaces CRM son largos. Para que el QR se pueda mostrar en pantallas pequeñas, la imagen codifica `/inscripcion/<token aleatorio>`. La redirección de Qori recupera el destino original exacto, valida al embajador y el contacto, y no renueva su vigencia. Un contacto cerrado, modificado, reasignado o un embajador suspendido invalida el recorrido. La página de un enlace inválido solicita un QR actualizado. El enlace no permite iniciar sesión ni leer datos del CRM.

## Implementación

- `POST /api/seller/referral-qr`: sesión comercial aprobada, propiedad del enlace, origen oficial, rutas y parámetros permitidos, plan público vigente y contexto firmado válido. No consulta servidores externos ni permite QR arbitrarios.
- Los QR personales se generan sin nuevas filas. Los QR CRM reutilizan una fila por embajador y destino; la tabla `qori_seller_signup_qr_links` conserva el URL exacto y su vencimiento, sin correo en texto plano.
- Migración `20261117155248_seller_subscription_qr_links.sql`, idéntica en ambas carpetas. RLS activado y acceso directo de Public, anon y authenticated revocado. El servidor controla escritura y resolución.
- No se modifican suscripciones, comisiones, saldos ni pagos al generar o escanear un QR. La inscripción y la confirmación de cobro siguen siendo pasos separados.

## Validación

Las pruebas de API decodifican los PNG de todos los planes y los QR CRM a 288 píxeles de ancho. Verifican redirección exacta, parámetros, reutilización, vencimiento, suspensión, aislamiento entre embajadores y bloqueo de destinos externos. Las pruebas DOM cubren descarga, cambio de plan, errores/reintentos, cierre, respuestas tardías y atribución en los formularios.

La lectura automatizada de la imagen no equivale a una prueba física con la cámara de un celular. La revisión visual de escritorio/móvil y la prueba física de cámara se reportan por separado.

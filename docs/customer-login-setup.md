# Acceso a Qori Customer

Correo y contraseña, código de correo y OAuth con Google/Microsoft comparten la misma identidad Customer. No se usa la identidad de Qori Empresa ni se enlazan cuentas solo porque coincidan correos.

La contraseña se establece únicamente después de verificar un código de correo de un solo uso. El cambio revoca todas las sesiones anteriores. Los hashes scrypt y las identidades externas se guardan en tablas privadas con RLS y sin permisos de Data API para PUBLIC, anon o authenticated. No se incluyen en respuestas de cuenta ni exportaciones.

El registro solo está completo cuando la cuenta tiene nombre y cédula confirmada. Verificar el correo crea una sesión de registro pendiente: puede completar sus datos, gestionar su acceso, exportar sus propios datos o eliminar la cuenta, pero no acceder a finanzas, tarjetas, invitaciones ni exploración. La misma regla se comprueba en el servidor para código, contraseña y OAuth. Las cuentas anteriores sin cédula deben completar este paso; sus datos se conservan.

`PATCH /api/customer/me` exige `document_id` y `document_confirmation` cuando aún no existe la cédula maestra. Guarda nombre y documento en una sola transacción; dos peticiones simultáneas no pueden fijar documentos distintos. Una vez guardada, la cédula no se puede cambiar desde el perfil. Autorizar la recuperación de beneficios sigue siendo una decisión separada y opcional: registrar la cédula no conecta historiales ni concede beneficios por sí solo.

## Configuración del operador

Las credenciales son del servidor. Configurarlas en las variables de entorno del servicio Render; nunca en JavaScript público, Git ni mensajes de chat. `/api/customer/auth/options` comunica únicamente si cada proveedor está habilitado. Los botones permanecen deshabilitados mientras falten credenciales.

Google: crear un cliente OAuth de tipo aplicación web, configurar la pantalla de consentimiento, dominio gosqori.com y publicar la aplicación (o añadir usuarios de prueba mientras se prueba).

- `CUSTOMER_GOOGLE_CLIENT_ID`
- `CUSTOMER_GOOGLE_CLIENT_SECRET`
- URI de redirección exacta: `https://gosqori.com/api/customer/auth/web/oauth/google/callback`

Microsoft Entra: registrar una aplicación compatible con cuentas de cualquier directorio organizacional y cuentas personales Microsoft. Añadir una redirección de plataforma Web y crear un secreto (usar el valor del secreto, no su identificador).

- `CUSTOMER_MICROSOFT_CLIENT_ID`
- `CUSTOMER_MICROSOFT_CLIENT_SECRET`
- URI de redirección exacta: `https://gosqori.com/api/customer/auth/web/oauth/microsoft/callback`

`PUBLIC_APP_URL=https://gosqori.com` debe corresponder al origen público. Los únicos ámbitos solicitados son `openid profile email`; no hacen falta permisos de correo, archivos ni calendarios. Mantener vigente el secreto Microsoft y rotar ambos cuando corresponda.

Referencias: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Microsoft OpenID Connect](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc).

## Vinculación y comprobación

1. La primera entrada con un proveedor valida firma, emisor, audiencia, caducidad, nonce, estado y PKCE. No crea una cuenta ni da acceso a finanzas.
2. El comprador verifica el correo de su cuenta Qori y confirma la conexión. La identidad externa solo puede pertenecer a una cuenta. Una sesión anterior al inicio del flujo no basta para vincular.
3. Los accesos posteriores con esa identidad entran a la misma cuenta. Nombre y correo del proveedor son solo sugerencias; el identificador estable del proveedor es la clave de acceso.
4. Probar con cuentas reales de Google y Microsoft una vez configurados: primera conexión, acceso posterior, cancelación, correo Qori distinto, sesión cerrada y cuenta ya conectada. Las pruebas con proveedores simulados no demuestran la configuración real de los proveedores.

Los códigos y cookies de flujo vencen en 10 minutos. Los tokens OAuth de acceso/actualización no se guardan. Las sesiones Customer usan cookies HttpOnly y no se exponen a JavaScript. Las finanzas, tarjetas y exploración requieren sesión validada en el servidor.

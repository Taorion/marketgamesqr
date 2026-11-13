# Recuperación de contraseña de Qori Seller

Desde **Admin → Cuentas Qori → Embajadores → Administrar**, selecciona **Generar enlace de recuperación**, verifica el destinatario, escribe el motivo y confirma. Copia el enlace y compártelo únicamente con ese embajador. No se envían correos automáticamente desde esta acción.

El enlace abre Seller, vence en 30 minutos y funciona una sola vez. Regenerarlo invalida todos los enlaces de recuperación anteriores de esa cuenta. La contraseña actual continúa funcionando hasta completar el cambio; al cambiarla se invalidan las sesiones anteriores mediante el mecanismo vigente `password_version`.

La contraseña del correo Hostinger es independiente. No se modifican aprobaciones, documentos, comisiones, roles ni aceptaciones del embajador. Las cuentas pendientes de su primer ingreso conservan **Generar enlace de activación** y deben completar la aceptación de condiciones. Cuentas suspendidas o eliminadas no admiten recuperación.

Solo las identidades autorizadas de Admin con permiso de superadmin pueden generar enlaces. Se reutiliza `password_reset_tokens` y su hash; el historial conserva responsable, motivo y vencimiento, sin el enlace secreto. Emisión y consumo se serializan por cuenta. No requiere migraciones ni variables nuevas.

En Seller, **Recuperar mi contraseña** abre `/seller/?recuperar=1`. Reutiliza el envío de recuperación vigente por Resend; requiere su configuración de correo existente. Los correos de cuentas Seller ahora llevan a Seller. Empresa mantiene su ruta habitual. El envío no revela si la cuenta existe.

## Prueba local

En la base aislada `qori_customer_qa`, ejecutar con Node:

```powershell
.\.local-tools\node-v22.23.5-win-x64\node.exe --test --test-concurrency=1 test/sellerPasswordRecovery.integration.test.js test/sellerPasswordRecovery.ui.test.js test/sellerActivationUI.test.js test/adminExclusiveAccess.integration.test.js
```

Las pruebas de recuperación sustituyen el servicio de correo por un registro local en memoria: no envían mensajes reales. Cubren API/BD, permisos, concurrencia, revocación, vencimiento y DOM. La revisión visual en navegador, dispositivos y entrega real de correo se verifica por separado.

Para verificar manualmente: generar dos enlaces, comprobar que el primero falla, cambiar la contraseña con el segundo e iniciar sesión en Seller. Reutilizar el segundo debe fallar; las sesiones previas deben pedir un nuevo ingreso. Probar una cuenta pendiente de activación y una suspendida.

Entrega local, sin publicación ni cambios en producción. Para revertir una publicación posterior, revertir solo estos cambios de recuperación; no hay tablas nuevas que eliminar. Los enlaces ya emitidos expiran naturalmente; conservar la pantalla de recuperación hasta su vencimiento evita interrumpirlos.

# Acceso exclusivo a Admin

Admin está reservado a `cbotero@gosqori.com` y `scasallas@gosqori.com`, siempre que sus cuentas estén activas y conserven un rol administrativo. La lista se define en `backend/src/services/adminAccessPolicy.js`. El correo autorizado por sí solo no otorga un rol.

El servidor consulta la identidad y el rol actuales de `app_users` en cada petición autenticada. No confía en el correo ni el rol enviados en el token. Las cuentas con roles administrativos históricos fuera de la lista son rechazadas, aunque su sesión no haya vencido. No se eliminan cuentas ni historiales.

El ingreso del panel usa `/api/auth/admin/login` y la recuperación de sesión usa `/api/admin/session`. Todo `/api/admin` exige la política de acceso. Los embajadores usan exclusivamente `/seller/` y sus rutas `/api/seller`. Su CRM de prospectos pasó a `/api/seller/commercial/prospects`, manteniendo aprobación previa y alcance por propietario. No se expone administración de equipo, revisión documental ni pagos en ese nuevo router.

La interfaz de Admin descarta sesiones que no acrediten acceso administrativo. La página pública de ingreso puede abrirse; eso no permite entrar al espacio de trabajo ni consultar datos. El selector de roles no ofrece Superadministrador a otros correos y el servidor rechaza tanto ese cambio como la creación de administradores por el formulario antiguo.

No se requiere migración. Las dos cuentas autorizadas se verificaron en lectura con `platform_role=QORI_SUPERADMIN`. Las pruebas usan exclusivamente PostgreSQL QA local e identidades de prueba, sin cambiar credenciales ni datos productivos.

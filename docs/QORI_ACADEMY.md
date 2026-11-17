# Qori Academy

Acceso: `/seller/#academy`, con cuenta de embajador aprobada o superadmin.

La colección contiene cuatro videos de Google Drive, cuatro presentaciones PowerPoint originales y un PDF de apertura comercial. Los enlaces y nombres de los videos se comprobaron con los metadatos de Drive el 17 de noviembre de 2026; los cuatro tienen permiso de lectura mediante enlace. No se modificaron permisos en Drive.

Los videos se cargan bajo demanda en el reproductor de Drive y tienen enlace alternativo. La protección del portal controla el acceso a la biblioteca; los enlaces de Drive conservan su permiso independiente de lectura por enlace. La disponibilidad de reproducción depende de Google Drive.

Los documentos iniciales se incluyen en `backend/assets/academy`. Los documentos nuevos o reemplazados se guardan en PostgreSQL, con validación real de formato y límite de 15 MB. Todos se entregan exclusivamente mediante `/api/seller/resources/academy/:id/download`, tras autenticar la sesión y comprobar aprobación, disponibilidad de Academy y publicación del material. No se publica la carpeta como contenido estático.

## Administración

En **Admin → Cuentas Qori → Qori Academy**, el superadmin puede:

- Habilitar o deshabilitar Academy para los embajadores. El contenido se conserva y Admin puede seguir consultándolo.
- Añadir videos mediante enlaces de Google Drive y subir PDF, PPTX, DOCX, XLSX, PNG, JPG o WebP.
- Editar título, descripción, tipo, archivo/enlace y orden (menores primero).
- Publicar, ocultar como borrador o archivar un material; los estados son reversibles.
- Descargar los documentos y abrir los videos de Drive para revisión.

Los formularios previenen sobrescrituras de cambios concurrentes mediante `expected_revision`. Los cambios de acceso y contenido generan registros en `qori_commercial_audit`, sin almacenar archivos ni base64 en la auditoría.

La migración `20261117213612_qori_academy_admin.sql` crea `qori_academy_settings` y `qori_academy_materials`, habilita RLS y revoca acceso directo a PUBLIC/anon/authenticated. Conserva el acceso habilitado y los nueve materiales publicados como estado inicial. La migración se ejecuta por el mecanismo habitual de arranque; no modifica recursos comerciales históricos. Los cambios posteriores de Admin se conservan en la base de datos.

Deshabilitar Academy bloquea nuevas consultas y descargas. Abrir un video desde una tarjeta previamente cargada vuelve a comprobar disponibilidad en el servidor. No retira archivos ya descargados ni revoca los permisos independientes de enlaces de Drive o un video que ya estaba abierto.

La biblioteca administrativa anterior conserva su acceso interno: la apertura no publica automáticamente sus borradores o recursos históricos.

## Validación

- 41 pruebas aprobadas entre las suites de Academy, administración, biblioteca, oportunidad y Cuentas Qori. Integración en PostgreSQL local `qori_customer_qa`, puerto 55441: permisos, cierre/reapertura, borradores, publicación, archivo/restauración, reemplazo de documentos, revisiones concurrentes y auditoría.
- Verificación SQL directa: ambas tablas tienen RLS activo y permisos solo del propietario del servidor. Supabase CLI Advisors no pudo ejecutarse porque busca el stack Docker en 54322; la base aislada de este repositorio está en 55441.
- Revisión visual pendiente: el navegador integrado no está disponible y el control nativo terminó al no poder determinar la URL con suficiente certeza. No se comprobó dispositivo físico ni reproducción audiovisual real.

Comando: `node --test --test-concurrency=1 test/sellerAcademyAdmin.integration.test.js test/sellerAcademyAdminUI.test.js test/sellerAcademyUI.test.js test/sellerResourcesUI.test.js test/sellerOpportunityUI.test.js test/sellerResources.integration.test.js test/adminAccountsUI.test.js`.

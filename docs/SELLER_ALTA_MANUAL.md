# Alta manual de embajadores

Entrega del 11 de noviembre de 2026: alta administrativa con activación personal de contraseña.

En **Admin → Cuentas Qori → Crear embajador**, el superadministrador registra nombre, correo, cédula, celular, ciudad y una nota del alta. Se crea la cuenta y su expediente sin contraseña utilizable y sin atribuirle una aceptación de condiciones que aún no ha realizado.

Admin muestra un enlace personal para copiar y compartir con el embajador. Vence en siete días y solo sirve una vez. Se pueden adjuntar documentos antes del primer ingreso. La ficha ofrece **Generar enlace de activación** mientras la cuenta siga pendiente; generar uno nuevo invalida el anterior. Las cuentas ya activadas conservan su contraseña y no admiten otra activación.

Al abrir el enlace, Seller solicita crear y confirmar una contraseña de al menos doce caracteres, leer las condiciones y confirmar su aceptación, el tratamiento de datos y la mayoría de edad. El servidor registra la aceptación con la versión vigente. Después puede iniciar sesión con sus credenciales. El mismo acceso sirve para Demo Qori cuando el embajador esté aprobado.

El alta manual no aprueba documentos ni habilita comisiones pagables. El administrador conserva **Dar de alta** y la revisión documental. Aunque autorice el acceso comercial antes, la cuenta permanece bloqueada hasta completar la activación. La carga documental es posible antes de activar; el envío a revisión exige la aceptación del embajador.

Los correos y documentos duplicados no reemplazan cuentas existentes. El servidor almacena solo el hash del enlace y no registra contraseñas ni enlaces en el historial. Las renovaciones y activaciones son atómicas, auditadas y verifican que la cuenta continúe habilitada. Los enlaces viajan en el fragmento de la URL y se retiran de la barra al abrir la pantalla.

Aplicar `20261111223448_qori_seller_manual_activation.sql` antes de iniciar el backend actualizado. Las copias de `database/migrations` y `supabase/migrations` son idénticas; se aplica una sola copia mediante el mecanismo habitual. Las pruebas usan exclusivamente `qori_customer_qa` en PostgreSQL local, puerto 55441. No se han creado embajadores reales ni enviado invitaciones.

Pruebas: `sellerActivation.integration.test.js`, `sellerActivationUI.test.js` y regresiones de documentación, aprobación, Seller y Demo. La revisión visual está pendiente porque el host de navegador no estuvo disponible.

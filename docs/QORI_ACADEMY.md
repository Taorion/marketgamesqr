# Qori Academy

Acceso: `/seller/#academy`, con cuenta de embajador aprobada o superadmin.

La colección contiene cuatro videos de Google Drive, cuatro presentaciones PowerPoint originales y un PDF de apertura comercial. Los enlaces y nombres de los videos se comprobaron con los metadatos de Drive el 17 de noviembre de 2026; los cuatro tienen permiso de lectura mediante enlace. No se modificaron permisos en Drive.

Los videos se cargan bajo demanda en el reproductor de Drive y tienen enlace alternativo. La protección del portal controla el acceso a la biblioteca; los enlaces de Drive conservan su permiso independiente de lectura por enlace. La disponibilidad de reproducción depende de Google Drive.

Los documentos se incluyen en `backend/assets/academy` y se entregan exclusivamente mediante `/api/seller/resources/academy/:id/download`, tras autenticar la sesión y comprobar aprobación. No se publica la carpeta como contenido estático. El catálogo permite únicamente identificadores conocidos. No requiere migraciones ni carga de videos a Git.

La biblioteca administrativa anterior conserva su acceso interno: la apertura no publica automáticamente sus borradores o recursos históricos.

## Validación

- 12 pruebas de interfaz aprobadas: Academy, biblioteca administrativa, oportunidad y presentación de planes.
- 9 pruebas de integración aprobadas en PostgreSQL local `qori_customer_qa`, puerto 55441: sesiones, roles, aprobación, nueve materiales y descarga de los cinco documentos, además de las regresiones de la biblioteca anterior.
- La revisión visual en navegador y en dispositivo móvil quedó pendiente: el navegador integrado no estuvo disponible y el control nativo detectó interacción del usuario. No se comprobó la reproducción audiovisual real de las cuatro sesiones.

Comando: `node --test test/sellerAcademyUI.test.js test/sellerResourcesUI.test.js test/sellerOpportunityUI.test.js test/sellerResources.integration.test.js`.

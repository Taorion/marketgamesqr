# Expediente de embajadores

Desde la versión contractual `2026-11-13-expediente`, el expediente requiere cédula, RUT con CIIU 4610, certificado bancario, antecedentes de Policía, antecedentes de Procuraduría, foto del rostro y contrato firmado y autenticado.

El embajador selecciona un archivo y confirma **Adjuntar definitivamente**. Puede descartar la selección o repetir una foto antes de confirmar. Después solo puede descargar ese documento. El servidor serializa las cargas por expediente y rechaza reemplazos, incluso si se solicitan correcciones. Admin debe realizar las correcciones de archivos ya guardados.

La cámara se abre únicamente por acción del embajador, tras su autorización para revisión manual de la foto. La captura ofrece vista previa y se detiene después de tomarla, al cerrar la cámara, al ocultar la página o al salir. Existe selección alternativa de imagen. No se realiza reconocimiento facial. La foto debe ser una imagen JPG/PNG decodificable y registra la autorización en auditoría. Otros documentos aceptan PDF/JPG/PNG, hasta 8 MB cada uno.

**Admin → Cuentas Qori → Vendedores → Administrar → Adjuntar documentos** permite cargar y reemplazar documentos en todos los estados. Un hash evita sobrescribir cambios concurrentes de otro administrador. Cada operación registra actor, tipo de archivo y hashes anterior/nuevo. Reemplazar un documento enviado devuelve el expediente a borrador. Si estaba aprobado, conserva el acceso comercial, pero exige nueva revisión documental antes de registrar pagos o enviar bienvenida. Una suspensión no se levanta al cargar archivos; requiere una decisión explícita.

La descarga de `/api/seller/contract` entrega un PDF personalizado con las condiciones vigentes. Debe imprimirse completo, firmarse y autenticarse ante notaría; se adjunta con su constancia. Descargarlo o adjuntarlo no prueba autenticidad ni aprobación. Admin verifica todos los documentos, incluidos antecedentes y rostro, antes de aprobar.

Los expedientes históricos conservan su estado. Se muestran los nuevos documentos faltantes. Al completar un expediente previamente aprobado se requiere una nueva revisión. No se modifica silenciosamente la aceptación anterior del embajador. El alta manual conserva la activación y aceptación personal separadas de la revisión administrativa.

Los archivos siguen cifrados, con descarga autenticada por titular o Superadmin, auditoría de consulta y tabla privada con RLS. La migración `20261113130720_qori_seller_complete_dossier` amplía la restricción de tipos; sus dos copias son idénticas y se aplica una sola vez por el mecanismo de migraciones existente.

Validación local: pruebas de API/PostgreSQL aislado, permisos, concurrencia, consentimiento, validación de imagen, envío/aprobación, bienvenida simulada y flujo DOM/cámara simulada. El PDF de muestra se renderizó y revisó en sus cuatro páginas. La prueba de cámara física y del diseño en navegador móvil requiere un navegador disponible; la simulación DOM no la sustituye.

# Biblioteca comercial Qori Seller

Seller → **Materiales para vender** reúne 11 guías web: siete internas y cuatro para el negocio. La guía **Empieza aquí** explica qué compartir, cuándo y cómo conservar la atribución. La colección revisada aporta 48 archivos: 16 internos, 29 para negocios y tres para futuros embajadores. El superadmin puede mantener su publicación desde Admin.

Admin → Cuentas Qori → **Materiales Seller** permite descargar el prompt y la fuente vigente, cargar archivos o enlaces HTTPS, editar sus instrucciones y versión, publicar o retirar recursos. Las ediciones requieren la revisión actual del registro para evitar sobrescribir cambios de otro administrador. Los cambios se registran en la auditoría comercial.

Los archivos admitidos son PDF, PNG, JPG, WebP, DOCX, PPTX y XLSX, hasta 15 MiB, sin macros ni objetos Office incrustados. Los bytes se almacenan en `qori_seller_resources`; RLS y revocación de permisos impiden el acceso directo desde los clientes de Supabase. Las descargas pasan por autorización de servidor, se entregan como adjuntos y no se almacenan en cachés compartidas. Retirar un archivo impide nuevas descargas, pero no borra copias que alguien ya descargó.

**Para mí** permanece dentro de Seller y requiere acceso aprobado. **Para mis clientes** se comparte a través de `/conoce-qori/?seller=...&recurso=...`. Esta página presenta únicamente recursos publicados para prospectos y los tres programas gratuitos y cuatro planes pagos del catálogo canónico. Las llamadas al registro conservan el embajador y el programa elegido. Los enlaces oficiales de registro cargados como recursos también reciben este contexto.

Cuando el prospecto ya existe en Mi CRM, **Compartir suscripción → Copiar presentación para este cliente** conserva además el token firmado del prospecto. La lectura no modifica el CRM ni expone su correo. El registro valida otra vez el contacto, propietario, correo, vigencia y elegibilidad dentro de su transacción. Un token vencido o un contacto cambiado no se reemplaza silenciosamente por un registro genérico.

Los PDF e imágenes descargados no contienen automáticamente la identidad del embajador: se acompañan del enlace personal. Las guías web y el checkout muestran la información vigente; los documentos deben incluir versión y fecha. La fuente descargable contiene comisiones para producción interna, por lo que no debe compartirse con prospectos. El campo técnico `public_signup_available` del catálogo se refiere al checkout de suscripciones; los tres gratuitos tienen su ruta separada `/pense-en-ti/?program=...`.

El inventario solicitado a ChatGPT contiene 21 familias de activos y sus originales/exportaciones. `PROMPT_COLECCION_DIGITAL_QORI.txt` pide archivos reales, revisión visual y un manifiesto. La importación inicial se realiza con un manifiesto verificado y huellas SHA-256; cada alta queda auditada con la identidad real del operador de mantenimiento.

Validación: `sellerResources.integration.test.js`, `sellerResourcesUI.test.js`, `qoriSellerUI.test.js`, `prospectReferral.integration.test.js`, `adminAccountsUI.test.js`, `prospectReferralUI.test.js` y `sellerPlanLinksUI.test.js`. Usan exclusivamente la base local QA. La prueba de pagos usa un proveedor simulado; no ejecuta cobros reales. La revisión visual mediante navegador requiere una sesión de navegador disponible.

## Oportunidad y colección integrada

Mi oportunidad ofrece tres rutas de aprendizaje y un simulador que utiliza la política VF1 canónica. La misma explicación está disponible en la entrada pública de Seller. No concede territorios, certificaciones ni comisiones por incorporar embajadores.

La audiencia CANDIDATE se comparte mediante `/seller/?recurso=...#sellerOpportunity`; solo sus recursos publicados se descargan desde `/api/public/seller-kit/opportunity`. Los recursos SELLER y PROSPECT no se exponen en esa ruta. La biblioteca filtra por destinatario, etapa y formato.

`scripts/prepare-seller-collection.py` conserva los originales y prepara copias revisadas. `scripts/export-seller-office.ps1` exporta las copias de Office. Tras revisar los PDF, el manifiesto VERIFIED registra cada hash. `scripts/import-seller-collection.js <manifiesto>` previsualiza y `--apply` importa en una transacción, sin duplicar ni sobreescribir recursos modificados en Admin. El importador es de mantenimiento, no una ruta web ni una suplantación de sesión.

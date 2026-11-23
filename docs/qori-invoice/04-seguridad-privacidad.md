# Seguridad, privacidad y límites del sandbox

Revisión técnica: 2026-11-22. Pendiente de validación jurídica humana. Ningún texto de este directorio habilita producción.

## Responsabilidades propuestas

| Actor | Finalidad y rol propuesto, sujeto a contrato | Acceso |
| --- | --- | --- |
| Comercio facturador | Emisión y entrega fiscal; responsable de su tratamiento | Sus propios documentos, nunca historial Customer |
| Integrador | Transmisor autorizado por cada emisor; encargado o responsable según contrato | Sus aplicaciones, autorizaciones y acuses técnicos |
| Qori | Recepción, conservación y análisis personal por autorización del consumidor; rol contractual por validar | Resolución interna, servicio y operaciones mínimas |
| Infraestructura/proveedor de identidad futuro | Encargado/subencargado según contrato | Solo evidencia necesaria, sin publicidad |
| Customer | Titular; autoriza, revoca, corrige organización, exporta y solicita supresión | Sus documentos con prueba de titularidad vigente |

Base de diseño: autorización informada, finalidad, acceso restringido y derechos del titular de la [Ley 1581 de 2012, publicación SIC](https://sedeelectronica.sic.gov.co/sites/default/files/normatividad/Ley_1581_2012.pdf). No se interpreta que la cédula o un correo verificado acrediten titularidad documental. El enlace de Función Pública suministrado devolvió 502 durante esta consulta; no se dedujo de ello derogación ni cambio normativo.

## Identidad y consentimiento

Identidad = país + tipo + número. Se correlaciona por HMAC-SHA256 con secreto de 256 bits; no SHA simple. Se admite llave actual y hasta dos previas durante rotación. Colisiones entre titulares detectadas en la resolución privada se detienen; la restricción única evita dos atestaciones activas de la misma huella. Cambiar documento genera revisión y revoca los consentimientos. No hay método productivo de verificación implementado: únicamente SANDBOX_FIXTURE, números alfanuméricos de prueba y evidencia de fixture local. No se guardan imágenes de cédula.

Diseño pendiente para proveedor real: comprobación de documento con desafío de titularidad proporcional al riesgo, sesión reciente, proveedor con evidencia verificable y referencia opaca; controles reforzados ante colisión/cambio y revisión humana. No desplegar reconocimiento biométrico ni almacenar copias sin contrato/finalidad/retención aprobados.

Consentimiento por aplicación, opcionalmente comercio, bolsillo e identidad; texto versionado y hash, RECEIVE/STORE/ANALYZE, canal y fechas. No se ofrece consentimiento global a futuros proveedores desconocidos. La UI actual muestra selección por aplicación; la restricción por comercio está disponible en contrato interno. Recepción desactivada inicialmente. Sin autorización vigente al recibir y asignar, se descarta contenido tras el procesamiento y no se crea bandeja de reclamación.

Primera factura: abrir entrada genérica /customer/invoices/, iniciar sesión propia, completar verificación habilitada y autorizar el proveedor; después reenviar con nueva clave. El primer envío sin autorización no se rescata con un consentimiento posterior. No incluir cédula, CUFE ni ID de Customer en enlaces o QR públicos.

## Matriz de amenazas

| Amenaza OWASP/API | Control implementado | Pendiente de piloto |
| --- | --- | --- |
| BOLA/BFLA | Sesión real, scopes, membresía OWNER/SUPPORT, objeto por app/customer, Admin QORI_SUPERADMIN | Pentest independiente |
| Enumeración de titulares | Acuse opaco, resolución privada en otra transacción, códigos y métricas técnicas sin entrega | Análisis estadístico de tiempos bajo carga; no se afirma ausencia demostrada de todo canal lateral |
| Suplantación emisor | Autorización app/emisor revalidada al asignar; único fixture | Validación real NIT/DV y mandato |
| XML/XXE/SSRF | Saxes namespace-aware, DTD/entidades/PI prohibidas, sin fetch, límites de bytes/nodos/profundidad; sin ZIP | Corpus XSD/Schematron y firmas de múltiples proveedores |
| Replay/duplicado | Unicidad app/idempotencia y emisor/tipo/CUFE; mismo identificador distinto contenido: revisión privada | Deduplicación fiscal de fuentes OCR/email sin CUFE normalizado |
| Exposición | AES-256-GCM del original, snapshot, perfil y solicitudes; AAD por objeto; tokens/secretos aleatorios con hash | KMS, control operacional de llaves y cifrado de discos/backups comprobado |
| Agotamiento | Límites IP/app, cuota persistente partner/app, máximo 5 credenciales activas | Rate limiting distribuido; cuota global NIT multitenant |
| Uso indebido interno | RLS sin políticas públicas, revocación anon/authenticated, consola sin XML ni datos del comprador | MFA privilegiado obligatorio si se incorpora soporte; exportación auditada a SIEM |
| Contaminación comercial | Ningún insert a business_sales, puntos, recompensas o campañas | Cualquier enlace futuro necesita base y diseño separado |

No se invoca IA ni se comparte historial con CRM. Métricas de partner excluyen asignación, consentimiento, colisiones y conflictos fiscales.

## Conservación y derechos

- Cola cifrada: se elimina al asignar/descartar/rechazar; TTL configurable de 5 a 60 minutos (15 por defecto) para fallos. Worker ejecuta limpieza cada minuto.
- Original recibido: referencia técnica sandbox de 30 días, no afirmación de plazo legal. Supresión requiere solicitud propia, revisión, plazo vencido y ausencia de legal_hold. Se elimina contenido y capas personales; se conserva huella técnica mínima para evitar reimportar el documento retirado.
- Tokens efímeros vencidos: purga después de un día. Invitaciones y acuses mínimos necesitan política definitiva y tarea de archivo antes de producción.
- Exportación existente /api/customer/export incluye originales accesibles, consentimientos, categorías personales y estado de solicitudes; identidad revocada/vencida no exporta facturas. La portabilidad de evidencias de verificación futuras depende del proveedor y política aprobados.
- Corrección fiscal se remite al emisor. Cambio de categoría altera solo la capa personal con original_value, normalized_value, user_override, método/confianza y revisión.
- Revocar recepción impide futuras asignaciones; no borra documentos ya entregados. Revocar/vencer titularidad bloquea lectura y descarga.
- Eliminación de cuenta existente mantiene su semántica previa; debe armonizarse explícitamente con conservación legal y backups antes de datos reales. Este es un bloqueo productivo, no una garantía resuelta.

Revisar este modelo contra [OWASP API Security Top 10](https://owasp.org/projects/api-security-project/) y documentar riesgos aceptados por responsables humanos.

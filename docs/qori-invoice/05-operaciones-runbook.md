# Operaciones y pruebas locales

## Entorno real y rutas nuevas

Servidor Express existente. Sin dominio nuevo, sin despliegue. Portal /developers/, guía pública /developers/guide.html, contrato /developers/openapi.yaml, Customer /customer/invoices/, operaciones /admin/invoices/. Navegación de Customer añade Mis facturas y Qori Developers únicamente si capabilities.sandbox=true. Expo no se modificó.

M2M estable de esta versión: POST /api/invoice/v1/oauth/token, POST /api/invoice/v1/invoices, GET /api/invoice/v1/receipts/:id. Se elige una sola ruta de recepción. OpenAPI 3.1 publicado como JSON válido dentro del archivo YAML.

Internos de Developers bajo /api/developers/v1: overview, partners, apps, keys, fixture-merchant, state, catalog, profile, invites, members, homologation, metrics, sandbox-run y terms. Customer bajo /api/customer/invoices: consent(s), integrations, identity/requests, summary, notices/read, notification-preference, requests, detalle, xml, lines/:line/category y reconcile. Admin bajo /api/admin/invoices: overview, reviews/:id/decision, apps/:id/block y requests/:id/decision. Ver esquemas Zod completos en backend/src/invoice/routes.js; los contratos internos siguen versionándose con el portal.

## Variables nuevas (sin valores secretos)

| Variable | Uso |
| --- | --- |
| QORI_INVOICE_SANDBOX_ENABLED | false por defecto; true solo development/test |
| QORI_INVOICE_ENCRYPTION_KEY | Hex de 32 bytes para versión 1; sin valor predeterminado |
| QORI_INVOICE_ENCRYPTION_KEYS | JSON de versiones y llaves hex; sustituye la llave única |
| QORI_INVOICE_ENCRYPTION_KEY_VERSION | Versión activa; conservar previas para descifrar |
| QORI_INVOICE_IDENTITY_KEY | HMAC actual de identidad, 32 bytes |
| QORI_INVOICE_IDENTITY_PREVIOUS_KEYS | JSON de hasta dos llaves previas durante transición |
| QORI_INVOICE_QUEUE_TTL_MINUTES | 15 por defecto, rango 5–60 |
| QORI_INVOICE_CATEGORY_MAPPINGS | JSON opcional emisor`|`SKU → categoría existente; prioridad sobre reglas por nombre |
| QORI_BASE_URL / QORI_CLIENT_ID / QORI_CLIENT_SECRET / QORI_IDEMPOTENCY_KEY | Solo ejemplos de servidor, nunca variables públicas del frontend |

Se reutilizan DATABASE_URL, DB_SSL, NODE_ENV y sesiones existentes. No copiar .env de producción. NODE_ENV=production bloquea el módulo incluso si se activa el flag. El worker adicional exige loopback y base qori_invoice_qa. No hay tráfico real ni claves productivas.

## Reproducción

Desde la raíz de esta rama, con Node 22 y PostgreSQL local preparado:

~~~powershell
node scripts/prepare-qori-invoice-qa.js
node --test test/qoriInvoice.test.js test/qoriInvoice.integration.test.js
node scripts/preview-qori-invoice.js
~~~

Si Node no está en PATH, usar la ruta absoluta de .local-tools/node-v22.23.5-win-x64/node.exe del checkout principal. Preparador fija 127.0.0.1:55489/qori_invoice_qa, no admite URL remota y no elimina bases. Instalar dependencias con npm ci en un checkout nuevo. El esquema base contiene referencias adelantadas: el preparador reordena DDL en memoria y difiere/restaura cuatro FK; no modifica schema.sql.

Preview: http://127.0.0.1:3197/__invoice-demo/developer y /__invoice-demo/customer. Acceso de fixture loopback exclusivo del launcher local, nunca instalado por app.js. Mantiene llaves locales bajo .qa-invoice ignorado por Git. DETENER preview antes de pruebas: ambos usan la misma base y llaves de prueba distintas. Un advisory lock de sesión impide iniciar las pruebas mientras un preview/worker actualizado usa esa base y viceversa.

El worker separado se lanza con variables sandbox configuradas: node scripts/qori-invoice-worker.js, o --once. Preview incorpora procesamiento periódico para la demostración; no utilizarlo como servicio de producción.

## Migraciones y reversión

20261122160317_qori_invoice_sandbox y 20261122163509_qori_invoice_customer_developers, espejadas en database/migrations y supabase/migrations. No ejecutar ambos directorios en el mismo migrador. Nueva rama no desplegada; Render ejecutaría migraciones al iniciar, por ello push/deploy requiere revisión previa.

Reversión preferida: desactivar flag, detener worker y volver al código anterior conservando datos cifrados y llaves. rollback.sql retira todo el módulo solo vacío y rechaza destruir evidencias. No es reversión destructiva automática con datos. Aplicar esquema antiguo sobre base con segunda migración sin revisión es incompatible. No eliminar llaves antiguas hasta completar recifrado, verificación y retención de backups.

## Incidentes

1. Bloquear aplicación desde consola Admin o revocar credencial propia; no comunicar estado del consumidor al partner.
2. Conservar ID técnico/request_id y eventos permitidos. No copiar XML/identificación a tickets o logs.
3. DEAD = DLQ técnica en PostgreSQL; máximo cinco intentos con backoff. DELIVERY_FAILED = fallo privado; no modifica acuse técnico. Investigar acceso mínimo, restaurar llave/configuración y reenviar desde fuente autorizada con clave nueva si el contenido ya fue descartado.
4. Conflicto fiscal: no reemplazar original. Revisar con emisor y titular por canales autorizados.
5. Revisar pendientes, edad de cola, errores, bytes y processing_ms. Los contadores técnicos están disponibles; exportadores externos, alarmas/SLO y monitoreo de accesos anómalos no se han desplegado.
6. Backup: exigir snapshot cifrado y ensayo de restauración con llaves separadas antes de piloto. RPO/RTO todavía no medidos.
7. Cambios de parser: nueva versión, corpus de regresión; nunca sobrescribir XML ni recalcular documentos históricos silenciosamente.

## Webhooks

No implementados: polling cubre este piloto técnico y evita habilitar salida arbitraria de red. Diseño futuro: URL HTTPS verificada, resolver y bloquear rangos privados/loopback/link-local en cada conexión, sin redirecciones, egress proxy, HMAC sobre timestamp.event_id.body con rotación, ventana antireplay de cinco minutos, inbox del consumidor con unicidad event_id, backoff con jitter, DLQ y revocación. Payload exclusivamente técnico; nunca datos de adquirente o estado de entrega.

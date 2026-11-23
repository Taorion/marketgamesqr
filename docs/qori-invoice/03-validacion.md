# Resultado verificable — 2026-11-22

## Alcance entregado

Implementación real y local sobre el servidor Express/PostgreSQL de Qori, en rama feat/qori-invoice-sandbox, checkout tmp/qori-invoice-20261122. No se modificó el checkout principal con trabajo ajeno. No hubo push, despliegue, migración remota ni habilitación productiva.

Etapa 0: auditoría del código real, matriz existente/reutilizar/extender/crear, ADR y diagramas de arquitectura y secuencia en 00-auditoria.md y 01-arquitectura.md.

Etapas 1–2: dos migraciones aditivas espejadas, 18 tablas privadas, identidad Qori reutilizada, organizaciones/apps/emisor autorizado, Client Credentials, scopes y revocación, sandbox sintético, cola 202, UBL namespace-aware y AttachedDocument, importes decimales, deduplicación/conflicto, notas, cifrado versionado y auditoría. No existe emisor ni conector DIAN.

Etapa 3: bandeja web Customer sobre bolsillos existentes, original, detalle, impuestos, descuentos, categorías personales con revisión, búsqueda/filtros, resumen de compras separado de pagos registrados, notas relacionadas, avisos internos, solicitudes de identidad y privacidad, exportación. No hay verificación real de documento ni alta automática de gastos/puntos. La solicitud de identidad nunca entrega titularidad.

Etapa 4: Qori Developers con sesión existente, perfil/condiciones de prueba, apps, credenciales de una sola visualización, emisor sintético, escenarios de prueba desde servidor, métricas, miembros OWNER/SUPPORT, catálogo, homologación y consola Qori Admin. Aprobar revisión no habilita producción. OpenAPI 3.1, guía consultable, Postman, ejemplos Node/Python/PHP y estimador parametrizado.

Etapa 5: pruebas locales de seguridad funcional, concurrencia, migración y regresión; amenazas, runbook y plan de piloto. No hay piloto externo ni aceptación jurídica, pentest independiente, prueba de carga sostenida o restauración productiva. No está listo para abrir tráfico real.

## Pruebas ejecutadas

| Suite | Resultado | Evidencia que aporta |
| --- | --- | --- |
| qoriInvoice.test.js + qoriInvoice.integration.test.js + qoriInvoice.migrations.test.js | 37/37 | Parser, impuestos múltiples/0%, descuentos/cargos, contenedor, rotación, auth, BOLA, consentimiento, idempotencia concurrente, notas, overrides, retención, miembros, Admin, JS/Python ejecutables y DOM contra HTTP real |
| customerFinance, customerCalculator, customerDebtMath, adminAccessPolicy, commercialAuthorization | 26/26 | Regresión financiera, separación venta/pago, permisos y políticas existentes |
| customerAccountIsolation.integration.test.js | 5/5 | Sesiones reales, bolsillos, adjuntos/exportación y solicitudes de navegador obsoletas. Harness local cambia únicamente destino fijo 55441/qori_customer_qa a 55489/qori_invoice_qa |
| qoriSellerUI.test.js | 14/16 | Dos fallos previos reproducidos: biblioteca de Seller aprobado y acciones diarias; error “UI did not settle” |
| Aplicación/reversión/reaplicación de migraciones | Incluida en 37/37 | Esquema temporal dentro de transacción; rollback vacío funciona, con organización registrada se bloquea; no elimina datos reales |

Los archivos seller/, test/qoriSellerUI.test.js y backend/src/services/sellerCommissionPolicy.js tienen diff vacío respecto de 2380911; son todas las fuentes locales cargadas por esa suite. No se corrigieron esos fallos ajenos dentro de Invoice.

Las pruebas DOM usan jsdom y HTTP/PostgreSQL real: prueban handlers, campos, permisos y renderizado de contenido, no disposición visual real. La revisión visual en navegador/escritorio/móvil y dispositivo físico queda pendiente por disponibilidad de control de navegador en esta sesión. CSS responsive está implementado, pero no se declara aceptación visual demostrada.

Node y Python se ejecutaron contra la API de pruebas. PHP se entregó como ejemplo de servidor y no se ejecutó: no se encontró PHP en PATH. La colección Postman se genera de un fixture sintético; no se ejecutó con Newman/Postman. OpenAPI se parsea y se sirve correctamente; falta revisión externa con el integrador.

## Incidencias encontradas y resueltas

- Consulta de métricas usaba alias day sin delimitar: corregida y cubierta por prueba.
- Preview local anterior compartía base con pruebas y llaves distintas: detectado y detenido; 37 pruebas pasan con un único runner. Se añadió bloqueo de sesión para impedir preview/worker y suite simultáneos.
- Contrato frontend anterior esperaba secreto como bearer largo: sustituido por token efímero y prueba de portal desde servidor; no se inserta secreto en formulario de envío.
- Lectura/exportación y conciliación revalidan titularidad; expiración/revocación bloquean originales.
- Original fiscal y contenedor tienen huellas separadas; duplicado fiscal no crea compra/pago adicional.
- Estado técnico se confirma antes de entrega privada; fallos internos no revelan consentimiento.

## Comandos

~~~powershell
node scripts/prepare-qori-invoice-qa.js
node --test test/qoriInvoice.test.js test/qoriInvoice.integration.test.js test/qoriInvoice.migrations.test.js
node --test test/adminAccessPolicy.test.js test/commercialAuthorization.test.js test/customerCalculator.test.js test/customerDebtMath.test.js test/customerFinance.test.js
node --test test/qoriSellerUI.test.js
node scripts/preview-qori-invoice.js
~~~

Ver 05-operaciones-runbook.md para binario Windows, PostgreSQL y variables. Los resultados TAP temporales están en .qa-invoice, ignorados por Git. El cambio nuevo se conserva en commits locales de esta rama, sin publicar.

## Pendientes materiales

- Proveedor de titularidad, verificación empresarial y mandato real del emisor.
- XSD/Schematron completos, cobertura fiscal representativa, firma y evidencia DIAN verificable; siempre DIAN_NOT_VERIFIED.
- Contratos, finalidades, subencargados, plazos legales, cambios de cuenta y conservación/backups aprobados por humanos.
- Convergencia fiscal automática de OCR/email/manual/business_sales con identificadores verificables; actualmente no se duplican pagos porque la API no los crea.
- Portal multiorganización avanzado, incorporación nativa Expo, notificaciones externas y verificación visual móvil.
- Rate limiting distribuido, alertas/SIEM, KMS operativo, corpus adversarial y estudio estadístico de tiempos, carga sostenida, coste y restauración medidos.
- Webhooks diseñados, no habilitados; polling es el transporte disponible.
- Primer integrador/comercio externo, pruebas de aceptación con ellos y aprobación explícita para cualquier producción.

No se presentan pendientes como capacidades ya homologadas.

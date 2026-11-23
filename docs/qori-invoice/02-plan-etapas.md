# Plan de implementación y evidencia por etapa
No se autorizó despliegue productivo, validación contractual ni cambios sensibles de permisos reales.

| Etapa | Implementación segura | Puerta de salida |
|---|---|---|
| 0 | Auditoría real, matriz, amenazas, ADR y diagramas | Archivos y dependencias encontrados; bloqueos explícitos |
| 1 | Partner/app/emisor, sesiones existentes, credenciales/token, RLS, scopes, aislamiento y consentimiento | Pruebas de autorización, revocación y contrato OpenAPI |
| 2 | XML/AttachedDocument, modelo canónico, dedupe y conflictos, notas, cola, cifrado | Casos fiscales sintéticos conciliados y rechazo de XXE |
| 3 | Customer: bandeja, detalle, overrides, analítica, avisos, filtros, privacidad | BOLA, XML inmutable, compras separadas de pagos |
| 4 | Developers: perfil, miembros, apps, scopes, guía, SDK, homologación; backoffice | Ejemplos ejecutables y revisión administrativa que no habilita producción |
| 5 | Resiliencia, regresión, carga local, runbook y plan de piloto | Evidencia local; piloto externo bloqueado hasta acuerdos y aprobación |

## Estado al retomar
El núcleo inicial pasó 19 pruebas (8 puras + 11 HTTP/PostgreSQL) el 2026-11-22 antes de ampliar alcance. Esta cifra es una línea base, no cobertura del incremento completo. El checkout principal permanece intacto; trabajo en rama aislada.

El migrador histórico no inicializa una base totalmente vacía por referencias adelantadas. El preparador QA reordena CREATE TABLE en memoria y difiere cuatro FK hasta terminar las migraciones; luego las restituye. No se alteró database/schema.sql ni migraciones históricas. Esto se registra como bloqueo previo para una instalación limpia, no como una migración productiva aprobada.

## Entregas
Los resultados finales de ejecución, commits y limitaciones se registran en 03-validacion.md. Cada etapa usa cambios aditivos y solo se verifica sobre qori_invoice_qa local. El hardening no equivale a certificación OWASP ni verificación legal.

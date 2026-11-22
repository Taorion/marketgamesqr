# Estado de implementación — 2026-11-22

Rama feat/qori-play-sandbox, base 06391dd, checkout tmp/qori-play-20261122. No se modificó el checkout principal con cambios ajenos. No hubo push, merge o despliegue productivo.

## Etapas

| Etapa | Entrega y evidencia | Riesgo / siguiente paso |
| --- | --- | --- |
| 0 — Auditoría | 00-auditoria.md, matriz real, ADR y diagramas en 01 | Reconciliar listener WS Cumbre de la rama principal antes de integrar |
| 1 — Vertical | Player, QR, consentimiento, controlador, cola, dos juegos, simulación servidor y eventos | Prueba visual y física pendiente |
| 2 — Developer/operador | Apps/auth reutilizadas, scopes, sedes, pantallas, emparejamiento, campañas, credencial única/revocación, SDK, guía/OpenAPI | Homologación productiva y fabricantes pendientes; webhooks no implementados |
| 3 — Beneficios/analítica | Reserva presupuestada, adaptador QR transaccional, Customer, redención existente, agregados/CSV | Solo beneficios sintéticos; antifraude y oferta reales pendientes |
| 4 — Hardening local | RLS, aislamiento, expiración, reconexión, rollback, tests HTTP/WS/DOM y diez pares concurrentes | Carga sostenida, pentest, privacidad definitiva, dependencias y hardware pendientes |

## IMPLEMENTADO Y PROBADO

Núcleo y flujo local completo de sandbox; autenticación y registros existentes; alta/consulta de operador, emparejamiento, dos juegos, tokens por actor, autorización de campañas, reserva/cupos, emisión única mediante generateQr, lectura privada Customer y redención Validator sin crear venta. Suite principal 30/30 (18 Play + 12 unidades Invoice); integración existente Invoice 24/24. Los fallos previos de otras suites se reproducen en la base y permanecen abiertos; detalle en 05-pruebas-y-validacion.md y validation-results.json.

La nueva migración 20261122173811_qori_play_sandbox.sql está aplicada únicamente en DB local, espejada en database/migrations y supabase/migrations. Once tablas nuevas con RLS; rollback de módulo vacío probado. No hay migraciones destructivas sobre entidades existentes.

## IMPLEMENTADO NO PROBADO EN HARDWARE REAL

Player Canvas, layouts horizontal/vertical/30-70/equilibrado/banda QR, fullscreen, iframe por origen permitido, controles táctiles, inclinación opcional, anuncio durante reconexión y lanzador HTTPS. Pruebas DOM no certifican ergonomía ni rendimiento visual. Ninguna certificación Yodeck, Tizen o webOS.

Panel patrocinador y consola Admin están conectados a rutas/roles existentes. Las autorizaciones de patrocinador y el bloqueo de organización tienen pruebas de servicio; falta aceptación visual con sesiones privilegiadas reales. No se relajó la política de Admin para facilitar una demo.

## PENDIENTE

1. Revisar y reconciliar cambios de checkout principal/Cumbre; dispatcher de upgrades por ruta.
2. Resolver cinco alertas de dependencias y fallos preexistentes de regresión; no confundirlos con aprobación global.
3. Validar HTTPS, QR/cámara, móvil y hardware de signage; evidencia visual/compatibilidad por modelo.
4. Antibots/fraude, menores, patrocinio y presupuesto contractual; términos, retención/solicitudes de datos y revisión jurídica.
5. Broker/sharding, pruebas sostenidas de 100 pantallas, observabilidad y recuperación de desastre.
6. Webhooks seguros, creatividades multimedia moderadas, catálogo ampliable de plugins externos, planes/tarifas y facturación. No hay pantallas que simulen estas funciones.
7. Aprobación explícita para cualquier piloto con tráfico/beneficios reales o despliegue. Este código mantiene la producción cerrada.

## Rutas de la entrega

- /play/ y /developers/play: producto y entrada desde Developers.
- /play/operator/: aplicaciones, sedes, pantallas, campañas y métricas.
- /play/sponsor/ y /play/admin/: aprobación y bloqueo.
- /play/screen/, /play/controller/: pantalla y control invitado.
- /play/rewards/: beneficios propios con identidad Customer existente.
- /play/guide/, /play/openapi.json, /play/examples/signage.html.
- /api/play/v1/manage, /sponsor, /device*, /sessions*, /live.
- /api/customer/play, /api/developers/play, /api/admin/play.
- /api/invoice/v1/oauth/token y /api/developers/v1/* reutilizados.

## Archivos y operación

Código nuevo: backend/src/play/*, play/*, test/qoriPlay*.test.js y fixtures, scripts/prepare-qori-play-qa.js, preview-qori-play.js, test-qori-play-regressions.js, estimate-qori-play-costs.js; documentación 00–07, OpenAPI, costos y rollback.

Extensiones acotadas: app.js instala rutas; server.js adjunta/cierra runtime detrás del flag; invoice/oauth.js y routes.js aceptan scopes Play optativos; qrService.js permite transacción externa; navegación Developers/Customer añade enlaces; ws se declara dependencia directa fijada; .gitignore excluye datos locales. No se cambió código de Seller ni el ledger de ventas.

Variables, comandos, supuestos de costo y runbook están en 02, 03, 05 y 06. El estimador no tiene precios reales: 100 pantallas/10.000 sesiones es un escenario de cálculo, no capacidad demostrada ni tarifa activada.

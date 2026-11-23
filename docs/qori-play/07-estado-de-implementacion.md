# Estado de implementación — correcciones de 2026-11-22

Rama feat/qori-play-sandbox, checkout tmp/qori-play-20261122. Continúa la entrega adff639. Cambios locales, sin push, merge, despliegue, tráfico real, premios reales ni cobros. Informe detallado: [08-correcciones.md](08-correcciones.md).

## IMPLEMENTADO Y PROBADO

- MVP de pantalla/controlador, dos juegos, cola, consentimiento, autenticación reutilizada, scopes, paneles, QR, cupos y beneficio sintético idempotente.
- Cumbre y Play atienden sus WebSockets en el mismo servidor sin interceptar rutas ajenas.
- Salida/revocación inmediata, exportación de sesión y datos Play dentro de Customer; eliminación de cuenta sin romper referencias comerciales.
- Callbacks propios con secreto único, rotación, revocación, outbox, HMAC, protección de destino, reintentos y DLQ. Transporte verificado con dobles de DNS/HTTPS; no se enviaron callbacks externos.
- Bloqueo concurrente de campañas corregido y finales simultáneos con un cupo comprobados.
- Errores de transición tardíos se sincronizan; falsificación de resultados sigue rechazada.
- Métricas de runtime para Admin, recuperación por reinicio de runtime y restauración de backup local.
- Dependencias actualizadas: instalación auditada con cero vulnerabilidades conocidas.
- **122/122 pruebas** en las suites ejecutadas: principal 43, Finance/Validator 28, Invoice HTTP 24, Customer Books 11 y Seller 16. No equivale a ejecutar todas las pruebas históricas del repositorio.
- Carga: 100 pantallas, cuatro aplicaciones, 200 conexiones, 60,39 s; 3.990 acciones confirmadas, cero errores. ACK p50 28,76 ms/p95 47,97 ms. Ciclo general máximo 1.664 ms: aún no cumple actualización periódica de 4 Hz a esa carga.
- Restauración desechable: cinco tablas Play coinciden por conteo y digest; 8,37 s en esta corrida. No demuestra RTO productivo ni recuperación de llaves.

Migraciones 20261122173811_qori_play_sandbox y 20261122233458_qori_play_operations aplicadas exclusivamente a qori_play_qa. Trece tablas con RLS y permisos Data API revocados. Aplicación/rollback local probados; scripts de reversión rechazan datos existentes.

## IMPLEMENTADO NO PROBADO EN HARDWARE REAL

Player Canvas, orientación/layouts, QR, iframe permitido, fullscreen, inclinación opcional y fallback de red; interfaces de operador, patrocinador y Admin. Se probaron contratos HTTP/WS y flujo DOM, no ergonomía visual, cámara, TLS en teléfono, hardware o firmware de signage. No se certifican Yodeck, Tizen ni webOS.

## PENDIENTE

1. Rendimiento periódico a mayor concurrencia: optimizar snapshots/consultas y definir shards/broker si se requiere más de un runtime. El lease impide réplicas activas incompatibles. El ensayo de 100 pantallas no constituye homologación de esa capacidad.
2. Aceptación visual, móvil HTTPS y hardware; conectividad/proxy, cortes prolongados y ensayo sostenido de horas.
3. Entrega HTTPS contra receptor externo aprobado, recepción idempotente persistente y alertas operativas externas. La implementación actual no realizó tráfico a terceros.
4. Pentest independiente, política legal definitiva, menores, antifraude productivo, patrocinio/presupuesto contractual y aprobación de piloto real.
5. Ampliaciones fuera del MVP: multimedia moderada, plugins externos y planes/facturación. No se simulan como operativas ni se activan tarifas.
6. Revisión/merge de esta rama con el checkout principal y aprobación explícita de despliegue. La convivencia Cumbre está resuelta, pero no se sobrescribió el trabajo ajeno.

## Uso local y archivos

Demo: node scripts/preview-qori-play.js; panel de acceso sintético http://127.0.0.1:3198/__play-demo. Mantener el proceso abierto y detenerlo antes de pruebas/carga/restauración.

Rutas: /play/, /play/operator/, /play/sponsor/, /play/admin/, /play/screen/, /play/controller/, /play/rewards/, /play/guide/, /play/openapi.json. API /api/play/v1, /api/customer/play, /api/admin/play y autenticación Developers/OAuth existente.

Código extendido: backend/src/play; Customer export/borrado; server y canal visual Cumbre; controlador/panel operador/Admin; dependencias; fixtures de regresión. Código nuevo de operaciones: privacy.js, concurrency.js, webhooks.js; pruebas y scripts de carga/restauración. No cambió el ledger business_sales ni los flujos comerciales Seller.

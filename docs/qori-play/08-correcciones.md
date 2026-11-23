# Correcciones verificables del sandbox

Esta entrega continúa adff639 en feat/qori-play-sandbox. Mantiene aislado el checkout principal y no publica cambios, emite premios reales ni habilita cobros. Los resultados actualizados están en validation-results.json; load-results.json conserva la medición de carga y load-before-correction.json el fallo inicial que motivó la corrección.

## Problemas corregidos

| Problema reproducido | Corrección | Evidencia |
| --- | --- | --- |
| Regresiones Finance/Books/Seller/Validator | Fixtures con registro y sesión completos, cabeceras de respuesta, módulos reales; expectativas de Academy y asset vigente | Suites existentes ejecutadas; no se retiraron requisitos de identidad ni se abrió la biblioteca privada |
| Cinco alertas npm heredadas | Nodemailer 10.6.1, Zod 4.6.7 y transitivas corregidas en lockfile | npm audit fix: cero vulnerabilidades conocidas al instalar; MIME offline y suites HTTP/DOM |
| Cumbre rechazaba upgrades Play | El listener canónico de Cumbre cede rutas ajenas; server adjunta ambos | Cinco pruebas Cumbre y autenticación simultánea Cumbre/Play en el mismo servidor |
| Beneficio Play impedía borrar Customer | FK ON DELETE SET NULL, exportación en mecanismo Customer y revocación de control dentro de su transacción de borrado | Exportación privada y DELETE /api/customer/me real con QR comercial preservado |
| Abandono sin revocación inmediata | Salir desde el controlador, revocar capacidad, limpiar estado y liberar reserva sin reclamar | Prueba HTTP de revocación y promoción del siguiente turno |
| Callbacks pendientes | Registro, secreto de una sola lectura, rotación, revocación, outbox transaccional, firma y cola con reintentos/DLQ | Aislamiento de aplicaciones, firma/timestamp, entregas competidoras, seis intentos y cancelación |
| Bloqueo concurrente de reservas | Serialización de campaña con FOR NO KEY UPDATE, compatible con locks FK de eventos; mantiene exclusión de escritores | Cuatro finales simultáneos con un cupo y repetición de carga |
| Toque posterior al cierre desconectaba jugador | Errores de transición recuperables y resincronización; puntuaciones forjadas siguen cerrando conexión | Input tardío y reinicio del runtime preservan secuencia y un solo evento final |
| Procesamiento serial y límite fijo de 100 filas | Concurrencia SQL acotada, recorrido de todas las pantallas pendientes, métricas internas y limpieza del mapa IP | 100 pantallas, cuatro apps, 200 sockets, 60 s, cero fallos en corrida final |

El servicio Cumbre y su cliente/pruebas provienen del código existente en el checkout principal; no se reconstruyó su lógica de juego ni se importaron cambios ajenos de esa rama. Solo se incorporó su canal visual y la convivencia de rutas.

## API añadida

- GET /api/play/v1/sessions/export: exportación de la sesión autenticada por capacidad; excluye secretos, semilla y datos Customer.
- POST /api/play/v1/sessions/leave: revocación inmediata; el beneficio ya emitido conserva su historial comercial.
- GET/POST /api/play/v1/manage/webhooks: consulta/alta bajo scopes existentes; máximo tres activos por app.
- POST /api/play/v1/manage/webhooks/{id}/rotate y DELETE /api/play/v1/manage/webhooks/{id}: rotación/revocación propias.
- GET /api/admin/play/runtime: métricas agregadas, solo Qori Superadmin. El panel administrativo las muestra.

OpenAPI 1.1.0 conserva contratos previos. El panel de operador incluye callbacks y entregas; el controlador ofrece exportar/salir. No se crearon usuarios, autenticación o ledger paralelos.

## Callbacks: contrato operativo

QORI_PLAY_WEBHOOK_HOSTS es una lista de hostnames exactos habilitados por administración; vacía por defecto. QORI_PLAY_WEBHOOK_DELIVERY_ENABLED requiere true y sandbox aislado; apagada por defecto. No se realizó ninguna entrega a terceros.

HTTPS obligatorio, sin credenciales, query, fragmentos o puerto personalizado. Solo DNS IPv4 pública, respuesta validada y fijada a la conexión TLS con verificación de certificado; se rechazan respuestas mixtas públicas/privadas. No sigue redirects, no usa proxy, DNS limitado a 3 s y envío a 5 s. Esta política conservadora excluye destinos solo IPv6. Referencias de diseño: [OWASP SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) y [Node HTTPS](https://nodejs.org/api/https.html).

X-Qori-Signature = HMAC-SHA256(secret, timestamp + '.' + delivery_id + '.' + raw_body). Cabeceras X-Qori-Timestamp y X-Qori-Delivery. Verificador ejecutable en play/examples/verify-webhook.cjs: ventana de 300 s y comparación constante. El receptor debe persistir delivery_id único en la misma transacción que su efecto; una red puede perder el acuse y provocar reentrega. Rotar cambia la firma de intentos futuros, incluso eventos pendientes; actualizar primero el receptor.

Payload limitado a ID de entrega, versión, tipo, fecha, pantalla, campaña y sesión pseudónima. Nunca identidad, resultado financiero ni token. Tipos: screen_online, game_finished, score_verified, reward_issued. Los registros de entrega solo muestran estado, intentos y código HTTP genérico. Máximo seis intentos, backoff exponencial desde 30 s con jitter, lease de 30 s y SKIP LOCKED. DEAD requiere investigación; no existe reenvío ilimitado automático. Revocación cancela pendientes; una petición ya enviada no se puede retirar de la red.

Retención de entregas terminales usa QORI_PLAY_EVENT_RETENTION_DAYS. Los secretos se cifran con AES-GCM y contexto propio mediante el gestor existente; nunca se devuelven al listar.

## Migración y rollback

20261122233458_qori_play_operations.sql, generada con CLI y espejada en database/migrations y supabase/migrations, añade dos tablas con RLS y privilegios revocados. Cambia solamente la FK Customer del beneficio Play. Aplicada únicamente a qori_play_qa local.

Para revertir código: apagar flags y detener runtime. rollback-operations.sql solo revierte tablas vacías; después puede usarse rollback.sql para el núcleo vacío. Si hay datos, mantener tablas y evidencia. No usar CASCADE ni borrar campañas/QR. Las pruebas aplican y revierten en un esquema desechable.

## Límites que permanecen abiertos

La prueba de carga mide ACK y estado técnico, no píxeles. El ciclo general alcanzó 1,66 s a 100 pantallas; no se certifica 4 Hz sostenidos ni 100 pantallas productivas. El runtime sigue siendo único con lease PostgreSQL: distribuirlo en shards exige diseñar enrutamiento/propiedad y medir un broker; iniciar réplicas sin ello está bloqueado. No se oculta esta limitación como cumplimiento de latencia.

Pendientes externos: aceptación visual y en móvil HTTPS, cámara/QR, hardware y firmware específicos; pentest independiente; política y revisión jurídica para menores, datos, patrocinio y beneficios reales; aprobación de piloto y despliegue. Se mantienen cerrados por diseño. No hay certificación de fabricantes ni emisión/facturación real.

Ampliaciones de producto aún no implementadas: contenido multimedia con moderación, ejecución de plugins externos y planes comerciales facturables. El MVP sí conserva anuncios de texto/branding aprobados y dos juegos incorporados; no ofrece controles ficticios para esas ampliaciones. No se inventaron tarifas ni decisiones contractuales para marcarlas terminadas.

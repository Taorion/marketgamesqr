# Operación y costos configurables

## Configuración

| Variable | Uso |
| --- | --- |
| QORI_PLAY_SANDBOX_ENABLED | true solo habilita si NODE_ENV=test/development y DATABASE_URL apunta a loopback/qori_play_qa |
| QORI_PLAY_PUBLIC_ORIGIN | Origen único HTTP loopback o HTTPS; QR, WS y enlaces |
| QORI_PLAY_EMBED_ORIGINS | Lista separada por coma de orígenes HTTPS exactos para iframe |
| QORI_PLAY_DISABLED_GAMES | Lista de claves bloqueadas: orbita,secuencia |
| QORI_PLAY_EVENT_RETENTION_DAYS | Entre 1 y 90; defecto 30 |
| QORI_PLAY_TLS_KEY / QORI_PLAY_TLS_CERT | Solo lanzador de laboratorio: rutas de certificado y llave |
| QORI_PLAY_BIND_HOST | Solo lanzador HTTPS; loopback por defecto |
| QORI_INVOICE_SANDBOX_ENABLED | Habilita infraestructura Developers/OAuth reutilizada |
| QORI_INVOICE_ENCRYPTION_KEY / QORI_INVOICE_IDENTITY_KEY | Claves existentes reutilizadas; valores no documentados |
| DATABASE_URL / DB_SSL / JWT_SECRET | Configuración existente; nunca copiar credenciales reales al sandbox |

No se añadieron planes ni tarifas. Máximos del corte: 25 pantallas/app, 5 participantes en cola, 100 pantallas con sesiones por tick, 200 conexiones globales y 20 por IP. Son límites de protección, no capacidad certificada. Una red/proxy con IP compartida puede alcanzar antes el límite de conexiones.

## Runbook

1. **Inicio:** comprobar base aislada, migraciones, claves persistentes, flag y origen. Iniciar preview; nunca usar el arranque de producción para una demo. Consultar /api/play-capabilities.
2. **Pantalla offline:** comprobar red y perfil de navegador, websocket/Origin, vencimiento del dispositivo y estado de organización/app/campaña. Reemparejar desde propietario si la credencial expiró.
3. **Partida abandonada:** heartbeat móvil cada 3 s; desconexión observada a los 12 s, abandono a los 30 s. Pantalla inactiva 15 s pausa, 45 s expira; waiting/ready máximo 120 s. El siguiente turno se promueve cuando corresponde.
4. **Runtime duplicado:** PLAY_RUNTIME_UNAVAILABLE indica fallo de lease/DB; no iniciar un segundo procesador esperando repartir carga. El lease PostgreSQL libera al morir la conexión. Mantener una instancia.
5. **Incidente:** bloquear organización desde Admin, revocar app/credencial en Developers o pantalla desde operador. Apagar flag y reiniciar para cerrar todo. Conservar evidencia sin exportar tokens ni datos privados.
6. **Sin premio:** consultar reserva y configuración autorizada; nunca crear un QR manual para compensar una partida no verificada. Repetir el reclamo devuelve el mismo QR cuando ya fue emitido.
7. **Rollback:** apagar feature, detener runtime. Con datos, conservar tablas y referencias. rollback.sql solo funciona si las once tablas están vacías; no utiliza CASCADE ni borra campaña/QR existente.
8. **Respaldo:** restaurar base de pruebas separada; para producción preparar backup cifrado, rotación/recuperación de claves y simulacro. No se probó restauración de desastre en esta entrega.

Logs propios: PLAY_RUNTIME_UNAVAILABLE y PLAY_TICK_UNAVAILABLE, sin frames, tokens, IP ni PII. Los eventos contienen IDs de app/pantalla/campaña/sesión y acciones auditadas. Dashboard cuenta eventos por periodo y filtro. Métricas operativas de CPU, DB, histograma de latencia, uptime y alertas externas quedan pendientes de instrumentación continua.

## Semántica de métricas

- campaign_displayed: una presencia por pantalla/campaña/hora; no impresiones humanas ni segundos de reproducción certificados.
- qr_scanned: unión consentida válida; no contabiliza cualquier apertura de cámara o visita.
- session_joined, queued, game_started, game_finished, score_verified: etapas diferentes.
- reward_issued: confirmación transaccional del motor QR.
- reward_redeemed: consulta redemptions existente; no evento declarado por Player.
- cta_opened: intención enviada al navegar; no compra ni conversión comercial validada.
- screen_online: emparejamiento; last_seen_at determina presencia actual.

No hay atribución de ventas por inferencia, cobros automáticos ni consumo de beneficios de negocios reales.

## Modelo de costos, sin tarifa comercial

Usar costs.example.json y scripts/estimate-qori-play-costs.js. Valores monetarios iniciales son cero a propósito: completar con cotizaciones reales aprobadas. Las unidades de moneda deben ser consistentes; no se presupone USD ni COP. Modelo mensual:

Costo = cómputo + DB + observabilidad + soporte + transferencia_GB × precio_GB + almacenamiento_GB × precio_GB_mes.

Escenario de referencia configurable: 100 pantallas, 8 h/día, 30 días, 4 snapshots/s de 1 KiB. Esto aproxima 353,9 GB decimales de salida del Player, antes de TLS, HTTP, activos, inputs y controladores. No representa medición ni soporte de 100 pantallas en esta instancia. Con 10.000 sesiones de 30 s y otro snapshot de controlador del mismo tamaño, añadir aproximadamente 1,23 GB. Registrar bytes reales antes de fijar planes.

10.000 sesiones × 8 KiB de estado/eventos estimados ≈ 0,082 GB sin índices, WAL, QR ni backups. El tamaño real depende de la duración y retención; esta es una hipótesis, no un costo unitario observado. El estimador separa costo total, costo por pantalla y costo por sesión.

Optimización propuesta antes de escalar: reducir snapshots idle, publicar deltas solo a suscriptores, disminuir viajes SQL por tick, lotes de eventos, capacidad por shard y broker compartido. No aplicar cambios de escala sin pruebas de carga y preservación de orden/atomicidad. No hay IA, streaming de video ni dependencias de pago en el juego.

## Piloto posterior

Elegir un integrador, un anunciante con oferta autorizada y una sede. Ensayar primero sin beneficios reales. Registrar modelo/firmware, TLS, orientación, inputs p50/p95, QR a control, porcentaje de cierres, cola, abandono, reconexiones y costo medido. Comprobar redenciones reales en Validator separadas de sesiones. Aprobar por escrito consentimiento, presupuesto, cupos, prevención de automatización y criterios de parada antes de un ensayo con beneficios reales.

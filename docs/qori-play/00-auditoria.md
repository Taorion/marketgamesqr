# Qori Play — auditoría previa a código (2026-11-22)

Base real: 06391dd, rama feat/qori-play-sandbox, checkout aislado tmp/qori-play-20261122. Contiene Developers/Invoice de la entrega previa. El checkout principal en 2380911 tiene cambios extensos sin confirmar, incluido Cumbre; se inspeccionan pero no se copian ni sobrescriben.

## Existente / reutilizar / extender / crear

| Dominio | Rutas y componentes encontrados | Decisión |
| --- | --- | --- |
| Stack y hosting | backend/src/app.js, server.js, config/db.js; Express 5/CommonJS, PostgreSQL/pg; render.yaml migra al arrancar | Extender mediante módulo play; sin despliegue ni modificación de hosting |
| Developers | developers/, invoice_partners/members/apps/keys/access_tokens, invoice/oauth.js; sesiones Customer reales | Reutilizar organizaciones/aplicaciones/membresías/token. Añadir scopes Play optativos, sin renombrar tablas históricas |
| Roles | middleware/auth.js, adminAccessPolicy.js, customerAuthService.js | Operador OWNER y observación SUPPORT; anunciante business JWT propio; Admin política real; invitados separados |
| Campañas y anunciantes | businesses, campaigns, games, rewards; campañas con fechas y límites | Referenciar campaña existente mediante autorización explícita de patrocinador. No inventar otra tabla de anunciantes/campañas base |
| Activaciones | interactiveActivationService.js, activacion/, catálogo existente; captura ligada a participante/recompensa | No importar directamente su lifecycle local ni aceptar score de cliente; contrato Screen/Controller diferente |
| Cumbre realtime | Checkout principal: summitLiveService.js, summitRaceService.js, summitCombatRules.js; ws noServer, tickets, replay, heartbeat | Reutilizar patrón y dependencia ws. No copiar módulo de carrera aún ajeno a la base de esta rama. Nuevo protocolo autoritativo para pantallas |
| Compatibilidad WS crítica | El listener Cumbre del checkout principal rechaza upgrades de otras rutas | Al reconciliar ramas, despachar cada ruta a su dueño o hacer return en rutas ajenas. Bloqueo previo a despliegue combinado; aquí no se modifica Cumbre ajeno |
| Beneficios | qrService.generateQr, consumeQrCredit, qr_codes, players, questionnaires, redemptions; rewardPassService para bonos de valor | Usar QR promocional existente, no nuevo ledger monetario. Adaptador con transacción externa optativa; solo base aislada y comercio demo |
| Customer | customer_accounts/sessions, beneficios y relaciones con consentimiento | Reclamo autenticado explícito por posesión del ticket de sesión; referencia privada a QR. No resolver por cédula/email ni mostrar PII en pantalla |
| Analítica | Eventos y ventas canónicas existentes, subscription_usage_events | Telemetría Play pseudónima específica; redención se confirma consultando redemptions. Nunca clic=venta; consumo sin cobros |
| Datos | database/migrations y espejo supabase/migrations, RLS server-only de Invoice | Migración aditiva con FK de tenant y caducidad, índices; no acceso Data API público |
| QA | node:test, jsdom, PostgreSQL local 55489 y preparador de esquema de Invoice | Nueva base qori_play_qa, sin compartir datos/colas con Invoice. Pruebas HTTP y WebSocket reales |

No apareció un producto Ludo en las rutas de servidor inspeccionadas. La plantilla 30/70 será opcional, junto a balanceado y juego completo. Dos juegos originales de bajo peso: Órbita (habilidad, carriles/obstáculos) y Secuencia (memoria). No se ejecutarán plugins arbitrarios de terceros.

## Arquitectura incremental

1. Registro operador: organización/app Developers existente; settings Play, sedes y pantallas. Vinculación con desafío de dispositivo y código temporal confirmado por propietario. Tokens de dispositivo revocables, nunca claves maestras.
2. Campaña: autorización del anunciante sobre campaigns y app del operador. play_campaigns solo añade configuración de distribución/juego y límites de sesiones; campaña base conserva identidad.
3. Player alojado /play/screen/ y controlador /play/controller/. QR contiene capacidad efímera de unión en fragmento; no identidad ni sesión Customer. Un jugador activo por pantalla, cola acotada.
4. Servidor interpreta inputs y avanza juegos deterministas. DB conserva estado y secuencia. WS publica snapshots mínimos; nadie envía score ni complete desde móvil.
5. Resultado verificado y reserva atómica de cupo; reclamo Customer explícito; adaptador de QR existente en misma transacción. Solo premios sintéticos en base local.
6. Dashboard/CSV propios, SDK JS/TypeScript ligero y embed postMessage con origen exacto. Sin webhooks en primer corte: polling y WS cubren el flujo; documentar extensión posterior.

## Archivos previstos

Crear backend/src/play/{config,games,service,realtime,routes,rewards}.js, play/ (producto/panel/player/controlador/SDK), scripts/prepare-qori-play-qa.js y preview-qori-play.js, test/qoriPlay*.test.js, docs/qori-play/00–07 y openapi.yaml. Extender app.js/server.js, invoice/oauth.js y creación de credenciales para scopes explícitos; entrada Developers; qrService.generateQr con cliente transaccional opcional. Migración nueva creada mediante CLI y espejada. No cambiar Empresa/Seller ni campañas actuales.

## Límites conservadores y rollback

Flag de release apagado por defecto, habilitación por organización y sandbox exclusivamente en development/test contra qori_play_qa de loopback. Producción, beneficios reales, pagos y facturación imposibles con esta entrega. Recompensa opcional; sin autorización/cupo/fecha válida no se promete ni emite. Sin sorteos con premios reales.

Primero apagar flag y cerrar conexiones; conservar eventos y llaves. Down separado del migrador: rechaza retirar tablas con datos; no DROP CASCADE ni cambios destructivos de modelos existentes. Cambio de generateQr mantiene su firma de dos argumentos compatible. Migraciones se prueban aplicar/revertir/reaplicar en esquema transaccional local.

## Riesgos y puertas de salida

- Reconciliar el checkout con cambios ajenos y el dispatcher WS de Cumbre antes de integrar/publicar.
- Single-node MVP: sin broker ni balanceo multiinstancia; lease/estado persistido y cola acotada. Medir latencia/carga local, no prometer escala sin evidencia.
- HTTPS/WSS para celular real; loopback HTTP exclusivamente laboratorio. Certificados, proxy y conectividad física quedan por validar.
- Emisor QR existente consume créditos: uso exclusivo de fixture demo en DB aislada, sin cargos reales.
- Contratos, privacidad Colombia, menores, patrocinio, presupuesto real y marketing requieren revisión humana. Aviso mínimo y consentimiento separado para reclamo.
- No declarar soporte Samsung/Tizen/LG/Yodeck sin hardware/firmware ensayado.
- Browser host Windows no estuvo disponible en la entrega anterior; pruebas DOM/HTTP no equivalen a aceptación visual.

## Cierre de correcciones

La revisión posterior resolvió convivencia WS con Cumbre, alertas npm y regresiones previas; incorporó privacidad y callbacks. El canal visual Cumbre se reutilizó del checkout principal sin importar otros cambios. Auditoría y evidencia actuales: 08-correcciones.md y validation-results.json. La integración/merge global sigue sin realizarse.

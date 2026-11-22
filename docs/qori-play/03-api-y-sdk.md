# Contrato, SDK y operación del integrador

Contrato OpenAPI 3.1: openapi.yaml (JSON válido como YAML), servido en /play/openapi.json. Importable en Postman. Referencia e inicio rápido: /play/guide/. Ejemplo de backend ejecutable: play/examples/integrator.mjs.

## Credenciales

Crear organización/app desde la identidad Qori existente en /play/operator/. Habilitar Play sandbox. Crear credencial con play:manage y play:analytics; client_secret solo se revela una vez. Guardar en backend/gestor de secretos. Revocar en panel y generar otra para rotar. Expira en 30 días; access token vive hasta 15 minutos y se comprueba revocación en cada uso.

Se conserva la ruta OAuth existente: POST /api/invoice/v1/oauth/token con Basic(client_id, client_secret), content-type application/x-www-form-urlencoded y grant_type=client_credentials. El prefijo histórico qi_sbx_ no implica habilitación Invoice; cada scope se comprueba. Los scopes Invoice por defecto permanecen iguales.

```powershell
# Variables cargadas de tu gestor local; no pegarlas en código o logs.
node play/examples/integrator.mjs
```

El ejemplo lee QORI_BASE_URL, QORI_CLIENT_ID y QORI_CLIENT_SECRET. Solo imprime agregados autorizados. El panel también acepta cookie Customer y X-Qori-App; OWNER escribe, SUPPORT lee. No se usa el app_id del frontend sin verificar membresía. Los controles de alta de recursos requieren OWNER aunque el panel sea visible para soporte.

## Recursos

| Ruta | Actor y resultado |
| --- | --- |
| /api/play/v1/manage/locations, /screens | Integrador con play:manage o propietario; recursos propios |
| /manage/screens/{id}/pairing | Confirma código efímero sobre pantalla propia |
| /manage/screens/{id}/state, /campaign | Pausa/revocación y asignación autorizada |
| /manage/campaigns, /campaigns/{id}/state | Configuración en borrador; reanudar solo aprobadas |
| /manage/dashboard, /analytics, /analytics.csv | play:analytics o miembro; sin Customer ni historial |
| /api/play/v1/sponsor/* | JWT Empresa, negocio propio; mandato y aprobación |
| /api/play/v1/device-pairings, /claim | Desafío y canje; no acceso a organizaciones |
| /api/play/v1/device/state, /qr, /rotate | Capacidad de pantalla, no credencial de integrador |
| /api/play/v1/sessions/join | QR + aviso/version/18+ explícitos; invitado |
| /sessions/status, /event | Solo capacidad de esa partida |
| /api/customer/play/* | Customer existente + autorización de reclamo; QR privado |
| /api/admin/play/* | Política administrativa existente, nunca rol aportado por frontend |

Los prefijos /manage y /sessions abreviados pertenecen a /api/play/v1. Todas las respuestas mutantes completadas usan 200 en este contrato; no se promete procesamiento asíncrono 202. No existe /complete accesible a cliente.

## WebSocket y SDK v1

/api/play/v1/live acepta Origin exacto, sin query string. Primer mensaje en 3 segundos:

```json
{"type":"auth","role":"controller","token":"CAPACIDAD_EFIMERA_RECIBIDA_AL_UNIRSE"}
```

El marcador anterior no es una credencial válida. Roles: screen y controller. Inputs: {"type":"input","seq":1,"action":"start"}. Luego solo controles del manifest. El servidor responde ready, ack, state o error técnico. La secuencia debe aumentar exactamente en uno; ante SEQUENCE_CONFLICT consultar estado y reanudar desde last_seq. Nunca reenviar a ciegas una acción no confirmada. ping mantiene presencia; el dispositivo puede enviar pause con paused booleano.

SDK: initialize(), beginPairing(), claimPairing(), subscribe(callback), showQR(), pause(), resume(), rotate(), destroy(). Tipos en play/sdk/screen-v1.d.ts. No hay complete/reward/reportScore. El servidor determina el cierre. Solo plugins incorporados y revisados.

## Errores y reintentos

- 400: esquema/campo/control inválido; corregir.
- 401/403: credencial, scope, revocación o permiso; no reintentar sin resolver autorización.
- 404: recurso ajeno, inexistente o feature apagada; no revela objetos de otro tenant.
- 409: código/QR consumido, pantalla ocupada al reasignar, campaña no aprobada, fuera de horario, presupuesto o transición.
- 413: máximo 2 KiB público/Customer, 8 KiB patrocinador, 12 KiB gestión.
- 415: contenido comprimido no admitido; enviar JSON sin Content-Encoding.
- 429: cuota; respetar Retry-After y reducir ritmo.
- 503: servicio no disponible; backoff con límite y alerta operativa.

SDK reconecta con backoff 0,5–10 s. Códigos de emparejamiento y QR son de un uso. El reclamo usa la partida como clave idempotente, con unicidad adicional Customer/campaña y QR. Altas de sede/pantalla/borrador no tienen Idempotency-Key: tras una respuesta ambigua consultar dashboard antes de repetir; no asumir exactly-once para esos recursos.

Webhooks no están implementados ni se ofrecen controles de configuración falsos. WS y consulta de métricas cubren el MVP. Una ampliación debe incorporar outbox, HMAC, timestamp, deduplicación, reintentos, DLQ y validación anti-SSRF antes de publicar el endpoint.

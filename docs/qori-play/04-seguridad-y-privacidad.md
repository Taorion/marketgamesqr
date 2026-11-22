# Seguridad y privacidad

Documento técnico de laboratorio; revisión jurídica y homologación pendientes. No constituye dictamen de cumplimiento.

## Fronteras y amenazas

| Amenaza | Control implementado | Límite que requiere piloto |
| --- | --- | --- |
| BOLA entre operadores | Membresía real, scope/app del token, FK compuestas, consultas por app | Pentest independiente antes de producción |
| Suplantación de patrocinador | JWT Empresa + campaign.business_id; autorización y hash de contenido aprobado | Contrato/mandato comercial y moderación humana |
| Robo de QR de unión | Capacidad aleatoria de un uso, 60 s, pantalla/campaña, fragmento y no-referrer | Una foto todavía puede permitir ocupar turno; controles físicos/anti-bots pendientes |
| Score/premio falso | Simulación servidor, manifest cerrado, secuencia y estado por input; sin complete público | Automatización de inputs no equivale a una persona; antifraude productivo pendiente |
| Doble emisión/exceso de presupuesto | Bloqueos, reservas, unicidad y generateQr en misma transacción | Conciliación operativa y presupuesto real no habilitados |
| CSWSH | Origin exacto, auth en primer frame, sin cookies de usuario en WS | Proxy/TLS real por verificar |
| Abuso de canal | 1 KiB, 20 mensajes/s/conexión, 200 conexiones/global, 20/IP, timeout y backpressure | Sin rate limit distribuido; IP del socket detrás de proxy puede agrupar clientes |
| Credenciales expuestas | Integrador solo backend; hash en DB; secretos de dispositivo distintos; QR cifrado en DB | Gestor de secretos y cifrado de disco/backups productivos pendientes |
| PII en pantalla/CRM | Snapshot sin identidad; player pseudónimo; vínculo Customer solo en tabla privada | Revisar nuevas creatividades/adaptadores antes de habilitar |
| XSS/SSRF/scripts externos | textContent, CSP, no eval del producto, no URLs descargadas por servidor, plugins internos | Mantener revisión de dependencias y origen de assets |
| Replays/transiciones cruzadas | Token asociado a una partida/pantalla, seq exacta, caducidad y revocación | Pruebas prolongadas con pérdida de paquetes pendientes |
| Emergencia | Flag apagado, organización bloqueada, app revocada, pantalla revocada, juego bloqueable | Ensayar runbook y recuperación con operador real |

Los límites HTTP Play usan IP del socket, no X-Forwarded-For aportado por el cliente. El servidor existente conserva su middleware; no se debilitan roles ni sesiones previas. Una mejora futura para proxy debe confiar únicamente en saltos conocidos.

## Consentimiento y minimización

Participar no exige nombre, correo, documento ni sesión Customer. Se registra versión del aviso, aceptación, fecha, capacidad pseudónima y resultado. La declaración 18+ es una barrera conservadora del laboratorio, no verificación suficiente para un producto dirigido a menores. No se habilita captación de menores ni perfilado publicitario.

El permiso de inclinación se solicita solo al pulsar el control correspondiente; hay botones táctiles. No se usa cámara, micrófono, contactos o ubicación. El giro se transforma localmente en una acción; no se transmite una lectura continua del sensor.

Para redimir, Validator conserva su captura y consentimiento presencial existentes. Si requiere datos del beneficiario, los solicita en ese paso; Play no los copia automáticamente desde Customer. El player inicialmente no tiene nombre, correo ni documento, evitando una identidad ficticia que impida la validación posterior.

Reclamar requiere sesión Customer y otra aceptación. El motor QR recibe un player pseudónimo, sin nombre, email, documento o customer_id. El vínculo Customer/QR vive en play_reward_grants, accesible solamente al Customer correspondiente y al servicio autorizado. Operador y patrocinador reciben agregados; no reciben identidad, historial financiero ni compras. Esto no implica consentimiento de marketing.

La Ley 1581 reconoce derechos sobre el tratamiento y exige autorización informada cuando corresponde. El diseño usa aceptación verificable y separación de finalidades, pero los textos, responsables, encargados, transferencias y procedimientos deben revisarse antes de captar datos reales. Referencias oficiales consultadas el 2026-11-22: [Ley 1581, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981) y [política y criterios de la SIC](https://sedeelectronica.sic.gov.co/politica-de-tratamiento-de-datos-personales). La apertura directa de Función Pública devolvió 502; el texto y referencia se corroboraron mediante búsqueda oficial.

Propuesta para revisión: Qori determina fines operativos de cuentas/sesiones; operador/anunciante determinan contenidos y oferta patrocinada; contratos deben precisar cada rol según el flujo real. No asignar automáticamente responsable/encargado solo por nombre comercial.

## Retención y derechos

- Desafíos: eliminar vencidos después de un día.
- Tickets QR: eliminar vencidos después de una hora.
- Reserva: vence a los diez minutos; no se transforma automáticamente en emisión.
- Eventos: 30 días por defecto, configurable entre 1 y 90 con QORI_PLAY_EVENT_RETENTION_DAYS.
- Estado de juego cerrado: limpiar snapshot pasado un día; no se conserva un historial bruto de inputs.
- Sesiones/resultados y referencias de QR: permanecen para trazabilidad en el laboratorio. Política final de eliminación, anonimización, retención legal y acceso del titular pendiente; no se declara implementado un portal completo de solicitudes Play.

Cerrar el control deja de enviar eventos; la sesión expira por abandono. El retiro inmediato explícito y exportación individual deberán incorporarse antes de un piloto público. La exportación actual es CSV agregado del operador. No reutilizar esta telemetría para campañas entre comercios.

## Fuentes técnicas y controles de release

Se aplican Origin, autorización por mensaje, límites y protección contra datos sensibles en logs recomendados por [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html). ws usa maxPayload y noServer según su [documentación oficial](https://github.com/websockets/ws/blob/master/doc/ws.md). RLS server-only sigue el modelo documentado por [Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Antes de producción: resolver alertas del lockfile, revisión de permisos, TLS, backups restaurables, monitoreo, gestión de incidentes, antifraude, moderación, términos, soporte de derechos y consentimiento adecuado a la población. No hubo despliegue, compra de servicios, modificación de pagos ni premios reales.

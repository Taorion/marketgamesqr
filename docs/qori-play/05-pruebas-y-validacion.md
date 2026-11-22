# Pruebas y límites de evidencia

Entorno: Windows, Node 22.23.5, PostgreSQL 18 local en 55489, base qori_play_qa. Sin conexiones a una DB productiva, beneficios reales o servicios de cobro. Detener preview antes de pruebas: el bloqueo advisory impide mezclar claves/fixtures con el laboratorio abierto.

## Comandos

```powershell
node scripts/prepare-qori-play-qa.js
node --test test/qoriPlay.test.js test/qoriPlay.integration.test.js test/qoriPlay.migrations.test.js test/qoriInvoice.test.js
node scripts/test-qori-play-regressions.js
node scripts/estimate-qori-play-costs.js
```

El runner de regresiones no cambia las suites existentes: sustituye sus URLs de DB de pruebas en memoria para ejecutarlas sobre qori_play_qa. --baseline ejecuta Customer Books en el checkout hermano qori-invoice-20261122 para comparar. Los resultados/logs locales están en .qa-play/, ignorados por Git.

## Cobertura del MVP

Pruebas nuevas cubren:

- Flags apagados y rechazo fuera de la DB local/entorno permitido.
- Propiedad de operador, alcance de OAuth y rechazo de objetos de otro partner.
- Código temporal, canje de un uso, rotación del dispositivo y QR vencido.
- Consentimiento obligatorio, declaración 18+, unión de un uso, cola y promoción.
- Secuencia estricta, tokens por rol, abandono, pausa y recuperación.
- Dos motores deterministas y acotados; acciones no adelantan tiempo ni asignan score.
- Solución/semilla excluidas del controlador; destello con separación para símbolos repetidos.
- Resultado servidor, reserva, cupo, presupuesto y rechazo de reducir compromisos existentes.
- Generación de QR con crédito en la misma transacción; rollback de ambos; firma original de dos argumentos.
- Reclamo idempotente, propiedad de Customer, ausencia de customer_id en QR/CRM.
- Redención a través del motor Validator existente, replay sin duplicar y sin venta inventada.
- RLS en once tablas, permisos server-only; migración up/down/up y rechazo de down con datos.
- WebSockets reales: Origin, roles, input, rechazo de score extra, reconexión y propagación.
- Scripts reales de operador, Player/SDK, controlador y beneficios: HTTP/WS reales con DOM jsdom.
- Concurrencia breve de diez pantallas y diez controles, sin mezcla de estados.

jsdom no renderiza como Chromium ni prueba pantallas táctiles, dimensiones físicas, cámara, permisos del sistema o hardware de cartelería. No se generaron capturas de navegador que permitan certificar esos aspectos.

## Resultados y regresiones

La ejecución final pasó 30/30: 18 pruebas Play (unidad, integración HTTP/WS/DOM y migración) y 12 unidades existentes de Invoice. Incluye rechazo de JSON malformado, sobredimensionado y comprimido. Las 24 pruebas HTTP existentes de Invoice también pasan en ejecución separada.

| Suite existente | Resultado en rama Play | Comparación con base 06391dd |
| --- | --- | --- |
| Invoice HTTP/integración | 24/24 | Sin cambios en comportamiento cubierto |
| Finance/Customer UI/Validator seleccionados | 22/28 | Mismos 6 fallos reproducidos en checkout base |
| Seller UI | 14/16 | Mismos 2 fallos reproducidos en checkout base |
| Customer Books integración | 0/11 | Mismo 0/11 en base; fixtures omiten registro confirmado y reciben 403, causando fallos derivados |

Fallos previos concretos: cuatro pruebas de Books UI esperan un módulo create no cargado; una prueba de Finance UI omite documentFields; Validator busca una versión antigua de asset; dos de Seller esperan nodos/flujo DOM que no están en la base. No se alteraron esos flujos para forzar resultados verdes. La plataforma completa no tiene una regresión global aprobada con estas suites.

## Latencia y concurrencia

Muestra final local de 12 inputs de un par: p50 20,8 ms, p95 33,0 ms desde envío a estado recibido. Experimento breve de diez pares y dos acciones consecutivas: p50 173,6 ms, p95 192,6 ms. Son mediciones de una corrida, no SLA ni latencia óptica/táctil. La carga de Windows/PostgreSQL compartido altera resultados; otras corridas alcanzaron aproximadamente 300 ms para el experimento de diez pares.

Pendiente: 100 pantallas, carga sostenida, reconexiones masivas, cortes prolongados, restart real del proceso/máquina, proxy, consumo de CPU/RAM en reproductor y latencia visible. Con esos pendientes no se declara listo para producción.

## Dependencias

npm audit --package-lock-only reportó 5 alertas: proxy-addr crítica; body-parser, nodemailer y zod altas; qs moderada. Sus versiones son las mismas de la base: el diff del lockfile solo añade ws 8.22.1 como dependencia directa y quita su marca dev. No se ejecutó audit fix ni se actualizaron módulos ajenos automáticamente. Es un bloqueo de homologación que debe resolverse y volver a probarse.

## Aceptación manual pendiente

Dos perfiles de navegador y luego computador/teléfono HTTPS: QR legible; botones accesibles a 360/390 px; sin overflow; paisaje/retrato; QR no tapa juego; secuencias repetidas distinguibles; pausa de red conserva anuncio; token vencido obliga a emparejar; no se muestra identidad en pantalla; beneficio solo con cupo; redención explícita. Registrar hardware, navegador/firmware, fecha y evidencia visual antes de marcar cada punto aprobado.

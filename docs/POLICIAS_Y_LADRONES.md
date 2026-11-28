# Policías y Ladrones · Qori

Activación propia `QORI_CHASE`, incorporada a Empresa → Activaciones → Juegos. Reutiliza el catálogo, permisos por plan, activación/organización, participantes y tokens, enlaces públicos, captura de datos, contabilidad de beneficios y transporte WebSocket de Qori. No requiere servicios, paquetes ni claves adicionales.

## Para jugar

1. En Empresa, crear una activación **Policías y Ladrones**. Configurar el beneficio, disponibilidad y captura de datos como en las demás activaciones. La duración inicial es **180 segundos**, configurable entre 45 y 300.
2. Compartir su enlace o QR. Cada persona abre la misma activación desde su propia sesión/dispositivo.
3. Elegir apodo. Una persona crea sala y comparte su código de seis caracteres o enlace de invitación; las demás se unen. Admite **2–8** jugadores. Cada participante tiene un color; casco significa guardia (policía) y antifaz significa rufián (ladrón).
4. El anfitrión inicia con al menos dos conectados. Igual que en Cumbre, el indicador «Listo» es informativo. Los equipos se equilibran automáticamente; el jugador impar es ladrón. Hay tres segundos de preparación.
5. Mover con WASD/flechas o joystick táctil. La flecha y el aro identifican al jugador propio. En móvil, la cámara sigue al personaje; «Ver mapa completo» permite observar todo el barrio.
6. Captura y rescate son automáticos al tocar los cuerpos: el casco y las etiquetas no aumentan su alcance. El ladrón capturado aparece inmóvil en una plaza de la prisión. Otro ladrón libre puede entrar por la abertura y tocarlo para liberarlo. Puede volver a ser capturado.
7. Ganan los policías cuando todos los ladrones están presos simultáneamente. Gana **todo** el equipo de ladrones si queda uno libre al agotarse el tiempo, incluidos sus compañeros presos.
8. «Preparar revancha» vuelve al lobby de la misma sala. «Iniciar partida» inicia una ronda nueva. Se conservan apodos y colores; se reinician posiciones, capturas y reloj. «Salir de la sala» vuelve a la activación.

## Salas, desconexiones y resultados

- Lobby: caduca a los 30 minutos desde su creación/reinicio, aunque se consulte continuamente.
- Partida: el reloj continúa sin clientes. Un barrido del servidor procesa las salas sin conexiones.
- Un input deja de mover después de 650 ms sin renovación. El personaje desconectado permanece físicamente en su posición y puede ser capturado. A los 30 segundos se declara abandono; un ladrón que abandona pasa a prisión y no es rescatable durante esa ronda. Un policía que abandona deja de perseguir; los ladrones todavía deben resistir hasta el plazo.
- Reconectar antes de ese margen recupera la identidad y el estado. Reconectar después no anula el abandono de la ronda. La revancha vuelve a habilitar al participante conectado.
- Una sesión duplicada reemplaza el WebSocket anterior; la pestaña anterior avisa y deja de reconectarse automáticamente.
- Al terminar se bloquea el juego, se archiva un resultado inmutable y deja de aceptar incorporaciones. La sala conserva una ventana de cinco minutos para preparar revancha; luego se cierra. Al salir el último jugador del lobby/resultado, se cierra inmediatamente.
- El anfitrión que sale del lobby transfiere su función. Si se desconecta, otro conectado puede asumirla. En resultados, otro conectado puede preparar revancha cuando el anfitrión ya no está. Los desconectados se retiran al preparar revancha para no ocupar cupos indefinidamente.
- Los resultados de la primera ronda pasan automáticamente al servicio canónico de participantes/beneficios. Cada ganador del equipo puede recibir el beneficio configurado, sujeto a cupos y créditos existentes. Un equipo de cuatro ganadores puede consumir cuatro beneficios, nunca uno repetido por reintento.
- Las revanchas conservan participantes y son recreativas: no generan más beneficios ni eluden la política de intentos. Para otra participación comercial se vuelve a entrar bajo las reglas existentes de Qori.
- La partida y su ganador se confirman antes de la entrega comercial. Un problema de disponibilidad no deja la sala jugando. La entrega se reintenta por separado y «Ver mi resultado / beneficio» permite recuperarla. Los QR son privados para cada participante.

## Contratos e implementación

| Componente | Archivo / contrato |
|---|---|
| Catálogo, registro y resultado comercial | `backend/src/services/interactiveActivationService.js`, `subscriptionService.js`, `utils/validators.js` |
| Configuración y selector de Empresa | `empresa/index.html`, `empresa/js/app.js` |
| Registro y recuperación pública | `activacion/activation.js`, `activacion/index.html` |
| Reglas, mapa y configuración central | `activacion/policias-core.js` |
| Pixel art original | `activacion/policias-view.js` |
| Interfaz, audio original sintetizado, teclado y joystick | `activacion/policias.js`, `policias.css` |
| Salas transaccionales | `backend/src/services/chaseService.js` |
| HTTP | `POST /api/public/activations/:slug/chase` |
| WebSocket | `/api/public/chase-live` mediante ticket firmado emitido por la sesión de activación |
| Persistencia | `qori_chase_rooms`, `qori_chase_members`, `qori_chase_rounds`, `qori_chase_results` |

El servidor guarda intenciones, no posiciones del cliente. Integra a pasos de hasta 25 ms, normaliza diagonales, valida círculos en los pies y un segmento libre de obstáculos para contactos. En cada paso resuelve primero todas las capturas; si todos están presos fija la victoria. Solo después procesa rescates por ladrones que seguían libres. Un policía en contacto con el prisionero impide liberarlo en ese paso. El contacto exactamente en el vencimiento favorece a los ladrones; para ganar, la captura debe ser anterior.

Cada ronda tiene UUID y secuencia de inputs; los mensajes atrasados no afectan a la revancha. Bloqueos de fila serializan todas las operaciones de una sala, incluidas las de otras instancias. El WebSocket difunde snapshots a 10 Hz y cada cliente interpola. HTTP recupera el estado si falla el canal. PostgreSQL mantiene la autoridad y permite recuperar tras un reinicio del proceso. No se usa un mapa en memoria como única fuente de verdad.

Todas las tablas tienen RLS y acceso directo revocado a `anon`, `authenticated` y `public`. La API exige participante, token, activación y pertenencia. Los tickets WebSocket fijan sala/activación/participante, admiten únicamente el origen del sitio y limitan tamaño y frecuencia. Ningún comando público fija el ganador o entrega un premio.

## Arte y sonido

**Barrio del Farol** es un mapa finito original de 26×22 unidades, con adoquines, plaza central, café, tienda, vivienda, bancas, jardineras, vehículo, cajas y prisión. Perspectiva 2:1, contornos azul tinta, fachadas cálidas y vegetación verde salvia. Los sprites y texturas se dibujan directamente en canvas; no hay recursos provisionales ni descargas externas. Reposo, caminar, gorra/antifaz, captura, prisión, humo y vegetación tienen animación. Las construcciones que ocultan personajes se vuelven parcialmente transparentes. El terreno está precalculado en una capa y las entidades se ordenan por profundidad.

Los sonidos de cuenta regresiva, captura, rescate y final son secuencias Web Audio originales. El volumen se conserva localmente, empieza después de un gesto y se libera al salir. No hay armas, inventarios, poderes ni economía añadida.

### Renovación gráfica v3

El barrio incorpora tejados inclinados de tejas individuales, ventanas y contraventanas dibujadas en perspectiva, balcones, toldos, zócalos de piedra, faroles, adoquines pequeños, un medallón en la plaza, árboles, bancas de madera, cajas y un vehículo con más detalle. Se mantiene exactamente el mapa físico y sus rutas. Los personajes tienen ocho poses de carrera, orientación según el movimiento, respiración, postura en prisión y retratos coherentes en lobby y resultados. Cada persona conserva su color y cada equipo su accesorio.

Las superficies estáticas se precalculan una vez y se reutilizan en cada fotograma; la transparencia consulta la silueta real del objeto. Los nombres se separan al coincidir, la cámara móvil se acerca y sigue al personaje suavemente y se respeta la preferencia de movimiento reducido. El juego sigue dibujándose con Canvas nativo del navegador, sin nuevas dependencias de producción.

Se inspeccionó el escenario en Chrome local y se generaron vistas del **mismo renderizador con estados de prueba**: [barrio y prisión](qa/policias-art-v3/barrio-y-prision.png), [ocho personajes](qa/policias-art-v3/personajes.png) y [encuadre móvil](qa/policias-art-v3/camara-movil.png). Estos PNG son renders de revisión, no capturas de una partida online. La revisión interactiva móvil y una medición de FPS en dispositivos físicos siguen pendientes.

`test/chaseArt.test.js` comprueba escenas, ocho colores, diferencias entre equipos, cámara móvil, animación, movimiento reducido y que dibujar no modifica el estado autoritativo ni crea superficies nuevas en cada fotograma. Para ejecutar estas pruebas y exportar imágenes, instalar opcionalmente `@napi-rs/canvas@1.2.1` en `tmp/chase-art-tools` y ejecutar `node --test test/chaseArt.test.js` y `node scripts/chase-art-proof.cjs`. Esta herramienta es solo de QA; sus tiempos de render no representan FPS del navegador.

## Arte v5: El Burgo del Farol

La ambientación mezcla un burgo medieval fantástico con una calle inglesa victoriana: fachadas de entramado Tudor sobre ladrillo, tejados altos de pizarra, chimeneas gemelas, ventanas con vidrieras emplomadas, taberna El Grifo, Botica Lunar, carruaje estacionado, almenas y faroles de gas. El horizonte tiene agujas, chimeneas y luna; pequeñas polillas luminosas animan las jardineras. La interfaz usa latón envejecido, verde botella y sombras ciruela.

Los guardias llevan casco metálico, hombreras, insignia y capa corta; los rufianes, gorro de fieltro, bufanda, antifaz y botas. Ambos conservan la tela de su color personal. Los nombres se elevan para dejar espacio a los cascos. La simulación, los obstáculos físicos y las reglas de captura/rescate permanecen en el contrato anterior.

Revisión del 28 de noviembre: **101 pruebas aprobadas**, incluyendo render, ocho identidades, animaciones, movimiento reducido, cámara móvil, reglas, salas y regreso desde Customer. Se revisaron visualmente el acceso y el lobby en Chrome local, se creó una sala con conexión en vivo y se salió de ella. Se inspeccionaron estos renders del juego con ocho participantes: [escenario y prisión](qa/policias-art-v5/barrio-y-prision.png), [guardias y rufianes](qa/policias-art-v5/personajes.png), [cámara móvil](qa/policias-art-v5/camara-movil.png). Los PNG son renders del mismo código con estados de prueba, no capturas de una partida online. No se midieron FPS ni gestos en un teléfono físico en esta revisión.

## Migración y despliegue

`database/migrations/20261128144900_qori_chase_rooms.sql` tiene copia idéntica en `supabase/migrations`. Aplicar antes de ejecutar el backend nuevo, con el mecanismo normal `npm run db:migrate`, o la migración específica y su registro en `schema_migrations`. Verificar las cuatro tablas, RLS, la versión exacta en `/api/version`, `/api/health`, el selector de Empresa y los cuatro assets `policias-*`/`policias.css`.

## Verificaciones ejecutadas

El 28 de noviembre de 2026 pasaron **78 pruebas** integradas: reglas, PostgreSQL, dos clientes HTTP/WebSocket independientes, controles en DOM simulado, contrato comercial real en PostgreSQL local, catálogo y regresiones de Cumbre (física, canal, recuperación, reinicio, finalización, salas y premios).

Se verificaron 2–8 jugadores, rechazo del noveno concurrente, colores/equipos, inicio autorizado, movimiento sincronizado, diagonales, paredes/rejas, accesibilidad de las zonas del mapa, prisión, rescate individual, recaptura, ciclos de rescate, simultaneidad, ambos ganadores, reloj, desconexión/reconexión, reemplazo de pestaña, aislamiento, expiración y revancha. La prueba comercial confirma dos ladrones ganadores (uno preso), dos QR diferentes, dos consumos y cero consumos adicionales al repetir o preparar revancha. Solo bases locales `qori_chase_qa`, `qori_chase_full_qa` y las bases de QA de Cumbre.

En Chrome se crearon y unieron dos participantes desde pestañas con credenciales independientes, se inició la cuenta regresiva y se observó la persecución en vivo. Se capturaron imágenes reales del lobby y la persecución en la conversación. Se activó la emulación 390×844. El control nativo de navegador se detuvo al intentar exportar una captura desde DevTools, porque no pudo verificar su URL. **Quedan pendientes la exportación de imágenes como archivos, la captura visual de prisión/rescate, una revisión completa de gestos/overflow en navegador móvil y dispositivos físicos.** La prueba de handlers de teclado/joystick es automatizada en DOM, no sustituye a esta comprobación.

Tampoco se ha evaluado diversión/equilibrio con personas ni carga sostenida de muchas salas sobre la latencia de la base de producción. Los resultados automatizados no demuestran esos aspectos.

### Reproducir QA local

Corrección de reapertura (28 de noviembre): la sesión se recupera también cuando ya no hay sala o esta venció, sin registrar otra participación. Al salir se libera la membresía incluso durante la persecución; el abandono queda registrado en la ronda anterior. La interfaz vuelve a Crear sala / Unirme sin recargar ni borrar el token. Los resultados y beneficios originales permanecen inmutables al cambiar de sala. Si falla la recuperación, Volver a entrar permite reintentar. Las solicitudes tienen tiempo límite y las respuestas atrasadas no pueden reabrir una sala abandonada. La revancha admite a los participantes que regresaron tras una desconexión.

Se comprobó en Chrome local que recargar recupera la misma sala y personaje con conexión en vivo. `test/chaseSession.test.js`, las regresiones de salas y las de interfaz cubren específicamente reapertura, expiración, salida, nueva sala y reintento; la prueba comercial comprueba que cambiar de sala no consume otro crédito.

Corrección de entrada desde Customer (28 de noviembre): abrir el enlace directo, una publicación o una invitación recupera la sesión propia de Policías y Ladrones antes de devolver el resultado comercial anterior. Funciona también sin sessionStorage, por ejemplo en otra pestaña. La recuperación exige una cuenta autenticada vinculada a esa participación; nombre, correo o documento no recuperan credenciales de invitados. El resultado anterior se consulta voluntariamente desde el lobby y dispone de «Volver al juego». Un ticket vencido no impide volver a jugar; las reglas de redención y la concesión única del beneficio no cambian.

Se ejecutaron **101 pruebas sin fallos ni omisiones** tras esta corrección. `test/chaseCustomerEntry.integration.test.js` usa el servidor HTTP y PostgreSQL local con cookies Customer, cubre las tres entradas, premio vencido, creación de una nueva sala, aislamiento de cuentas, invitados, créditos y conservación del comportamiento de otras activaciones. `chaseSession.test.js` y `chaseUI.test.js` verifican la entrada sin almacenamiento, la consulta explícita del beneficio y el botón de regreso en DOM simulado. Esta corrección no añade una nueva comprobación visual en navegador real.

Usar PostgreSQL local en `127.0.0.1:55447`. Crear `qori_chase_qa` y `qori_chase_browser_qa`; para `qori_chase_full_qa`, usar el esquema completo de Qori. Los fixtures rechazan cualquier URL remota. Desde este checkout:

```powershell
node --test test/chaseRules.test.js test/chaseRooms.integration.test.js test/chaseUI.test.js test/chaseSession.test.js test/chaseAward.integration.test.js test/chaseCustomerEntry.integration.test.js
node scripts/chase-qa-server.cjs
```

Abrir `http://127.0.0.1:3098/qa?seat=uno` y `http://127.0.0.1:3098/qa?seat=dos` en dos pestañas. El servidor QA escucha solo loopback y usa el mismo cliente, controlador y WebSocket. No se monta en producción. Sus participantes son ficticios y no emite beneficios comerciales.

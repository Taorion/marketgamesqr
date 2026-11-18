# Cumbre Qori

Nueva activación `QORI_SUMMIT`: plataformas retro originales, ascenso por pisos, enemigos, hielo rompible, plataformas móviles y frágiles, martillo, puntos de retorno y supersalto. El premio es fijo: el negocio lo configura y solo llegar al cofre final lo desbloquea. La altura alcanzada se conserva como puntuación de seguimiento; no sustituye la llegada al cofre.

## Probar la demo

Abrir `activacion/cumbre-demo.html` directamente en un navegador. No requiere servidor ni conexión. También funciona en `/activacion/cumbre-demo.html` cuando se sirve el proyecto.

La demo permite cambiar el texto del premio, la altura y la dificultad. Usa un premio de ejemplo y no emite QR, registra ventas ni consume tickets. Después de ganar o perder, pulsar **Preparar nueva partida**.

- Teclado: flechas izquierda/derecha o A/D; espacio, arriba o W para saltar; X/J para golpear.
- Celular: botones de dirección, salto y golpe; admite varios dedos a la vez.
- Tres bloques o criaturas golpeados cargan el supersalto: salto + golpe.
- Sonido opcional, apagado inicialmente. En individual, ocultar la pestaña pausa la simulación. En multijugador el reloj común continúa.

## Carrera familiar: individual y multijugador

La activación integrada ofrece ambos modos después de registrar la participación. La demo HTML independiente sigue siendo individual; las salas requieren el backend y PostgreSQL.

1. Todos escanean el mismo QR de la activación y eligen **Multijugador**.
2. Una persona escribe su apodo y pulsa **Crear sala familiar**. Comparte el código de seis caracteres.
3. Los demás escriben su apodo y el código en **Unirme a la sala**. Cada sala admite entre 2 y 8 personas.
4. Desde **2 jugadores conectados**, quien creó la sala pulsa **Iniciar con 2 jugadores** (el botón muestra la cantidad conectada). No hace falta llenar los 8 cupos ni confirmar que todos estén listos. Cuenta regresiva común de tres segundos; los jugadores desconectados pueden volver, con el reloj de la carrera ya en marcha.

### Movimiento de los rivales

Durante la carrera, `/api/public/summit-live` transmite posiciones visuales por WebSocket a 20 Hz. El canvas interpola entre mensajes con un pequeño búfer de 90 ms y dibuja al rival en cada cuadro; las respuestas HTTP atrasadas no lo hacen retroceder. Cada rival conserva su color, apodo, animación de caminar y martillo.

El controlador entrega un permiso firmado y temporal únicamente después de autenticar una participación en una carrera iniciada. El canal limita tamaño y frecuencia, fija la identidad y sala desde ese permiso, reemplaza conexiones duplicadas y se reconecta automáticamente. No acepta resultados, premios ni saldos: la simulación de controles, el ganador y el QR siguen siendo responsabilidad exclusiva de la transacción existente.

Si WebSocket no está disponible, continúan los controles y la validación por HTTP, con movimiento visual suavizado desde esas respuestas. El canal visual distribuye mensajes entre conexiones de la misma instancia Node; antes de escalar a varias instancias se requiere un distribuidor compartido. Entre instancias distintas se conserva el respaldo HTTP, con mayor retraso visual.
5. Todos recorren la misma montaña, con las mismas condiciones. Se ven los otros escaladores y una lista de avance, actualizados aproximadamente cada medio segundo. Los personajes no se empujan ni comparten colisiones.
6. Gana la primera llegada al cofre que recibe y valida el servidor. La latencia de la conexión puede influir en llegadas muy cercanas. Solo esa sesión recibe el resultado privado y el QR del premio.

Cada sala entrega como máximo un premio, sujeto a la disponibilidad general de la activación y los créditos del negocio. Si nadie llega, no se emite. La sala en espera vence a los 30 minutos; una carrera dura lo configurado, con dos segundos de margen para recibir los últimos controles. No se permite incorporarse una vez iniciada. Antes de empezar, salir transfiere la organización al siguiente participante.

**Reconexión:** la sesión se conserva en `sessionStorage` de esa pestaña. Al recargar se recupera la sala y el avance confirmado. Si faltan controles durante una desconexión, el juego recupera el tiempo con controles neutrales: el reloj no se detiene. Cerrar la pestaña o borrar sus datos puede perder la credencial. Repetir una solicitud o recuperar el resultado no vuelve a emitir el premio.

**Persistencia y premio:** `qori_summit_rooms` y `qori_summit_members` guardan la sala y la simulación validada. Un bloqueo transaccional de la sala decide la llegada única; la emisión usa `completeInteractiveParticipant` en la misma transacción. Si esa emisión falla, no queda un ganador falso. El endpoint individual rechaza participantes vinculados a una sala. Cada participante ve únicamente su propio resultado privado; apodos y posiciones son compartidos. Las tablas tienen RLS y no conceden acceso directo a `anon` ni `authenticated`.

### Preparar el despliegue

Aplicar `database/migrations/20261118134405_qori_summit_rooms.sql` (copia idéntica en `supabase/migrations`) **antes** de publicar el backend y los nuevos assets. Registrar su identificador en `schema_migrations` para que el arranque no la repita. Confirmar la publicación comparando `/api/version.render_git_commit` con el commit enviado y comprobando salud, rutas y assets.

Pruebas adicionales: `test/summitRace.integration.test.js` usa exclusivamente `127.0.0.1:55447/qori_summit_qa`, una base local con tablas mínimas. Comprueba PostgreSQL real, concurrencia, capacidad, sesiones, caducidad, recuperación, rollback y dos clientes HTTP con el controlador real. En ese archivo la emisión final se sustituye por un registro local de prueba. `test/summitAward.integration.test.js` utiliza otra base local, `qori_summit_release_qa`, con el esquema completo: verifica la creación de la activación, una carrera concurrente con el servicio canónico real, un único QR y un solo débito, recuperación sin nuevo cargo y emisión individual independiente. No acredita redención en tienda ni dispositivos físicos. `test/summitModes.test.js` y `test/summitView.test.js` comprueban elección de modo, sala, cuenta regresiva, controles y resultado en DOM simulado.

## Configurar en Qori Empresa

1. En Activaciones, seleccionar **Cumbre Qori**.
2. Completar campaña, sede, vendedor y captura de participantes según corresponda.
3. En **Beneficio, producto e interés GOS**, definir el premio concreto, producto, condiciones y entrega. Ese mismo texto aparece antes de empezar y sobre el cofre de la cima.
4. Configurar entre 8 y 16 pisos, 45–180 segundos, 1–5 vidas y dificultad amable, clásica o experta.
5. Definir disponibilidad, vigencia y política de intentos con los controles existentes y lanzar la activación.

Se integra en la categoría de juegos y en los planes que admiten ese catálogo. No añade una emisión de beneficios paralela: usa el QR, los créditos, la disponibilidad y la validación existentes.

## Comprobación del premio

`cumbre-core.js` comparte una simulación determinista de 60 pasos por segundo entre cliente y servidor. El cliente envía los controles comprimidos; el servidor reproduce el recorrido con la semilla de sesión y calcula la llegada. No confía en la puntuación, duración o victoria declaradas por el cliente.

La participación guarda una huella de la configuración y del premio. Si el negocio los cambia durante la partida, se requiere una nueva participación. Se comprueban el token de sesión, los límites de tiempo y controles, la finalización previa y la pertenencia de la participación a la activación. Llegar a la cima sigue sujeto a la disponibilidad de premios y créditos del negocio. La repetición de una participación finalizada se rechaza, no genera otro ticket.

La reproducción comprueba que los controles describen una partida válida. No demuestra que haya jugado una persona ni impide bots capaces de resolver el juego. No sustituye los controles de identidad o la política de intentos de Qori.

## Verificación y alcance

- Pruebas de física, llegada, caída, tiempo agotado y reproducción determinista.
- Pruebas del servidor frente a puntuaciones inventadas, token incorrecto, repetición, cambio de premio y reclamación inmediata.
- Pruebas del flujo de finalización con cliente de datos simulado: pérdida sin emisión/consumo, límite de premios y aislamiento entre activaciones.
- Pruebas DOM con teclado y punteros simulados: partida ganadora, controles simultáneos, cancelación y limpieza de eventos.
- Regresión del catálogo, Orden correcto y Runner.

Las pruebas DOM no son una inspección visual. El navegador automatizado no estuvo disponible durante la preparación del despliegue. Pendientes: revisión visual de escritorio/celular, prueba en dispositivo físico y redención en QA. La emisión canónica y el débito se comprobaron en la base local completa. El balance y la diversión requieren probarlo con personas.

Preparación de la publicación del 18 de noviembre de 2026: 39 pruebas aprobadas, incluyendo emisión canónica con PostgreSQL local y salas concurrentes. La evidencia de publicación se obtiene de la versión servida, no únicamente del push.

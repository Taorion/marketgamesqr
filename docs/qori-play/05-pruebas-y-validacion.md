# Pruebas y validación

Entorno: Windows, Node 22.23.5, PostgreSQL 18 local, base qori_play_qa con datos sintéticos. Las suites se ejecutan secuencialmente respecto de la base; el preview se detiene antes. No se usaron cuentas, documentos ni premios reales.

## Resultado actual

| Suite | Resultado |
| --- | --- |
| Play unidad/HTTP/WS/DOM/migraciones/operaciones + Invoice unidad + Cumbre | 43/43 |
| Finance, Customer UI, Validator seleccionados | 28/28 |
| Invoice integración existente | 24/24 |
| Customer Books integración existente | 11/11 |
| Seller UI existente | 16/16 |
| Total ejecutado | 122/122 |

Los fallos documentados en adff639 fueron reproducidos en la base y ahora corregidos en los fixtures/expectativas: registro obligatorio, sesión y cabeceras completas, módulos cargados, estado restringido de Academy y script versionado vigente. Se conservan todas las aserciones financieras y de aislamiento; no se retiraron controles productivos para hacer pasar pruebas.

## Reproducir

Detener preview. Usar el Node del workspace o Node 22.23.5 equivalente:

```powershell
node scripts/prepare-qori-play-qa.js
node --test test/qoriPlay.test.js test/qoriPlay.integration.test.js test/qoriPlay.migrations.test.js test/qoriPlay.operations.test.js test/qoriInvoice.test.js test/summitLive.test.js
node scripts/test-qori-play-regressions.js
node scripts/load-qori-play.js
node scripts/restore-qori-play-qa.js
```

El inicializador y las pruebas fijan loopback/base de laboratorio; no aceptan producción. Las dos últimas operaciones deben ejecutarse solas. La restauración usa PostgreSQL 18 instalado en C:/Program Files/PostgreSQL/18/bin, crea una DB desechable de nombre aleatorio verificado y retira solo esa DB al finalizar. Backup sintético bajo .qa-play, ignorado por Git.

Casos nuevos: Cumbre/Play simultáneos, privacidad/DELETE Customer real, cuatro finales concurrentes con un cupo, transición tardía, reinicio de runtime, callbacks por tenant, secreto no recuperable al listar, firma/caducidad, DNS fijado, SSRF, redirect sin seguimiento, backoff, DEAD, cancelación y MIME Nodemailer sin red. Los dobles de DNS/HTTPS prueban decisiones del transporte; no certifican un receptor externo.

## Carga y recuperación

load-results.json: 100 pantallas en cuatro apps, 200 sockets durante 60,39 s, 3.990 ACK, ningún error ni fallo de ciclo. 123 inputs llegaron después del final y se recuperaron mediante estado sin desconectar. ACK p50 28,76 ms y p95 47,97 ms; no es latencia visible. Último ciclo general 1.189 ms, máximo 1.664 ms. No se declara 4 Hz sostenidos a 100 pantallas.

load-before-correction.json conserva el fallo inicial: bloqueos SQL y cierres de control. La prueba dirigida y la corrida final verifican las correcciones. Se mantiene un solo runtime, no una arquitectura distribuida certificada.

restore-results.json compara contenido por digest y conteo de sesiones, beneficios, eventos, callbacks y entregas tras pg_dump/pg_restore de una copia sintética. Resultado coincidente, 8,37 s; no equivale a desastre productivo, llaves recuperadas o RTO remoto.

## Dependencias

Nodemailer 10.6.1, Zod 4.6.7, proxy-addr 2.0.8, body-parser 2.4.0 y transitivas corregidas. npm audit fix reportó cero vulnerabilidades conocidas al instalar esta revisión. Lockfile fijado; se usó --ignore-scripts. No se probó SMTP real. Nodemailer requiere Node >=20; este conjunto se ejecutó con Node 22.23.5. Verificar runtime del destino antes de cualquier despliegue autorizado.

## Aceptación externa pendiente

Navegador visual, 360/390 px sin overflow, tablet/pantalla y celular HTTPS con cámara; QR legible, orientación, controles alcanzables, audio/fullscreen, abandono/reconexión y firmware real. El host de automatización de navegador no estuvo disponible en la entrega inicial; DOM no sustituye esa evidencia. Pentest independiente, receptor HTTPS externo y pruebas prolongadas pendientes. Ningún resultado declara lista la producción.

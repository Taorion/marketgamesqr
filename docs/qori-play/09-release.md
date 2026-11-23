# Integración para despliegue solicitado

Solicitud explícita: deploy. Release aislado desde origin/main 9b7b0ac5b6ec4d2c4b5d913b69507e5693f680a4, incorporando la entrega 4e4928e y sus dependencias Invoice/Developers. No incluye cambios sin commit del checkout principal.

Conflictos resueltos: conservar el worker de renovaciones de producción y ambos canales Cumbre/Play; una sola declaración de cada runtime; protección de ruta WS; versiones corregidas de dependencias. La biblioteca Academy actualmente publicada se conserva. Su prueba de navegación ahora carga el módulo real y verifica nueve materiales y ausencia de acceso para Seller pendiente.

## Verificación local del código integrado

| Suite | Resultado final |
| --- | --- |
| Play/Invoice unidad, HTTP, WS, privacidad, migraciones, operaciones y Cumbre live | 43/43 |
| Finance/Customer UI/Validator | 28/28 |
| Invoice integración | 24/24 |
| Customer Books integración | 11/11 |
| Seller navegación con Academy vigente | 16/16 |
| Academy/recursos/oportunidad y juegos Cumbre existentes | 75/75 |
| Renovación mensual con proveedor simulado | 17/17 |
| Total | 214/214 |

Además, smoke HTTP local con NODE_ENV=production: ocho rutas públicas disponibles, dos capabilities deshabilitadas y cinco rutas API cerradas aun poniendo flags sandbox=true. No hubo pagos, correos, premios ni callbacks reales.

Se ejecutó el inicializador integrado sobre PostgreSQL local qori_play_qa. Para reproducir migraciones Supabase existentes se crearon allí roles anon, authenticated y service_role sin login; no se tocaron roles remotos. Las cuatro migraciones nuevas incorporan tablas privadas y referencias del módulo; no borran filas comerciales existentes. El migrador de Render las ejecuta transaccionalmente antes de arrancar el servidor.

## Alcance público y restricciones

Publicar código y documentación no habilita tráfico real. Qori Play exige NODE_ENV=test/development y base loopback qori_play_qa; Invoice también permanece cerrado bajo NODE_ENV=production. No se configuraron secretos nuevos en Render ni se alteraron pagos, cupos reales o planes comerciales.

Rutas públicas a verificar: /play/, /play/guide/, /play/openapi.json, /play/sdk/screen-v1.js, /developers/guide.html y /developers/openapi.yaml. Consolas y APIs sandbox no se habilitan en producción. /api/play-capabilities y /api/invoice-capabilities deben informar sandbox=false y production=false.

Puerta de verificación del release: /api/version.render_git_commit debe coincidir exactamente con el commit enviado a main; /api/health debe responder correctamente; verificar assets publicados y conservación de /empresa/, /customer/, /seller/ y /activacion/. No declarar soporte de hardware ni aceptación visual: el host de navegador no estuvo disponible. Los límites de carga/homologación descritos en 08-correcciones.md siguen vigentes.

Rollback operativo: revertir el commit de release mediante un nuevo commit y el mismo flujo GitHub/Render; mantener las tablas aditivas y evidencia. No ejecutar los scripts DROP de laboratorio sobre tablas con datos. No hacer reset forzado de main.

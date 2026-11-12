# Programas gratuitos de Qori Empresa

| Programa | Herramienta | Tickets iniciales | Capacidad |
|---|---|---|---|
| Pensé en ti (`PENSE_EN_TI`) | Productos para regalar y cortesías | 20, una sola vez | 5 productos registrados |
| Una razón para volver (`SELLOS_GRATIS`) | Tarjetas de sellos | 0 | 1 programa no eliminado; 5 productos |
| Crea activaciones (`ACTIVACIONES_GRATIS`) | Creador de activaciones | 0 | 2 activaciones activas simultáneas; 5 productos |

Todos incluyen validador, cuenta, compra de tickets y publicación en Customer de su propio tipo de beneficio. Los premios de sellos y activaciones consumen tickets comprados. Pausar una activación libera un cupo activo; los borradores no consumen cupos. Archivar un producto conserva su registro y sigue contando dentro de los cinco. Eliminar un producto está sujeto a las protecciones existentes de historial de ventas.

Los programas son separados y no incluyen Gift Cards ni los demás módulos de una suscripción. Una recarga de tickets no cambia el plan ni sus permisos. El documento del negocio puede reclamar un único registro gratuito entre los tres programas. Cambiar de programa no vuelve a conceder saldo inicial.

Seller ofrece un enlace para cada programa con `program`, `seller` y, cuando procede, el token firmado `prospect_ref`. El registro conserva la atribución y el contacto exacto del CRM. El alta gratuita no genera un pago ni una comisión por suscripción. Admin conserva la consulta de cuentas, saldos e historial.

## Controles

- Catálogo canónico de suscripciones y permisos de herramientas; los ajustes comerciales no amplían un programa gratuito.
- Autorización de solicitudes por programa en el servidor, además de ocultar módulos ajenos en Empresa.
- Límites transaccionales en PostgreSQL, con bloqueo de la fila del negocio para proteger inserciones y reactivaciones concurrentes.
- Publicaciones Customer elegibles según la herramienta del programa y su estado.
- Emisión y validación mediante los servicios canónicos de tickets; no se crea un saldo paralelo.
- Los registros, beneficios emitidos y movimientos previos se conservan. Los datos heredados de herramientas excluidas no habilitan nuevas emisiones.

Migración: `20261112165700_qori_free_program_isolation.sql`, espejada en `database/migrations` y `supabase/migrations`.
`20261112172713_qori_free_program_function_permissions.sql` retira también los permisos directos de `anon` y `authenticated` concedidos por los privilegios predeterminados de Supabase. Las funciones de límite se ejecutan mediante los triggers del servidor.

Validación local: `test/freePrograms.integration.test.js` usa exclusivamente `qori_customer_qa` en `127.0.0.1:55441`. Cubre registro, permisos, concurrencia, premios, publicación, recargas y supervisión. `test/freeProgramsUI.test.js` comprueba selección del programa y atribución en el formulario, herramientas del panel y publicación por tipo con JSDOM. JSDOM no acredita revisión visual en navegador ni dispositivo físico.

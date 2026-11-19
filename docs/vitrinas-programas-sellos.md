# Vitrinas de programas y QR de acceso

En Vitrina web, crea o edita una vitrina y elige **Inscripción a programas de sellos**. Marca los programas del negocio que quieres mostrar y publica la vitrina. Los programas se crean previamente en Tarjetas de sellos; solo aparecen al público si están activos y no están eliminados.

La persona escanea el QR de la vitrina, revisa los premios y las condiciones, elige **Quiero mi tarjeta** y completa la inscripción habitual. Cada programa entrega su propia tarjeta. La inscripción por documento es idempotente y conserva la protección del enlace personal.

Todas las vitrinas tienen **QR de acceso** en su administración y **QR de esta vitrina** en la página pública. Se puede descargar la imagen, imprimirla o copiar el enlace. El QR apunta al enlace permanente de la vitrina y no consume tickets. Los borradores y vitrinas pausadas requieren publicación antes de compartir. El acceso no autoriza redenciones: emitir un premio sigue las reglas y el saldo de tickets del negocio.

El servidor valida que los programas seleccionados pertenezcan al mismo negocio. La vitrina de sellos no recibe pedidos de productos ni pedidos por WhatsApp. No requiere migración: usa `smart_catalogs.metadata.redemption_mode=STAMP_PROGRAMS` y `stamp_program_ids`.

## Demo Qori

`scripts/seed-demo-affiliates-stamps.cjs` crea exclusivamente en el tenant de demostración fijado en el script:

- Sofía Demo, documento ficticio DEMO-AF-001, saldo inicial de 100 puntos.
- Mateo Demo, documento ficticio DEMO-AF-002, saldo inicial de 650 puntos.
- Valentina Demo, documento ficticio DEMO-AF-003, saldo inicial de 1500 puntos.
- Tres programas con premios del inventario de muestra, a los 5, 8 y 10 sellos.
- La vitrina pública `/c/demo-qori-sellos`.

Ejecutarlo sin argumentos verifica dentro de una transacción y revierte. Con `--apply` guarda. Verifica idempotencia en ambas modalidades, registra los puntos iniciales en el libro de movimientos, conserva saldos y carnés existentes y no consume tickets. Las personas, documentos y premios están identificados como ficticios; no se envían comunicaciones. Los enlaces de los carnés se devuelven al operador y no se guardan en el repositorio.

Pruebas: `test/catalogShowcases.integration.test.js` cubre aislamiento entre negocios, permisos, estados, selección, QR decodificado, saldo de tickets, inscripción canónica y presentación pública. Las pruebas de navegador usan exclusivamente la base local de QA para las inscripciones.

# Vitrinas de activaciones

En **Vitrina web → Crear vitrina → Uso de esta vitrina**, selecciona **Juegos y activaciones con beneficios**. Marca las activaciones existentes del negocio, publica la vitrina y comparte su enlace o su **QR de acceso**. Desde **Gestionar** o **Editar** puedes cambiar la selección. No necesita WhatsApp ni productos de inventario.

La página pública muestra el tipo de juego, una ilustración, su objetivo, beneficios configurados, rangos de puntuación cuando correspondan, condiciones y el botón **Jugar ahora** o **Participar**. La búsqueda encuentra juegos por nombre, tipo o beneficio. Los enlaces abren las activaciones existentes; la vitrina no crea participaciones ni concede premios por visitarla.

El servidor valida la pertenencia al negocio, la selección sin duplicados y los tipos incluidos en su plan. Solo publica activaciones seleccionadas, activas y dentro de su vigencia. No expone respuestas correctas, posiciones ganadoras, pesos, códigos de redención ni datos de participantes. El QR abre la vitrina y no consume tickets; las emisiones de premios siguen el flujo y las condiciones de cada activación.

Se reutiliza `smart_catalogs.metadata` con `redemption_mode: ACTIVATIONS` y `activation_ids`. No requiere migraciones. `GET /api/public/catalogs/:slug/activations` consulta la selección vigente sin caché; no habilita pedidos ni WhatsApp en este tipo de vitrina.

Validación: pruebas de integración con PostgreSQL local aislado para pertenencia, planes, estado/vigencia, edición por HTTP, reglas de beneficios, QR sin consumo y conservación de vitrinas de sellos; pruebas DOM para tarjetas, búsqueda, texto seguro y edición de la selección.

Revisión del 19 de noviembre de 2026: 54 pruebas aprobadas entre activaciones, sellos, puntos, pedidos y acciones del catálogo. Se actualizaron dos comprobaciones que dependían de etiquetas de caché retiradas en septiembre, conservando la comprobación de que precarga y ejecución usan la misma URL versionada. Chrome verificó la creación desde el formulario real de Empresa, edición de la selección y la página pública a 1440, 390 y 320 px: búsqueda por beneficio, entrada a Cumbre, descarga del QR y ausencia de desbordamiento horizontal o errores JavaScript. Estas pruebas usaron un negocio de QA y una base local; no emitieron premios.

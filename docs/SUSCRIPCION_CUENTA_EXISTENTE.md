# Suscripción de una cuenta existente

El propietario entra a `/empresa/` con su usuario habitual. Si Descubre ya venció, el portal abre Cuenta → Recargas para elegir y pagar un plan. También dispone de «Formalizar mi suscripción» en el resumen del plan.

La entrada con sesión guardada y los enlaces a módulos vencidos abren directamente esa selección. Las consultas de módulos restringidos se omiten y sus respuestas tardías no cubren el formulario de pago. Al actualizar, el portal consulta nuevamente el estado de la suscripción para recuperar la operación después de un pago aprobado.

El checkout pertenece al mismo negocio y usuario. El retorno del navegador no activa el plan: se requiere la confirmación validada de Mercado Pago. Al pasar de prueba o programa gratuito al primer plan pago se conservan los tickets restantes, los registros y los usuarios; se agregan los tickets incluidos del plan adquirido. Las renovaciones posteriores mantienen la política existente de reposición de tickets incluidos sin acumulación.

## Módulos y cupos desde Admin

1. Abrir Cuentas Qori → Empresas y empresarios → Administrar.
2. Abrir «Módulos y cupos del plan».
3. Después de un pago aprobado y aplicado al mismo negocio y plan vigente, seleccionar módulos y escribir los cupos totales deseados, por ejemplo 3 vitrinas.
4. Indicar motivo y, si corresponde, vencimiento de los adicionales. Guardar.

La operación es exclusiva del superadmin. Conserva el plan, no registra pagos, no genera comisiones ni abona tickets. No reduce las capacidades incluidas en el plan. Los adicionales se mantienen al renovar el mismo plan, están sujetos al acceso vigente y no se aplican a otro plan. Se pueden retirar sin borrar registros. Cada modificación queda auditada, vinculada a la orden de pago, y rechaza ediciones sobre una ficha desactualizada.

Los pagos pendientes, la prueba Descubre, los programas gratuitos y una activación manual sin orden de suscripción aprobada no habilitan ampliaciones en este flujo.

## Verificación

Pruebas con PostgreSQL local aislado y proveedor de pago simulado: cuenta vencida, checkout idempotente, confirmación duplicada, conservación de datos y tickets, programas gratuitos, límites efectivos, aislamiento entre negocios, permisos, auditoría, expiración y suspensión. Pruebas DOM cubren selección de plan, cobro automático, navegación al editor administrativo y guardado de cantidades.

No se realizó un cobro real. La revisión visual móvil quedó pendiente por limitaciones del conector de navegador y actividad concurrente en la ventana nativa; las pruebas DOM no sustituyen esa revisión.

La regresión de entrada se comprueba cargando el HTML y el script completos en DOM: sesión vencida, enlace previo a GOS, selección de Crece, envío al checkout de la misma cuenta, ausencia de consultas a módulos bloqueados y recuperación ante una suscripción aprobada. La API local confirma que identidad, planes, perfil y saldo siguen accesibles durante el vencimiento.

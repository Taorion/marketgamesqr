# Recuperar un pago de suscripción con acceso ya activado

En Admin → Cuentas Qori → Administrar → Módulos y cupos, una cuenta activa sin pago acreditado muestra la orden pendiente y «Verificar pago sin cambiar renovación». Solo superadmin puede solicitarlo. La petición registra negocio, orden, fecha esperada, responsable y motivo. No marca el pago aprobado.

El servidor verifica las solicitudes pendientes con Mercado Pago por external_reference. Un único pago aprobado se consulta nuevamente por ID y pasa por el finalizador canónico, con las validaciones de importe, moneda, referencia e idempotencia. Ausencia de pago, errores o múltiples coincidencias mantienen la orden sin acreditar. El estado de verificación se consulta con «Actualizar estado».

La renovación debe seguir exactamente igual a la autorizada; si cambió, se requiere una nueva revisión. La acreditación conserva esa fecha, entrega los tickets del plan una vez y conserva los tickets previos en la primera suscripción pagada. El trigger vigente atribuye la comisión al embajador inmutable de la orden. No se registra un desembolso al embajador.

No se modifican credenciales, se fabrican referencias de Mercado Pago ni se acepta el retorno del navegador como prueba de pago. Las auditorías distinguen solicitud y pago recuperado. El worker solo procesa órdenes explícitamente solicitadas por superadmin; consulta cada minuto y reintenta cada cinco minutos. No necesita migración.

POST /api/admin/accounts/businesses/:id/payment-recovery recibe order_id, expected_period_end y reason; respuesta queued o already_confirmed. Mantiene autorización superadmin y respuestas private/no-store.

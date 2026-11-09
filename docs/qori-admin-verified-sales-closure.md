# Cierre comercial validado por Admin

La inscripción de un negocio (stage WON) no acredita un cierre ni un pago. Seller muestra «Inscrito · pendiente de cierre» hasta que el superadmin registra el cierre explícito en Admin → Prospectos → Validar cierre.

El embajador solo puede registrar Nuevo, Contactado o En conversación. La API también rechaza LOST para vendedores y la reapertura de seguimientos cerrados por Admin. Los LOST históricos conservan su información como «No continúa»; no se presentan como ventas cerradas.

Validar cierre exige dos confirmaciones administrativas y motivo: pago revisado y suscripción activa revisada. El servidor vuelve a comprobar, dentro de una transacción, un pago APPROVED y aplicado de suscripción mensual/anual/renovación del mismo negocio y plan, de importe positivo. Rechaza otros negocios, paquetes de tickets, planes distintos, pagos pendientes, cancelados o sin aplicar. Comprueba negocio activo, plan de pago, estado ACTIVE y vigencia futura, sin periodo gratuito o de gracia.

La acción guarda closed_at, closed_by y closed_payment_order_id en el prospecto y un evento PROSPECT_CLOSURE_VALIDATED con el soporte del pago y la suscripción. Es idempotente y no crea cobros, recargas ni comisiones. Las inscripciones existentes no se cierran automáticamente. El cierre es un hecho histórico validado en esa fecha; la vigencia posterior de la suscripción se sigue mostrando por separado.

Migración: 20261109203424_qori_admin_verified_sales_closure.sql. Mantiene RLS y ausencia de permisos públicos sobre qori_sales_prospects. Pruebas locales: 29 aprobadas entre commercialClosure.integration, commercialClosureUI, qoriSellerUI, adminAccountsBoot.integration y qoriSellerLaunch.integration. La prueba DOM no sustituye revisión visual en navegador.

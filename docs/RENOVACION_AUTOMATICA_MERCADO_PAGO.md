# Renovación mensual con tarjeta

En las inscripciones públicas y al formalizar, renovar o cambiar un plan mensual
desde Empresa, la opción predeterminada es **Tarjeta con renovación automática**.
Antes de continuar se muestran el valor mensual y el aviso de que los próximos
cobros se pueden desactivar desde **Mi cuenta → Renovación mensual automática**.
El botón continúa al checkout de Suscripciones (`/preapproval`) de Mercado Pago;
la autorización del titular incluye las renovaciones mensuales. No hay un paso
posterior de inscripción voluntaria para esta modalidad.

La API exige `auto_renewal_consent: true` en el checkout mensual predeterminado y
conserva en la orden la versión del aviso, fecha, usuario, plan, importe y frecuencia.
El consentimiento al aviso no sustituye la confirmación del proveedor: Qori solo
muestra la renovación activa al verificar `authorized` en Mercado Pago. Qori no
almacena datos de tarjeta.

La alternativa explícita **PSE o saldo Mercado Pago · pago único** usa Checkout Pro
y excluye tarjetas de crédito, débito y prepago en los planes mensuales. Despega
conserva su pago prepago, con los medios digitales habituales y sin débito mensual.
Las recargas de tickets, almacenamiento y regalos no cambian.

Un pago único anterior no autoriza retroactivamente una tarjeta. Los propietarios
de cuentas existentes también pueden inscribirla desde Mi cuenta. Los descuentos
comerciales temporales que ya impedían el débito automático conservan esa regla;
la pantalla de error indica usar pago único mientras termina el beneficio.

Si el mismo plan tiene un periodo pagado vigente, el primer cobro se programa al
vencimiento. Para una inscripción nueva, plan vencido o cambio de plan, Mercado
Pago procesa el primer pago tras la inscripción; solo su aprobación activa el
plan elegido. Autorizar la tarjeta no acredita una mensualidad, tickets ni
comisiones. La recuperación de una inscripción autorizada sin primer pago pide
esperar la confirmación, sin invitar a repetir el cobro. La UI muestra el
estado, el importe autorizado y la siguiente fecha que devuelve el proveedor.
No se promete un importe ni un plazo fijo para las validaciones temporales de tarjeta.

## Operación

- `POST /api/public/signup/portal` y `POST /api/payments/subscriptions/checkout`:
  `payment_mode` es `recurring_card` por defecto para los planes mensuales, o
  `one_time` para la opción explícita PSE/saldo. Despega siempre es `one_time`.
  El cambio de plan conserva el plan anterior hasta el pago aprobado. Cada cobro
  recurrente debe pertenecer a la autorización actual del negocio y a su factura.

- `POST /api/payments/subscriptions/auto-renewal`: crea o recupera una autorización
  para el plan mensual actual. Un bloqueo por negocio y una clave persistente de
  intento evitan autorizaciones paralelas. Si se pierde la respuesta del proveedor,
  se busca la referencia del intento antes de crear otra autorización.
- `POST /api/payments/subscriptions/auto-renewal/refresh`: consulta autorización,
  facturas y pagos completos en Mercado Pago. También se ejecuta al volver del proveedor.
- `POST /api/payments/subscriptions/auto-renewal/cancel`: cancela en Mercado Pago y
  confirma el resultado antes de mostrar cancelación. Conserva el periodo pagado.
  Un débito que ya esté en proceso puede requerir revisión con Mercado Pago.
- Solo administradores de facturación autenticados del negocio acceden a estos
  controles. Se bloquea el pago manual mientras exista una autorización abierta;
  debe cancelarse primero para evitar pagos simultáneos.

Los webhooks `subscription_preapproval`, `subscription_authorized_payment` y
`payment` verifican su firma. La acreditación consulta el pago completo, valida
referencia, autorización, moneda y monto; un pago pendiente o rechazado no renueva.
Los estados posteriores de un mismo pago pueden avanzar a aprobado. Eventos
repetidos, concurrentes o de autorizaciones reemplazadas no duplican el periodo.
Una factura histórica no retrocede la vigencia ni repone tickets de otro periodo.
Los reembolsos y contracargos conservan el historial y pasan por los ajustes
existentes de atribución/comisiones; este cambio no introduce reembolsos automáticos.

El proceso de conciliación corre al iniciar el servidor y cada cinco minutos,
en lotes de veinte negocios, con la paginación predeterminada del proveedor y avance por el número de facturas recibidas. Consulta al proveedor;
no ejecuta cargos adicionales. Guarda en `businesses.settings.subscription` la
fecha de intento, de verificación y el aviso de error. Los fallos se reintentan.
No necesita migración ni datos de tarjeta nuevos.

## Configuración y verificación

En Qori Empresa, **Admin → Cuenta**, la tarjeta «Renovación mensual automática»
está disponible tanto en el perfil como en Administración de usuarios. El
administrador puede activar la inscripción para el plan vigente, consultar su
estado y desactivarla. La activación redirige a Mercado Pago y permanece pendiente
hasta la autorización del titular; al regresar se abre el perfil y se consulta al
proveedor. Desactivar conserva el periodo pagado. Los usuarios sin permisos de
facturación ven el estado con los controles deshabilitados; la API conserva la
restricción por rol y negocio. Despega no ofrece activación mensual.

La revisión del perfil cubrió navegador a 1440, 390 y 320 píxeles: consulta,
cancelación confirmada, fallo de cancelación sin falso estado desactivado,
conservación de vigencia, nueva inscripción del plan vigente y estado pendiente.
Se verificó también el bloqueo de controles para usuarios sin permiso y el 403
del servidor, además de la exclusión de Despega. Se usó PostgreSQL local y
Mercado Pago simulado; no se modificaron autorizaciones de clientes reales.

Requiere `MERCADO_PAGO_ACCESS_TOKEN` y `MERCADO_PAGO_WEBHOOK_SECRET` en el servidor.
Configurar en Mercado Pago los tres eventos citados hacia
`https://gosqori.com/api/payments/mercadopago/webhook` y conservar la clave de firma
correspondiente. `SUBSCRIPTION_RECONCILIATION_ENABLED=false` detiene la conciliación.
`/api/health` muestra únicamente si la configuración y el proceso están habilitados;
no expone credenciales ni prueba por sí solo un débito bancario.

Fuentes oficiales:
- https://www.mercadopago.com.co/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
- https://www.mercadopago.com.co/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks
- https://www.mercadopago.com.co/developers/es/reference/online-payments/subscriptions/authorized-payment-search/get

Validación local: PostgreSQL aislado `qori_customer_qa`, proveedor simulado,
41 pruebas de renovación/pagos/planes y recorrido real de navegador a 1440, 390
y 320 píxeles para consultar y cancelar la autorización. Una prueba antigua de
referidos tiene cuatro fallos de acceso Admin que también se reproducen en el
commit anterior `cc3f4e5`; no se modificó la política administrativa.

La auditoría inicial de producción encontró siete órdenes de autorización
pendientes y ninguna acreditada en ese tipo de orden. Las pruebas simuladas no
certifican un débito bancario real: para certificarlo se requiere la autorización
del titular y un cobro aprobado por Mercado Pago, con una sola aplicación del periodo.

# Inscripción de tarjeta con renovación automática

## Cambio

Los planes mensuales usan Suscripciones de Mercado Pago por defecto, tanto en
el registro público como en la contratación desde Empresa. Antes de continuar
se informa el importe mensual y cómo desactivar futuros cobros desde Mi cuenta.
La orden conserva el consentimiento al aviso. Mercado Pago debe confirmar la
autorización y un pago aprobado debe confirmar cada periodo de acceso.

El mismo plan ya pagado programa el primer cobro para su vencimiento. Una cuenta
nueva, un plan vencido o un cambio de plan requiere el primer pago aprobado para
activar el plan solicitado. Se conserva el plan anterior durante la autorización.
PSE y saldo son una alternativa explícita de pago único sin tarjeta. Despega
continúa prepago. No se alteran autorizaciones de clientes existentes.

## Validación

- PostgreSQL aislado `127.0.0.1:55441/qori_customer_qa`; proveedor simulado.
- 84 pruebas funcionales en las suites de autorización, checkout público,
  activación, cambio de plan, conciliación, entrada al portal, referidos y prepago.
  La comprobación DOM final pasó 3/3 y la suite de autorización y recuperación
  pasó 21/21 después de los últimos ajustes.
- Autorizar sin pagar no da acceso ni tickets. Pago aprobado activa una sola vez.
- Inscripción predeterminada exige aceptar el aviso; el pago manual no ofrece
  tarjetas. Se mantienen importes canónicos de los planes y atribución comercial.
- Reintento con una clave de navegador distinta recupera la misma autorización.
- Los eventos de una autorización reemplazada no acreditan un pago.
- Cancelar conserva el periodo pagado. Recuperar una inscripción autorizada sin
  primer pago pide esperar confirmación y no crea otra orden.
- Navegador Chromium real: 1440, 390 y 320 px, sin desbordamiento horizontal y con
  controles accesibles. A 390 px se completaron registro, apertura de suscripción,
  verificación simulada y cancelación desde el perfil.
- Se corrigió la interferencia de avisos tardíos de módulos restringidos sobre
  las pantallas de facturación, perfil y administración de cuenta.
- Sintaxis JavaScript y `git diff --check` comprobados.

La cuenta de administrador de las pruebas de referidos usa la identidad de QA
autorizada; no se cambió la política de acceso administrativo de producción.
Estas pruebas no certifican un débito bancario real ni inscriben la tarjeta de
El Rey del Sabor. Un pago único anterior requiere autorización del titular.

## Contrato del proveedor

- [Suscripciones pendientes con checkout alojado](https://www.mercadopago.com.co/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments)
- [Crear una suscripción](https://www.mercadopago.com.co/developers/es/reference/online-payments/subscriptions/create-preapproval/post)

El despliegue se verifica aparte mediante `/api/version`, `/api/health` y los
archivos publicados de Empresa y Planes; un push por sí solo no lo confirma.

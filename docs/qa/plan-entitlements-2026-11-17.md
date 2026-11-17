# Auditoría de acceso por plan — 17 de noviembre de 2026

## Alcance y resultado

Se contrastó el catálogo público `/api/public/subscription-plans` con las funciones y límites efectivos de nuevas cuentas Despega, Crece, Escala y Expande. La inscripción real en QA permanece inactiva antes del pago; el finalizador de un pago aprobado activa exactamente el plan comprado. El proveedor de pagos se simula; no se realizan cobros ni inscripciones de producción.

La matriz HTTP comprueba 27 rutas por cada uno de los cuatro planes, además de escrituras excluidas, aislamiento entre negocios, intento de autoasignación de permisos y cambios de plan dentro de una misma sesión. Las suites de programas gratuitos cubren las cuatro inscripciones independientes, cinco productos, cupos de sellos y activaciones, cinco Gift Cards iniciales, recargas y aislamiento de módulos.

## Fallos corregidos

- La ruta antigua de campañas exigía solo acceso al portal: ahora exige campañas.
- El historial general de canjes estaba disponible sin el permiso correspondiente. Se mantiene la muestra limitada del acceso prepago legacy.
- Los pedidos de Gift Cards podían consultarse sin tener el módulo: sus rutas exigen Gift Cards.
- El dashboard aceptaba Despega aunque no incluye dashboard: ahora exige dashboard básico.
- El dashboard completo podía seguir saliendo de caché al cambiar de Expande a Crece. La caché ahora distingue código, funciones, límites y rol autorizados, y el navegador debe volver a consultar al servidor.
- Las consultas de lotes, historial y métricas QR no verificaban vigencia antes de la caché. Ahora comprueban acceso y funciones en cada solicitud. Despega sí incluye lotes QR.

## Validación

86 pruebas aprobadas, 0 fallidas, 0 omitidas, en PostgreSQL local `qori_customer_qa`:

- `planEntitlements.integration.test.js`
- `freePrograms.integration.test.js`
- `unRegaloPersonal.integration.test.js`
- `qoriPlanMatrix.test.js`
- `planCommercialLimits.test.js`
- `subscriptionPlanEnforcement.test.js`
- `publicPlanMercadoPagoCheckout.test.js`
- `portalSignupPaymentActivation.test.js`
- `catalogOrders.integration.test.js`

Las pruebas incluyen cuotas de afiliados y Gift Cards, control de inventario gratuito bajo concurrencia, tipos/cupos de activación, renovación de tickets y pedidos de catálogo. Se actualizaron dos pruebas antiguas para reconocer la cuenta de emisiones prepagadas y la consulta de sede permitida al programa de Gift Cards.

La evidencia automatizada cubre los escenarios enumerados; no constituye una revisión visual móvil ni una compra real en Mercado Pago. Global, contratos especiales y demos no son altas públicas ordinarias y no forman parte de la matriz de nuevas suscripciones pagadas.

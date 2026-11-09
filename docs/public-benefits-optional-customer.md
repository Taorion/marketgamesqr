# Beneficios públicos y Customer opcional

Actualización del 9 de noviembre de 2026. Sustituye la regla anterior que exigía una cuenta Customer para abrir o usar beneficios públicos.

- Tickets, giftcards, sellos, afiliaciones y actividades conservan sus páginas y QR. El destinatario no necesita una cuenta Customer. El negocio sigue validando la entrega.
- Customer se ofrece como una opción gratuita para guardar y encontrar beneficios y organizar las finanzas. El panel compartido tiene estilos aislados, adaptación móvil, enlace de regreso y copia del enlace completo, incluido el token de sellos.
- Los regalos emitidos tienen enlace `/regalo/:id`. Los enlaces antiguos `/customer/?gift=...` y las continuaciones públicas válidas abren el beneficio directamente. Las redirecciones externas o fuera de las rutas de beneficios se rechazan.
- Un regalo requiere emisión y venta pagada; su canje ya no depende de aceptar una invitación Customer. Se comprueba el correo del destinatario, incluso en cortesías que todavía no tienen un contacto asociado.
- Se mantienen vigencias, estados, condiciones del negocio, PIN de activación de giftcards, documento del titular de sellos, autorización del validador, inventario y canje único. El saldo y la venta no se duplican al canjear.
- Guardar en Customer conserva los controles de identidad, correo verificado, aceptación y pertenencia existentes. Los enlaces públicos no permiten acceder a datos financieros ni a cuentas privadas. Las actividades públicas requieren su token para completar una participación existente; conocer un correo o documento no permite recuperar su premio.
- Los textos de Empresa, Customer y los nuevos mensajes de entrega explican que Customer es opcional. Los mensajes ya enviados conservan sus enlaces funcionales.

## Verificación

Base local aislada `qori_customer_qa`, puerto 55441; sin escrituras ni correos de prueba en producción. Verificación final: **44 pruebas aprobadas**, con:

```powershell
node --test --test-concurrency=1 test/publicBenefits.integration.test.js test/publicBenefitInviteUI.test.js test/customerBenefitSession.integration.test.js test/customerBenefitReturnUI.test.js test/customerGiftJourneyUI.test.js test/customerCourtesy.integration.test.js test/qoriSellerLaunch.integration.test.js
```

Incluye regalos y cortesías canjeados sin Customer, inscripción/sellos/premio sin sesión, giftcard con PIN y vencimiento, actividades con token de sesión, protección de cuentas privadas, enlaces antiguos, saldos, inventario, comisiones e interfaz DOM. También se ejecutaron las pruebas de componentes `customerCourtesyUI.test.js` y `customerProductGiftUI.test.js`.

La revisión visual de escritorio/móvil no pudo realizarse: la herramienta devolvió `The browser access host is unavailable`. Las pruebas DOM no sustituyen una revisión visual.

La comprobación posterior al despliegue usa `scripts/verify-public-benefits-release.cjs <SHA>`: commit servido, salud, hashes de archivos, acceso público sin redirección a Customer, programa Alipunto, rutas privadas y ausencia de redirecciones externas. No efectúa canjes reales.

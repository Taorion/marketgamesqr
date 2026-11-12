# Enlaces de embajador y supervisión de Admin

## Recorrido del cliente

Seller comparte su enlace de planes (`/paquetes/?advisor=<id>`) o de Pensé en ti (`/pense-en-ti/?seller=<id>`). Ambas páginas reconocen los dos parámetros. La referencia se conserva por 30 días en el mismo navegador, se propaga entre las páginas de registro y se vuelve a validar con el servidor. Un enlace explícito nuevo reemplaza la referencia anterior; un enlace inválido bloquea el registro con ese embajador. El cliente puede elegir expresamente continuar sin embajador. Al completar el registro se elimina la referencia del navegador, porque la atribución ya reside en la cuenta y la orden.

El formulario de pago muestra el nombre del embajador y envía su identificador automáticamente. Un cambio de plan o escribir en el campo del nombre no pierde la referencia. No hay atribución entre navegadores o dispositivos sin abrir de nuevo el enlace. Si el navegador bloquea almacenamiento, el enlace abierto sigue funcionando, pero no se garantiza conservarlo después de abandonar la página.

El servidor valida el rol, la aprobación y la activación del embajador y rechaza autorreferencias por correo, documento o documento del negocio propio. La creación de la cuenta, la asignación de cartera, la orden y la auditoría se ejecutan en la misma transacción. Antes de aceptar el registro de pago, comprueba que el destinatario inmutable de la orden coincide con el embajador validado. La auditoría guarda el identificador real de la orden, no un valor nulo.

## Pago y comisiones

La cuenta comienza pendiente de pago. El enlace y el alta no acreditan comisiones. El finalizador verificado de Mercado Pago activa la suscripción y el mecanismo existente genera/libera las comisiones. Las notificaciones duplicadas no duplican el saldo. Las cuotas futuras de una anualidad siguen programadas; los reembolsos conservan el historial y generan los ajustes previstos por VF1.

Un negocio registrado gratis conserva su embajador para las órdenes de pago posteriores. Cada orden toma una copia del responsable al crearse. Cambiar el responsable después no altera esa orden ni sus comisiones; la reasignación afecta órdenes futuras. No se reparan ni atribuyen retrospectivamente órdenes históricas en esta entrega.

## Supervisión

En **Admin → Cuentas Qori → Supervisar embajadores**, solo Qori Superadmin puede consultar:

- Toda la cartera y las suscripciones, incluidos negocios sin responsable.
- Órdenes y pagos, con el embajador original y el responsable actual mostrados por separado.
- Comisiones programadas, pendientes, pagadas y anuladas, base, tasa, mes, orden y transferencia.
- Transferencias registradas y responsable que las registró.
- Historial de atribución y control, incluidos el motivo y los responsables anterior y nuevo.

Las vistas permiten filtrar, buscar y recorrer páginas de 30 registros; los totales corresponden a todos los registros filtrados, no solo a la página visible. El filtro de embajador sobre órdenes/comisiones se refiere a su destinatario histórico; en cartera se refiere al responsable actual.

**Gestionar atribución** exige un motivo y comprueba que el responsable no haya cambiado desde que se abrió la ficha. Solo superadmin puede reasignar, incluso si un vendedor recibe permisos adicionales. Se reutiliza la gestión existente de cartera: cambiar responsable cancela ofertas comerciales abiertas, mantiene órdenes/comisiones históricas y registra la auditoría. El acceso a expedientes y registro de transferencias permanece disponible desde la supervisión. Registrar una transferencia sigue exigiendo las validaciones documentales y bancarias existentes; la pantalla no envía dinero.

## Verificación

Pruebas nuevas: `sellerReferral.integration.test.js`, `sellerReferralUI.test.js`, `sellerSupervisionUI.test.js`. La integración utiliza exclusivamente PostgreSQL local `127.0.0.1:55441/qori_customer_qa` y Mercado Pago simulado. Comprueba registro real por API, orden, pago, comisión, saldo, conversión desde gratuito, repetición de pago, rollback ante error de proveedor, rechazo de enlaces inválidos y autorreferencias, alcance de permisos y reasignación con historia inmutable.

También se ejecutaron regresiones de comisiones VF1, Seller, activación y cierre administrativo. Las pruebas DOM verifican interacción, filtros, paginación, opt-out explícito, descarte de respuestas tras cerrar sesión y escape de HTML. No certifican diseño visual ni comportamiento en dispositivo físico: Computer Use detuvo la revisión al no poder determinar la URL actual del navegador con suficiente certeza.

No requiere migración nueva. Reutiliza las tablas, disparadores, permisos y políticas instalados. Esta documentación describe la implementación y sus pruebas locales; no demuestra por sí misma publicación ni una transacción productiva.

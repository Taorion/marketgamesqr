# Vitrina de puntos de afiliados

## Configuración del negocio

1. En **Vitrina web**, crea o edita la vitrina y selecciona **Canje por puntos de afiliados** en **Uso de esta vitrina**. El negocio necesita acceso a vitrinas y afiliados.
2. Publica los productos, sus fotos y el campo **Puntos necesarios para canjear una unidad**. Si se deja vacío, se toma el costo en puntos del producto de inventario vinculado. Sin costo positivo, el producto no puede canjearse.
3. Activa la vitrina. Los enlaces aparecen en el carné de ese negocio y en su afiliación dentro de Customer web.

## Canje del afiliado

El cliente elige productos y cantidades. El carrito muestra el total y el saldo restante. En el acceso público debe presentar el enlace/código privado del carné y su documento; el documento solo no autoriza gasto. Desde Customer se usa la sesión y la afiliación aceptada de esa cuenta. Siempre se exige que carné, productos y vitrina pertenezcan al mismo negocio.

Antes de emitir, el cliente revisa el resumen y acepta que presentará su documento físico. El servidor vuelve a comprobar precios, cantidades, disponibilidad y saldo. Una única transacción descuenta los puntos, consume **un ticket del negocio por QR** y reserva las unidades vinculadas a inventario. Los productos manuales no tienen una cantidad de inventario que reservar.

Si faltan puntos, inventario o tickets del negocio, no se emite el QR ni se descuenta nada. Los reintentos de una misma emisión recuperan el mismo ticket. No se registra una venta de dinero.

El QR incluye todos los productos del canje y se entrega completo, una sola vez. Puede descargarse, imprimirse o recuperarse desde el carné o Customer, incluso si se pausa la vitrina. Su enlace es privado.

## Entrega en el Validador

Al escanear, el Validador del mismo negocio muestra los nombres y cantidades originales, el total pagado en puntos y el titular. El operador debe escribir el documento físico presentado y marcar que lo verificó. El servidor exige coincidencia con el documento del ticket y bloquea una segunda redención. No se vuelven a cobrar puntos, tickets ni inventario al entregar.

Los tickets emitidos no tienen vencimiento automático. La anulación de un ticket no redimido devuelve una sola vez los puntos y el inventario reservado; el ticket del negocio usado para emitirlo sigue consumido.

## Instalación y comprobaciones

Antes de publicar el código se debe aplicar `20261118210632_affiliate_catalog_points.sql`, idéntica en `database/migrations` y `supabase/migrations`. Añade la instantánea del canje y la clave de emisión única, con RLS y sin permisos públicos directos. Los saldos siguen en los registros existentes de afiliados y créditos QR.

Implementación validada con PostgreSQL local `qori_customer_qa`, APIs HTTP y DOM real de los archivos mediante JSDOM. La suite `test/affiliateCatalog.integration.test.js` cubre publicación desde el formulario, compra múltiple, separación entre negocios, Customer, documento físico, concurrencia, saldo insuficiente, falta de créditos, inventario, recuperación, redención y anulación. Se ejecutan también las regresiones de domicilios, beneficiario, carrito del Validador y redención de puntos.

Resultado integrado: **52/52 pruebas correctas** en las seis suites indicadas, más comprobación de sintaxis JavaScript y migraciones idénticas. Evidencia local: `tmp/affiliate-points-integrated-final.log`. Durante la revisión ampliada, `validatorInventorySaleMovement.test.js` tiene una comprobación de marcador histórico `validator-inventory-sale-v513-20260928` que falla también en el código anterior al cambio; no se modificó ese test para ocultar el fallo.

El despliegue requiere verificar la migración y que `/api/version.render_git_commit` coincida con el commit publicado. La revisión visual en navegador y dispositivos queda pendiente porque la herramienta de navegador no estuvo conectada. JSDOM comprueba las interacciones, no el diseño visual.

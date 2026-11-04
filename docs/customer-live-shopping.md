# Modo mercando

En Mercado y hogar, prepara tu lista y activa Modo mercando. El presupuesto inicial queda conservado; cada producto admite marcar/desmarcar el carrito, cantidad real y precio real por unidad. El total visible se actualiza al escribir, con aviso de precios pendientes. El botón Producto extra lleva a la captura rápida; las incorporaciones durante la compra se identifican como adicionales.

Los cambios válidos se guardan automáticamente después de una breve pausa. La interfaz indica Guardando, Lista guardada o Sin guardar y permite reintentar. Las peticiones se serializan, mantienen la revisión y conservan la identidad de creación. No hay soporte sin conexión: espera Lista guardada antes de cerrar. La recuperación de una lista guardada conserva el carrito y su presupuesto inicial.

Terminar mercado guarda y muestra el resumen antes del pago: presupuesto inicial, total del carrito, diferencia para lo comprado, disponibilidad frente al presupuesto completo, artículos adicionales, importe de cantidades extra y pendientes. Lo no comprado no se considera ahorro. Los precios desconocidos impiden presentar una comparación completa. La compra puede terminar sin completar la lista.

El gasto solo se registra con la confirmación explícita de pago. Se mantiene el enlace a un gasto o venta canónica existente, evitando duplicarlo. Los pendientes pueden pasar a una nueva lista sin conservar la marca de extra de la compra anterior. Todo permanece en el bolsillo y moneda seleccionados.

La clasificación PLANNED/EXTRA se conserva en los artículos JSON existentes. Una vez comenzada la compra, el servidor preserva identidad, cantidad y precio presupuestados de los artículos originales; los nuevos son extras y no puede borrarse un artículo inicial para alterar la comparación. No requiere migración.

Validación: 27 pruebas de cálculo, DOM y API con PostgreSQL de QA aislado: guardado durante edición concurrente, recuperación, extras, cantidades parciales, protección del presupuesto, aislamiento, enlaces canónicos y confirmación idempotente. No hay verificación visual de escritorio ni móvil; la herramienta de navegador no estuvo disponible.

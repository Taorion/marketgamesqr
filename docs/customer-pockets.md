# Mis bolsillos

Qori Customer presenta sus contabilidades independientes como bolsillos. La pantalla #pockets muestra el dinero disponible y su estado por bolsillo: positivo, negativo, cero o saldo por definir, sin compensarlos en una cifra general. Desde cada tarjeta se abren las finanzas y la proyección de ese bolsillo. El consolidado permanece como una vista explícita en Mi patrimonio.

Se pueden crear bolsillos con nombres libres o sugeridos (Personal, Mi negocio, Casa, Familia, Hijo, Esposa, Ganado). El saldo inicial es opcional, permite negativos y se guarda junto con la fecha en la misma transacción de creación. Una solicitud repetida no crea un segundo bolsillo. Cambiar el nombre usa revisión y propiedad del registro, y no altera saldos.

El bolsillo activo permanece visible en el encabezado. Cambiarlo actualiza también la URL y conserva el alcance de las peticiones. Al cambiar desde una lista de mercado concreta, se abre el directorio del bolsillo elegido. Los formularios mantienen el contexto de bolsillo que recibieron.

Los traslados usan el mecanismo existente: bajan un saldo y suben otro sin generar ingresos o gastos. La pantalla explica que no se debe repetir el mismo saldo en dos bolsillos, y que un bolsillo con nombre familiar o empresarial sigue siendo una división privada de los registros del mismo usuario.

Validación: 33 pruebas distintas aprobadas entre las suites CustomerPocketsUI, CustomerFinanceBooksUI, CustomerFinanceBooks.integration y CustomerWealth.integration. Cubren negativos independientes de positivos, saldo desconocido, creación concurrente, validación de fechas, renombrado, navegación, solicitudes por bolsillo, movimientos, obligaciones, traslados, patrimonio y control de acceso. No hay migración nueva. La inspección visual en navegador continúa sin estar disponible por el fallo de la herramienta.

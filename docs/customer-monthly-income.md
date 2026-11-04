# Ingresos recurrentes y cierres mensuales

Customer permite declarar varias fuentes de ingreso por bolsillo: motivo, importe, frecuencia y primera fecha esperada. La base mensual suma las fuentes mensuales activas que ya comienzan este mes; las semanales, anuales y ocasionales conservan su calendario propio.

Declarar una fuente genera expectativas, no dinero disponible. Cada cobro se confirma con su importe y fecha reales. Un ingreso tardío cuenta en el mes de recepción. Corregirlo o anularlo recalcula los meses afectados y el arrastre posterior. La creación admite un request_id estable usando el identificador existente para evitar duplicados en reintentos; no requiere migración.

Ingresos y cierres muestra, por año y bolsillo, saldo inicial, ingresos recibidos, gastos pagados, resultado del mes, traslados netos y saldo final. Los negativos se conservan. Los traslados afectan el saldo pero no el resultado de ingresos menos gastos. No se suman monedas distintas. Antes del saldo inicial registrado el cierre aparece por definir; un saldo inicial a mitad de mes produce un período parcial.

Los indicadores describen los registros: meses con déficit, meses con saldo negativo y promedios de los últimos tres meses completos terminados disponibles en el año seleccionado. Excluyen el mes actual, períodos parciales y cierres sin saldo inicial. No son saldos bancarios verificados ni garantías de ingresos futuros.

Validación: 33 pruebas funcionales de ingresos, agenda, bolsillos y finanzas, con PostgreSQL de QA aislado. Cubren recepción tardía, negativos, corrección, anulación, concurrencia, aislamiento por usuario/bolsillo/moneda y formularios. Las comprobaciones DOM no sustituyen la revisión visual: la herramienta de navegador no permitió verificar escritorio ni móvil en esta sesión.

# Qori Customer: disponible, flujo y patrimonio

La pantalla Mi dinero abre con el saldo disponible registrado y advierte cuando es negativo. El flujo mensual muestra saldo inicial, entradas y salidas pagadas, traslados separados y saldo de cierre diario. Si el saldo inicial se configuró a mitad de mes, identifica el período parcial y conserva los movimientos anteriores en el historial.

Mi patrimonio consolida las contabilidades por moneda. Suma efectivo positivo y valoraciones de bienes, y resta capital pendiente de créditos (incluidos los archivados con saldo), cargos repartidos exigibles, compras Qori pendientes, otras cuentas por pagar y dinero negativo. Un saldo negativo se incluye una sola vez como pasivo. No suma intereses futuros ni compras planeadas al pasivo. No convierte monedas ni consulta bancos o tasaciones. Faltas de saldo inicial impiden presentar un total completo. Advierte sobre movimientos en monedas distintas de la contabilidad.

Las valoraciones tienen fecha, revisión y auditoría. Guardarlas o retirarlas no crea ingresos, gastos ni pagos. El comprador debe registrar cada saldo, bien y deuda una sola vez y añadir facturas exigibles no incluidas en otros módulos. Los pagos y anulaciones conservan las fuentes canónicas de movimientos.

Migración: 20261104202833_qori_customer_wealth. Dos tablas privadas con RLS y revocación de privilegios públicos; alcance de usuario y contabilidad validado en servidor. La API usa las sesiones Customer existentes.

Validación: 35 pruebas de interfaz y de integración sobre qori_customer_qa. Incluyen monedas, saldos negativos/desconocidos, traslados, capital pagado/anulado, deuda archivada, ventas Qori pendientes/pagadas/anuladas y recibos vinculados sin duplicación, revisiones, reintentos, aislamiento entre usuarios/contabilidades y denegación real de lectura/escritura a un rol sin privilegios. El asesor Supabase no terminó sobre el Postgres aislado por ausencia de los roles de Supabase; se comprobaron RLS, ACL y accesos denegados directamente. No se obtuvo revisión visual en navegador: la herramienta de inspección sigue fallando.

# Preparación inicial de Qori Customer

Al terminar nombre y documento, una cuenta nueva debe declarar y confirmar su saldo real actual antes de entrar al portal o usar beneficios. La pantalla admite importes positivos, cero y negativos. El campo comienza vacío; no existe una omisión implícita ni una opción para saltarlo.

La confirmación se persiste en el servidor. Cerrar sesión antes de terminar deja la preparación pendiente. Las siguientes visitas de una cuenta que ya terminó abren el portal; los enlaces de beneficios continúan después de confirmar. Las cuentas con nombre y documento completos al aplicar la migración conservan su acceso habitual mediante el estado LEGACY.

## Contabilidad y seguridad

- GET/POST /api/customer/finance-setup requieren sesión e identidad completas. El middleware bloquea el resto del portal mientras el estado sea PENDING, manteniendo identidad, sesiones, privacidad y recuperación opcional del registro.
- El saldo corresponde al bolsillo predeterminado Personal y a su moneda. No se acepta un identificador de cuenta o bolsillo enviado por el cliente.
- El importe confirmado es el dinero actual. El saldo de apertura del día se calcula restando el neto de movimientos pagados y traslados ya registrados ese día. Así no se contabiliza otra vez una compra recibida antes de preparar las finanzas.
- Se conservan movimientos anteriores. La apertura usa la fecha actual en la zona horaria de la cuenta. La confirmación no crea ingresos ni transferencias; el dinero se puede distribuir después entre cajas.
- El bloqueo de la cuenta y del bolsillo y la actualización transaccional evitan que guardados simultáneos o reintentos posteriores reinicien el saldo. El estado, fecha y detalles de cálculo quedan guardados juntos.
- Los importes admiten hasta diez dígitos enteros y dos decimales. Una fecha o moneda desactualizada exige actualizar la preparación.
- Las tablas conservan RLS y carecen de acceso directo de anon/authenticated. No se añade un segundo libro contable.

## Validación

Pruebas en PostgreSQL local aislado qori_customer_qa: acceso obligatorio, identidad previa, importes positivos/cero/negativos, entradas inválidas, rollback, concurrencia, reintentos después de gastar, movimientos del día, separación entre cuentas y conservación de cuentas existentes.

Pruebas DOM con la aplicación real: registro y confirmación, rutas directas, ausencia de navegación anticipada, entrada vacía, corrección, confirmación explícita, errores y reintentos, regreso al beneficio, sesión cambiada y siguientes visitas sin preparación. Regresión de cajas, billetera, ahorro, sesiones y autenticación.

La migración nueva se aplicó directamente en una transacción local; el historial completo de migraciones de la base de pruebas no está alineado con schema.sql y su reproducción detectó una restricción previa duplicada de trivias, ajena a este cambio. Producción usa su registro schema_migrations.

El host de acceso al navegador no estuvo disponible. No se atribuye a las pruebas DOM una validación visual o en dispositivo físico.

## Publicación

Migración 20261109005403_qori_customer_finance_preparation, idéntica en database/migrations y supabase/migrations. La publicación debe comprobar el SHA exacto de Render, salud, archivos web exactos, rechazo anónimo de la API y migración/columnas/RLS/permisos mediante consultas de solo lectura. No requiere crear usuarios de prueba en producción.

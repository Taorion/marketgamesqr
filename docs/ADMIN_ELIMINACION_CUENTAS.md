# Eliminar embajadores y negocios desde Admin

En **Cuentas Qori → Embajadores / Empresas y empresarios → Administrar → Eliminar**, el administrador debe escribir el correo del embajador o el nombre exacto del negocio, registrar un motivo de al menos diez caracteres y marcar la casilla de confirmación antes de pulsar **Sí, eliminar**. Cerrar o cancelar no modifica datos.

La confirmación tiene vigencia de diez minutos, está vinculada a la identidad administradora, al tipo e identificador de la cuenta y a su revisión. El servidor rechaza cambios concurrentes, confirmaciones reutilizadas, incompletas o destinadas a otra cuenta. La baja de Equipo de ventas usa el mismo control.

La eliminación es lógica: retira la cuenta del listado habitual, bloquea el acceso correspondiente, invalida sesiones anteriores y registra el motivo y el actor en `qori_commercial_audit`. Conserva documentos, ventas canónicas, pagos, saldos, cartera y comisiones. No borra registros contables ni crea pagos o reembolsos.

- Embajador: marca `qori_sales_profiles.archived_at`, retira Seller, invalida enlaces pendientes y preserva cualquier rol empresarial independiente. Las bajas pueden consultarse desde Equipo y permisos → Dados de baja.
- Negocio: marca `businesses.archived_at`, deshabilita el negocio e invalida sesiones de sus usuarios. Se conserva cualquier rol Seller independiente. El trigger `keep_archived_business_inactive` evita que un abono tardío reactive el negocio; el abono y su historial pueden registrarse normalmente.
- Las dos identidades administradoras y los negocios que contienen una cuenta administradora están protegidos. Las renovaciones automáticas deben cancelarse antes de eliminar el negocio.

La migración se ejecuta mediante el arranque habitual de Render. Pruebas con base aislada `qori_customer_qa`: autorización, reconfirmación, concurrencia, protección de administradores, revocación, conservación financiera, callbacks y formularios DOM. Ninguna prueba elimina cuentas de producción.

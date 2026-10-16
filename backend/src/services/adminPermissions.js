const { forbidden } = require('../utils/http');

const PERMISSIONS = {
  'prospects.manage': 'Registrar y actualizar prospectos',
  'enrollments.create': 'Inscribir negocios en Descubre',
  'offers.manage': 'Preparar, cancelar y aplicar ofertas autorizadas',
  'team.view': 'Consultar el equipo de ventas',
  'team.create': 'Crear vendedores y habilitar usuarios existentes',
  'team.edit': 'Editar vendedores y restablecer sus contraseñas',
  'team.remove': 'Suspender o dar de baja vendedores',
  'policies.manage': 'Autorizar descuentos, muestras, módulos y cupos',
  'offers.approve': 'Aprobar o rechazar excepciones comerciales',
  'customers.manage': 'Gestionar clientes, responsables y beneficios',
  'portfolio.all': 'Consultar y trabajar con la cartera de todo el equipo',
  'audit.view': 'Consultar el historial de gestión de todo el equipo',
};
const DEFAULT_PERMISSIONS = ['prospects.manage', 'enrollments.create', 'offers.manage'];
function permissionsFor(user) {
  if (user?.role === 'QORI_SUPERADMIN') return Object.keys(PERMISSIONS);
  if (user?.role !== 'QORI_SELLER') return [];
  return Array.isArray(user.admin_permissions) ? user.admin_permissions.filter(p => Object.hasOwn(PERMISSIONS, p)) : [...DEFAULT_PERMISSIONS];
}
const hasPermission = (user, permission) => permissionsFor(user).includes(permission);
function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) throw forbidden('No tienes permiso para esta acción. Solicítalo al superadministrador.');
}
const canSeeTeam = user => ['team.view','team.create','team.edit','team.remove','policies.manage','customers.manage','portfolio.all'].some(p => hasPermission(user,p));
// A delegated staff manager must never reset credentials or revive a privileged account.
function hasPrivilegedAccess(account) {
  return account.role === 'QORI_SUPERADMIN' || account.platform_role === 'QORI_SUPERADMIN'
    || (account.admin_permissions || []).some(p => !DEFAULT_PERMISSIONS.includes(p));
}
module.exports = { PERMISSIONS, DEFAULT_PERMISSIONS, permissionsFor, hasPermission, requirePermission, canSeeTeam, hasPrivilegedAccess };

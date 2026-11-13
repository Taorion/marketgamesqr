const {forbidden}=require('../utils/http');

// Identity is read from app_users on every authenticated request, never from JWT claims.
const ADMIN_EMAILS=Object.freeze(['cbotero@gosqori.com','scasallas@gosqori.com']);
const ADMIN_ROLES=Object.freeze(['ADMIN','ADMIN_MARKET_GAMES','QORI_SUPERADMIN']);
const isAdminEmail=email=>ADMIN_EMAILS.includes(String(email||'').trim().toLowerCase());
const hasAdministrativeRole=user=>Boolean(user&&(ADMIN_ROLES.includes(user.role)||ADMIN_ROLES.includes(user.platform_role)));
const canAccessAdmin=user=>Boolean(user&&user.is_active!==false&&!user.demo_mode&&isAdminEmail(user.email)&&hasAdministrativeRole(user));
function requireAdminAccess(user){if(!canAccessAdmin(user))throw forbidden('Admin está reservado a las dos cuentas autorizadas de Qori. Los embajadores deben ingresar al Portal de embajadores.');}
function enforceAdministrativeIdentity(user){if(hasAdministrativeRole(user))requireAdminAccess(user);}
module.exports={ADMIN_EMAILS,isAdminEmail,hasAdministrativeRole,canAccessAdmin,requireAdminAccess,enforceAdministrativeIdentity};

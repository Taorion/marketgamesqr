const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { env } = require("../config/env");
const { unauthorized, forbidden } = require("../utils/http");

async function authRequired(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw unauthorized("Missing bearer token.");
    }

    const payload = jwt.verify(token, env.jwtSecret);
    if (env.enforceSessionVersion && payload.session_version !== env.appSessionVersion) {
      throw unauthorized("El portal fue actualizado. Inicia sesion de nuevo para cargar la version vigente.");
    }

    const result = await query(
      `select u.id, u.business_id, u.email, u.full_name, u.role, u.is_active, u.password_version,
              u.can_redeem_cross_business, u.branch_id,
              b.is_active as business_is_active
       from app_users u
       left join businesses b on b.id = u.business_id
       where u.id = $1`,
      [payload.sub]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw unauthorized("User is inactive or does not exist.");
    }
    if (Number(payload.password_version || 0) !== Number(user.password_version || 0)) {
      throw unauthorized("Tu contraseña cambió. Inicia sesión de nuevo en este dispositivo.");
    }
    if (!["ADMIN", "ADMIN_MARKET_GAMES"].includes(user.role) && user.business_id && !user.business_is_active) {
      throw forbidden("El negocio asignado a este usuario no esta activo.");
    }

    delete user.business_is_active;
    req.user = user;
    next();
  } catch (error) {
    next(error.status ? error : unauthorized("Invalid or expired token."));
  }
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden("This role cannot perform this action."));
    }
    next();
  };
}

function canAccessBusiness(user, businessId) {
  if (!user) {
    return false;
  }
  if (user.role === "ADMIN" || user.role === "ADMIN_MARKET_GAMES") {
    return true;
  }
  if (user.can_redeem_cross_business) {
    return true;
  }
  return user.business_id === businessId;
}

module.exports = { authRequired, requireRoles, canAccessBusiness };

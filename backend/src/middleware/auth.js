const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { env } = require("../config/env");
const { unauthorized, forbidden } = require("../utils/http");

const PORTAL_WEB_ACCESS_COOKIE = "qori_portal_access";

function businessSellerSelfServiceAllowed(req) {
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  if (req.method === "GET" && ["/api/auth/me", "/api/business/sellers/me"].includes(path)) return true;
  if (req.method === "PATCH" && path === "/api/business/sellers/me/profile") return true;
  if (req.method === "POST" && path === "/api/auth/password/change") return true;
  return false;
}

async function authenticatedUserFromToken(token) {
  if (!token) throw unauthorized("Missing access token.");
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
  return user;
}

function requestCookie(req, name) {
  const header = String(req.headers.cookie || "");
  const entry = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!entry) return "";
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return "";
  }
}

async function authRequired(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw unauthorized("Missing bearer token.");
    const user = await authenticatedUserFromToken(token);
    req.user = user;
    if (user.role === "BUSINESS_SELLER" && !businessSellerSelfServiceAllowed(req)) {
      throw forbidden("Tu cuenta de vendedor solo puede acceder a Mi desempeno y a tu perfil personal.");
    }
    next();
  } catch (error) {
    next(error.status ? error : unauthorized("Invalid or expired token."));
  }
}

async function portalWebAccessRequired(req, res, next) {
  try {
    req.user = await authenticatedUserFromToken(requestCookie(req, PORTAL_WEB_ACCESS_COOKIE));
    res.locals.qoriPortalProtectedAsset = true;
    return next();
  } catch (_error) {
    const requestPath = String(req.originalUrl || req.url || "/");
    const pathname = requestPath.split("?")[0];
    const isDocumentRequest = pathname.endsWith("/") || !/\.[a-z0-9]+$/i.test(pathname) || /\.html$/i.test(pathname);
    res.set("Cache-Control", "private, no-store, max-age=0");
    if (isDocumentRequest) {
      return res.redirect(302, `/empresa/?continue=${encodeURIComponent(requestPath)}`);
    }
    return res.status(401).type("text/plain").send("Inicia sesión en Cuenta Qori para acceder a este material.");
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

function blockBusinessSeller(req, _res, next) {
  if (req.user?.role === "BUSINESS_SELLER") {
    return next(forbidden("Tu cuenta de vendedor solo puede acceder a Mi desempeno y a tu perfil personal."));
  }
  next();
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

module.exports = {
  authRequired,
  portalWebAccessRequired,
  requireRoles,
  blockBusinessSeller,
  canAccessBusiness,
  businessSellerSelfServiceAllowed,
};

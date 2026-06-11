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
    const result = await query(
      `select id, business_id, email, full_name, role, is_active, can_redeem_cross_business, branch_id
       from app_users
       where id = $1`,
      [payload.sub]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw unauthorized("User is inactive or does not exist.");
    }

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

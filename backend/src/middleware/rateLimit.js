const { tooManyRequests } = require("../utils/http");

const buckets = new Map();

function clientKey(req, keyPrefix) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return `${keyPrefix}:${forwardedFor || req.ip || req.socket?.remoteAddress || "unknown"}`;
}

function rateLimit({ windowMs = 60_000, max = 30, keyPrefix = "default", message } = {}) {
  return (req, _res, next) => {
    const now = Date.now();
    const key = clientKey(req, keyPrefix);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      return next(tooManyRequests(message || "Demasiados intentos. Espera un momento y vuelve a intentar."));
    }

    return next();
  };
}

module.exports = { rateLimit };

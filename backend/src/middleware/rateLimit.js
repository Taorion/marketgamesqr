const { tooManyRequests } = require("../utils/http");
const { createHash } = require('node:crypto');

const buckets = new Map();

function clientKey(req, keyPrefix) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return `${keyPrefix}:${forwardedFor || req.ip || req.socket?.remoteAddress || "unknown"}`;
}

let nextSweep = 0;
function rateLimit({ windowMs = 60_000, max = 30, keyPrefix = "default", message, keyFromRequest } = {}) {
  return (req, _res, next) => {
    const now = Date.now();
    if(now>=nextSweep){for(const [key,bucket] of buckets)if(bucket.resetAt<=now)buckets.delete(key);nextSweep=now+60000;}
    const key = keyFromRequest ? `${keyPrefix}:${keyFromRequest(req)}` : clientKey(req, keyPrefix);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      if(!current&&buckets.size>=100000)return next(tooManyRequests('Demasiados intentos. Vuelve a intentar en unos minutos.'));
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

// A caller cannot evade this credential limit by changing a forwarded IP header.
function emailRateLimit(options={}) {
  return rateLimit({...options,keyFromRequest:req=>createHash('sha256').update(String(req.body?.email||'').trim().toLowerCase().slice(0,180)).digest('hex')});
}
module.exports = { rateLimit, emailRateLimit };

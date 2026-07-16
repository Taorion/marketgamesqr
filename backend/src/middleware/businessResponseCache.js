const DEFAULT_TTL_MS = 120_000;
const DEFAULT_MAX_BYTES = 768 * 1024;
const MAX_ENTRIES = 500;

const responseCache = new Map();
const businessKeys = new Map();

function now() {
  return Date.now();
}

function normalizeBusinessId(value) {
  return value ? String(value) : "";
}

function defaultBusinessId(req) {
  return normalizeBusinessId(req.user?.business_id || req.params?.businessId || req.params?.id);
}

function cacheScope(req, businessId, includeUser) {
  const userPart = includeUser ? `:user:${req.user?.id || "anon"}` : "";
  return `business:${businessId}${userPart}`;
}

function cacheKey(req, scope, prefix) {
  return `${scope}:${prefix}:${req.method}:${req.originalUrl || req.url}`;
}

function trackBusinessKey(scope, key) {
  if (!businessKeys.has(scope)) businessKeys.set(scope, new Set());
  businessKeys.get(scope).add(key);
}

function removeOldestEntry() {
  const oldestKey = responseCache.keys().next().value;
  if (!oldestKey) return;
  responseCache.delete(oldestKey);
  businessKeys.forEach((keys, scope) => {
    keys.delete(oldestKey);
    if (!keys.size) businessKeys.delete(scope);
  });
}

function setCacheEntry(scope, key, value, ttlMs) {
  while (responseCache.size >= MAX_ENTRIES) removeOldestEntry();
  responseCache.set(key, {
    expiresAt: now() + ttlMs,
    value,
  });
  trackBusinessKey(scope, key);
}

function getCacheEntry(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now()) {
    responseCache.delete(key);
    return null;
  }
  responseCache.delete(key);
  responseCache.set(key, cached);
  return cached.value;
}

function clearBusinessResponseCache(businessId) {
  const businessPrefix = `business:${normalizeBusinessId(businessId)}`;
  Array.from(businessKeys.keys()).forEach((scope) => {
    if (!scope.startsWith(businessPrefix)) return;
    const keys = businessKeys.get(scope) || new Set();
    keys.forEach((key) => responseCache.delete(key));
    businessKeys.delete(scope);
  });
}

function shouldBypassCache(req) {
  if (req.method !== "GET") return true;
  const cacheControl = String(req.headers["cache-control"] || "").toLowerCase();
  if (cacheControl.includes("no-cache") || cacheControl.includes("no-store")) return true;
  if (req.query?.fresh === "1" || req.query?.cache === "off") return true;
  return false;
}

function cacheBusinessResponse({
  ttlMs = DEFAULT_TTL_MS,
  maxBytes = DEFAULT_MAX_BYTES,
  keyPrefix = "read",
  includeUser = false,
  businessIdFromReq = defaultBusinessId,
} = {}) {
  return (req, res, next) => {
    if (shouldBypassCache(req)) return next();
    const businessId = normalizeBusinessId(businessIdFromReq(req));
    if (!businessId) return next();

    const scope = cacheScope(req, businessId, includeUser);
    const key = cacheKey(req, scope, keyPrefix);
    const cached = getCacheEntry(key);
    if (cached) {
      res.vary("Authorization");
      res.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
      res.set("X-Portal-Cache", "HIT");
      return res.status(cached.statusCode || 200).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let byteLength = 0;
        try {
          byteLength = Buffer.byteLength(JSON.stringify(body), "utf8");
        } catch {
          byteLength = maxBytes + 1;
        }
        if (byteLength <= maxBytes) {
          setCacheEntry(scope, key, { statusCode: res.statusCode, body }, ttlMs);
          res.vary("Authorization");
          res.set("X-Portal-Cache", "MISS");
          res.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
        } else {
          res.set("X-Portal-Cache", "SKIP-LARGE");
        }
      }
      return originalJson(body);
    };

    return next();
  };
}

function invalidateBusinessResponseCache({ businessIdFromReq = defaultBusinessId } = {}) {
  return (req, _res, next) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      clearBusinessResponseCache(businessIdFromReq(req));
    }
    next();
  };
}

module.exports = {
  cacheBusinessResponse,
  clearBusinessResponseCache,
  invalidateBusinessResponseCache,
};

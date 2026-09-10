const OFFICIAL_QORI_ORIGIN = "https://gosqori.com";
const LOCAL_PUBLIC_ORIGIN = "http://localhost:3000";
const LEGACY_PUBLIC_HOSTS = new Set([
  "marketgamesqr.com",
  "www.marketgamesqr.com",
  "market-games-portal.onrender.com",
]);
const QORI_ALIAS_HOSTS = new Set(["gosqori.com", "www.gosqori.com"]);

function cleanOrigin(value, fallback = OFFICIAL_QORI_ORIGIN) {
  try {
    const parsed = new URL(String(value || fallback));
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
}

function isLegacyPublicHost(value) {
  try {
    return LEGACY_PUBLIC_HOSTS.has(new URL(String(value || "")).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function resolvePublicAppUrl({ isProduction = false, configuredPublicAppUrl = "" } = {}) {
  const configured = String(configuredPublicAppUrl || "").trim();
  if (!isProduction) return cleanOrigin(configured || LOCAL_PUBLIC_ORIGIN, LOCAL_PUBLIC_ORIGIN);
  if (!configured || isLegacyPublicHost(configured)) return OFFICIAL_QORI_ORIGIN;
  try {
    if (QORI_ALIAS_HOSTS.has(new URL(configured).hostname.toLowerCase())) return OFFICIAL_QORI_ORIGIN;
  } catch {
    return OFFICIAL_QORI_ORIGIN;
  }
  return cleanOrigin(configured, OFFICIAL_QORI_ORIGIN);
}

function canonicalizePublicUrl(value, baseUrl = OFFICIAL_QORI_ORIGIN) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, `${cleanOrigin(baseUrl)}/`);
    if (LEGACY_PUBLIC_HOSTS.has(parsed.hostname.toLowerCase()) || parsed.hostname.toLowerCase() === "www.gosqori.com") {
      const official = new URL(OFFICIAL_QORI_ORIGIN);
      parsed.protocol = official.protocol;
      parsed.host = official.host;
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function canonicalizePublicUrlsInText(value) {
  return String(value || "")
    .replace(/https?:\/\/(?:www\.)?marketgamesqr\.com(?=\/|\b)/gi, OFFICIAL_QORI_ORIGIN)
    .replace(/https?:\/\/market-games-portal\.onrender\.com(?=\/|\b)/gi, OFFICIAL_QORI_ORIGIN);
}

module.exports = {
  OFFICIAL_QORI_ORIGIN,
  canonicalizePublicUrl,
  canonicalizePublicUrlsInText,
  isLegacyPublicHost,
  resolvePublicAppUrl,
};

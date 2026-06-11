const crypto = require("crypto");

function createSecureToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function normalizeToken(input) {
  const value = String(input || "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    return parsed.searchParams.get("token") || parsed.pathname.split("/").filter(Boolean).pop() || value;
  } catch {
    return value;
  }
}

module.exports = { createSecureToken, normalizeToken };

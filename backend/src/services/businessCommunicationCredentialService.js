const crypto = require("crypto");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { query } = require("../config/db");

const CIPHER_VERSION = "v1";

function credentialKey() {
  if (!env.jwtSecret || env.jwtSecret === "dev-only-change-me") {
    throw badRequest("No se puede proteger la conexión de correo hasta que el servidor tenga un JWT_SECRET seguro.");
  }
  return crypto.createHash("sha256").update(`qori-business-email-credential:${env.jwtSecret}`).digest();
}

function encryptCredential(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", credentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value || ""), "utf8"), cipher.final()]);
  return [CIPHER_VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptCredential(value) {
  const [version, ivValue, tagValue, encryptedValue] = String(value || "").split(".");
  if (version !== CIPHER_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw badRequest("La conexión de Resend guardada no es válida. Vuelve a conectar tu cuenta.");
  }
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(ivValue, "base64"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw badRequest("No se pudo abrir la conexión de Resend. Vuelve a guardar tu clave de envío.");
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function emailConnectionForBusiness(businessId) {
  const result = await query("select id, name, settings from businesses where id = $1 and is_active = true", [businessId]);
  const business = result.rows[0];
  if (!business) throw notFound("Empresa no encontrada.");
  const settings = business.settings || {};
  return {
    business,
    sender_name: String(settings.communication_sender_name || business.name || "").trim(),
    sender_email: normalizeEmail(settings.communication_sender_email),
    has_own_resend_key: Boolean(settings.communication_resend_api_key_ciphertext),
  };
}

async function getEmailConnectionStatus(businessId) {
  const connection = await emailConnectionForBusiness(businessId);
  return {
    provider: "RESEND",
    sender_name: connection.sender_name,
    sender_email: connection.sender_email,
    api_key_configured: connection.has_own_resend_key,
    ready: Boolean(connection.sender_email && connection.has_own_resend_key),
  };
}

async function saveEmailConnection(businessId, payload) {
  const connection = await emailConnectionForBusiness(businessId);
  const patch = {
    communication_sender_name: String(payload.sender_name || connection.sender_name || connection.business.name || "").trim() || null,
    communication_sender_email: normalizeEmail(payload.sender_email),
  };
  if (payload.remove_api_key) {
    patch.communication_resend_api_key_ciphertext = null;
  } else if (payload.resend_api_key) {
    patch.communication_resend_api_key_ciphertext = encryptCredential(payload.resend_api_key.trim());
  }
  const updated = await query(
    `update businesses
       set settings = jsonb_strip_nulls(coalesce(settings, '{}'::jsonb) || $2::jsonb), updated_at = now()
     where id = $1 and is_active = true
     returning id`,
    [businessId, JSON.stringify(patch)]
  );
  if (!updated.rowCount) throw notFound("Empresa no encontrada.");
  return getEmailConnectionStatus(businessId);
}

async function ownResendApiKey(businessId) {
  const connection = await emailConnectionForBusiness(businessId);
  const ciphertext = connection.business.settings?.communication_resend_api_key_ciphertext;
  return ciphertext ? decryptCredential(ciphertext) : "";
}

module.exports = { getEmailConnectionStatus, ownResendApiKey, saveEmailConnection };

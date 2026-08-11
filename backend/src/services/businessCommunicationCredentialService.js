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
    throw badRequest("La credencial de envío guardada no es válida. Vuelve a conectar la cuenta.");
  }
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(ivValue, "base64"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw badRequest("No se pudo abrir la credencial de envío. Vuelve a guardar la conexión.");
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

function normalizedIdentifier(value) {
  return String(value || "").trim().replace(/[^0-9]/g, "");
}

function whatsAppWebhookVerifyToken() {
  if (env.whatsappWebhookVerifyToken) return env.whatsappWebhookVerifyToken;
  return `qori_${crypto.createHash("sha256").update(`whatsapp-webhook:${env.jwtSecret}`).digest("hex").slice(0, 40)}`;
}

async function whatsAppConnectionForBusiness(businessId) {
  const result = await query("select id, name, settings from businesses where id = $1 and is_active = true", [businessId]);
  const business = result.rows[0];
  if (!business) throw notFound("Empresa no encontrada.");
  const settings = business.settings || {};
  return {
    business,
    business_account_id: normalizedIdentifier(settings.communication_whatsapp_business_account_id),
    phone_number_id: normalizedIdentifier(settings.communication_whatsapp_phone_number_id),
    has_access_token: Boolean(settings.communication_whatsapp_access_token_ciphertext),
  };
}

async function getWhatsAppConnectionStatus(businessId) {
  const connection = await whatsAppConnectionForBusiness(businessId);
  return {
    provider: "WHATSAPP_CLOUD_API",
    business_account_id: connection.business_account_id,
    phone_number_id: connection.phone_number_id,
    access_token_configured: connection.has_access_token,
    ready: Boolean(connection.business_account_id && connection.phone_number_id && connection.has_access_token),
    webhook_callback_url: `${String(env.publicAppUrl || "").replace(/\/$/, "")}/api/webhooks/whatsapp`,
    webhook_verify_token: whatsAppWebhookVerifyToken(),
    webhook_signature_ready: Boolean(env.whatsappAppSecret),
  };
}

async function saveWhatsAppConnection(businessId, payload) {
  const connection = await whatsAppConnectionForBusiness(businessId);
  const patch = {
    communication_whatsapp_business_account_id: normalizedIdentifier(payload.business_account_id || connection.business_account_id) || null,
    communication_whatsapp_phone_number_id: normalizedIdentifier(payload.phone_number_id || connection.phone_number_id) || null,
  };
  if (payload.remove_access_token) {
    patch.communication_whatsapp_access_token_ciphertext = null;
  } else if (payload.access_token) {
    patch.communication_whatsapp_access_token_ciphertext = encryptCredential(payload.access_token.trim());
  }
  const updated = await query(
    `update businesses
       set settings = jsonb_strip_nulls(coalesce(settings, '{}'::jsonb) || $2::jsonb), updated_at = now()
     where id = $1 and is_active = true
     returning id`,
    [businessId, JSON.stringify(patch)]
  );
  if (!updated.rowCount) throw notFound("Empresa no encontrada.");
  return getWhatsAppConnectionStatus(businessId);
}

async function ownWhatsAppAccessToken(businessId) {
  const connection = await whatsAppConnectionForBusiness(businessId);
  const ciphertext = connection.business.settings?.communication_whatsapp_access_token_ciphertext;
  return ciphertext ? decryptCredential(ciphertext) : "";
}

module.exports = {
  getEmailConnectionStatus,
  getWhatsAppConnectionStatus,
  ownResendApiKey,
  ownWhatsAppAccessToken,
  saveEmailConnection,
  saveWhatsAppConnection,
  whatsAppWebhookVerifyToken,
};

const crypto = require("crypto");
const { env } = require("../config/env");
const { query } = require("../config/db");
const { forbidden } = require("../utils/http");
const { whatsAppWebhookVerifyToken } = require("./businessCommunicationCredentialService");

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyWhatsAppWebhookSignature(req) {
  if (!env.whatsappAppSecret) {
    const error = new Error("Falta configurar WHATSAPP_APP_SECRET en Render antes de activar los webhooks de WhatsApp.");
    error.status = 503;
    throw error;
  }
  const signature = String(req.get("x-hub-signature-256") || "");
  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
  const expected = `sha256=${crypto.createHmac("sha256", env.whatsappAppSecret).update(rawBody).digest("hex")}`;
  if (!safeEqual(signature, expected)) throw forbidden("Firma de webhook de WhatsApp inválida.");
}

async function businessIdForPhoneNumber(phoneNumberId) {
  if (!phoneNumberId) return null;
  const result = await query(
    `select id from businesses
      where is_active = true and settings->>'communication_whatsapp_phone_number_id' = $1
      limit 1`,
    [String(phoneNumberId)]
  );
  return result.rows[0]?.id || null;
}

async function recordStatus(businessId, status) {
  const messageId = String(status?.id || "").trim();
  if (!messageId) return;
  const statusName = String(status?.status || "").toUpperCase();
  const failed = statusName === "FAILED";
  const error = Array.isArray(status?.errors) ? status.errors.map((item) => item?.title || item?.message || item?.code).filter(Boolean).join(" · ").slice(0, 600) : null;
  await query(
    `update business_communication_recipients
        set status = case when $3 then 'FAILED' else status end,
            error_message = case when $3 then $4 else error_message end,
            metadata = coalesce(metadata, '{}'::jsonb) || $5::jsonb,
            updated_at = now()
      where business_id = $1 and provider_message_id = $2 and metadata->>'channel' = 'WHATSAPP'`,
    [businessId, messageId, failed, error, JSON.stringify({ delivery_status: statusName || "UNKNOWN", delivery_updated_at: new Date().toISOString(), whatsapp_conversation_id: status?.conversation?.id || null, whatsapp_pricing_category: status?.pricing?.category || null })]
  );
}

async function recordInboundMessage(businessId, value, message) {
  const from = String(message?.from || "").replace(/\D/g, "");
  const body = String(message?.text?.body || message?.button?.text || message?.interactive?.button_reply?.title || "").trim();
  if (!from || !body) return;
  const contact = await query(
    `select id from players
      where business_id = $1 and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') in ($2, regexp_replace($2, '^57', ''))
      limit 1`,
    [businessId, from]
  );
  const player = contact.rows[0];
  await query(
    `insert into lead_communications (business_id, lead_id, source_type, source_id, type, channel, subject, message, status, metadata)
     values ($1,$2,$3,$4,'WHATSAPP_INBOUND','whatsapp','Mensaje entrante de WhatsApp',$5,'opened',$6::jsonb)`,
    [businessId, player?.id || null, player ? "PLAYER" : "WHATSAPP", player?.id || null, body, JSON.stringify({ whatsapp_message_id: message?.id || null, from, phone_number_id: value?.metadata?.phone_number_id || null, profile_name: value?.contacts?.[0]?.profile?.name || null })]
  );
}

async function processWhatsAppWebhook(payload) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  let processed = 0;
  for (const entry of entries) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== "messages") continue;
      const value = change.value || {};
      const businessId = await businessIdForPhoneNumber(value?.metadata?.phone_number_id);
      if (!businessId) continue;
      for (const status of Array.isArray(value.statuses) ? value.statuses : []) { await recordStatus(businessId, status); processed += 1; }
      for (const message of Array.isArray(value.messages) ? value.messages : []) { await recordInboundMessage(businessId, value, message); processed += 1; }
    }
  }
  return { processed };
}

module.exports = { processWhatsAppWebhook, verifyWhatsAppWebhookSignature, whatsAppWebhookVerifyToken };

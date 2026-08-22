const { query } = require("../config/db");
const { notFound } = require("../utils/http");

async function preferenceByToken(token) {
  const result = await query(
    `select p.id, p.business_id, p.recipient_email, p.unsubscribed_at, b.name as business_name
     from business_communication_email_preferences p
     join businesses b on b.id = p.business_id
     where p.unsubscribe_token = $1`,
    [token]
  );
  if (!result.rowCount) throw notFound("Este enlace para administrar comunicaciones no es válido.");
  return result.rows[0];
}

async function unsubscribeCommunicationEmail(token, reason = "RECIPIENT_REQUEST") {
  const current = await preferenceByToken(token);
  if (current.unsubscribed_at) return { ...current, already_unsubscribed: true };
  const result = await query(
    `update business_communication_email_preferences
     set unsubscribed_at = now(), unsubscribe_reason = $2, updated_at = now()
     where id = $1
     returning recipient_email, unsubscribed_at`,
    [current.id, String(reason || "RECIPIENT_REQUEST").slice(0, 120)]
  );
  return { ...current, ...result.rows[0], already_unsubscribed: false };
}

module.exports = { preferenceByToken, unsubscribeCommunicationEmail };

const { query } = require("../config/db");
const { badRequest, notFound } = require("../utils/http");
const { listLeadCrmRows } = require("./leadCrmService");
const { sendBusinessCommunicationEmail } = require("./businessCommunicationMailService");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function personalize(value, contact) {
  const firstName = contact.first_name || String(contact.name || "").trim().split(/\s+/)[0] || "";
  return String(value || "")
    .replace(/{{\s*nombre\s*}}/gi, firstName)
    .replace(/{{\s*contacto\s*}}/gi, contact.name || firstName)
    .replace(/{{\s*interes\s*}}/gi, contact.top_interest || "nuestra oferta");
}

function normalizeMediaAssets(communication) {
  const saved = Array.isArray(communication?.metadata?.media_assets) ? communication.metadata.media_assets : [];
  const unique = [];
  const seen = new Set();
  [...saved, communication?.image_url ? { source: communication.image_url } : null].filter(Boolean).forEach((asset) => {
    const source = String(asset?.source || "").trim();
    if (!source || seen.has(source)) return;
    seen.add(source);
    unique.push({ source, name: String(asset?.name || "").trim(), type: String(asset?.type || "").trim() });
  });
  return unique.slice(0, 3);
}

function imageExtension(type = "") {
  return ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[type] || "png");
}

function makeEmailAttachments(assets = []) {
  return assets.map((asset, index) => {
    const cid = index === 0 ? "communication-image" : undefined;
    const source = String(asset.source || "");
    const match = source.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([a-z0-9+/=\s]+)$/i);
    const filename = asset.name || `comunicacion-${index + 1}.${imageExtension(match?.[1] || asset.type)}`;
    if (match) return { content: match[2].replace(/\s/g, ""), filename, content_id: cid, content_type: match[1] };
    return { path: source, filename, ...(cid ? { content_id: cid } : {}) };
  });
}

function buildEmailMarkup({ title, body, hasInlineImage, actionUrl }) {
  const image = hasInlineImage ? `<img src="cid:communication-image" alt="${escapeHtml(title)}" style="display:block;width:100%;max-width:560px;border-radius:18px;margin:0 auto 24px;" />` : "";
  const action = actionUrl ? `<p style="margin:28px 0 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0759d6;color:#fff;padding:13px 20px;border-radius:12px;text-decoration:none;font-weight:700">Ver información</a></p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f9fc;color:#052a6b;font-family:Arial,sans-serif"><main style="max-width:620px;margin:24px auto;background:#fff;padding:36px;border-radius:22px">${image}<h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;color:#052a6b">${escapeHtml(title)}</h1><div style="font-size:16px;line-height:1.6;color:#294b5e">${escapeHtml(body).replace(/\r?\n/g, "<br>")}</div>${action}</main></body></html>`;
}

function safeFilters(filters = {}) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function normalizeAudience(rows, filters = {}) {
  const interest = String(filters.interest || "").trim().toLowerCase();
  const city = String(filters.city || "").trim().toLowerCase();
  return rows.filter((row) => {
    if (interest && !String(row.top_interest || "").toLowerCase().includes(interest)) return false;
    if (city && !String(row.city || "").toLowerCase().includes(city)) return false;
    return true;
  }).map((row) => ({
    source_id: row.id,
    source_type: row.source_type,
    lead_id: row.lead_id || null,
    name: row.name || "Sin nombre",
    email: row.email || "",
    phone: row.phone || "",
    city: row.city || "",
    interest: row.top_interest || "",
    campaign_name: row.campaign_name || "",
    channel: row.channel || "",
    score_total: Number(row.score_total || 0),
    purchase_count: Number(row.purchase_count || 0),
  }));
}

async function listAudience(businessId, filters = {}) {
  const result = await listLeadCrmRows(businessId, { ...safeFilters(filters), limit: 120, offset: 0 });
  const contacts = normalizeAudience(result.rows || [], filters);
  return { contacts, returned: contacts.length, total: interestOrCity(filters) ? contacts.length : Number(result.total || contacts.length), capped: Number(result.total || 0) > 120 };
}

function interestOrCity(filters) {
  return Boolean(String(filters?.interest || "").trim() || String(filters?.city || "").trim());
}

async function assertRelationBelongsToBusiness(businessId, payload) {
  const checks = [
    ["campaign_id", "campaigns"],
    ["channel_id", "business_acquisition_channels"],
  ];
  for (const [field, table] of checks) {
    if (!payload[field]) continue;
    const result = await query(`select id from ${table} where id = $1 and business_id = $2`, [payload[field], businessId]);
    if (!result.rowCount) throw badRequest("La campaña o canal elegido no pertenece a esta empresa.");
  }
  if (payload.activation_id) {
    const result = await query("select id from interactive_activations where id = $1 and company_id = $2", [payload.activation_id, businessId]);
    if (!result.rowCount) throw badRequest("La activación elegida no pertenece a esta empresa.");
  }
}

async function listBusinessCommunications(businessId) {
  const result = await query(
    `select bc.*, c.name as campaign_name, ch.name as channel_name, ia.title as activation_name,
       coalesce(rc.recipients_total, 0)::int as recipients_total, coalesce(rc.sent_count, 0)::int as recipients_sent, coalesce(rc.failed_count, 0)::int as recipients_failed,
       coalesce(rc.skipped_count, 0)::int as recipients_skipped
     from business_communications bc
     left join campaigns c on c.id = bc.campaign_id and c.business_id = bc.business_id
     left join business_acquisition_channels ch on ch.id = bc.channel_id and ch.business_id = bc.business_id
     left join interactive_activations ia on ia.id = bc.activation_id and ia.company_id = bc.business_id
     left join lateral (
       select count(*) as recipients_total,
              count(*) filter (where status = 'SENT') as sent_count,
              count(*) filter (where status = 'FAILED') as failed_count,
              count(*) filter (where status = 'SKIPPED') as skipped_count
       from business_communication_recipients r where r.communication_id = bc.id
     ) rc on true
     where bc.business_id = $1 and bc.status <> 'ARCHIVED'
     order by bc.updated_at desc`,
    [businessId]
  );
  return { communications: result.rows };
}

async function createBusinessCommunication(businessId, userId, payload) {
  await assertRelationBelongsToBusiness(businessId, payload);
  const result = await query(
    `insert into business_communications (
      business_id, title, communication_type, status, campaign_id, channel_id, activation_id,
      subject, email_body, social_copy, image_url, action_url, audience_filters, metadata, created_by, updated_by
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$15)
    returning *`,
    [businessId, payload.title, payload.communication_type, payload.status, payload.campaign_id || null,
      payload.channel_id || null, payload.activation_id || null, payload.subject || null, payload.email_body || null,
      payload.social_copy || null, payload.image_url || null, payload.action_url || null,
      JSON.stringify(payload.audience_filters || {}), JSON.stringify(payload.metadata || {}), userId]
  );
  return { communication: result.rows[0] };
}

async function updateBusinessCommunication(businessId, userId, id, payload) {
  const existing = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!existing.rowCount) throw notFound("Comunicación no encontrada.");
  const merged = { ...existing.rows[0], ...payload };
  await assertRelationBelongsToBusiness(businessId, merged);
  const result = await query(
    `update business_communications set title=$3, communication_type=$4, status=$5, campaign_id=$6, channel_id=$7,
      activation_id=$8, subject=$9, email_body=$10, social_copy=$11, image_url=$12, action_url=$13,
      audience_filters=$14::jsonb, metadata=$15::jsonb, updated_by=$16, updated_at=now()
     where id=$1 and business_id=$2 returning *`,
    [id, businessId, merged.title, merged.communication_type, merged.status, merged.campaign_id || null,
      merged.channel_id || null, merged.activation_id || null, merged.subject || null, merged.email_body || null,
      merged.social_copy || null, merged.image_url || null, merged.action_url || null,
      JSON.stringify(merged.audience_filters || {}), JSON.stringify(merged.metadata || {}), userId]
  );
  return { communication: result.rows[0] };
}

async function saveRecipient({ businessId, communicationId, contact, status, providerMessageId, errorMessage, userId }) {
  const recipient = await query(
    `insert into business_communication_recipients (
      business_id, communication_id, lead_id, source_type, source_id, recipient_name, recipient_email,
      status, provider_message_id, error_message, sent_at, metadata
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,case when $8 = 'SENT' then now() else null end,$11::jsonb)
    on conflict (communication_id, source_type, source_id) do update set
      recipient_name=excluded.recipient_name, recipient_email=excluded.recipient_email, status=excluded.status,
      provider_message_id=excluded.provider_message_id, error_message=excluded.error_message,
      sent_at=excluded.sent_at, metadata=excluded.metadata, updated_at=now()
    returning *`,
    [businessId, communicationId, contact.lead_id || null, contact.source_type, contact.source_id,
      contact.name, contact.email || null, status, providerMessageId || null, errorMessage || null,
      JSON.stringify({ sent_by: userId })]
  );
  return recipient.rows[0];
}

async function logLeadCommunication({ businessId, contact, communication, status, message, errorMessage, userId }) {
  await query(
    `insert into lead_communications (
      business_id, lead_id, source_type, source_id, campaign_id, type, channel, subject, message, status, metadata, created_by
    ) values ($1,$2,$3,$4,$5,'BUSINESS_COMMUNICATION','email',$6,$7,$8,$9::jsonb,$10)`,
    [businessId, contact.lead_id || null, contact.source_type, contact.source_id, communication.campaign_id || null,
      communication.subject || communication.title, message, status === 'SENT' ? 'sent' : 'failed',
      JSON.stringify({ business_communication_id: communication.id, activation_id: communication.activation_id || null, error: errorMessage || null }), userId]
  );
}

async function sendBusinessCommunication(businessId, userId, id, recipientRefs, consentConfirmed) {
  if (!consentConfirmed) throw badRequest("Confirma que los destinatarios aceptaron recibir esta comunicación antes de enviarla.");
  const found = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!found.rowCount) throw notFound("Comunicación no encontrada.");
  const communication = found.rows[0];
  if (!['EMAIL', 'MIXED'].includes(communication.communication_type)) throw badRequest("Esta comunicación no está configurada para email.");
  if (!communication.subject || !communication.email_body) throw badRequest("Completa asunto y mensaje antes de enviar.");
  const sourceIds = [...new Set((recipientRefs || []).map((item) => String(item?.source_id || "")).filter(Boolean))];
  if (!sourceIds.length) throw badRequest("Selecciona al menos un contacto con el que comunicarte.");
  if (sourceIds.length > 120) throw badRequest("Envía máximo 120 contactos por lote para mantener el control del envío.");
  const audience = await listAudience(businessId, { source_ids: sourceIds });
  const byId = new Map(audience.contacts.map((contact) => [contact.source_id, contact]));
  const selected = sourceIds.map((sourceId) => byId.get(sourceId)).filter(Boolean);
  if (!selected.length) throw badRequest("No encontramos contactos válidos para este envío.");

  const results = { attempted: selected.length, sent: 0, failed: 0, skipped: 0 };
  for (const contact of selected) {
    if (!contact.email) {
      await saveRecipient({ businessId, communicationId: id, contact, status: 'SKIPPED', errorMessage: 'Sin correo electrónico', userId });
      results.skipped += 1;
      continue;
    }
    const subject = personalize(communication.subject, contact);
    const message = personalize(communication.email_body, contact);
    const mediaAssets = normalizeMediaAssets(communication);
    const attachments = makeEmailAttachments(mediaAssets);
    try {
      const provider = await sendBusinessCommunicationEmail({
        to: contact.email,
        subject,
        text: message,
        html: buildEmailMarkup({ title: subject, body: message, hasInlineImage: Boolean(attachments.length), actionUrl: communication.action_url }),
        attachments,
      });
      await saveRecipient({ businessId, communicationId: id, contact, status: 'SENT', providerMessageId: provider.id, userId });
      await logLeadCommunication({ businessId, contact, communication, status: 'SENT', message, userId });
      results.sent += 1;
    } catch (error) {
      await saveRecipient({ businessId, communicationId: id, contact, status: 'FAILED', errorMessage: error.message, userId });
      await logLeadCommunication({ businessId, contact, communication, status: 'FAILED', message, errorMessage: error.message, userId });
      results.failed += 1;
    }
  }
  await query("update business_communications set status = $3, updated_by = $4, updated_at = now() where id = $1 and business_id = $2", [id, businessId, results.sent ? 'SENT' : communication.status, userId]);
  return { results };
}

module.exports = {
  createBusinessCommunication,
  listAudience,
  listBusinessCommunications,
  sendBusinessCommunication,
  updateBusinessCommunication,
};

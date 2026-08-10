const { query } = require("../config/db");
const { env } = require("../config/env");
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

function normalizedRecipientEmail(value) {
  return String(value || "").trim().toLowerCase();
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

function normalizeAudience(rows) {
  return rows.map((row) => ({
    source_id: row.id,
    source_type: row.source_type,
    lead_id: row.lead_id || null,
    name: row.name || "Sin nombre",
    email: row.email || "",
    phone: row.phone || "",
    city: row.city || "",
    interest: row.top_interest || "",
    purchased_product: row.top_product || "",
    purchased_products: row.purchased_products || row.top_product || "",
    audience_type: Number(row.purchase_count || 0) > 0 ? "CLIENT" : "LEAD",
    commercial_status: row.commercial_status || "",
    rms_phase: row.rms_phase || "recoleccion",
    campaign_name: row.campaign_name || "",
    channel: row.channel || "",
    score_total: Number(row.score_total || 0),
    purchase_count: Number(row.purchase_count || 0),
  }));
}

async function listAudience(businessId, filters = {}) {
  const result = await listLeadCrmRows(businessId, {
    ...safeFilters(filters),
    limit: filters.limit || 120,
    offset: filters.offset || 0,
  });
  const contacts = normalizeAudience(result.leads || []);
  const pagination = result.pagination || { total: contacts.length, limit: contacts.length, offset: 0, has_more: false };
  return { contacts, returned: contacts.length, total: Number(pagination.total || contacts.length), pagination, capped: false };
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
    `select bc.*, c.name as campaign_name, ch.name as channel_name, ia.title as activation_name, ia.public_slug as activation_public_slug,
       coalesce(rc.recipients_total, 0)::int as recipients_total, coalesce(rc.sent_count, 0)::int as recipients_sent, coalesce(rc.failed_count, 0)::int as recipients_failed,
       coalesce(rc.skipped_count, 0)::int as recipients_skipped,
       coalesce(em.views, 0)::int as views, coalesce(em.starts, 0)::int as starts, coalesce(em.leads, 0)::int as leads,
       coalesce(em.completions, 0)::int as completions, coalesce(em.rewards, 0)::int as rewards,
       coalesce(sm.sales, 0)::int as sales, coalesce(sm.revenue, 0)::numeric as revenue, coalesce(sm.customers, 0)::int as customers,
       coalesce(pm.investment, 0)::numeric as investment
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
     left join lateral (
       select count(*) filter (where event_type = 'ACTIVATION_VIEWED')::int as views,
              count(*) filter (where event_type = 'ACTIVATION_STARTED')::int as starts,
              count(*) filter (where event_type = 'LEAD_CAPTURED')::int as leads,
              count(*) filter (where event_type = 'ACTIVATION_COMPLETED')::int as completions,
              count(*) filter (where event_type = 'REWARD_ISSUED')::int as rewards
       from business_communication_events e where e.communication_id = bc.id
     ) em on true
     left join lateral (
       select coalesce(sum(bs.sale_amount), 0)::numeric as revenue,
              count(*)::int as sales,
              count(distinct coalesce(nullif(bs.customer_email, ''), nullif(bs.customer_phone, ''), bs.id::text))::int as customers
       from business_sales bs left join qr_codes q on q.id = bs.qr_code_id
       where bs.business_id = bc.business_id and (q.metadata->>'communication_id' = bc.id::text or bs.metadata->>'communication_id' = bc.id::text)
     ) sm on true
     left join lateral (
       select coalesce(e.budget_amount, 0)::numeric as investment
       from business_acquisition_channel_efforts e
       where e.business_id = bc.business_id and e.metadata->>'communication_id' = bc.id::text and e.status <> 'ARCHIVED'
       order by e.updated_at desc nulls last, e.created_at desc
       limit 1
     ) pm on true
     where bc.business_id = $1 and bc.status <> 'ARCHIVED'
     order by bc.updated_at desc`,
    [businessId]
  );
  return { communications: result.rows.map((row) => {
    const investment = Number(row.investment || 0); const revenue = Number(row.revenue || 0); const customers = Number(row.customers || 0);
    return { ...row, ...trackingUrls(row), views: Number(row.views || 0), starts: Number(row.starts || 0), leads: Number(row.leads || 0), completions: Number(row.completions || 0), rewards: Number(row.rewards || 0), sales: Number(row.sales || 0), revenue, investment, cac: customers ? investment / customers : null, roi: investment ? (revenue - investment) / investment : null };
  }) };
}

function publicActivationUrl(slug, trackingToken, source = "social") {
  const trackingSource = String(source || "social").toLowerCase() === "email" ? "email" : "social";
  return `${String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "")}/activacion/${encodeURIComponent(slug)}?qori_ref=${encodeURIComponent(trackingToken)}&qori_source=${trackingSource}`;
}

function trackingUrls(row) {
  if (!row?.activation_public_slug || !row?.tracking_token) return { tracking_url: null, email_tracking_url: null };
  return {
    tracking_url: publicActivationUrl(row.activation_public_slug, row.tracking_token, "social"),
    email_tracking_url: publicActivationUrl(row.activation_public_slug, row.tracking_token, "email"),
  };
}

function communicationEffortContentType(communication = {}) {
  const type = String(communication.communication_type || "").toUpperCase();
  if (type === "EMAIL") return "EMAIL";
  if (type === "MIXED") return "CAMPAIGN";
  return "POST";
}

function communicationEffortStatus(communication = {}) {
  if (String(communication.status || "").toUpperCase() === "ARCHIVED") return "ARCHIVED";
  if (String(communication.publication_status || "").toUpperCase() === "PUBLISHED" || ["SENT", "READY"].includes(String(communication.status || "").toUpperCase())) return "ACTIVE";
  return "DRAFT";
}

async function syncCommunicationChannelEffort(businessId, userId, communication = {}) {
  const existing = await query(
    `select * from business_acquisition_channel_efforts
     where business_id = $1 and metadata->>'communication_id' = $2
     order by updated_at desc nulls last, created_at desc
     limit 1`,
    [businessId, communication.id]
  );
  const existingEffort = existing.rows[0] || null;
  const effortStatus = communicationEffortStatus(communication);
  if (!communication.channel_id || effortStatus === "ARCHIVED") {
    if (existingEffort && existingEffort.status !== "ARCHIVED") {
      await query(
        "update business_acquisition_channel_efforts set status='ARCHIVED', updated_at=now() where id=$1 and business_id=$2",
        [existingEffort.id, businessId]
      );
    }
    return null;
  }
  const metadata = {
    ...(existingEffort?.metadata && typeof existingEffort.metadata === "object" ? existingEffort.metadata : {}),
    source_module: "business_communication",
    communication_id: communication.id,
    tracking_token: communication.tracking_token || null,
    activation_id: communication.activation_id || null,
  };
  const media = normalizeMediaAssets(communication);
  const creativeUrl = String(communication.image_url || media.find((item) => /^https?:\/\//i.test(String(item?.source || "")))?.source || "").trim() || null;
  const sourceUrl = communication.external_publication_url || communication.action_url || existingEffort?.source_url || null;
  const description = communication.social_copy || communication.email_body || existingEffort?.description || null;
  const objective = existingEffort?.objective || (String(communication.communication_type || "").toUpperCase() === "EMAIL" ? "Comunicar y convertir por email" : "Comunicar y convertir desde la pieza");
  const publishedAt = String(communication.publication_status || "").toUpperCase() === "PUBLISHED"
    ? (communication.published_at || existingEffort?.published_at || new Date().toISOString())
    : existingEffort?.published_at || null;
  if (existingEffort) {
    await query(
      `update business_acquisition_channel_efforts
       set channel_id=$3, campaign_id=$4, title=$5, description=$6, objective=$7, content_type=$8, status=$9,
           published_at=$10::timestamptz, starts_at=coalesce(starts_at, $11::timestamptz),
           creative_url=$12, source_url=$13, metadata=$14::jsonb, updated_at=now()
       where id=$1 and business_id=$2`,
      [existingEffort.id, businessId, communication.channel_id, communication.campaign_id || null, communication.title, description,
        objective, communicationEffortContentType(communication), effortStatus, publishedAt,
        communication.created_at || new Date().toISOString(), creativeUrl, sourceUrl, JSON.stringify(metadata)]
    );
    return existingEffort.id;
  }
  const inserted = await query(
    `insert into business_acquisition_channel_efforts
      (business_id, channel_id, campaign_id, title, description, objective, content_type, status,
       published_at, starts_at, budget_amount, currency, creative_url, source_url, metadata, created_by_user_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10::timestamptz,0,'COP',$11,$12,$13::jsonb,$14)
     returning id`,
    [businessId, communication.channel_id, communication.campaign_id || null, communication.title, description, objective,
      communicationEffortContentType(communication), effortStatus, publishedAt, communication.created_at || new Date().toISOString(),
      creativeUrl, sourceUrl, JSON.stringify(metadata), userId]
  );
  return inserted.rows[0]?.id || null;
}

async function publishBusinessCommunication(businessId, userId, id, payload = {}) {
  const found = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!found.rowCount) throw notFound("Comunicación no encontrada.");
  const communication = found.rows[0];
  if (!["SOCIAL", "MIXED"].includes(communication.communication_type)) throw badRequest("Solo las piezas para redes pueden registrarse como publicación.");
  if (!communication.activation_id || !communication.channel_id) throw badRequest("Conecta una activación y un canal antes de registrar esta publicación medida.");
  const activation = await query("select public_slug from interactive_activations where id = $1 and company_id = $2", [communication.activation_id, businessId]);
  if (!activation.rowCount) throw badRequest("La activación seleccionada ya no está disponible.");
  const trackingUrl = publicActivationUrl(activation.rows[0].public_slug, communication.tracking_token, "social");
  const investment = Number(payload.investment_amount || 0);
  if (!Number.isFinite(investment) || investment < 0) throw badRequest("La inversión debe ser un valor válido mayor o igual a cero.");
  const effortMetadata = JSON.stringify({ source_module: "business_communication", communication_id: communication.id, tracking_token: communication.tracking_token, tracking_url: trackingUrl, activation_id: communication.activation_id });
  const existingEffort = await query(
    `select id from business_acquisition_channel_efforts
     where business_id = $1 and metadata->>'communication_id' = $2 and status <> 'ARCHIVED'
     order by updated_at desc nulls last, created_at desc
     limit 1`,
    [businessId, communication.id]
  );
  if (existingEffort.rowCount) {
    await query(
      `update business_acquisition_channel_efforts
       set channel_id=$3, campaign_id=$4, title=$5, description=$6, content_type='POST', status='ACTIVE',
           published_at=coalesce(published_at, now()), budget_amount=$7, source_url=$8, metadata=$9::jsonb
       where id=$1 and business_id=$2`,
      [existingEffort.rows[0].id, businessId, communication.channel_id, communication.campaign_id || null, communication.title, communication.social_copy || null, investment, payload.external_publication_url || trackingUrl, effortMetadata]
    );
  } else {
    await query(
      `insert into business_acquisition_channel_efforts (business_id, channel_id, campaign_id, title, description, content_type, status, published_at, budget_amount, source_url, metadata, created_by_user_id)
       values ($1,$2,$3,$4,$5,'POST','ACTIVE',now(),$6,$7,$8::jsonb,$9)`,
      [businessId, communication.channel_id, communication.campaign_id || null, communication.title, communication.social_copy || null, investment, payload.external_publication_url || trackingUrl, effortMetadata, userId]
    );
  }
  const updated = await query("update business_communications set publication_status='PUBLISHED', published_at=coalesce(published_at, now()), published_by=$3, external_publication_url=coalesce($4, external_publication_url), updated_by=$3, updated_at=now() where id=$1 and business_id=$2 returning *", [id, businessId, userId, payload.external_publication_url || null]);
  await query("insert into business_communication_events (business_id, communication_id, activation_id, event_type, metadata) values ($1,$2,$3,'PUBLISHED',$4::jsonb)", [businessId, id, communication.activation_id, JSON.stringify({ tracking_url: trackingUrl, investment })]);
  return { communication: { ...updated.rows[0], tracking_url: trackingUrl, email_tracking_url: publicActivationUrl(activation.rows[0].public_slug, communication.tracking_token, "email") } };
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
  await syncCommunicationChannelEffort(businessId, userId, result.rows[0]);
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
  await syncCommunicationChannelEffort(businessId, userId, result.rows[0]);
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
  let emailTrackingUrl = null;
  if (communication.activation_id) {
    const activation = await query("select public_slug from interactive_activations where id = $1 and company_id = $2", [communication.activation_id, businessId]);
    if (!activation.rowCount) throw badRequest("La activación seleccionada ya no está disponible.");
    emailTrackingUrl = publicActivationUrl(activation.rows[0].public_slug, communication.tracking_token, "email");
  }
  const requestedRecipients = [];
  const requestedKeys = new Set();
  for (const item of recipientRefs || []) {
    const sourceId = String(item?.source_id || "").trim();
    const sourceType = String(item?.source_type || "").trim().toUpperCase();
    if (!sourceId) continue;
    const key = `${sourceType}:${sourceId}`;
    if (requestedKeys.has(key)) continue;
    requestedKeys.add(key);
    requestedRecipients.push({ source_id: sourceId, source_type: sourceType });
  }
  const sourceIds = [...new Set(requestedRecipients.map((item) => item.source_id))];
  if (!sourceIds.length) throw badRequest("Selecciona al menos un contacto con el que comunicarte.");
  if (sourceIds.length > 120) throw badRequest("Envía máximo 120 contactos por lote para mantener el control del envío.");
  const audience = await listAudience(businessId, { source_ids: sourceIds });
  const byId = new Map(audience.contacts.map((contact) => [contact.source_id, contact]));
  const byTypedId = new Map(audience.contacts.map((contact) => [`${String(contact.source_type || "").toUpperCase()}:${contact.source_id}`, contact]));
  const selected = requestedRecipients.map((recipient) => (
    recipient.source_type ? byTypedId.get(`${recipient.source_type}:${recipient.source_id}`) : byId.get(recipient.source_id)
  )).filter(Boolean);
  if (!selected.length) throw badRequest("No encontramos contactos válidos para este envío.");
  if (selected.length !== requestedRecipients.length) throw badRequest("Uno o más contactos ya no están disponibles para este envío.");

  const seenEmails = new Set();
  const recipientsForDelivery = [];
  const duplicateEmailRecipients = [];
  for (const contact of selected) {
    const email = normalizedRecipientEmail(contact.email);
    if (email && seenEmails.has(email)) {
      duplicateEmailRecipients.push(contact);
      continue;
    }
    if (email) seenEmails.add(email);
    recipientsForDelivery.push(contact);
  }
  const results = {
    attempted: selected.length,
    unique_emails: seenEmails.size,
    duplicate_emails: duplicateEmailRecipients.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  };
  for (const contact of duplicateEmailRecipients) {
    await saveRecipient({
      businessId,
      communicationId: id,
      contact,
      status: 'SKIPPED',
      errorMessage: 'Correo duplicado en la audiencia: se envió una sola copia a esta dirección.',
      userId,
    });
    results.skipped += 1;
  }
  for (const contact of recipientsForDelivery) {
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
        html: buildEmailMarkup({ title: subject, body: message, hasInlineImage: Boolean(attachments.length), actionUrl: emailTrackingUrl || communication.action_url }),
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
  const updated = await query("update business_communications set status = $3, updated_by = $4, updated_at = now() where id = $1 and business_id = $2 returning *", [id, businessId, results.sent ? 'SENT' : communication.status, userId]);
  await syncCommunicationChannelEffort(businessId, userId, updated.rows[0] || communication);
  return { results };
}

module.exports = {
  createBusinessCommunication,
  listAudience,
  listBusinessCommunications,
  publishBusinessCommunication,
  sendBusinessCommunication,
  updateBusinessCommunication,
};

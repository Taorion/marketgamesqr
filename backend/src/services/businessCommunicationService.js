const { query } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { listLeadCrmRows } = require("./leadCrmService");
const { sendBusinessCommunicationEmail } = require("./businessCommunicationMailService");
const { getEmailConnectionStatus, getWhatsAppConnectionStatus, ownResendApiKey, saveEmailConnection, saveWhatsAppConnection } = require("./businessCommunicationCredentialService");
const { listApprovedWhatsAppTemplates, sendWhatsAppTemplate } = require("./businessCommunicationWhatsAppService");

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

function messageWithActionUrl(message, actionUrl) {
  const text = String(message || "").trim();
  const url = String(actionUrl || "").trim();
  if (!url || text.includes(url)) return text;
  return `${text}\n\n${url}`.trim();
}

function normalizedRecipientEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function communicationSenderName(value) {
  return String(value || "").replace(/[<>\"\r\n]/g, "").trim();
}

async function businessCommunicationSender(businessId, connectedUserEmail) {
  const result = await query(
    "select name, settings from businesses where id = $1 and is_active = true",
    [businessId]
  );
  const business = result.rows[0];
  if (!business) throw notFound("Empresa no encontrada.");

  const settings = business.settings || {};
  const senderEmail = normalizedRecipientEmail(settings.communication_sender_email);
  if (!senderEmail) {
    throw badRequest("Configura el email remitente verificado de tu empresa en Cuenta antes de enviar una comunicacion. No enviaremos desde MarketGamesQR por defecto.");
  }
  const senderName = communicationSenderName(settings.communication_sender_name || business.name) || "Qori";
  const replyTo = normalizedRecipientEmail(connectedUserEmail) || senderEmail;
  const apiKey = await ownResendApiKey(businessId) || env.resendApiKey;
  if (!apiKey) throw badRequest("Conecta tu cuenta de Resend en Cuenta > Correo masivo antes de enviar.");
  return { from: `${senderName} <${senderEmail}>`, replyTo, apiKey };
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
    ["branch_id", "branches"],
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
    `select bc.*, c.name as campaign_name, ch.name as channel_name, br.name as branch_name, ia.title as activation_name, ia.public_slug as activation_public_slug,
       sw.title as web_showcase_title, sw.slug as web_showcase_slug, sw.status as web_showcase_status,
       coalesce(rc.recipients_total, 0)::int as recipients_total, coalesce(rc.sent_count, 0)::int as recipients_sent, coalesce(rc.prepared_count, 0)::int as recipients_prepared, coalesce(rc.queued_count, 0)::int as recipients_queued, coalesce(rc.failed_count, 0)::int as recipients_failed,
       coalesce(rc.skipped_count, 0)::int as recipients_skipped,
       coalesce(em.views, 0)::int as views, coalesce(em.starts, 0)::int as starts, coalesce(em.leads, 0)::int as leads,
       coalesce(em.completions, 0)::int as completions, coalesce(em.rewards, 0)::int as rewards,
       coalesce(sm.sales, 0)::int as sales, coalesce(sm.revenue, 0)::numeric as revenue, coalesce(sm.customers, 0)::int as customers,
       coalesce(pm.investment, 0)::numeric as investment
     from business_communications bc
     left join campaigns c on c.id = bc.campaign_id and c.business_id = bc.business_id
     left join business_acquisition_channels ch on ch.id = bc.channel_id and ch.business_id = bc.business_id
     left join branches br on br.id = bc.branch_id and br.business_id = bc.business_id
     left join interactive_activations ia on ia.id = bc.activation_id and ia.company_id = bc.business_id
     left join smart_catalogs sw on sw.id::text = bc.metadata->>'web_showcase_id' and sw.business_id = bc.business_id
     left join lateral (
       select count(*) as recipients_total,
              count(*) filter (where status = 'SENT') as sent_count,
              count(*) filter (where status = 'PREPARED') as prepared_count,
              count(*) filter (where status = 'QUEUED') as queued_count,
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

function publicWebShowcaseUrl(slug) {
  return `${String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "")}/c/${encodeURIComponent(slug)}`;
}

function publicWebShowcaseProductUrl(catalogSlug, productSlug) {
  return `${publicWebShowcaseUrl(catalogSlug)}/${encodeURIComponent(productSlug)}`;
}

function normalizeProductPromotion(value) {
  if (!value || typeof value !== "object") return null;
  const promotionalPrice = Number(value.promotional_price);
  const startsAt = new Date(value.starts_at);
  const endsAt = new Date(value.ends_at);
  if (!Number.isFinite(promotionalPrice) || promotionalPrice < 0 || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw badRequest("Define un precio promocional y una vigencia temporal válida.");
  }
  return {
    label: String(value.label || "Promoción temporal").trim().slice(0, 140) || "Promoción temporal",
    promotional_price: promotionalPrice,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  };
}

async function normalizeWebShowcaseProductRelation(businessId, payload, existingMetadata = {}) {
  const hasProductSelection = Object.prototype.hasOwnProperty.call(payload, "web_showcase_product_id");
  const productId = hasProductSelection ? payload.web_showcase_product_id : existingMetadata?.web_showcase_product_id || null;
  const metadata = {
    ...(existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {}),
    ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
  };
  const promotion = Object.prototype.hasOwnProperty.call(payload, "product_promotion")
    ? normalizeProductPromotion(payload.product_promotion)
    : existingMetadata?.product_promotion || null;
  if (promotion) metadata.product_promotion = promotion;
  else delete metadata.product_promotion;
  if (!productId) {
    delete metadata.web_showcase_product_id;
    delete metadata.web_showcase_product_name;
    delete metadata.web_showcase_product_slug;
    return { ...payload, metadata };
  }
  const result = await query(
    `select p.id, p.name, p.slug, p.price, p.catalog_id, c.title as catalog_title, c.slug as catalog_slug
     from smart_catalog_products p
     join smart_catalogs c on c.id = p.catalog_id and c.business_id = p.business_id
     where p.id = $1 and p.business_id = $2 and p.stock_status <> 'HIDDEN'`,
    [productId, businessId]
  );
  if (!result.rowCount) throw badRequest("El producto elegido no pertenece a una vitrina web disponible de esta empresa.");
  const product = result.rows[0];
  if (payload.web_showcase_id && String(payload.web_showcase_id) !== String(product.catalog_id)) {
    throw badRequest("El producto seleccionado debe pertenecer a la vitrina web elegida.");
  }
  if (promotion && promotionalPriceIsInvalid(promotion.promotional_price, product.price)) {
    throw badRequest("El precio promocional debe ser menor que el precio actual del producto.");
  }
  return {
    ...payload,
    web_showcase_id: product.catalog_id,
    metadata: {
      ...metadata,
      web_showcase_product_id: product.id,
      web_showcase_product_name: product.name,
      web_showcase_product_slug: product.slug,
      web_showcase_product_price: product.price,
    },
    action_url: publicWebShowcaseProductUrl(product.catalog_slug, product.slug),
  };
}

function promotionalPriceIsInvalid(promotionalPrice, basePrice) {
  const currentPrice = Number(basePrice);
  return Number.isFinite(currentPrice) && currentPrice > 0 && Number(promotionalPrice) >= currentPrice;
}

async function syncCommunicationProductPromotion(businessId, communication) {
  const productId = communication?.metadata?.web_showcase_product_id;
  const promotion = String(communication?.status || "").toUpperCase() === "ARCHIVED" ? null : communication?.metadata?.product_promotion || null;
  if (!productId) return;
  const result = await query(
    "select id, price, metadata from smart_catalog_products where id = $1 and business_id = $2",
    [productId, businessId]
  );
  if (!result.rowCount) throw badRequest("El producto de esta comunicación ya no está disponible.");
  const product = result.rows[0];
  const productMetadata = product.metadata && typeof product.metadata === "object" ? product.metadata : {};
  const existingPromotion = productMetadata.active_promotion;
  if (!promotion) {
    if (existingPromotion?.communication_id === communication.id) {
      delete productMetadata.active_promotion;
      await query("update smart_catalog_products set metadata = $3::jsonb, updated_at = now() where id = $1 and business_id = $2", [product.id, businessId, JSON.stringify(productMetadata)]);
    }
    return;
  }
  if (promotionalPriceIsInvalid(promotion.promotional_price, product.price)) throw badRequest("El precio promocional debe ser menor que el precio actual del producto.");
  const existingEndsAt = new Date(existingPromotion?.ends_at || 0).getTime();
  if (existingPromotion?.communication_id && existingPromotion.communication_id !== communication.id && existingEndsAt > Date.now()) {
    throw badRequest("Este producto ya tiene una promoción temporal vigente desde otra comunicación.");
  }
  productMetadata.active_promotion = {
    ...promotion,
    communication_id: communication.id,
    original_price: Number(product.price || 0),
    updated_at: new Date().toISOString(),
  };
  await query("update smart_catalog_products set metadata = $3::jsonb, updated_at = now() where id = $1 and business_id = $2", [product.id, businessId, JSON.stringify(productMetadata)]);
}

async function clearCommunicationProductPromotion(businessId, productId, communicationId) {
  if (!productId) return;
  const result = await query("select id, metadata from smart_catalog_products where id = $1 and business_id = $2", [productId, businessId]);
  if (!result.rowCount) return;
  const metadata = result.rows[0].metadata && typeof result.rows[0].metadata === "object" ? result.rows[0].metadata : {};
  if (metadata.active_promotion?.communication_id !== communicationId) return;
  delete metadata.active_promotion;
  await query("update smart_catalog_products set metadata = $3::jsonb, updated_at = now() where id = $1 and business_id = $2", [productId, businessId, JSON.stringify(metadata)]);
}

async function normalizeWebShowcaseRelation(businessId, payload, existingMetadata = {}) {
  const hasShowcaseSelection = Object.prototype.hasOwnProperty.call(payload, "web_showcase_id");
  const webShowcaseId = hasShowcaseSelection ? payload.web_showcase_id : existingMetadata?.web_showcase_id || null;
  const metadata = {
    ...(existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {}),
    ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
  };
  if (!webShowcaseId) {
    delete metadata.web_showcase_id;
    delete metadata.web_showcase_title;
    delete metadata.web_showcase_slug;
    return { ...payload, metadata };
  }
  const result = await query(
    "select id, title, slug from smart_catalogs where id = $1 and business_id = $2",
    [webShowcaseId, businessId]
  );
  if (!result.rowCount) throw badRequest("La vitrina web elegida no pertenece a esta empresa.");
  const showcase = result.rows[0];
  return {
    ...payload,
    metadata: { ...metadata, web_showcase_id: showcase.id, web_showcase_title: showcase.title, web_showcase_slug: showcase.slug },
    action_url: metadata.web_showcase_product_slug
      ? publicWebShowcaseProductUrl(showcase.slug, metadata.web_showcase_product_slug)
      : publicWebShowcaseUrl(showcase.slug),
  };
}

async function assertWebShowcaseIsActiveForDelivery(businessId, communication) {
  const webShowcaseId = communication?.metadata?.web_showcase_id;
  if (!webShowcaseId) return null;
  const result = await query(
    "select id, title, slug, status from smart_catalogs where id = $1 and business_id = $2",
    [webShowcaseId, businessId]
  );
  if (!result.rowCount || String(result.rows[0].status || "").toUpperCase() !== "ACTIVE") {
    throw badRequest("La vitrina web seleccionada debe estar activa antes de enviarla o publicarla.");
  }
  return result.rows[0];
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
    web_showcase_id: communication.metadata?.web_showcase_id || null,
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
    await query(
      "update business_acquisition_channel_efforts set branch_id = $3, updated_at = now() where id = $1 and business_id = $2",
      [existingEffort.id, businessId, communication.branch_id || null]
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
  const effortId = inserted.rows[0]?.id || null;
  if (effortId) {
    await query(
      "update business_acquisition_channel_efforts set branch_id = $3, updated_at = now() where id = $1 and business_id = $2",
      [effortId, businessId, communication.branch_id || null]
    );
  }
  return effortId;
}

async function publishBusinessCommunication(businessId, userId, id, payload = {}) {
  const found = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!found.rowCount) throw notFound("Comunicación no encontrada.");
  const communication = found.rows[0];
  if (!["SOCIAL", "MIXED"].includes(communication.communication_type)) throw badRequest("Solo las piezas para redes pueden registrarse como publicación.");
  if (!communication.channel_id || (!communication.activation_id && !communication.metadata?.web_showcase_id)) throw badRequest("Conecta un canal y una activación o vitrina web antes de registrar esta publicación medida.");
  const showcase = await assertWebShowcaseIsActiveForDelivery(businessId, communication);
  const activation = communication.activation_id
    ? await query("select public_slug from interactive_activations where id = $1 and company_id = $2", [communication.activation_id, businessId])
    : null;
  if (communication.activation_id && !activation.rowCount) throw badRequest("La activación seleccionada ya no está disponible.");
  const trackingUrl = showcase
    ? publicWebShowcaseUrl(showcase.slug)
    : publicActivationUrl(activation.rows[0].public_slug, communication.tracking_token, "social");
  const investment = Number(payload.investment_amount || 0);
  if (!Number.isFinite(investment) || investment < 0) throw badRequest("La inversión debe ser un valor válido mayor o igual a cero.");
  const effortMetadata = JSON.stringify({ source_module: "business_communication", communication_id: communication.id, tracking_token: communication.tracking_token, tracking_url: trackingUrl, activation_id: communication.activation_id || null, branch_id: communication.branch_id || null, web_showcase_id: showcase?.id || null });
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
       set channel_id=$3, campaign_id=$4, branch_id=$5, title=$6, description=$7, content_type='POST', status='ACTIVE',
           published_at=coalesce(published_at, now()), budget_amount=$8, source_url=$9, metadata=$10::jsonb
       where id=$1 and business_id=$2`,
      [existingEffort.rows[0].id, businessId, communication.channel_id, communication.campaign_id || null, communication.branch_id || null, communication.title, communication.social_copy || null, investment, payload.external_publication_url || trackingUrl, effortMetadata]
    );
  } else {
    await query(
      `insert into business_acquisition_channel_efforts (business_id, channel_id, campaign_id, branch_id, title, description, content_type, status, published_at, budget_amount, source_url, metadata, created_by_user_id)
       values ($1,$2,$3,$4,$5,$6,'POST','ACTIVE',now(),$7,$8,$9::jsonb,$10)`,
      [businessId, communication.channel_id, communication.campaign_id || null, communication.branch_id || null, communication.title, communication.social_copy || null, investment, payload.external_publication_url || trackingUrl, effortMetadata, userId]
    );
  }
  const updated = await query("update business_communications set publication_status='PUBLISHED', published_at=coalesce(published_at, now()), published_by=$3, external_publication_url=coalesce($4, external_publication_url), updated_by=$3, updated_at=now() where id=$1 and business_id=$2 returning *", [id, businessId, userId, payload.external_publication_url || null]);
  await query("insert into business_communication_events (business_id, communication_id, activation_id, event_type, metadata) values ($1,$2,$3,'PUBLISHED',$4::jsonb)", [businessId, id, communication.activation_id || null, JSON.stringify({ tracking_url: trackingUrl, investment, branch_id: communication.branch_id || null, web_showcase_id: showcase?.id || null })]);
  return { communication: { ...updated.rows[0], tracking_url: trackingUrl, email_tracking_url: activation?.rowCount ? publicActivationUrl(activation.rows[0].public_slug, communication.tracking_token, "email") : null } };
}

async function createBusinessCommunication(businessId, userId, payload) {
  const productNormalizedPayload = await normalizeWebShowcaseProductRelation(businessId, payload);
  const normalizedPayload = await normalizeWebShowcaseRelation(businessId, productNormalizedPayload);
  await assertRelationBelongsToBusiness(businessId, normalizedPayload);
  const result = await query(
    `insert into business_communications (
      business_id, title, communication_type, status, campaign_id, channel_id, branch_id, activation_id,
      subject, email_body, whatsapp_body, social_copy, image_url, action_url, audience_filters, metadata, created_by, updated_by
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$17)
    returning *`,
    [businessId, normalizedPayload.title, normalizedPayload.communication_type, normalizedPayload.status, normalizedPayload.campaign_id || null,
      normalizedPayload.channel_id || null, normalizedPayload.branch_id || null, normalizedPayload.activation_id || null, normalizedPayload.subject || null, normalizedPayload.email_body || null,
      normalizedPayload.whatsapp_body || null, normalizedPayload.social_copy || null, normalizedPayload.image_url || null, normalizedPayload.action_url || null,
      JSON.stringify(normalizedPayload.audience_filters || {}), JSON.stringify(normalizedPayload.metadata || {}), userId]
  );
  await syncCommunicationProductPromotion(businessId, result.rows[0]);
  await syncCommunicationChannelEffort(businessId, userId, result.rows[0]);
  return { communication: result.rows[0] };
}

async function updateBusinessCommunication(businessId, userId, id, payload) {
  const existing = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!existing.rowCount) throw notFound("Comunicación no encontrada.");
  const productNormalizedPayload = await normalizeWebShowcaseProductRelation(businessId, { ...existing.rows[0], ...payload }, existing.rows[0].metadata);
  const merged = await normalizeWebShowcaseRelation(businessId, productNormalizedPayload, existing.rows[0].metadata);
  await assertRelationBelongsToBusiness(businessId, merged);
  const result = await query(
    `update business_communications set title=$3, communication_type=$4, status=$5, campaign_id=$6, channel_id=$7, branch_id=$8,
      activation_id=$9, subject=$10, email_body=$11, whatsapp_body=$12, social_copy=$13, image_url=$14, action_url=$15,
      audience_filters=$16::jsonb, metadata=$17::jsonb, updated_by=$18, updated_at=now()
     where id=$1 and business_id=$2 returning *`,
    [id, businessId, merged.title, merged.communication_type, merged.status, merged.campaign_id || null,
      merged.channel_id || null, merged.branch_id || null, merged.activation_id || null, merged.subject || null, merged.email_body || null,
      merged.whatsapp_body || null, merged.social_copy || null, merged.image_url || null, merged.action_url || null,
      JSON.stringify(merged.audience_filters || {}), JSON.stringify(merged.metadata || {}), userId]
  );
  const previousProductId = existing.rows[0].metadata?.web_showcase_product_id || null;
  if (previousProductId && String(previousProductId) !== String(result.rows[0].metadata?.web_showcase_product_id || "")) {
    await clearCommunicationProductPromotion(businessId, previousProductId, id);
  }
  await syncCommunicationProductPromotion(businessId, result.rows[0]);
  await syncCommunicationChannelEffort(businessId, userId, result.rows[0]);
  return { communication: result.rows[0] };
}

async function saveRecipient({ businessId, communicationId, contact, status, providerMessageId, errorMessage, userId, metadata = {} }) {
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
      JSON.stringify({ sent_by: userId, ...metadata })]
  );
  return recipient.rows[0];
}

async function logLeadCommunication({ businessId, contact, communication, status, message, errorMessage, userId, channel = "email" }) {
  await query(
    `insert into lead_communications (
      business_id, lead_id, source_type, source_id, campaign_id, type, channel, subject, message, status, metadata, created_by
    ) values ($1,$2,$3,$4,$5,'BUSINESS_COMMUNICATION',$6,$7,$8,$9,$10::jsonb,$11)`,
    [businessId, contact.lead_id || null, contact.source_type, contact.source_id, communication.campaign_id || null,
      channel, communication.subject || communication.title, message, status === 'SENT' ? 'sent' : 'failed',
      JSON.stringify({ business_communication_id: communication.id, activation_id: communication.activation_id || null, web_showcase_id: communication.metadata?.web_showcase_id || null, error: errorMessage || null }), userId]
  );
}

async function sendBusinessCommunication(businessId, userId, id, recipientRefs, consentConfirmed, connectedUserEmail = null) {
  if (!consentConfirmed) throw badRequest("Confirma que los destinatarios aceptaron recibir esta comunicación antes de enviarla.");
  const found = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!found.rowCount) throw notFound("Comunicación no encontrada.");
  const communication = found.rows[0];
  if (!['EMAIL', 'MIXED'].includes(communication.communication_type)) throw badRequest("Esta comunicación no está configurada para email.");
  if (!communication.subject || !communication.email_body) throw badRequest("Completa asunto y mensaje antes de enviar.");
  await assertWebShowcaseIsActiveForDelivery(businessId, communication);
  const sender = await businessCommunicationSender(businessId, connectedUserEmail);
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
    failure_reasons: [],
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
        apiKey: sender.apiKey,
        from: sender.from,
        to: contact.email,
        replyTo: sender.replyTo,
        subject,
        text: message,
        html: buildEmailMarkup({ title: subject, body: message, hasInlineImage: Boolean(attachments.length), actionUrl: communication.metadata?.web_showcase_id ? communication.action_url : emailTrackingUrl || communication.action_url }),
        attachments,
      });
      await saveRecipient({ businessId, communicationId: id, contact, status: 'SENT', providerMessageId: provider.id, userId });
      await logLeadCommunication({ businessId, contact, communication, status: 'SENT', message, userId });
      results.sent += 1;
    } catch (error) {
      await saveRecipient({ businessId, communicationId: id, contact, status: 'FAILED', errorMessage: error.message, userId });
      await logLeadCommunication({ businessId, contact, communication, status: 'FAILED', message, errorMessage: error.message, userId });
      results.failed += 1;
      const reason = String(error.publicMessage || "No se pudo entregar el correo. Revisa la configuración del envío.").slice(0, 280);
      const knownReason = results.failure_reasons.find((item) => item.message === reason);
      if (knownReason) knownReason.count += 1;
      else results.failure_reasons.push({ message: reason, count: 1 });
    }
  }
  const updated = await query("update business_communications set status = $3, updated_by = $4, updated_at = now() where id = $1 and business_id = $2 returning *", [id, businessId, results.sent ? 'SENT' : communication.status, userId]);
  await syncCommunicationChannelEffort(businessId, userId, updated.rows[0] || communication);
  return { results };
}

function normalizedWhatsAppPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
}

async function selectedCommunicationAudience(businessId, recipientRefs = []) {
  const requested = [];
  const keys = new Set();
  for (const item of recipientRefs) {
    const sourceId = String(item?.source_id || "").trim();
    const sourceType = String(item?.source_type || "").trim().toUpperCase();
    const key = `${sourceType}:${sourceId}`;
    if (!sourceId || keys.has(key)) continue;
    keys.add(key);
    requested.push({ source_id: sourceId, source_type: sourceType });
  }
  if (!requested.length) throw badRequest("Selecciona al menos un contacto con el que comunicarte.");
  if (requested.length > 120) throw badRequest("Envía máximo 120 contactos por lote para mantener el control del envío.");
  const audience = await listAudience(businessId, { source_ids: [...new Set(requested.map((item) => item.source_id))] });
  const byTypedId = new Map(audience.contacts.map((contact) => [`${String(contact.source_type || "").toUpperCase()}:${contact.source_id}`, contact]));
  const selected = requested.map((recipient) => byTypedId.get(`${recipient.source_type}:${recipient.source_id}`)).filter(Boolean);
  if (selected.length !== requested.length) throw badRequest("Uno o más contactos ya no están disponibles para esta comunicación.");
  return selected;
}

function whatsAppTemplateForDelivery(communication, suppliedTemplate = null) {
  const template = suppliedTemplate || communication.metadata?.whatsapp_template || {};
  const name = String(template.name || template.template_name || "").trim();
  const language = String(template.language || template.language_code || "es_CO").trim() || "es_CO";
  const parameters = Array.isArray(template.body_parameters) ? template.body_parameters : [];
  if (!/^[a-z0-9_]+$/.test(name)) throw badRequest("Elige una plantilla aprobada de Meta antes de enviar por WhatsApp.");
  return { name, language, body_parameters: parameters.map((value) => String(value || "").trim()).filter(Boolean) };
}

function whatsappTemplateParameters(template, contact, actionUrl) {
  return template.body_parameters.map((value) => personalize(value, contact).replace(/{{\s*(enlace|link)\s*}}/gi, String(actionUrl || "").trim()));
}

async function runWithConcurrency(items, limit, callback) {
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (items.length) await callback(items.shift());
  });
  await Promise.all(workers);
}

async function sendBusinessCommunicationWhatsApp(businessId, userId, id, recipientRefs, consentConfirmed, suppliedTemplate = null) {
  if (!consentConfirmed) throw badRequest("Confirma que los destinatarios aceptaron recibir esta comunicación antes de enviarla.");
  const found = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!found.rowCount) throw notFound("Comunicación no encontrada.");
  const communication = found.rows[0];
  if (communication.communication_type !== "WHATSAPP") throw badRequest("Esta comunicación no está configurada para WhatsApp.");
  await assertWebShowcaseIsActiveForDelivery(businessId, communication);
  const template = whatsAppTemplateForDelivery(communication, suppliedTemplate);
  const selected = await selectedCommunicationAudience(businessId, recipientRefs);
  const seenPhones = new Set();
  const duplicates = [];
  let invalidPhones = 0;
  const deliverable = [];
  for (const contact of selected) {
    const phone = normalizedWhatsAppPhone(contact.phone);
    if (!phone || phone.length < 7) {
      await saveRecipient({ businessId, communicationId: id, contact, status: "SKIPPED", errorMessage: "Sin teléfono válido para WhatsApp", userId, metadata: { channel: "WHATSAPP", delivery_status: "SKIPPED" } });
      invalidPhones += 1;
      continue;
    }
    if (seenPhones.has(phone)) { duplicates.push({ contact, phone }); continue; }
    seenPhones.add(phone);
    deliverable.push({ contact, phone });
  }
  const results = { attempted: selected.length, unique_phones: seenPhones.size, duplicate_phones: duplicates.length, sent: 0, failed: 0, skipped: invalidPhones, failure_reasons: [] };
  for (const { contact, phone } of duplicates) {
    await saveRecipient({ businessId, communicationId: id, contact, status: "SKIPPED", errorMessage: "Número de WhatsApp duplicado en la audiencia: se envió una sola copia.", userId, metadata: { channel: "WHATSAPP", phone, delivery_status: "DUPLICATE" } });
    results.skipped += 1;
  }
  const pending = [...deliverable];
  await runWithConcurrency(pending, 6, async ({ contact, phone }) => {
    const parameters = whatsappTemplateParameters(template, contact, communication.action_url);
    const message = messageWithActionUrl(personalize(communication.whatsapp_body || "", contact), communication.action_url);
    try {
      const provider = await sendWhatsAppTemplate(businessId, { to: phone, templateName: template.name, languageCode: template.language, bodyParameters: parameters });
      await saveRecipient({ businessId, communicationId: id, contact, status: "SENT", providerMessageId: provider.id, userId, metadata: { channel: "WHATSAPP", phone, template_name: template.name, template_language: template.language, template_parameters: parameters, delivery_status: "ACCEPTED_BY_META", consent_confirmed: true } });
      await logLeadCommunication({ businessId, contact, communication, status: "SENT", message, userId, channel: "whatsapp" });
      results.sent += 1;
    } catch (error) {
      await saveRecipient({ businessId, communicationId: id, contact, status: "FAILED", errorMessage: error.message, userId, metadata: { channel: "WHATSAPP", phone, template_name: template.name, template_language: template.language, delivery_status: "FAILED", consent_confirmed: true } });
      await logLeadCommunication({ businessId, contact, communication, status: "FAILED", message, errorMessage: error.message, userId, channel: "whatsapp" });
      results.failed += 1;
      const reason = String(error.publicMessage || "No se pudo entregar por WhatsApp. Revisa la plantilla y la conexión.").slice(0, 280);
      const known = results.failure_reasons.find((item) => item.message === reason);
      if (known) known.count += 1; else results.failure_reasons.push({ message: reason, count: 1 });
    }
  });
  const updated = await query("update business_communications set status = $3, updated_by = $4, updated_at = now() where id = $1 and business_id = $2 returning *", [id, businessId, results.sent ? "SENT" : communication.status, userId]);
  await syncCommunicationChannelEffort(businessId, userId, updated.rows[0] || communication);
  return { results };
}

async function prepareBusinessCommunicationWhatsApp(businessId, userId, id, recipientRefs, consentConfirmed) {
  if (!consentConfirmed) throw badRequest("Confirma que los destinatarios aceptaron recibir esta comunicación antes de prepararla.");
  const found = await query("select * from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!found.rowCount) throw notFound("Comunicación no encontrada.");
  const communication = found.rows[0];
  if (communication.communication_type !== "WHATSAPP") throw badRequest("Esta comunicación no está configurada para WhatsApp.");
  if (!communication.whatsapp_body) throw badRequest("Completa el mensaje de WhatsApp antes de preparar el lote.");
  await assertWebShowcaseIsActiveForDelivery(businessId, communication);
  const selected = await selectedCommunicationAudience(businessId, recipientRefs);
  const results = { attempted: selected.length, queued: 0, skipped: 0 };
  for (const contact of selected) {
    const phone = normalizedWhatsAppPhone(contact.phone);
    if (phone.length < 7) {
      await saveRecipient({ businessId, communicationId: id, contact, status: "SKIPPED", errorMessage: "Sin teléfono válido para WhatsApp", userId, metadata: { channel: "WHATSAPP" } });
      results.skipped += 1;
      continue;
    }
    await saveRecipient({
      businessId, communicationId: id, contact, status: "QUEUED", userId,
      metadata: { channel: "WHATSAPP", phone, message: messageWithActionUrl(personalize(communication.whatsapp_body, contact), communication.action_url), delivery_status: "QUEUED_FOR_MANUAL_SEND", consent_confirmed: true, web_showcase_id: communication.metadata?.web_showcase_id || null },
    });
    results.queued += 1;
  }
  const updated = await query("update business_communications set status = case when $3 > 0 then 'READY' else status end, updated_by = $4, updated_at = now() where id = $1 and business_id = $2 returning *", [id, businessId, results.queued, userId]);
  await syncCommunicationChannelEffort(businessId, userId, updated.rows[0] || communication);
  return { results, queue: await listBusinessCommunicationWhatsAppQueue(businessId, id) };
}

async function listBusinessCommunicationWhatsAppQueue(businessId, id) {
  const found = await query("select id, communication_type from business_communications where id = $1 and business_id = $2", [id, businessId]);
  if (!found.rowCount) throw notFound("Comunicación no encontrada.");
  if (found.rows[0].communication_type !== "WHATSAPP") throw badRequest("Esta comunicación no está configurada para WhatsApp.");
  const result = await query(
    `select source_id, source_type, recipient_name, status, metadata, created_at
     from business_communication_recipients
     where business_id = $1 and communication_id = $2 and metadata->>'channel' = 'WHATSAPP'
     order by case status when 'QUEUED' then 0 when 'PREPARED' then 1 else 2 end, created_at asc`,
    [businessId, id]
  );
  const queue = result.rows.map((row) => ({
    source_id: row.source_id,
    source_type: row.source_type,
    name: row.recipient_name || "Contacto",
    phone: row.metadata?.phone || "",
    message: row.metadata?.message || "",
    status: row.status,
    prepared_at: row.metadata?.opened_at || null,
  }));
  return { queue, queued: queue.filter((item) => item.status === "QUEUED").length, prepared: queue.filter((item) => item.status === "PREPARED").length };
}

async function markBusinessCommunicationWhatsAppOpened(businessId, userId, id, recipientRef) {
  const recipient = await query(
    `select r.*, bc.campaign_id, bc.activation_id
     from business_communication_recipients r
     join business_communications bc on bc.id = r.communication_id and bc.business_id = r.business_id
     where r.business_id = $1 and r.communication_id = $2 and r.source_id = $3 and r.source_type = $4 and r.metadata->>'channel' = 'WHATSAPP'`,
    [businessId, id, recipientRef.source_id, String(recipientRef.source_type || "PLAYER").toUpperCase()]
  );
  if (!recipient.rowCount) throw notFound("El contacto no pertenece a la cola de WhatsApp de esta comunicación.");
  const row = recipient.rows[0];
  if (row.status === "PREPARED") return { already_prepared: true, recipient: row };
  const updated = await query(
    `update business_communication_recipients
     set status = 'PREPARED', sent_at = now(), metadata = metadata || jsonb_build_object('delivery_status', 'OPENED_FOR_MANUAL_SEND', 'opened_at', now()::text)
     where id = $1 and business_id = $2 returning *`,
    [row.id, businessId]
  );
  const message = String(row.metadata?.message || "");
  const description = "WhatsApp abierto para envío manual desde una comunicación masiva; la entrega no se confirma automáticamente.";
  await query(
    `insert into lead_communications (business_id, lead_id, source_type, source_id, campaign_id, type, channel, subject, message, status, opened_at, metadata, created_by)
     values ($1,$2,$3,$4,$5,'BUSINESS_COMMUNICATION','whatsapp',$6,$7,'opened',now(),$8::jsonb,$9)`,
    [businessId, row.lead_id || null, row.source_type, row.source_id, row.campaign_id || null, "WhatsApp masivo preparado", message, JSON.stringify({ business_communication_id: id, delivery_status: "OPENED_FOR_MANUAL_SEND" }), userId]
  );
  await query(
    `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1,$2,$3,$4,'whatsapp_opened_for_manual_send','WhatsApp abierto para envío manual',$5,$6,$7::jsonb)`,
    [businessId, row.lead_id || null, row.source_type, row.source_id, description, userId, JSON.stringify({ business_communication_id: id, channel: "WHATSAPP", phone: row.metadata?.phone || null, message, delivery_status: "OPENED_FOR_MANUAL_SEND" })]
  );
  return { recipient: updated.rows[0] };
}

async function sendEmailConnectionTest(businessId, userEmail, recipientEmail) {
  const sender = await businessCommunicationSender(businessId, userEmail);
  const recipient = normalizedRecipientEmail(recipientEmail);
  if (!recipient) throw badRequest("Escribe el correo donde quieres recibir la prueba.");
  const provider = await sendBusinessCommunicationEmail({
    apiKey: sender.apiKey,
    from: sender.from,
    to: recipient,
    replyTo: sender.replyTo,
    subject: "Prueba de correo masivo Qori",
    text: "La conexión de Resend quedó lista. Este correo confirma que Qori puede enviar desde el remitente configurado.",
    html: buildEmailMarkup({
      title: "Conexión lista",
      body: "La conexión de Resend quedó lista. Este correo confirma que Qori puede enviar desde el remitente configurado.",
      hasInlineImage: false,
      actionUrl: "",
    }),
  });
  return { ok: true, provider_message_id: provider.id || null, recipient_email: recipient };
}

async function sendWhatsAppConnectionTest(businessId, payload) {
  const phone = normalizedWhatsAppPhone(payload.recipient_phone);
  if (phone.length < 7) throw badRequest("Escribe un número de WhatsApp válido con su prefijo de país.");
  const provider = await sendWhatsAppTemplate(businessId, {
    to: phone,
    templateName: payload.template_name,
    languageCode: payload.language_code,
    bodyParameters: payload.body_parameters,
  });
  return { ok: true, provider_message_id: provider.id || null, recipient_phone: phone };
}

module.exports = {
  createBusinessCommunication,
  getEmailConnectionStatus,
  getWhatsAppConnectionStatus,
  listAudience,
  listBusinessCommunications,
  publishBusinessCommunication,
  prepareBusinessCommunicationWhatsApp,
  listBusinessCommunicationWhatsAppQueue,
  markBusinessCommunicationWhatsAppOpened,
  sendBusinessCommunication,
  sendBusinessCommunicationWhatsApp,
  saveEmailConnection,
  saveWhatsAppConnection,
  sendEmailConnectionTest,
  sendWhatsAppConnectionTest,
  listApprovedWhatsAppTemplates,
  updateBusinessCommunication,
};

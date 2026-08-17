const crypto = require("crypto");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createPostSaleQr } = require("./strategicQrService");

const CATALOG_EVENT_TYPES = new Set([
  "catalog_view",
  "product_view",
  "whatsapp_click",
  "info_click",
  "lead_created_from_catalog",
  "post_sale_ticket_sent",
  "post_sale_ticket_claimed",
  "catalog_order_intent",
  "catalog_return_visit",
]);

const CATALOG_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);
const PRODUCT_TYPES = new Set(["physical", "service", "combo", "advisory", "plan", "voucher", "experience"]);
const STOCK_STATUSES = new Set(["AVAILABLE", "LIMITED", "OUT_OF_STOCK", "HIDDEN"]);
const INTENT_STATUSES = new Set(["INTENT_CREATED", "CONTACTED", "WON", "LOST", "POST_SALE_SENT"]);

function publicBaseUrl() {
  try {
    const parsed = new URL(env.publicAppUrl || "http://localhost:3000");
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

function toSlug(value, fallback = "catalogo") {
  const slug = String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || fallback;
}

function cleanText(value, max = 1000) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
}

function normalizeWhatsapp(value) {
  const digits = cleanPhone(value);
  if (!digits || digits.length < 8 || digits.length > 18) {
    throw badRequest("Configura un numero de WhatsApp valido para el catalogo.");
  }
  return digits;
}

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function moneyNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function activeProductPromotion(product, now = Date.now()) {
  const promotion = metadata(product?.metadata).active_promotion;
  if (!promotion || typeof promotion !== "object") return null;
  const startsAt = new Date(promotion.starts_at || 0).getTime();
  const endsAt = new Date(promotion.ends_at || 0).getTime();
  const promotionalPrice = Number(promotion.promotional_price);
  const basePrice = Number(product?.price);
  if (!Number.isFinite(promotionalPrice) || promotionalPrice < 0 || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt > now || endsAt <= now) return null;
  if (Number.isFinite(basePrice) && basePrice > 0 && promotionalPrice >= basePrice) return null;
  return { ...promotion, promotional_price: promotionalPrice, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString() };
}

function publicProductWithPromotion(product) {
  const promotion = activeProductPromotion(product);
  if (!promotion) return { ...product, active_promotion: null };
  return {
    ...product,
    price: promotion.promotional_price,
    compare_at_price: Number(product.price || 0) || product.compare_at_price || null,
    active_promotion: promotion,
  };
}

function hashIp(value) {
  const raw = String(value || "").split(",")[0].trim();
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 48);
}

function reqSource(meta = {}, body = {}) {
  return cleanText(body.source || meta.source || "smart_catalog", 80);
}

function trackingMetadata(source = {}) {
  return {
    source: source.source || null,
    channel: source.channel || null,
    source_url: source.sourceUrl || null,
    campaign_id: source.campaign_id || null,
    activation_id: source.activation_id || null,
    qr_code_id: source.qr_code_id || null,
    partner_id: source.partner_id || null,
    branch_id: source.branch_id || null,
    partner_name: source.partner_name || null,
    referral_source: source.referral_source || null,
  };
}

async function uniqueCatalogSlug(client, baseSlug, currentId = null) {
  const base = toSlug(baseSlug, "catalogo");
  let candidate = base;
  for (let index = 2; index < 80; index += 1) {
    const result = await client.query(
      "select id from smart_catalogs where slug = $1 and ($2::uuid is null or id <> $2) limit 1",
      [candidate, currentId]
    );
    if (!result.rowCount) return candidate;
    candidate = `${base}-${index}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function uniqueProductSlug(client, catalogId, baseSlug, currentId = null) {
  const base = toSlug(baseSlug, "producto");
  let candidate = base;
  for (let index = 2; index < 80; index += 1) {
    const result = await client.query(
      "select id from smart_catalog_products where catalog_id = $1 and slug = $2 and ($3::uuid is null or id <> $3) limit 1",
      [catalogId, candidate, currentId]
    );
    if (!result.rowCount) return candidate;
    candidate = `${base}-${index}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function catalogPublicUrl(slug) {
  return `${publicBaseUrl()}/c/${encodeURIComponent(slug)}`;
}

function mapCatalog(row = {}) {
  return {
    ...row,
    public_url: row.slug ? catalogPublicUrl(row.slug) : null,
  };
}

function mapProductPayload(body = {}, userId = null) {
  const productType = String(body.product_type || "physical").trim();
  const stockStatus = String(body.stock_status || "AVAILABLE").trim().toUpperCase();
  if (!PRODUCT_TYPES.has(productType)) throw badRequest("Tipo de producto no valido para el catalogo.");
  if (!STOCK_STATUSES.has(stockStatus)) throw badRequest("Estado de stock no valido.");
  return {
    inventory_product_id: body.inventory_product_id || null,
    name: cleanText(body.name, 180),
    slug: body.slug ? toSlug(body.slug, "producto") : null,
    product_type: productType,
    description: cleanText(body.description, 4000),
    short_description: cleanText(body.short_description || body.description, 260),
    category: cleanText(body.category, 120),
    price: body.price === "" || body.price === null || body.price === undefined ? null : moneyNumber(body.price, 0),
    compare_at_price: body.compare_at_price === "" || body.compare_at_price === null || body.compare_at_price === undefined ? null : moneyNumber(body.compare_at_price, 0),
    currency: cleanText(body.currency || "COP", 8) || "COP",
    image_url: cleanText(body.image_url, 1_600_000),
    gallery: jsonArray(body.gallery),
    tags: jsonArray(body.tags),
    benefits: jsonArray(body.benefits),
    ingredients_or_details: cleanText(body.ingredients_or_details, 4000),
    stock_status: stockStatus,
    cta_label: cleanText(body.cta_label || "Ordenar por WhatsApp", 80) || "Ordenar por WhatsApp",
    whatsapp_message_template: cleanText(body.whatsapp_message_template, 600),
    display_order: Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0,
    is_featured: body.is_featured === true,
    metadata: metadata(body.metadata),
    created_by_user_id: userId,
  };
}

function mapCatalogPayload(body = {}, userId = null) {
  const status = String(body.status || "DRAFT").trim().toUpperCase();
  if (!CATALOG_STATUSES.has(status)) throw badRequest("Estado de catalogo no valido.");
  const title = cleanText(body.title, 180);
  if (!title) throw badRequest("El catalogo necesita titulo.");
  return {
    title,
    slug: body.slug ? toSlug(body.slug, "catalogo") : toSlug(title, "catalogo"),
    description: cleanText(body.description, 1400),
    brand_name: cleanText(body.brand_name || title, 180),
    brand_logo_url: cleanText(body.brand_logo_url, 1200),
    cover_image_url: cleanText(body.cover_image_url, 1200),
    whatsapp_number: normalizeWhatsapp(body.whatsapp_number),
    default_cta_label: cleanText(body.default_cta_label || "Ordenar por WhatsApp", 80) || "Ordenar por WhatsApp",
    theme_color: cleanText(body.theme_color || "#0759d6", 32) || "#0759d6",
    status,
    linked_campaign_id: body.linked_campaign_id || null,
    linked_activation_id: body.linked_activation_id || null,
    linked_lead_capture_id: body.linked_lead_capture_id || null,
    linked_reward_id: body.linked_reward_id || null,
    metadata: metadata(body.metadata),
    created_by_user_id: userId,
  };
}

async function assertCatalog(client, businessId, catalogId) {
  const result = await client.query(
    "select * from smart_catalogs where id = $1 and business_id = $2",
    [catalogId, businessId]
  );
  if (!result.rowCount) throw notFound("Catalogo no encontrado.");
  return result.rows[0];
}

async function assertProduct(client, businessId, catalogId, productId) {
  const result = await client.query(
    "select * from smart_catalog_products where id = $1 and catalog_id = $2 and business_id = $3",
    [productId, catalogId, businessId]
  );
  if (!result.rowCount) throw notFound("Producto de catalogo no encontrado.");
  return result.rows[0];
}

async function listCatalogs(businessId) {
  const result = await query(
    `select c.*,
            count(distinct p.id)::int as product_count,
            count(e.id) filter (where e.event_type = 'catalog_view')::int as view_count,
            count(e.id) filter (where e.event_type = 'whatsapp_click')::int as whatsapp_clicks,
            count(distinct i.id)::int as intent_count,
            count(distinct i.id) filter (where i.status in ('WON', 'POST_SALE_SENT'))::int as won_count,
            coalesce(sum(i.sale_amount) filter (where i.status in ('WON', 'POST_SALE_SENT')), 0)::numeric(14,2) as revenue_attributed
       from smart_catalogs c
       left join smart_catalog_products p on p.catalog_id = c.id and p.stock_status <> 'HIDDEN'
       left join smart_catalog_events e on e.catalog_id = c.id
       left join smart_catalog_order_intents i on i.catalog_id = c.id
      where c.business_id = $1 and c.status <> 'ARCHIVED'
      group by c.id
      order by c.updated_at desc`,
    [businessId]
  );
  return result.rows.map(mapCatalog);
}

async function dashboard(businessId) {
  const [summary, topProducts, recentIntents] = await Promise.all([
    query(
      `select
          count(distinct c.id) filter (where c.status = 'ACTIVE')::int as active_catalogs,
          count(e.id) filter (where e.event_type = 'catalog_view')::int as catalog_views,
          count(e.id) filter (where e.event_type = 'whatsapp_click')::int as whatsapp_clicks,
          count(e.id) filter (where e.event_type = 'lead_created_from_catalog')::int as leads_created,
          count(distinct i.id)::int as intents,
          count(distinct i.id) filter (where i.status in ('WON', 'POST_SALE_SENT'))::int as won_intents,
          coalesce(sum(i.sale_amount) filter (where i.status in ('WON', 'POST_SALE_SENT')), 0)::numeric(14,2) as revenue_attributed,
          coalesce(sum(coalesce(p.price, 0)) filter (where i.id is not null), 0)::numeric(14,2) as revenue_potential
       from smart_catalogs c
       left join smart_catalog_events e on e.catalog_id = c.id
       left join smart_catalog_order_intents i on i.catalog_id = c.id
       left join smart_catalog_products p on p.id = i.product_id
       where c.business_id = $1 and c.status <> 'ARCHIVED'`,
      [businessId]
    ),
    query(
      `select p.id, p.name, p.category, p.price, p.currency, c.title as catalog_title,
              count(e.id) filter (where e.event_type = 'product_view')::int as views,
              count(e.id) filter (where e.event_type = 'whatsapp_click')::int as whatsapp_clicks,
              count(i.id)::int as intents
       from smart_catalog_products p
       join smart_catalogs c on c.id = p.catalog_id
       left join smart_catalog_events e on e.product_id = p.id
       left join smart_catalog_order_intents i on i.product_id = p.id
       where p.business_id = $1 and c.status <> 'ARCHIVED'
       group by p.id, c.title
       order by intents desc, whatsapp_clicks desc, views desc, p.updated_at desc
       limit 8`,
      [businessId]
    ),
    query(
      `select i.*, c.title as catalog_title, p.name as product_name, ml.name as lead_name, ml.phone as lead_phone
       from smart_catalog_order_intents i
       join smart_catalogs c on c.id = i.catalog_id
       left join smart_catalog_products p on p.id = i.product_id
       left join business_manual_leads ml on ml.id = i.lead_id
       where i.business_id = $1
       order by i.created_at desc
       limit 8`,
      [businessId]
    ),
  ]);
  const totals = summary.rows[0] || {};
  const views = Number(totals.catalog_views || 0);
  const clicks = Number(totals.whatsapp_clicks || 0);
  const intents = Number(totals.intents || 0);
  const won = Number(totals.won_intents || 0);
  return {
    summary: {
      ...totals,
      view_to_whatsapp_rate: views ? Number(((clicks / views) * 100).toFixed(1)) : 0,
      intent_to_won_rate: intents ? Number(((won / intents) * 100).toFixed(1)) : 0,
    },
    top_products: topProducts.rows,
    recent_intents: recentIntents.rows,
  };
}

async function createCatalog(businessId, user, body) {
  const payload = mapCatalogPayload(body, user.id);
  const result = await withTransaction(async (client) => {
    const slug = await uniqueCatalogSlug(client, payload.slug);
    return client.query(
      `insert into smart_catalogs
        (business_id, title, slug, description, brand_name, brand_logo_url, cover_image_url, whatsapp_number,
         default_cta_label, theme_color, status, linked_campaign_id, linked_activation_id, linked_lead_capture_id,
         linked_reward_id, metadata, created_by_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17)
       returning *`,
      [
        businessId,
        payload.title,
        slug,
        payload.description,
        payload.brand_name,
        payload.brand_logo_url,
        payload.cover_image_url,
        payload.whatsapp_number,
        payload.default_cta_label,
        payload.theme_color,
        payload.status,
        payload.linked_campaign_id,
        payload.linked_activation_id,
        payload.linked_lead_capture_id,
        payload.linked_reward_id,
        JSON.stringify(payload.metadata),
        payload.created_by_user_id,
      ]
    );
  });
  return mapCatalog(result.rows[0]);
}

async function updateCatalog(businessId, catalogId, body) {
  const existing = await query("select * from smart_catalogs where id = $1 and business_id = $2", [catalogId, businessId]);
  if (!existing.rowCount) throw notFound("Catalogo no encontrado.");
  const merged = { ...existing.rows[0], ...body };
  const payload = mapCatalogPayload(merged, existing.rows[0].created_by_user_id);
  const result = await withTransaction(async (client) => {
    const slug = body.slug ? await uniqueCatalogSlug(client, payload.slug, catalogId) : existing.rows[0].slug;
    return client.query(
      `update smart_catalogs
       set title = $3, slug = $4, description = $5, brand_name = $6, brand_logo_url = $7,
           cover_image_url = $8, whatsapp_number = $9, default_cta_label = $10, theme_color = $11,
           status = $12, linked_campaign_id = $13, linked_activation_id = $14, linked_lead_capture_id = $15,
           linked_reward_id = $16, metadata = $17::jsonb, updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [
        catalogId,
        businessId,
        payload.title,
        slug,
        payload.description,
        payload.brand_name,
        payload.brand_logo_url,
        payload.cover_image_url,
        payload.whatsapp_number,
        payload.default_cta_label,
        payload.theme_color,
        payload.status,
        payload.linked_campaign_id,
        payload.linked_activation_id,
        payload.linked_lead_capture_id,
        payload.linked_reward_id,
        JSON.stringify({ ...metadata(existing.rows[0].metadata), ...payload.metadata }),
      ]
    );
  });
  return mapCatalog(result.rows[0]);
}

async function archiveCatalog(businessId, catalogId) {
  const result = await query(
    "update smart_catalogs set status = 'ARCHIVED', updated_at = now() where id = $1 and business_id = $2 returning *",
    [catalogId, businessId]
  );
  if (!result.rowCount) throw notFound("Catalogo no encontrado.");
  return mapCatalog(result.rows[0]);
}

async function catalogDetail(businessId, catalogId) {
  const [catalog, products, intents, events] = await Promise.all([
    query("select * from smart_catalogs where id = $1 and business_id = $2", [catalogId, businessId]),
    listProducts(businessId, catalogId),
    listIntents(businessId, { catalog_id: catalogId, limit: 40 }),
    query(
      `select event_type, count(*)::int as total
       from smart_catalog_events
       where business_id = $1 and catalog_id = $2
       group by event_type`,
      [businessId, catalogId]
    ),
  ]);
  if (!catalog.rowCount) throw notFound("Catalogo no encontrado.");
  return { catalog: mapCatalog(catalog.rows[0]), products, intents: intents.intents, event_counts: events.rows };
}

async function listProducts(businessId, catalogId) {
  const result = await query(
    `select p.*,
            count(e.id) filter (where e.event_type = 'product_view')::int as view_count,
            count(e.id) filter (where e.event_type = 'whatsapp_click')::int as whatsapp_clicks,
            count(i.id)::int as intent_count
     from smart_catalog_products p
     left join smart_catalog_events e on e.product_id = p.id
     left join smart_catalog_order_intents i on i.product_id = p.id
     where p.business_id = $1 and p.catalog_id = $2
     group by p.id
     order by p.display_order asc, p.is_featured desc, p.updated_at desc`,
    [businessId, catalogId]
  );
  return result.rows;
}

async function createProduct(businessId, catalogId, user, body) {
  const payload = mapProductPayload(body, user.id);
  if (!payload.name) throw badRequest("El producto necesita nombre.");
  const result = await withTransaction(async (client) => {
    await assertCatalog(client, businessId, catalogId);
    const slug = await uniqueProductSlug(client, catalogId, payload.slug || payload.name);
    return client.query(
      `insert into smart_catalog_products
        (business_id, catalog_id, inventory_product_id, name, slug, product_type, description, short_description,
         category, price, compare_at_price, currency, image_url, gallery, tags, benefits, ingredients_or_details,
         stock_status, cta_label, whatsapp_message_template, display_order, is_featured, metadata, created_by_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17,
               $18, $19, $20, $21, $22, $23::jsonb, $24)
       returning *`,
      [
        businessId,
        catalogId,
        payload.inventory_product_id,
        payload.name,
        slug,
        payload.product_type,
        payload.description,
        payload.short_description,
        payload.category,
        payload.price,
        payload.compare_at_price,
        payload.currency,
        payload.image_url,
        JSON.stringify(payload.gallery),
        JSON.stringify(payload.tags),
        JSON.stringify(payload.benefits),
        payload.ingredients_or_details,
        payload.stock_status,
        payload.cta_label,
        payload.whatsapp_message_template,
        payload.display_order,
        payload.is_featured,
        JSON.stringify(payload.metadata),
        payload.created_by_user_id,
      ]
    );
  });
  return result.rows[0];
}

async function updateProduct(businessId, catalogId, productId, body) {
  const existing = await query(
    "select * from smart_catalog_products where id = $1 and catalog_id = $2 and business_id = $3",
    [productId, catalogId, businessId]
  );
  if (!existing.rowCount) throw notFound("Producto de catalogo no encontrado.");
  const payload = mapProductPayload({ ...existing.rows[0], ...body }, existing.rows[0].created_by_user_id);
  const result = await withTransaction(async (client) => {
    const slug = body.slug ? await uniqueProductSlug(client, catalogId, payload.slug || payload.name, productId) : existing.rows[0].slug;
    return client.query(
      `update smart_catalog_products
       set inventory_product_id = $4, name = $5, slug = $6, product_type = $7, description = $8,
           short_description = $9, category = $10, price = $11, compare_at_price = $12, currency = $13,
           image_url = $14, gallery = $15::jsonb, tags = $16::jsonb, benefits = $17::jsonb,
           ingredients_or_details = $18, stock_status = $19, cta_label = $20, whatsapp_message_template = $21,
           display_order = $22, is_featured = $23, metadata = $24::jsonb, updated_at = now()
       where id = $1 and catalog_id = $2 and business_id = $3
       returning *`,
      [
        productId,
        catalogId,
        businessId,
        payload.inventory_product_id,
        payload.name,
        slug,
        payload.product_type,
        payload.description,
        payload.short_description,
        payload.category,
        payload.price,
        payload.compare_at_price,
        payload.currency,
        payload.image_url,
        JSON.stringify(payload.gallery),
        JSON.stringify(payload.tags),
        JSON.stringify(payload.benefits),
        payload.ingredients_or_details,
        payload.stock_status,
        payload.cta_label,
        payload.whatsapp_message_template,
        payload.display_order,
        payload.is_featured,
        JSON.stringify({ ...metadata(existing.rows[0].metadata), ...payload.metadata }),
      ]
    );
  });
  return result.rows[0];
}

async function deleteProduct(businessId, catalogId, productId) {
  const result = await query(
    "update smart_catalog_products set stock_status = 'HIDDEN', updated_at = now() where id = $1 and catalog_id = $2 and business_id = $3 returning id",
    [productId, catalogId, businessId]
  );
  if (!result.rowCount) throw notFound("Producto de catalogo no encontrado.");
  return { ok: true, id: productId };
}

async function recordEvent(clientOrQuery, payload, reqMeta = {}) {
  if (!CATALOG_EVENT_TYPES.has(payload.event_type)) throw badRequest("Evento de catalogo no valido.");
  const runner = clientOrQuery?.query ? clientOrQuery : { query };
  const result = await runner.query(
    `insert into smart_catalog_events
      (business_id, catalog_id, product_id, lead_id, campaign_id, activation_id, qr_code_id, event_type,
       source, channel, partner_id, branch_id, partner_name, referral_source, user_agent, ip_hash, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
     returning *`,
    [
      payload.business_id,
      payload.catalog_id,
      payload.product_id || null,
      payload.lead_id || null,
      payload.campaign_id || null,
      payload.activation_id || null,
      payload.qr_code_id || null,
      payload.event_type,
      payload.source || "smart_catalog",
      payload.channel || "public_catalog",
      payload.partner_id || null,
      payload.branch_id || null,
      payload.partner_name || null,
      payload.referral_source || null,
      reqMeta.userAgent || payload.user_agent || null,
      hashIp(reqMeta.ip || payload.ip),
      JSON.stringify(payload.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function getPublicCatalog(slug, reqMeta = {}, params = {}) {
  const catalogResult = await query(
    `select c.*, b.name as business_name
     from smart_catalogs c
     join businesses b on b.id = c.business_id
     where c.slug = $1 and c.status = 'ACTIVE'`,
    [slug]
  );
  if (!catalogResult.rowCount) throw notFound("Catalogo no encontrado o no publicado.");
  const catalog = catalogResult.rows[0];
  const products = await query(
    `select *
     from smart_catalog_products
     where catalog_id = $1 and business_id = $2 and stock_status <> 'HIDDEN'
     order by is_featured desc, display_order asc, updated_at desc`,
    [catalog.id, catalog.business_id]
  );
  await recordEvent(query, {
    business_id: catalog.business_id,
    catalog_id: catalog.id,
    event_type: params.return_visit ? "catalog_return_visit" : "catalog_view",
    campaign_id: params.campaign_id || catalog.linked_campaign_id || null,
    activation_id: params.activation_id || catalog.linked_activation_id || null,
    qr_code_id: params.qr_code_id || null,
    source: params.source || "public_catalog",
    channel: params.channel || "catalog_link",
    partner_id: params.partner_id || null,
    branch_id: params.branch_id || null,
    partner_name: params.partner_name || null,
    referral_source: params.referral_source || null,
    metadata: trackingMetadata(params),
  }, reqMeta);
  return {
    catalog: mapCatalog(catalog),
    products: products.rows.map(publicProductWithPromotion),
    categories: [...new Set(products.rows.map((item) => item.category).filter(Boolean))],
  };
}

async function publicProduct(slug, productSlug, reqMeta = {}, params = {}) {
  const data = await getPublicCatalog(slug, reqMeta, { ...params, return_visit: true });
  const product = data.products.find((item) => item.slug === productSlug);
  if (!product) throw notFound("Producto no encontrado.");
  await recordEvent(query, {
    business_id: data.catalog.business_id,
    catalog_id: data.catalog.id,
    product_id: product.id,
    event_type: "product_view",
    campaign_id: params.campaign_id || data.catalog.linked_campaign_id || null,
    activation_id: params.activation_id || data.catalog.linked_activation_id || null,
    qr_code_id: params.qr_code_id || null,
    source: params.source || "public_catalog",
    channel: params.channel || "catalog_product",
    metadata: trackingMetadata(params),
  }, reqMeta);
  return { ...data, product };
}

async function findOrCreateCatalogLead(client, catalog, product, body, userId = null) {
  const name = cleanText(body.customer_name || body.name, 160);
  const phone = cleanText(body.customer_phone || body.phone, 40);
  const email = cleanText(body.customer_email || body.email, 160);
  const documentType = cleanText(body.customer_document_type, 20);
  const documentId = cleanText(body.customer_document, 60);
  if (!name || !phone || !documentType || !documentId) {
    throw badRequest("Nombre, WhatsApp y documento son requeridos para ordenar desde el catálogo.");
  }
  const matches = await client.query(
    `select * from business_manual_leads
     where business_id = $1
        and ((document_id is not null and lower(regexp_replace(document_id, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace($2, '[^a-zA-Z0-9]', '', 'g')))
         or (phone is not null and regexp_replace(phone, '\\D', '', 'g') = regexp_replace($3, '\\D', '', 'g'))
         or (email is not null and lower(email) = lower($4)))
     order by updated_at desc
     limit 10`,
    [catalog.business_id, documentId, phone, email || ""]
  );
  const leadMetadata = {
    source_module: "smart_catalog",
    catalog_id: catalog.id,
    catalog_title: catalog.title,
    product_id: product?.id || null,
    product_name: product?.name || null,
  };
  const normalizedDocument = documentId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const sameDocument = matches.rows.find((row) => String(row.document_id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === normalizedDocument);
  const conflictingContact = matches.rows.find((row) => row.document_id && String(row.document_id).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() !== normalizedDocument);
  if (conflictingContact) {
    throw badRequest("El teléfono o correo ya pertenece a otro documento registrado. Verifica los datos antes de continuar.");
  }
  const existing = sameDocument || matches.rows[0] || null;
  if (existing) {
    const updated = await client.query(
      `update business_manual_leads
        set name = coalesce(nullif($3, ''), name),
            email = coalesce(nullif($4, ''), email),
            phone = coalesce(nullif($5, ''), phone),
            document_type = coalesce(nullif($6, ''), document_type),
            document_id = coalesce(nullif($7, ''), document_id),
            interest = coalesce(nullif($8, ''), interest),
            source = 'Catalogo Qori',
            source_detail = $9,
            metadata = coalesce(metadata, '{}'::jsonb) || $10::jsonb,
            updated_at = now()
        where id = $1 and business_id = $2
        returning *`,
      [
        existing.id,
        catalog.business_id,
        name,
        email,
        phone,
        documentType,
        documentId,
        product?.name || catalog.title,
        catalog.title,
        JSON.stringify(leadMetadata),
      ]
    );
    return { lead: updated.rows[0], created: false };
  }
  const created = await client.query(
    `insert into business_manual_leads
      (business_id, created_by_user_id, name, email, phone, document_type, document_id, source, source_detail, interest, status, priority, notes, metadata)
      values ($1, $2, $3, $4, $5, $6, $7, 'Catalogo Qori', $8, $9, 'NEW', 'HIGH', $10, $11::jsonb)
     returning *`,
    [
      catalog.business_id,
      userId,
      name,
      email,
      phone,
      documentType,
      documentId,
      catalog.title,
      product?.name || catalog.title,
      "Lead creado desde catalogo accionable conectado a WhatsApp.",
      JSON.stringify(leadMetadata),
    ]
  );
  return { lead: created.rows[0], created: true };
}

function buildWhatsappMessage(catalog, product, lead, body = {}) {
  const template = product?.whatsapp_message_template || body.whatsapp_message_template || "";
  const base = template || "Hola, vengo desde Qori. Me interesa ordenar: {product_name}. Mi nombre es {lead_name}. Vi el catalogo: {catalog_title}. Origen: {origin}.";
  return base
    .replace(/\{product_name\}/g, product?.name || "producto del catalogo")
    .replace(/\{lead_name\}/g, lead?.name || body.customer_name || "cliente interesado")
    .replace(/\{catalog_title\}/g, catalog.title)
    .replace(/\{campaign_name\}/g, body.campaign_name || catalog.metadata?.campaign_name || "catalogo")
    .replace(/\{origin\}/g, body.source || body.referral_source || "catalogo Qori");
}

async function syncIntentWithRms(client, intent, lead, phase = "procesamiento", userId = null) {
  const revenuePotential = moneyNumber(intent.sale_amount || intent.product_price || intent.price || 0);
  const meta = {
    source_module: "smart_catalog",
    catalog_id: intent.catalog_id,
    product_id: intent.product_id,
    catalog_order_intent_id: intent.id,
    rms_stage: intent.rms_stage,
    product_name: intent.product_name || null,
    whatsapp_number_sent_to: intent.whatsapp_number_sent_to || null,
  };
  await client.query(
    `insert into rms_lead_state
      (business_id, source_type, source_id, lead_id, rms_phase, priority, recommended_action, last_operation, last_material_sent, revenue_potential, metadata, created_by, updated_by)
     values ($1, 'MANUAL', $2, null, $3, 'HIGH', $4, $5, 'catalogo_whatsapp', $6, $7::jsonb, $8, $8)
     on conflict (business_id, source_type, source_id)
     do update set rms_phase = excluded.rms_phase,
                   priority = 'HIGH',
                   recommended_action = excluded.recommended_action,
                   last_operation = excluded.last_operation,
                   last_material_sent = excluded.last_material_sent,
                   revenue_potential = greatest(rms_lead_state.revenue_potential, excluded.revenue_potential),
                   metadata = coalesce(rms_lead_state.metadata, '{}'::jsonb) || excluded.metadata,
                   updated_by = excluded.updated_by,
                   updated_at = now()`,
    [
      intent.business_id,
      lead.id,
      phase,
      phase === "postventa" ? "Enviar encuesta, garantia o beneficio de recompra" : "Contactar por WhatsApp y cerrar pedido",
      phase === "postventa" ? "Venta canónica registrada desde Catalogos Qori" : "Intencion de pedido detectada desde Catalogos Qori",
      revenuePotential,
      JSON.stringify(meta),
      userId,
    ]
  );
  await client.query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, material_type, created_by, metadata)
     values ($1, 'MANUAL', $2, null, $3, $4, $5, $6, $7, 'smart_catalog', $8, $9::jsonb)`,
    [
      intent.business_id,
      lead.id,
      phase === "postventa" ? "sale_attributed" : "catalog_order_intent",
      phase === "postventa" ? "Venta atribuida desde catalogo" : "Intencion de pedido desde catalogo",
      phase === "postventa" ? "La intencion del catalogo fue marcada como vendida y quedó disponible para Postventa." : "El catalogo genero una accion comercial para WhatsApp.",
      phase,
      phase === "postventa" ? "register_revenue" : "commercial_process",
      userId,
      JSON.stringify(meta),
    ]
  );
}

async function createWhatsappIntent(slug, productId, body = {}, reqMeta = {}) {
  return withTransaction(async (client) => {
    const catalogResult = await client.query(
      "select * from smart_catalogs where slug = $1 and status = 'ACTIVE'",
      [slug]
    );
    if (!catalogResult.rowCount) throw notFound("Catalogo no encontrado o no publicado.");
    const catalog = catalogResult.rows[0];
    const product = productId
      ? (await client.query(
        "select * from smart_catalog_products where id = $1 and catalog_id = $2 and business_id = $3 and stock_status <> 'HIDDEN'",
        [productId, catalog.id, catalog.business_id]
      )).rows[0]
      : null;
    if (productId && !product) throw notFound("Producto no encontrado.");
    if (product && product.stock_status === "OUT_OF_STOCK") throw badRequest("Este producto no esta disponible.");

    const { lead, created } = await findOrCreateCatalogLead(client, catalog, product, body);
    const offeredProduct = product ? publicProductWithPromotion(product) : product;
    const messageBody = buildWhatsappMessage(catalog, offeredProduct, lead, body);
    const whatsappNumber = normalizeWhatsapp(catalog.whatsapp_number);
    const intentResult = await client.query(
      `insert into smart_catalog_order_intents
        (business_id, catalog_id, product_id, lead_id, campaign_id, activation_id, qr_code_id,
         customer_name, customer_phone, customer_email, whatsapp_number_sent_to, message_body,
         status, rms_stage, partner_id, branch_id, partner_name, referral_source, sale_amount, sale_currency, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'INTENT_CREATED', 'INTENT_DETECTED', $13, $14, $15, $16, $17, $18, $19::jsonb)
       returning *`,
      [
        catalog.business_id,
        catalog.id,
        product?.id || null,
        lead.id,
        body.campaign_id || catalog.linked_campaign_id || null,
        body.activation_id || catalog.linked_activation_id || null,
        body.qr_code_id || null,
        lead.name,
        lead.phone,
        lead.email,
        whatsappNumber,
        messageBody,
        body.partner_id || null,
        body.branch_id || null,
        cleanText(body.partner_name, 160),
        cleanText(body.referral_source || body.source, 160),
        offeredProduct?.price || null,
        offeredProduct?.currency || "COP",
        JSON.stringify({
          ...metadata(body.metadata),
          ...trackingMetadata(body),
          source_module: "smart_catalog",
          active_promotion: offeredProduct?.active_promotion || null,
        }),
      ]
    );
    const intent = { ...intentResult.rows[0], product_name: offeredProduct?.name, product_price: offeredProduct?.price };
    if (created) {
      await recordEvent(client, {
        business_id: catalog.business_id,
        catalog_id: catalog.id,
        product_id: product?.id || null,
        lead_id: lead.id,
        event_type: "lead_created_from_catalog",
        campaign_id: body.campaign_id || catalog.linked_campaign_id || null,
        activation_id: body.activation_id || catalog.linked_activation_id || null,
        qr_code_id: body.qr_code_id || null,
        source: reqSource(reqMeta, body),
        channel: body.channel || "whatsapp",
        metadata: { intent_id: intent.id },
      }, reqMeta);
    }
    await recordEvent(client, {
      business_id: catalog.business_id,
      catalog_id: catalog.id,
      product_id: product?.id || null,
      lead_id: lead.id,
      event_type: "whatsapp_click",
      campaign_id: body.campaign_id || catalog.linked_campaign_id || null,
      activation_id: body.activation_id || catalog.linked_activation_id || null,
      qr_code_id: body.qr_code_id || null,
      source: reqSource(reqMeta, body),
      channel: body.channel || "whatsapp",
      metadata: { intent_id: intent.id },
    }, reqMeta);
    await recordEvent(client, {
      business_id: catalog.business_id,
      catalog_id: catalog.id,
      product_id: product?.id || null,
      lead_id: lead.id,
      event_type: "catalog_order_intent",
      campaign_id: body.campaign_id || catalog.linked_campaign_id || null,
      activation_id: body.activation_id || catalog.linked_activation_id || null,
      qr_code_id: body.qr_code_id || null,
      source: reqSource(reqMeta, body),
      channel: body.channel || "whatsapp",
      metadata: { intent_id: intent.id },
    }, reqMeta);
    await syncIntentWithRms(client, intent, lead, "procesamiento", null);
    return {
      intent,
      lead,
      whatsapp_url: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageBody)}`,
      message_body: messageBody,
    };
  });
}

async function listIntents(businessId, filters = {}) {
  const params = [businessId];
  const clauses = ["i.business_id = $1"];
  if (filters.catalog_id) {
    params.push(filters.catalog_id);
    clauses.push(`i.catalog_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(String(filters.status).toUpperCase());
    clauses.push(`i.status = $${params.length}`);
  }
  const limit = Math.min(Number(filters.limit || 120) || 120, 300);
  params.push(limit);
  const result = await query(
    `select i.*, c.title as catalog_title, c.slug as catalog_slug, p.name as product_name, p.price as product_price,
            p.currency as product_currency, ml.name as lead_name, ml.phone as lead_phone, ml.email as lead_email
     from smart_catalog_order_intents i
     join smart_catalogs c on c.id = i.catalog_id
     left join smart_catalog_products p on p.id = i.product_id
     left join business_manual_leads ml on ml.id = i.lead_id
     where ${clauses.join(" and ")}
     order by i.updated_at desc, i.created_at desc
     limit $${params.length}`,
    params
  );
  return { intents: result.rows };
}

async function updateIntent(businessId, intentId, body = {}, user = null) {
  const status = body.status ? String(body.status).toUpperCase() : null;
  if (status && !INTENT_STATUSES.has(status)) throw badRequest("Estado de intencion no valido.");
  const result = await query(
    `update smart_catalog_order_intents
     set status = coalesce($3, status),
         sale_notes = case when $4 then $5 else sale_notes end,
         metadata = coalesce(metadata, '{}'::jsonb) || $6::jsonb,
         updated_at = now()
     where id = $1 and business_id = $2
     returning *`,
    [
      intentId,
      businessId,
      status,
      Object.prototype.hasOwnProperty.call(body, "sale_notes"),
      body.sale_notes || null,
      JSON.stringify({ updated_by: user?.id || null, ...(metadata(body.metadata)) }),
    ]
  );
  if (!result.rowCount) throw notFound("Intencion de catalogo no encontrada.");
  return result.rows[0];
}

async function markWon(businessId, intentId, body = {}, user) {
  return withTransaction(async (client) => {
    const intentResult = await client.query(
      `select i.*, c.title as catalog_title, c.linked_campaign_id, p.name as product_name, p.price as product_price, p.currency as product_currency,
              ml.id as lead_row_id, ml.name as lead_name, ml.phone as lead_phone, ml.email as lead_email
       from smart_catalog_order_intents i
       join smart_catalogs c on c.id = i.catalog_id
       left join smart_catalog_products p on p.id = i.product_id
       left join business_manual_leads ml on ml.id = i.lead_id
       where i.id = $1 and i.business_id = $2`,
      [intentId, businessId]
    );
    if (!intentResult.rowCount) throw notFound("Intencion de catalogo no encontrada.");
    const row = intentResult.rows[0];
    const saleAmount = moneyNumber(body.sale_amount, moneyNumber(row.product_price, moneyNumber(row.sale_amount, 0)));
    const sale = await client.query(
      `insert into business_sales
        (business_id, campaign_id, customer_name, customer_phone, customer_email, product_name, sale_amount, currency, seller_user_id, acquisition_source, acquisition_channel, notes, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Catalogos Qori', 'smart_catalog', $10, $11::jsonb)
       returning *`,
      [
        businessId,
        row.campaign_id || row.linked_campaign_id || null,
        row.lead_name || row.customer_name,
        row.lead_phone || row.customer_phone,
        row.lead_email || row.customer_email,
        row.product_name,
        saleAmount,
        body.currency || row.product_currency || row.sale_currency || "COP",
        user.id,
        body.notes || row.sale_notes || null,
        JSON.stringify({ catalog_order_intent_id: row.id, catalog_id: row.catalog_id, product_id: row.product_id, source_module: "smart_catalog" }),
      ]
    );
    const updated = await client.query(
      `update smart_catalog_order_intents
       set status = 'WON',
           rms_stage = 'SALE_ATTRIBUTED',
           sale_amount = $3,
           sale_currency = $4,
           sale_notes = $5,
           metadata = coalesce(metadata, '{}'::jsonb) || $6::jsonb,
           updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [
        intentId,
        businessId,
        saleAmount,
        body.currency || row.product_currency || row.sale_currency || "COP",
        body.notes || row.sale_notes || null,
        JSON.stringify({ sale_id: sale.rows[0].id, marked_won_by: user.id }),
      ]
    );
    if (row.lead_row_id) {
      await client.query(
        "update business_manual_leads set status = 'CONVERTED', updated_at = now() where id = $1 and business_id = $2",
        [row.lead_row_id, businessId]
      );
      await syncIntentWithRms(client, { ...updated.rows[0], product_name: row.product_name, product_price: saleAmount }, { id: row.lead_row_id }, "postventa", user.id);
    }
    return { intent: updated.rows[0], sale: sale.rows[0] };
  });
}

async function createAgendaTask(businessId, intentId, body = {}, user) {
  const result = await withTransaction(async (client) => {
    const intent = await client.query(
      `select i.*, c.title as catalog_title, p.name as product_name
       from smart_catalog_order_intents i
       join smart_catalogs c on c.id = i.catalog_id
       left join smart_catalog_products p on p.id = i.product_id
       where i.id = $1 and i.business_id = $2`,
      [intentId, businessId]
    );
    if (!intent.rowCount) throw notFound("Intencion de catalogo no encontrada.");
    const row = intent.rows[0];
    if (!row.lead_id) throw badRequest("La intencion no tiene lead asociado para agenda.");
    const task = await client.query(
      `insert into lead_notes
        (business_id, lead_id, source_type, source_id, note, note_type, next_action, reminder_at, agenda_priority, progress_percent, checklist, metadata, created_by)
       values ($1, null, 'MANUAL', $2, $3, 'follow_up', $4, $5, $6, 0, '[]'::jsonb, $7::jsonb, $8)
       returning *`,
      [
        businessId,
        row.lead_id,
        body.note || `Intencion de pedido desde ${row.catalog_title}: ${row.product_name || "producto del catalogo"}.`,
        body.next_action || "Contactar por WhatsApp y cerrar pedido",
        body.reminder_at || null,
        body.priority || "HIGH",
        JSON.stringify({ catalog_order_intent_id: row.id, catalog_id: row.catalog_id, product_id: row.product_id, source_module: "smart_catalog" }),
        user.id,
      ]
    );
    await client.query(
      `update smart_catalog_order_intents
       set status = case when status = 'INTENT_CREATED' then 'CONTACTED' else status end,
           metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb,
           updated_at = now()
       where id = $1 and business_id = $2`,
      [intentId, businessId, JSON.stringify({ agenda_task_id: task.rows[0].id })]
    );
    return task.rows[0];
  });
  return { task: result };
}

async function sendPostSaleTicket(businessId, intentId, body = {}, user) {
  const intent = await query(
    `select i.*, c.title as catalog_title, c.linked_campaign_id, p.name as product_name, p.price as product_price,
            p.currency as product_currency, ml.name as lead_name, ml.phone as lead_phone, ml.email as lead_email
     from smart_catalog_order_intents i
     join smart_catalogs c on c.id = i.catalog_id
     left join smart_catalog_products p on p.id = i.product_id
     left join business_manual_leads ml on ml.id = i.lead_id
     where i.id = $1 and i.business_id = $2`,
    [intentId, businessId]
  );
  if (!intent.rowCount) throw notFound("Intencion de catalogo no encontrada.");
  const row = intent.rows[0];
  const saleAmount = moneyNumber(body.sale_amount, moneyNumber(row.sale_amount, moneyNumber(row.product_price, 0)));
  const existingSaleId = metadata(row.metadata).sale_id || null;
  const ticket = await createPostSaleQr(businessId, user, {
    existing_sale_id: existingSaleId,
    campaign_id: body.campaign_id || row.campaign_id || row.linked_campaign_id || null,
    sale_amount: saleAmount,
    currency: body.currency || row.product_currency || row.sale_currency || "COP",
    customer_name: row.lead_name || row.customer_name,
    customer_phone: row.lead_phone || row.customer_phone,
    customer_email: row.lead_email || row.customer_email,
    product_name: row.product_name || "Compra desde catalogo",
    notes: body.notes || "Ticket postventa generado desde Catalogos Qori.",
    expires_mode: body.expires_mode || "30_DAYS",
    expiration_days: Number(body.expiration_days || 30),
    metadata: {
      source_module: "smart_catalog",
      catalog_order_intent_id: row.id,
      catalog_id: row.catalog_id,
      product_id: row.product_id,
      ticket_use_case: "smart_catalog_post_sale",
      ticket_use_case_label: "Postventa Catalogo Qori",
      attribution_source: "Catalogos Qori",
      attribution_subject: row.product_name || row.catalog_title,
    },
    benefit: {
      benefit_type: body.benefit_type || "CUSTOM",
      benefit_label: body.benefit_label || "Beneficio postventa por tu compra",
      benefit_value: body.benefit_value || {
        fulfillment: {
          mode: "PHYSICAL_QR",
          instructions: "Presenta este ticket para activar garantia, encuesta o beneficio de recompra.",
        },
      },
      reward_id: body.reward_id || null,
    },
  });
  await withTransaction(async (client) => {
    await client.query(
      `update smart_catalog_order_intents
       set status = 'POST_SALE_SENT',
           rms_stage = 'POST_SALE',
           post_sale_qr_id = $3,
           sale_amount = coalesce(sale_amount, $4),
           metadata = coalesce(metadata, '{}'::jsonb) || $5::jsonb,
           updated_at = now()
       where id = $1 and business_id = $2`,
      [intentId, businessId, ticket.qr_code.id, saleAmount, JSON.stringify({ post_sale_ticket_url: ticket.public_ticket_url })]
    );
    await recordEvent(client, {
      business_id: businessId,
      catalog_id: row.catalog_id,
      product_id: row.product_id,
      lead_id: row.lead_id,
      campaign_id: row.campaign_id || row.linked_campaign_id || null,
      event_type: "post_sale_ticket_sent",
      source: "portal",
      channel: "business_portal",
      metadata: { intent_id: row.id, qr_code_id: ticket.qr_code.id },
    });
    if (row.lead_id) {
      await syncIntentWithRms(client, { ...row, post_sale_qr_id: ticket.qr_code.id, product_price: saleAmount }, { id: row.lead_id }, "postventa", user.id);
    }
  });
  return ticket;
}

async function seedDoctorAngieCatalog(businessId, user) {
  const catalog = await createCatalog(businessId, user, {
    title: "Productos de la Doctora Angie",
    slug: "productos-doctora-angie",
    description: "Descubre productos saludables seleccionados para acompanar tu bienestar. Escoge el producto que te interesa y ordenalo directamente por WhatsApp.",
    brand_name: "Doctora Angie",
    whatsapp_number: "573001112233",
    default_cta_label: "Ordenar por WhatsApp",
    theme_color: "#0759d6",
    status: "DRAFT",
    metadata: {
      template: "doctor_angie",
      activation_copy: "Escanea en tu gimnasio, participa y recibe un beneficio especial en productos saludables.",
    },
  });
  const products = [
    ["Combo energia saludable", "Combos fitness", 69000, "Combo funcional para acompanar entrenamiento y energia diaria."],
    ["Snack proteico natural", "Snacks saludables", 18000, "Snack practico con ingredientes naturales para antes o despues del gimnasio."],
    ["Plan de asesoria nutricional inicial", "Asesorias", 120000, "Primera asesoria para orientar habitos, objetivos y ruta de bienestar."],
    ["Kit bienestar semanal", "Productos recomendados", 99000, "Seleccion semanal de productos saludables recomendados por la doctora."],
    ["Pack gimnasio saludable", "Promociones para gimnasio", 79000, "Pack pensado para activaciones y aliados fitness."],
  ];
  const createdProducts = [];
  for (let index = 0; index < products.length; index += 1) {
    const [name, category, price, description] = products[index];
    createdProducts.push(await createProduct(businessId, catalog.id, user, {
      name,
      category,
      price,
      description,
      short_description: description,
      product_type: category === "Asesorias" ? "advisory" : category.includes("Combo") ? "combo" : "physical",
      tags: [category, "bienestar", "gimnasio"],
      benefits: ["Seleccion saludable", "Pedido directo por WhatsApp"],
      cta_label: "Ordenar por WhatsApp",
      display_order: index + 1,
      is_featured: index === 0,
    }));
  }
  return { catalog, products: createdProducts };
}

module.exports = {
  archiveCatalog,
  catalogDetail,
  createAgendaTask,
  createCatalog,
  createProduct,
  createWhatsappIntent,
  dashboard,
  deleteProduct,
  getPublicCatalog,
  listCatalogs,
  listIntents,
  listProducts,
  markWon,
  publicProduct,
  recordEvent,
  seedDoctorAngieCatalog,
  sendPostSaleTicket,
  updateCatalog,
  updateIntent,
  updateProduct,
};

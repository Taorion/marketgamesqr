const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_COVER_BYTES = 2 * 1024 * 1024;
const ALLOWED_ASSET_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const ALLOWED_COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function publicBaseUrl() {
  return (env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
}

function publicCaptureUrl(token) {
  return `${publicBaseUrl()}/captura/${encodeURIComponent(token)}`;
}

function downloadUrl(token) {
  return `${publicBaseUrl()}/api/public/lead-captures/download/${encodeURIComponent(token)}`;
}

function cleanText(value, max = 500) {
  const text = String(value || "").replace(/[<>]/g, "").trim();
  return text.slice(0, max);
}

function parseDataUrl(value, allowedTypes, maxBytes) {
  const text = String(value || "");
  const match = text.match(/^data:([^;,]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw badRequest("Archivo invalido. Sube un archivo base64 valido.");
  const mime = match[1].toLowerCase();
  if (!allowedTypes.has(mime)) throw badRequest("Tipo de archivo no permitido.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > maxBytes) throw badRequest("El archivo supera el tamaño permitido.");
  return { mime, buffer, size: buffer.length, dataUrl: text };
}

function defaultFormConfig(config = {}) {
  const fields = Array.isArray(config.fields) ? config.fields : [];
  const byName = new Map(fields.map((field) => [field.name, field]));
  const base = [
    { name: "first_name", label: "Nombre", visible: true, required: true, type: "text" },
    { name: "last_name", label: "Apellido", visible: true, required: false, type: "text" },
    { name: "phone", label: "Telefono", visible: true, required: true, type: "tel" },
    { name: "email", label: "Correo", visible: true, required: false, type: "email" },
    { name: "document_id", label: "Cedula / documento", visible: true, required: false, type: "text" },
    { name: "city", label: "Ciudad", visible: false, required: false, type: "text" },
    { name: "company", label: "Empresa", visible: false, required: false, type: "text" },
    { name: "role", label: "Cargo", visible: false, required: false, type: "text" },
    { name: "interest", label: "Interes principal", visible: true, required: false, type: "text" },
    { name: "budget", label: "Presupuesto aproximado", visible: false, required: false, type: "text" },
    { name: "source_detail", label: "Como nos conociste", visible: true, required: false, type: "text" },
  ].map((field) => ({ ...field, ...(byName.get(field.name) || {}) }));
  return {
    fields: base,
    consent_required: config.consent_required !== false,
    consent_text: cleanText(config.consent_text || "Autorizo el tratamiento de mis datos personales para recibir informacion comercial relacionada con esta marca.", 1000),
    privacy_url: cleanText(config.privacy_url || "", 300),
  };
}

function mapActivation(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    business_id: row.business_id,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name || null,
    branch_id: row.branch_id,
    branch_name: row.branch_name || null,
    name: row.name,
    description: row.description,
    channel: row.channel,
    status: row.status,
    public_token: row.public_token,
    public_code: row.public_code,
    public_url: publicCaptureUrl(row.public_token),
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    form_config: row.form_config || {},
    public_message: row.public_message || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    asset: row.asset_id ? {
      id: row.asset_id,
      title: row.asset_title,
      description: row.asset_description,
      file_name: row.file_name,
      file_type: row.file_type,
      file_size: Number(row.file_size || 0),
      cover_image_data_url: row.cover_image_data_url || "",
      download_button_text: row.download_button_text || "Descargar ahora",
      category: row.category || "catalogo",
    } : extras.asset || null,
    metrics: extras.metrics || null,
  };
}

function mapDigitalAsset(row) {
  if (!row) return null;
  return {
    id: row.id,
    business_id: row.business_id,
    title: row.title,
    description: row.description,
    file_name: row.file_name,
    file_type: row.file_type,
    file_size: Number(row.file_size || 0),
    storage_path: row.storage_path || "",
    cover_image_data_url: row.cover_image_data_url || "",
    download_button_text: row.download_button_text || "Descargar ahora",
    category: row.category || "catalogo",
    asset_scope: row.asset_scope || "library",
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata || {},
  };
}

function publicMessagePayload(message = {}, defaults = {}) {
  const badges = Array.isArray(message.detail_badges)
    ? message.detail_badges.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 3)
    : Array.isArray(defaults.detail_badges)
      ? defaults.detail_badges.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 3)
      : [];
  return {
    title: cleanText(message.title || defaults.title || "", 180),
    subtitle: cleanText(message.subtitle || defaults.subtitle || "", 800),
    success_message: cleanText(message.success_message || defaults.success_message || "", 300),
    details_title: cleanText(message.details_title || defaults.details_title || "Que recibes", 80),
    details_description: cleanText(message.details_description || defaults.details_description || "", 800),
    detail_badges: badges,
  };
}

async function listDigitalAssets(businessId, options = {}) {
  const includeInactive = ["1", "true", "yes"].includes(String(options.include_inactive || "").toLowerCase());
  const result = await query(
    `select id, business_id, title, description, file_name, file_type, file_size, storage_path,
            cover_image_data_url, download_button_text, category, asset_scope, is_active,
            created_at, updated_at, metadata
     from digital_assets
     where business_id = $1
       and asset_scope = 'library'
       and ($2::boolean = true or is_active = true)
     order by created_at desc`,
    [businessId, includeInactive]
  );
  return result.rows.map(mapDigitalAsset);
}

async function createDigitalAsset(businessId, user, body) {
  if (!body.title) throw badRequest("Escribe el titulo del activo digital.");
  if (!body.file_data_url) throw badRequest("Sube el archivo digital a la biblioteca de la cuenta.");
  const assetFile = parseDataUrl(body.file_data_url, ALLOWED_ASSET_TYPES, MAX_ASSET_BYTES);
  let cover = null;
  if (body.cover_image_data_url) {
    cover = parseDataUrl(body.cover_image_data_url, ALLOWED_COVER_TYPES, MAX_COVER_BYTES);
  }
  const token = createSecureToken(12);
  const result = await query(
    `insert into digital_assets
      (business_id, activation_id, title, description, file_name, file_type, file_size,
       storage_path, file_data_url, cover_image_data_url, download_button_text, category,
       asset_scope, is_active, created_by, metadata)
     values ($1, null, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'library', true, $12, $13::jsonb)
     returning id, business_id, title, description, file_name, file_type, file_size, storage_path,
               cover_image_data_url, download_button_text, category, asset_scope, is_active,
               created_at, updated_at, metadata`,
    [
      businessId,
      cleanText(body.title, 180),
      cleanText(body.description, 800),
      cleanText(body.file_name || "activo-digital", 180),
      assetFile.mime,
      assetFile.size,
      `business/${businessId}/digital-assets/${token}/${cleanText(body.file_name || "asset", 120)}`,
      assetFile.dataUrl,
      cover?.dataUrl || null,
      cleanText(body.download_button_text || "Descargar ahora", 80),
      cleanText(body.category || "catalogo", 80),
      user.id,
      JSON.stringify({
        uploaded_from: "account_settings",
        business_asset_library: true,
        ...(body.metadata || {}),
      }),
    ]
  );
  return mapDigitalAsset(result.rows[0]);
}

async function updateDigitalAssetStatus(businessId, assetId, isActive) {
  const result = await query(
    `update digital_assets
     set is_active = $3, updated_at = now()
     where id = $1 and business_id = $2 and asset_scope = 'library'
     returning id, business_id, title, description, file_name, file_type, file_size, storage_path,
               cover_image_data_url, download_button_text, category, asset_scope, is_active,
               created_at, updated_at, metadata`,
    [assetId, businessId, Boolean(isActive)]
  );
  if (!result.rowCount) throw notFound("Activo digital no encontrado.");
  return mapDigitalAsset(result.rows[0]);
}

async function getLibraryAssetForBusiness(client, businessId, assetId) {
  if (!assetId) return null;
  const result = await client.query(
    `select *
     from digital_assets
     where id = $1 and business_id = $2 and asset_scope = 'library' and is_active = true`,
    [assetId, businessId]
  );
  if (!result.rowCount) throw badRequest("Selecciona un activo digital valido de la biblioteca de la cuenta.");
  return result.rows[0];
}

async function assertCampaignAndBranch(client, businessId, campaignId, branchId) {
  if (campaignId) {
    const result = await client.query("select id from campaigns where id = $1 and business_id = $2", [campaignId, businessId]);
    if (!result.rowCount) throw badRequest("La campaña seleccionada no pertenece a este negocio.");
  }
  if (branchId) {
    const result = await client.query("select id from branches where id = $1 and business_id = $2", [branchId, businessId]);
    if (!result.rowCount) throw badRequest("La sucursal seleccionada no pertenece a este negocio.");
  }
}

async function createLeadCaptureActivation(businessId, user, body) {
  return withTransaction(async (client) => {
    if (!body.name) throw badRequest("Nombre de activacion requerido.");
    if (!body.asset_id && !body.asset?.file_data_url) {
      throw badRequest("Selecciona un activo digital de la cuenta para entregar al lead.");
    }
    await assertCampaignAndBranch(client, businessId, body.campaign_id || null, body.branch_id || null);
    const libraryAsset = await getLibraryAssetForBusiness(client, businessId, body.asset_id || null);
    let assetFile = null;
    let cover = null;
    if (!libraryAsset) {
      assetFile = parseDataUrl(body.asset.file_data_url, ALLOWED_ASSET_TYPES, MAX_ASSET_BYTES);
      if (body.asset.cover_image_data_url) {
        cover = parseDataUrl(body.asset.cover_image_data_url, ALLOWED_COVER_TYPES, MAX_COVER_BYTES);
      }
    }
    if (body.expires_at && new Date(body.expires_at) <= new Date()) {
      throw badRequest("La fecha de vencimiento debe ser futura.");
    }
    const token = createSecureToken();
    const publicCode = `LC-${token.slice(0, 8).toUpperCase()}`;
    const formConfig = defaultFormConfig(body.form_config || {});
    const created = await client.query(
      `insert into lead_capture_activations
        (business_id, campaign_id, branch_id, name, description, channel, status,
         public_token, public_code, starts_at, expires_at, form_config, public_message, created_by, asset_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15)
       returning *`,
      [
        businessId,
        body.campaign_id || null,
        body.branch_id || null,
        cleanText(body.name, 160),
        cleanText(body.description, 1200),
        cleanText(body.channel || "tienda_fisica", 80),
        body.status || "ACTIVE",
        token,
        publicCode,
        body.starts_at || null,
        body.expires_at || null,
        JSON.stringify(formConfig),
        JSON.stringify(publicMessagePayload(body.public_message || {}, {
          title: libraryAsset?.title || body.asset?.title || body.name,
          subtitle: "Completa tus datos y recibe el material digital de inmediato.",
          success_message: "Listo. Ya puedes descargar tu material digital.",
          details_title: "Que recibes",
          details_description: libraryAsset?.description || body.asset?.description || body.description || "",
        })),
        user.id,
        libraryAsset?.id || null,
      ]
    );
    const activation = created.rows[0];
    let asset = { rows: [libraryAsset] };
    if (!libraryAsset) {
      asset = await client.query(
        `insert into digital_assets
          (business_id, activation_id, title, description, file_name, file_type, file_size,
           storage_path, file_data_url, cover_image_data_url, download_button_text, category, asset_scope, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'activation', $13)
         returning *`,
        [
          businessId,
          activation.id,
          cleanText(body.asset.title || body.name, 180),
          cleanText(body.asset.description, 800),
          cleanText(body.asset.file_name || "activo-digital", 180),
          assetFile.mime,
          assetFile.size,
          `business/${businessId}/activations/${activation.id}/${cleanText(body.asset.file_name || "asset", 120)}`,
          assetFile.dataUrl,
          cover?.dataUrl || null,
          cleanText(body.asset.download_button_text || "Descargar ahora", 80),
          cleanText(body.asset.category || "catalogo", 80),
          user.id,
        ]
      );
    }
    await client.query(
      `insert into lead_events (business_id, event_type, event_title, event_description, campaign_id, metadata, created_by)
       values ($1, 'capture_activation_created', 'Captura Relampago creada', $2, $3, $4::jsonb, $5)`,
      [
        businessId,
        `Activacion creada: ${activation.name}`,
        activation.campaign_id || null,
        JSON.stringify({ activation_id: activation.id, asset_id: asset.rows[0].id, asset_scope: asset.rows[0].asset_scope || "library", public_url: publicCaptureUrl(token) }),
        user.id,
      ]
    );
    return {
      activation: mapActivation({ ...activation, asset_id: asset.rows[0].id, asset_title: asset.rows[0].title, asset_description: asset.rows[0].description, file_name: asset.rows[0].file_name, file_type: asset.rows[0].file_type, file_size: asset.rows[0].file_size, cover_image_data_url: asset.rows[0].cover_image_data_url, download_button_text: asset.rows[0].download_button_text, category: asset.rows[0].category }),
      qr_image_data_url: await QRCode.toDataURL(publicCaptureUrl(token)),
    };
  });
}

async function listLeadCaptureActivations(businessId, options = {}) {
  const limit = Math.min(Math.max(Number.parseInt(options.limit, 10) || 80, 1), 200);
  const result = await query(
    `with metrics as (
       select a.id,
              (
                select count(*)::int
                from lead_events le
                where le.business_id = a.business_id
                  and le.event_type = 'capture_link_viewed'
                  and le.metadata->>'activation_id' = a.id::text
              ) as visits,
              (
                select count(*)::int
                from lead_capture_submissions s
                where s.activation_id = a.id
              ) as leads_captured,
              (
                select coalesce(sum(s.download_count), 0)::int
                from lead_capture_submissions s
                where s.activation_id = a.id
              ) as downloads
       from lead_capture_activations a
       where a.business_id = $1
     )
     select a.*, c.name as campaign_name, br.name as branch_name,
            da.id as asset_id, da.title as asset_title, da.description as asset_description,
            da.file_name, da.file_type, da.file_size, da.cover_image_data_url,
            da.download_button_text, da.category,
            m.visits, m.leads_captured, m.downloads
     from lead_capture_activations a
     left join campaigns c on c.id = a.campaign_id
     left join branches br on br.id = a.branch_id
     left join lateral (
       select da.*
       from digital_assets da
       where da.business_id = a.business_id
         and (da.id = a.asset_id or (a.asset_id is null and da.activation_id = a.id and da.is_active = true))
       order by case when da.id = a.asset_id then 0 else 1 end, da.created_at desc
       limit 1
     ) da on true
     left join metrics m on m.id = a.id
     where a.business_id = $1
     order by a.created_at desc
     limit $2`,
    [businessId, limit]
  );
  return result.rows.map((row) => mapActivation(row, {
    metrics: {
      visits: Number(row.visits || 0),
      leads_captured: Number(row.leads_captured || 0),
      downloads: Number(row.downloads || 0),
      conversion_rate: Number(row.visits || 0) ? Math.round((Number(row.leads_captured || 0) / Number(row.visits || 1)) * 1000) / 10 : 0,
    },
  }));
}

async function getLeadCaptureActivation(businessId, activationId) {
  const result = await query(
    `select a.*, c.name as campaign_name, br.name as branch_name,
            da.id as asset_id, da.title as asset_title, da.description as asset_description,
            da.file_name, da.file_type, da.file_size, da.cover_image_data_url,
            da.download_button_text, da.category
     from lead_capture_activations a
     left join campaigns c on c.id = a.campaign_id
     left join branches br on br.id = a.branch_id
     left join lateral (
       select da.*
       from digital_assets da
       where da.business_id = a.business_id
         and (da.id = a.asset_id or (a.asset_id is null and da.activation_id = a.id and da.is_active = true))
       order by case when da.id = a.asset_id then 0 else 1 end, da.created_at desc
       limit 1
     ) da on true
     where a.id = $1 and a.business_id = $2`,
    [activationId, businessId]
  );
  if (!result.rowCount) throw notFound("Captura Relampago no encontrada.");
  const leads = await query(
    `select s.*, p.name, p.phone, p.email, p.document_id
     from lead_capture_submissions s
     left join players p on p.id = s.lead_id
     where s.activation_id = $1 and s.business_id = $2
     order by s.created_at desc
     limit 300`,
    [activationId, businessId]
  );
  const activation = mapActivation(result.rows[0]);
  const visits = await query(
    `select count(*)::int as visits from lead_events
     where business_id = $1 and event_type = 'capture_link_viewed' and metadata->>'activation_id' = $2`,
    [businessId, activationId]
  );
  const downloads = leads.rows.reduce((sum, item) => sum + Number(item.download_count || 0), 0);
  return {
    activation,
    qr_image_data_url: await QRCode.toDataURL(activation.public_url),
    metrics: {
      visits: Number(visits.rows[0]?.visits || 0),
      form_starts: leads.rows.length,
      leads_captured: leads.rows.length,
      downloads,
      conversion_rate: Number(visits.rows[0]?.visits || 0) ? Math.round((leads.rows.length / Number(visits.rows[0].visits || 1)) * 1000) / 10 : 0,
      download_rate: leads.rows.length ? Math.round((downloads / leads.rows.length) * 1000) / 10 : 0,
      new_leads: leads.rows.filter((item) => !item.lead_was_existing).length,
      existing_updated: leads.rows.filter((item) => item.lead_was_existing).length,
      with_email: leads.rows.filter((item) => item.email || item.form_data?.email).length,
      with_phone: leads.rows.filter((item) => item.phone || item.form_data?.phone).length,
      with_consent: leads.rows.filter((item) => item.consent_accepted).length,
    },
    leads: leads.rows,
  };
}

async function updateLeadCaptureStatus(businessId, activationId, status) {
  const result = await query(
    `update lead_capture_activations
     set status = $3, updated_at = now()
     where id = $1 and business_id = $2
     returning *`,
    [activationId, businessId, status]
  );
  if (!result.rowCount) throw notFound("Captura Relampago no encontrada.");
  return mapActivation(result.rows[0]);
}

async function updateLeadCaptureContent(businessId, activationId, body) {
  const current = await query(
    `select a.*, da.title as asset_title, da.description as asset_description
     from lead_capture_activations a
     left join lateral (
       select da.*
       from digital_assets da
       where da.business_id = a.business_id
         and (da.id = a.asset_id or (a.asset_id is null and da.activation_id = a.id and da.is_active = true))
       order by case when da.id = a.asset_id then 0 else 1 end, da.created_at desc
       limit 1
     ) da on true
     where a.id = $1 and a.business_id = $2`,
    [activationId, businessId]
  );
  if (!current.rowCount) throw notFound("Captura Relampago no encontrada.");
  const row = current.rows[0];
  const nextPublicMessage = {
    ...(row.public_message || {}),
    ...(body.public_message || {}),
  };
  const result = await query(
    `update lead_capture_activations
     set public_message = $3::jsonb,
         updated_at = now()
     where id = $1 and business_id = $2
     returning *`,
    [
      activationId,
      businessId,
      JSON.stringify(publicMessagePayload(nextPublicMessage, {
        title: row.asset_title || row.name,
        subtitle: "Completa tus datos y recibe el material digital de inmediato.",
        success_message: "Listo. Ya puedes descargar tu material digital.",
        details_title: "Que recibes",
        details_description: row.asset_description || row.description || "",
      })),
    ]
  );
  return mapActivation(result.rows[0]);
}

function activationAvailable(row) {
  if (!row) throw notFound("El enlace no es valido.");
  if (row.status !== "ACTIVE") throw forbidden("Esta activacion ya no esta disponible.");
  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) throw forbidden("Esta activacion aun no esta disponible.");
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) throw forbidden("Este recurso ha vencido.");
}

async function getPublicLeadCapture(token, reqMeta = {}) {
  const result = await query(
    `select a.*, b.name as business_name, b.settings as business_settings,
            da.id as asset_id, da.title as asset_title, da.description as asset_description,
            da.file_name, da.file_type, da.file_size, da.cover_image_data_url,
            da.download_button_text, da.category
     from lead_capture_activations a
     join businesses b on b.id = a.business_id
     join lateral (
       select da.*
       from digital_assets da
       where da.business_id = a.business_id
         and (da.id = a.asset_id or (a.asset_id is null and da.activation_id = a.id and da.is_active = true))
       order by case when da.id = a.asset_id then 0 else 1 end, da.created_at desc
       limit 1
     ) da on true
     where a.public_token = $1`,
    [token]
  );
  const row = result.rows[0];
  activationAvailable(row);
  await query(
    `insert into lead_events (business_id, event_type, event_title, event_description, campaign_id, metadata)
     values ($1, 'capture_link_viewed', 'Link de Captura Relampago visto', $2, $3, $4::jsonb)`,
    [
      row.business_id,
      `Vista publica de ${row.name}`,
      row.campaign_id || null,
      JSON.stringify({ activation_id: row.id, asset_id: row.asset_id, ip: reqMeta.ip || null, user_agent: reqMeta.userAgent || null }),
    ]
  );
  return {
    business: {
      name: row.business_name,
      logo_data_url: row.business_settings?.logo_data_url || "",
      logo_url: row.business_settings?.logo_url || "",
      privacy_url: row.business_settings?.privacy_url || "",
    },
    activation: mapActivation(row),
  };
}

function requiredVisibleFields(formConfig) {
  return (formConfig.fields || []).filter((field) => field.visible !== false && field.required);
}

async function findOrCreateLead(client, activation, formData) {
  const documentId = cleanText(formData.document_id, 80);
  const email = cleanText(formData.email, 180).toLowerCase();
  const phone = cleanText(formData.phone, 40);
  const name = [formData.first_name, formData.last_name].map((value) => cleanText(value, 120)).filter(Boolean).join(" ") || cleanText(formData.name, 160) || "Lead captura relampago";
  const existing = await client.query(
    `select * from players
     where business_id = $1 and (
       ($2::text <> '' and document_id = $2)
       or ($3::text <> '' and lower(email) = lower($3))
       or ($4::text <> '' and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = regexp_replace($4, '\\D', '', 'g'))
     )
     order by created_at desc
     limit 1`,
    [activation.business_id, documentId, email, phone]
  );
  const metadataPatch = {
    source: "captura_relampago",
    lead_source: "Captura Relampago",
    channel: activation.channel,
    city: cleanText(formData.city, 120),
    company: cleanText(formData.company, 160),
    role: cleanText(formData.role, 120),
    interest: cleanText(formData.interest, 200),
    budget: cleanText(formData.budget, 120),
    source_detail: cleanText(formData.source_detail, 200),
    commercial_status: "INTERESTED",
    tags: ["captura-relampago", "descargo-catalogo", "lead-presencial", "interesado", "activo-digital"],
  };
  if (existing.rowCount) {
    const updated = await client.query(
      `update players
       set name = coalesce(nullif(name, ''), $3),
           email = coalesce(nullif(email, ''), nullif($4, '')),
           phone = coalesce(nullif(phone, ''), nullif($5, '')),
           document_id = coalesce(nullif(document_id, ''), nullif($6, '')),
           campaign_id = coalesce(campaign_id, $7),
           metadata = coalesce(metadata, '{}'::jsonb) || $8::jsonb
       where id = $1 and business_id = $2
       returning *`,
      [existing.rows[0].id, activation.business_id, name, email, phone, documentId, activation.campaign_id || null, JSON.stringify(metadataPatch)]
    );
    return { lead: updated.rows[0], existing: true };
  }
  const created = await client.query(
    `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
     values ($1, $2, null, $3, nullif($4, ''), nullif($5, ''), nullif($6, ''), $7::jsonb)
     returning *`,
    [activation.business_id, activation.campaign_id || null, name, email, phone, documentId, JSON.stringify(metadataPatch)]
  );
  return { lead: created.rows[0], existing: false };
}

async function submitPublicLeadCapture(token, body, reqMeta = {}) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `select a.*, da.id as asset_id, da.title as asset_title, da.file_name
       from lead_capture_activations a
       join lateral (
         select da.*
         from digital_assets da
         where da.business_id = a.business_id
           and (da.id = a.asset_id or (a.asset_id is null and da.activation_id = a.id and da.is_active = true))
         order by case when da.id = a.asset_id then 0 else 1 end, da.created_at desc
         limit 1
       ) da on true
       where a.public_token = $1
       for update`,
      [token]
    );
    const activation = result.rows[0];
    activationAvailable(activation);
    const formConfig = defaultFormConfig(activation.form_config || {});
    const formData = body.form_data || {};
    for (const field of requiredVisibleFields(formConfig)) {
      if (!String(formData[field.name] || "").trim()) {
        throw badRequest(`Campo requerido: ${field.label || field.name}.`);
      }
    }
    if (formConfig.consent_required && !body.consent_accepted) {
      throw badRequest("Debes aceptar el tratamiento de datos para acceder al contenido.");
    }
    const { lead, existing } = await findOrCreateLead(client, activation, formData);
    const submission = await client.query(
      `insert into lead_capture_submissions
        (business_id, activation_id, asset_id, lead_id, campaign_id, branch_id, source, channel,
         form_data, consent_accepted, consent_text, lead_was_existing, ip_address, user_agent)
       values ($1, $2, $3, $4, $5, $6, 'captura_relampago', $7, $8::jsonb, $9, $10, $11, $12, $13)
       returning *`,
      [
        activation.business_id,
        activation.id,
        activation.asset_id,
        lead.id,
        activation.campaign_id || null,
        activation.branch_id || null,
        activation.channel,
        JSON.stringify(formData),
        Boolean(body.consent_accepted),
        formConfig.consent_text || null,
        existing,
        reqMeta.ip || null,
        reqMeta.userAgent || null,
      ]
    );
    const downloadToken = createSecureToken();
    await client.query(
      `insert into digital_asset_downloads
        (business_id, activation_id, asset_id, lead_id, submission_id, download_token, ip_address, user_agent, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        activation.business_id,
        activation.id,
        activation.asset_id,
        lead.id,
        submission.rows[0].id,
        downloadToken,
        reqMeta.ip || null,
        reqMeta.userAgent || null,
        JSON.stringify({ file_name: activation.file_name }),
      ]
    );
    const eventType = existing ? "lead_existing_updated" : "lead_captured";
    await client.query(
      `insert into lead_events
        (business_id, lead_id, event_type, event_title, event_description, campaign_id, metadata)
       values ($1, $2, $3, 'Lead capturado por activo digital', $4, $5, $6::jsonb)`,
      [
        activation.business_id,
        lead.id,
        eventType,
        `${lead.name} desbloqueo "${activation.asset_title}" desde "${activation.name}".`,
        activation.campaign_id || null,
        JSON.stringify({
          activation_id: activation.id,
          asset_id: activation.asset_id,
          submission_id: submission.rows[0].id,
          channel: activation.channel,
          consent_accepted: Boolean(body.consent_accepted),
        }),
      ]
    );
    if (body.consent_accepted) {
      await client.query(
        `insert into lead_events
          (business_id, lead_id, event_type, event_title, event_description, campaign_id, metadata)
         values ($1, $2, 'lead_consent_accepted', 'Consentimiento aceptado', $3, $4, $5::jsonb)`,
        [activation.business_id, lead.id, formConfig.consent_text || "Consentimiento aceptado.", activation.campaign_id || null, JSON.stringify({ activation_id: activation.id })]
      );
    }
    return {
      lead: { id: lead.id, name: lead.name },
      existing_lead: existing,
      submission: submission.rows[0],
      download_url: downloadUrl(downloadToken),
      success_message: activation.public_message?.success_message || "Listo. Ya puedes descargar tu activo digital.",
    };
  });
}

async function downloadDigitalAsset(token, reqMeta = {}) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `select d.*, da.file_name, da.file_type, da.file_data_url, da.file_size,
              a.status, a.starts_at, a.expires_at, a.name as activation_name
       from digital_asset_downloads d
       join digital_assets da on da.id = d.asset_id and da.is_active = true
       join lead_capture_activations a on a.id = d.activation_id
       where d.download_token = $1
       for update`,
      [token]
    );
    const row = result.rows[0];
    activationAvailable(row);
    const parsed = parseDataUrl(row.file_data_url, ALLOWED_ASSET_TYPES, MAX_ASSET_BYTES);
    await client.query(
      `update digital_asset_downloads
       set downloaded_at = now(), ip_address = coalesce(ip_address, $2), user_agent = coalesce(user_agent, $3)
       where id = $1`,
      [row.id, reqMeta.ip || null, reqMeta.userAgent || null]
    );
    await client.query(
      `update lead_capture_submissions
       set download_count = download_count + 1, last_downloaded_at = now()
       where id = $1`,
      [row.submission_id]
    );
    await client.query(
      `insert into lead_events
        (business_id, lead_id, event_type, event_title, event_description, metadata)
       values ($1, $2, 'digital_asset_downloaded', 'Activo digital descargado', $3, $4::jsonb)`,
      [
        row.business_id,
        row.lead_id || null,
        `El lead descargo ${row.file_name} desde ${row.activation_name}.`,
        JSON.stringify({ activation_id: row.activation_id, asset_id: row.asset_id, submission_id: row.submission_id, file_name: row.file_name }),
      ]
    );
    return {
      buffer: parsed.buffer,
      file_name: row.file_name,
      file_type: row.file_type,
      file_size: row.file_size,
    };
  });
}

function submissionsToCsv(rows = [], activation = {}) {
  const csv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const headers = ["nombre", "apellido", "documento", "correo", "telefono", "ciudad", "empresa", "cargo", "interes", "campana", "activacion", "activo", "fecha_captura", "consentimiento", "canal", "sucursal", "descargas"];
  const lines = rows.map((row) => {
    const form = row.form_data || {};
    return [
      form.first_name || row.name,
      form.last_name,
      form.document_id || row.document_id,
      form.email || row.email,
      form.phone || row.phone,
      form.city,
      form.company,
      form.role,
      form.interest,
      activation.campaign_name || "",
      activation.name || "",
      activation.asset?.title || "",
      row.created_at,
      row.consent_accepted ? "si" : "no",
      row.channel,
      activation.branch_name || "",
      row.download_count || 0,
    ].map(csv).join(",");
  });
  return [headers.join(","), ...lines].join("\n");
}

module.exports = {
  createLeadCaptureActivation,
  createDigitalAsset,
  downloadDigitalAsset,
  getLeadCaptureActivation,
  getPublicLeadCapture,
  listDigitalAssets,
  listLeadCaptureActivations,
  submissionsToCsv,
  submitPublicLeadCapture,
  updateDigitalAssetStatus,
  updateLeadCaptureContent,
  updateLeadCaptureStatus,
};

const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { logQrEvent } = require("./auditService");
const { consumeQrCredits, ensureCreditAccount, mapPublicCreditAccount } = require("./qrCreditService");
const { registerActivityQrInCollector } = require("./rmsCollectorIntakeService");

const DIGITAL_ASSET_MAX_BYTES = 5 * 1024 * 1024;
const DIGITAL_ASSET_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ACTIVATION_CATALOG = [
  { type: "TRIVIA_QUIZ", label: "Trivia / Quiz comercial", category: "commercial", group: "Comerciales rapidas", reward_modes: ["by_score", "fixed"] },
  { type: "OPEN_QUESTION", label: "Pregunta abierta", category: "commercial", group: "Comerciales rapidas", reward_modes: ["fixed", "manual_approval"] },
  { type: "FLEX_SURVEY", label: "Encuesta flexible", category: "survey", group: "Encuestas y formularios inteligentes", reward_modes: ["fixed", "by_answer"] },
  { type: "QUICK_VOTE", label: "Votacion rapida", category: "commercial", group: "Comerciales rapidas", reward_modes: ["fixed", "by_choice"] },
  { type: "QUICK_DIAGNOSTIC", label: "Diagnostico rapido", category: "commercial", group: "Comerciales rapidas", reward_modes: ["by_profile"] },
  { type: "BENEFIT_SELECTOR", label: "Selector de beneficio", category: "commercial", group: "Comerciales rapidas", reward_modes: ["by_choice"] },
  { type: "SPIN_DISCOVER", label: "Gira y descubre", category: "touch", group: "Experiencias tactiles", reward_modes: ["by_choice", "fixed"] },
  { type: "SCRATCH_WIN", label: "Raspa y gana digital", category: "touch", group: "Experiencias tactiles", reward_modes: ["fixed", "by_score"] },
  { type: "TAP_REVEAL", label: "Toca y revela", category: "touch", group: "Experiencias tactiles", reward_modes: ["by_choice"] },
  { type: "CHOOSE_DOOR", label: "Elige tu puerta", category: "touch", group: "Experiencias tactiles", reward_modes: ["by_choice"] },
  { type: "DISCOUNT_THERMOMETER", label: "Termometro de descuento", category: "touch", group: "Experiencias tactiles", reward_modes: ["by_position"] },
  { type: "LUCK_METER", label: "Medidor de suerte controlado", category: "touch", group: "Experiencias tactiles", reward_modes: ["by_position"] },
  { type: "REWARD_TRAFFIC_LIGHT", label: "Semaforo de recompensa", category: "touch", group: "Experiencias tactiles", reward_modes: ["by_position"] },
  { type: "HIDDEN_CODE", label: "Codigo oculto", category: "touch", group: "Experiencias tactiles", reward_modes: ["fixed"] },
  { type: "SPACE_SHOOTER", label: "Marcianitos / Space Shooter", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "BREAKOUT", label: "Breakout / Rompe bloques", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "SNAKE", label: "Culebrita / Snake", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "CATCH_PRIZE", label: "Atrapa el premio", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "MEMORY_PAIRS", label: "Memoria de pares", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "FAST_TAP", label: "Tap rapido / Reflex challenge", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "MINI_MAZE", label: "Camino correcto / Mini laberinto", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "WHACK_A_MOLE", label: "Golpea el topo", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "DODGE_RUNNER", label: "Runner esquiva obstaculos", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "BALLOON_POP", label: "Revienta globos", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "ROULETTE_SPIN", label: "Ruleta de beneficio", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "TOUCH_CATCH", label: "Touch atrapalo", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "TRUE_FALSE", label: "Falso o verdadero", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "ORDER_OPTIONS", label: "Orden correcto", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "CONNECTORS", label: "Conectores", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "BATTLESHIP_COORDS", label: "Batalla naval por coordenadas", category: "minigame", group: "Minijuegos con score", reward_modes: ["by_score"] },
  { type: "VIP_EXPERIENCE_SELECTOR", label: "Selector de experiencia VIP", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["by_choice"] },
  { type: "STYLE_PROFILE", label: "Perfil de estilo", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["by_profile"] },
  { type: "GIFT_CURATOR", label: "Curador de regalo", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["by_profile"] },
  { type: "PRIVATE_INVITATION", label: "Invitacion privada", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["fixed", "manual_approval"] },
  { type: "PREMIUM_NEED_DIAGNOSTIC", label: "Diagnostico de necesidad premium", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["by_profile"] },
  { type: "SEALED_LETTER", label: "Carta sellada digital", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["fixed"] },
  { type: "SILENT_AUCTION_INTENT", label: "Subasta silenciosa / intencion de compra", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["fixed"] },
  { type: "EXPERIENCE_RESERVATION", label: "Reserva de experiencia", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["fixed", "manual_approval"] },
  { type: "PREMIUM_ACCESS_CERTIFICATE", label: "Certificado de acceso premium", category: "premium", group: "Experiencias premium / lujo", reward_modes: ["fixed"] },
  { type: "STORE_CHECKIN", label: "Check-in en tienda", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["fixed"] },
  { type: "CHECKOUT_REWARD", label: "Check-out con recompensa", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["fixed"] },
  { type: "TOUCH_SATISFACTION", label: "Encuesta de satisfaccion touch", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["fixed", "by_answer"] },
  { type: "PREFERENCE_WALL", label: "Muro de preferencias", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["by_choice"] },
  { type: "NEXT_PURCHASE_PICKER", label: "Elige tu proxima compra", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["fixed"] },
  { type: "INVOICE_UNLOCK", label: "Desbloqueo por factura", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["fixed"] },
  { type: "PURCHASE_AMOUNT_ACTIVATION", label: "Activacion por monto de compra", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["by_answer"] },
  { type: "PURCHASED_PRODUCT_ACTIVATION", label: "Activacion por producto comprado", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["by_answer"] },
  { type: "TIME_BASED_ACTIVATION", label: "Activacion por horario", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["fixed"] },
  { type: "BRANCH_BASED_ACTIVATION", label: "Activacion por sede", category: "physical_store", group: "Comercio fisico y pantalla touch", reward_modes: ["fixed"] },
  { type: "REFERRAL_CHALLENGE", label: "Reto de referidos", category: "referral", group: "Referidos y red", reward_modes: ["fixed"] },
  { type: "RECOMMENDATION_CHAIN", label: "Cadena de recomendacion", category: "referral", group: "Referidos y red", reward_modes: ["fixed"] },
  { type: "GROUP_BENEFIT", label: "Beneficio grupal", category: "referral", group: "Referidos y red", reward_modes: ["fixed"] },
  { type: "DOUBLE_PASS", label: "Pase doble", category: "referral", group: "Referidos y red", reward_modes: ["fixed"] },
  { type: "BRAND_ALLIANCE", label: "Alianza entre marcas", category: "referral", group: "Referidos y red", reward_modes: ["fixed"] },
  { type: "WAITLIST", label: "Lista de espera", category: "intent", group: "Datos e intencion", reward_modes: ["fixed"] },
  { type: "PRESALE_BENEFIT", label: "Preventa con beneficio", category: "intent", group: "Datos e intencion", reward_modes: ["fixed"] },
  { type: "INCENTIVIZED_QUOTE", label: "Cotizacion incentivada", category: "intent", group: "Datos e intencion", reward_modes: ["fixed"] },
  { type: "APPOINTMENT_REWARD", label: "Agenda con recompensa", category: "intent", group: "Datos e intencion", reward_modes: ["fixed"] },
  { type: "DORMANT_CUSTOMER_RECOVERY", label: "Recuperacion de cliente dormido", category: "intent", group: "Datos e intencion", reward_modes: ["fixed"] },
];

const CATALOG_BY_TYPE = new Map(ACTIVATION_CATALOG.map((item) => [item.type, item]));
const JSONB_ACTIVATION_FIELDS = new Set(["reward_config", "game_config", "interaction_config", "capture_config", "visual_config"]);
const CUSTOM_CAPTURE_FIELD_TYPES = new Set([
  "TEXT",
  "TEXTAREA",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "CHECKBOXES",
  "SELECT",
  "RATING",
  "SCALE",
  "LEVEL",
  "YES_NO",
  "NUMBER",
  "DATE",
  "EMAIL",
  "PHONE",
]);
const CUSTOM_CAPTURE_CHOICE_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "CHECKBOXES", "SELECT", "LEVEL"]);
const PRODUCT_INTEREST_MODES = new Set(["OPEN_LEAD_CHOICE", "PROMOTED_PRODUCT", "NO_PRODUCT"]);
const RMS_CAPTURE_FIELDS = new Set([
  "interest",
  "intent",
  "priority",
  "budget",
  "purchase_window",
  "preferred_channel",
  "category",
  "level",
  "rating",
  "notes",
  "custom",
]);

function escapeSvg(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, " ");
}

function safeBrandColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function qoriBrandColor(value, fallback) {
  const legacyGreen = new Set(["#0f7354", "#09725f", "#0d6b52", "#118568", "#16a34a", "#22c55e", "#059669", "#047857", "#065f46", "#064e3b", "#14b8a6", "#0f766e"]);
  const color = safeBrandColor(value, fallback).toLowerCase();
  return legacyGreen.has(color) ? fallback : color;
}

function brandStyle(settings = {}) {
  return {
    primary: qoriBrandColor(settings.brand_primary, "#052a6b"),
    secondary: qoriBrandColor(settings.brand_secondary, "#00bfe5"),
    logoUrl: typeof settings.logo_data_url === "string" && settings.logo_data_url
      ? settings.logo_data_url
      : typeof settings.logo_url === "string" ? settings.logo_url : "",
    ticketFrameUrl: typeof settings.ticket_frame_data_url === "string" && settings.ticket_frame_data_url
      ? settings.ticket_frame_data_url
      : typeof settings.ticket_frame_url === "string" ? settings.ticket_frame_url : "",
  };
}

function wrapSvgText(value, maxChars = 40, maxLines = 1) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? `${word.slice(0, Math.max(1, maxChars - 1))}...` : word;
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function brandedQrTextRows({ businessName, activationTitle, rewardLabel, publicCode }) {
  return [
    ...wrapSvgText(businessName || "Qori", 34, 1).map((text) => ({ text, size: 30, weight: 900, fill: "#111827" })),
    ...wrapSvgText(rewardLabel || "Beneficio desbloqueado", 42, 2).map((text, index) => ({ text, size: index ? 22 : 25, weight: 800, fill: "#111827" })),
    ...wrapSvgText(activationTitle || "Activacion interactiva", 46, 1).map((text) => ({ text, size: 18, weight: 700, fill: "#4b5563" })),
    { text: publicCode || "QR UNICO", size: 18, weight: 900, fill: "#111827" },
  ].slice(0, 6);
}

function normalizeBenefitFulfillment(value = {}) {
  const source = value?.fulfillment || value?.value?.fulfillment || {};
  const mode = String(source.mode || value.redemption_channel || "PHYSICAL_QR").toUpperCase();
  if (mode === "ECOMMERCE_CODE" || mode === "ECOMMERCE") {
    const ecommerceCode = String(source.ecommerce_code || value.ecommerce_code || "").trim();
    return {
      mode: "ECOMMERCE_CODE",
      channel: "ecommerce",
      label: "Codigo para ecommerce",
      ecommerce_code: ecommerceCode,
      ecommerce_url: String(source.ecommerce_url || value.ecommerce_url || "").trim() || null,
      instructions: String(source.instructions || value.instructions || "Copia este codigo y aplicalo en el checkout de la tienda online.").trim(),
    };
  }
  if (mode === "DIGITAL_ASSET" || mode === "DIGITAL_DOWNLOAD") {
    return {
      mode: "DIGITAL_ASSET",
      channel: "digital_download",
      label: "Activo digital al cumplir el juego",
      asset_id: String(source.asset_id || value.digital_asset_id || "").trim() || null,
      asset_title: String(source.asset_title || value.digital_asset_title || "").trim() || null,
      asset_file_name: String(source.asset_file_name || value.digital_asset_file_name || "").trim() || null,
      instructions: String(source.instructions || value.instructions || "Completaste la dinamica. Descarga tu activo digital ahora.").trim(),
    };
  }
  return {
    mode: "PHYSICAL_QR",
    channel: "physical_store",
    label: "Premio fisico / QR en tienda",
    instructions: String(source.instructions || value.instructions || "Presenta el QR en el punto autorizado para redimir el beneficio.").trim(),
  };
}

async function buildInteractiveBrandedQrDataUrl({ validatorUrl, activation, reward }) {
  const brand = brandStyle(activation.business_settings || {});
  const qrImage = await QRCode.toDataURL(validatorUrl, {
    type: "image/png",
    width: 560,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const width = 1080;
  const height = 1350;
  const qrSize = 490;
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = 440;
  const frame = String(brand.ticketFrameUrl || "").trim();
  const logo = String(brand.logoUrl || "").trim();
  const fulfillment = normalizeBenefitFulfillment(reward.reward_value || {});
  const footerText = fulfillment.mode === "ECOMMERCE_CODE"
    ? "Usa el codigo en la tienda online o conserva este QR como respaldo"
    : "Presenta este QR en el punto fisico para redimir";
  const rows = brandedQrTextRows({
    businessName: activation.business_name,
    activationTitle: activation.title,
    rewardLabel: reward.reward_label,
    publicCode: fulfillment.mode === "ECOMMERCE_CODE" ? fulfillment.ecommerce_code || reward.public_code : reward.public_code,
  });
  const textPanelY = 970;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="52" fill="#ffffff"/>
  ${frame
    ? `<image href="${escapeSvg(frame)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="0" y="0" width="${width}" height="${height}" rx="52" fill="${escapeSvg(brand.primary)}"/>
       <rect x="44" y="44" width="992" height="1262" rx="42" fill="#ffffff"/>
       <rect x="44" y="44" width="992" height="170" rx="42" fill="${escapeSvg(brand.primary)}"/>
       <rect x="44" y="154" width="992" height="120" fill="${escapeSvg(brand.primary)}"/>`}
  ${logo ? `<rect x="410" y="78" width="260" height="118" rx="28" fill="#ffffff" opacity="0.95"/>
  <image href="${escapeSvg(logo)}" x="430" y="96" width="220" height="82" preserveAspectRatio="xMidYMid meet"/>` : `<text x="${width / 2}" y="146" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#ffffff">Qori</text>`}
  <rect x="${qrX - 34}" y="${qrY - 34}" width="${qrSize + 68}" height="${qrSize + 68}" rx="40" fill="#ffffff"/>
  <rect x="${qrX - 34}" y="${qrY - 34}" width="${qrSize + 68}" height="${qrSize + 68}" rx="40" fill="none" stroke="${escapeSvg(brand.secondary)}" stroke-width="10"/>
  <image href="${qrImage}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>
  <rect x="136" y="${textPanelY}" width="808" height="240" rx="34" fill="#ffffff" opacity="0.96"/>
  ${rows.map((row, index) => `<text x="${width / 2}" y="${textPanelY + 48 + index * 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${row.size}" font-weight="${row.weight}" fill="${escapeSvg(row.fill)}">${escapeSvg(row.text)}</text>`).join("\n  ")}
  <text x="${width / 2}" y="1260" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="#4b5563">${escapeSvg(footerText)}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function jsonParam(value, fallback) {
  if (value === undefined || value === null) {
    return fallback === undefined ? null : JSON.stringify(fallback);
  }
  return JSON.stringify(value);
}

function publicAppBaseUrl() {
  try {
    const parsed = new URL(env.publicAppUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

function buildPublicUrl(slug) {
  return `${publicAppBaseUrl()}/activacion/${encodeURIComponent(slug)}`;
}

function buildValidatorUrl(token) {
  const target = new URL("/empresa/", publicAppBaseUrl());
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  return target.toString();
}

function interactiveAssetDownloadUrl(token) {
  return `${publicAppBaseUrl()}/api/public/activations/download/${encodeURIComponent(token)}`;
}

function parseDigitalAssetDataUrl(value) {
  const text = String(value || "");
  const match = text.match(/^data:([^;,]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw badRequest("El activo digital no tiene un archivo valido.");
  const mime = match[1].toLowerCase();
  if (!DIGITAL_ASSET_TYPES.has(mime)) throw badRequest("El tipo del activo digital no esta permitido.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > DIGITAL_ASSET_MAX_BYTES) throw badRequest("El activo digital supera el tamano permitido.");
  return { buffer, mime };
}

function slugify(value) {
  return String(value || "activacion")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "activacion";
}

function normalizeRewardType(type) {
  const value = String(type || "custom_benefit").toLowerCase();
  return {
    discount_percentage: "PERCENT_DISCOUNT",
    discount_value: "FIXED_AMOUNT_DISCOUNT",
    reward_pass: "CUSTOM",
    gift_card: "CUSTOM",
    points: "CUSTOM",
    free_item: "FREE_GIFT",
    vip_access: "VIP_ACCESS",
    appointment: "CUSTOM",
    custom_benefit: "CUSTOM",
    percent_discount: "PERCENT_DISCOUNT",
    fixed_amount_discount: "FIXED_AMOUNT_DISCOUNT",
    free_gift: "FREE_GIFT",
    free_sample: "FREE_SAMPLE",
    upgrade: "UPGRADE",
    raffle_entry: "RAFFLE_ENTRY",
    buy_x_get_y: "BUY_X_GET_Y",
  }[value] || String(type || "CUSTOM").toUpperCase();
}

function mapActivation(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    company_id: row.company_id,
    business_id: row.company_id,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name || null,
    branch_id: row.branch_id || null,
    branch_name: row.branch_name || null,
    seller_user_id: row.seller_user_id || null,
    seller_name: row.seller_name || null,
    title: row.title,
    description: row.description,
    category: row.category,
    activation_type: row.activation_type,
    activation_label: CATALOG_BY_TYPE.get(row.activation_type)?.label || row.activation_type,
    status: row.status,
    reward_ticket_cost: Number(row.reward_ticket_cost || 1),
    reward_mode: row.reward_mode,
    reward_config: row.reward_config || {},
    game_config: row.game_config || {},
    interaction_config: row.interaction_config || {},
    capture_config: normalizeCaptureConfig(row.capture_config || {}),
    visual_config: row.visual_config || {},
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    max_participants: row.max_participants,
    max_rewards: row.max_rewards,
    public_slug: row.public_slug,
    public_url: buildPublicUrl(row.public_slug),
    terms: row.terms,
    created_at: row.created_at,
    updated_at: row.updated_at,
    attempts_count: Number(row.participants_count || row.attempts_count || 0),
    winners_count: Number(row.rewards_count || row.winners_count || 0),
    digital_asset_downloads: Number(row.digital_asset_downloads || 0),
    max_winners: row.max_rewards,
    ...extras,
  };
}

function normalizeParticipantLock(config = {}) {
  const rawCooldown = config.cooldown_days ?? config.duration_days ?? 7;
  const cooldownDays = Math.max(0, Math.min(365, Number.isFinite(Number(rawCooldown)) ? Number(rawCooldown) : 7));
  const winnerPolicy = ["block_previous_winners", "allow_after_cooldown"].includes(config.winner_policy)
    ? config.winner_policy
    : (config.block_previous_winners === false ? "allow_after_cooldown" : "block_previous_winners");
  return {
    scope: config.scope === "company" ? "company" : "activation",
    cooldown_days: cooldownDays,
    winner_policy: winnerPolicy,
    label: `${cooldownDays} dias de espera entre intentos`,
  };
}

function customFieldKey(value, fallback) {
  const key = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return key || fallback;
}

function normalizeCustomCaptureField(field = {}, index = 0) {
  const label = String(field.label || field.question || field.name || "").trim();
  if (!label) return null;
  const type = CUSTOM_CAPTURE_FIELD_TYPES.has(String(field.type || "").toUpperCase())
    ? String(field.type || "").toUpperCase()
    : "TEXT";
  const key = customFieldKey(field.key || field.id || label, `field_${index + 1}`);
  const options = Array.isArray(field.options)
    ? field.options
      .map((option) => {
        if (option && typeof option === "object") {
          const optionLabel = String(option.label || option.value || "").trim();
          if (!optionLabel) return null;
          return {
            label: optionLabel,
            value: String(option.value || optionLabel).trim(),
          };
        }
        const optionLabel = String(option || "").trim();
        return optionLabel ? { label: optionLabel, value: optionLabel } : null;
      })
      .filter(Boolean)
      .slice(0, 10)
    : [];
  const rmsField = RMS_CAPTURE_FIELDS.has(String(field.rms_field || "").toLowerCase())
    ? String(field.rms_field).toLowerCase()
    : "custom";
  return {
    id: String(field.id || key),
    key,
    label,
    type,
    help_text: String(field.help_text || field.help || "").trim() || null,
    options: CUSTOM_CAPTURE_CHOICE_TYPES.has(type) ? options : [],
    required: field.required === true,
    rms_field: rmsField,
    order_index: Number.isFinite(Number(field.order_index)) ? Number(field.order_index) : index,
  };
}

function normalizeCustomCaptureFields(fields = []) {
  if (!Array.isArray(fields)) return [];
  const seen = new Set();
  return fields
    .map(normalizeCustomCaptureField)
    .filter(Boolean)
    .map((field, index) => {
      let key = field.key;
      while (seen.has(key)) key = `${field.key}_${index + 1}`;
      seen.add(key);
      return { ...field, key, id: field.id || key };
    })
    .slice(0, 12);
}

function normalizeProductInterestOption(option = {}) {
  if (option && typeof option === "object") {
    const label = String(option.label || option.value || option.name || "").trim();
    const value = String(option.value || option.name || label).trim();
    if (!label || !value) return null;
    return {
      label,
      value,
      product_id: option.product_id || option.id || null,
      sku: option.sku || null,
      category: option.category || null,
    };
  }
  const label = String(option || "").trim();
  return label ? { label, value: label, product_id: null, sku: null, category: null } : null;
}

function normalizeProductInterestConfig(config = {}) {
  const mode = PRODUCT_INTEREST_MODES.has(String(config.mode || "")) ? String(config.mode) : "NO_PRODUCT";
  const productName = String(config.product_name || config.product || config.name || "").trim();
  const options = Array.isArray(config.options)
    ? config.options.map(normalizeProductInterestOption).filter(Boolean).slice(0, 80)
    : [];
  return {
    mode,
    required: config.required !== false && mode !== "NO_PRODUCT",
    product_id: config.product_id || null,
    product_name: productName || null,
    options,
    rms_field: "interest",
  };
}

function normalizeCaptureConfig(config = {}) {
  const required = new Set(["name", "phone", "email", "document", ...(Array.isArray(config.required_fields) ? config.required_fields : [])]);
  const customFields = normalizeCustomCaptureFields(config.custom_fields || config.fields || []);
  return {
    ...config,
    required_fields: Array.from(required),
    optional_fields: Array.isArray(config.optional_fields)
      ? config.optional_fields.filter((field) => !required.has(field))
      : [],
    participant_lock: normalizeParticipantLock(config.participant_lock || {}),
    custom_fields: customFields,
    product_interest: normalizeProductInterestConfig(config.product_interest || {}),
    form_schema_version: Number(config.form_schema_version || 1),
    rms_mapping_enabled: config.rms_mapping_enabled !== false,
    rms_entry_phase: config.rms_entry_phase || "recoleccion",
  };
}

function publicActivation(row, questions = [], scoreRules = [], touchZones = []) {
  const mapped = mapActivation(row);
  const scratchWin = row.activation_type === "SCRATCH_WIN";
  const brand = brandStyle(row.business_settings || {});
  return {
    ...mapped,
    ...(scratchWin ? {
      description: "Registra tus datos y raspa la superficie para descubrir el premio.",
      reward_config: redactScratchRewardConfig(mapped.reward_config),
    } : {}),
    business: {
      id: row.company_id,
      name: row.business_name,
      slug: row.business_slug,
      logo_url: brand.logoUrl || null,
      primary_color: brand.primary,
      secondary_color: brand.secondary,
    },
    questions: questions.map((question) => ({
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || [],
      required: question.required,
      order_index: question.order_index,
    })),
    score_rewards: scratchWin ? [] : scoreRules.map(mapScoreRule),
    touch_zones: scratchWin ? [] : touchZones.map(mapTouchZone),
    active: row.status === "active" && (!row.starts_at || new Date(row.starts_at) <= new Date()) && (!row.ends_at || new Date(row.ends_at) > new Date()),
  };
}

function redactScratchRewardConfig(config = {}) {
  const choices = Array.isArray(config.choices)
    ? config.choices.map((choice, index) => {
      const slotKey = choice.value || choice.key || String.fromCharCode(65 + index);
      return {
        value: `scratch-${index}`,
        slot_label: String(slotKey).length === 1 ? `Zona ${slotKey}` : `Casilla ${index + 1}`,
        label: choice.reward_label || choice.benefit_label || choice.label || `Casilla ${index + 1}`,
      };
    })
    : [];
  return {
    masked: true,
    reveal_on_complete: true,
    ...(choices.length ? { choices } : {}),
  };
}

function mapScoreRule(row) {
  return {
    id: row.id,
    min_score: Number(row.min_score || 0),
    max_score: row.max_score === null ? null : Number(row.max_score),
    reward_type: row.reward_type,
    reward_value: row.reward_value || {},
    reward_label: row.reward_label,
    reward_conditions: row.reward_conditions,
    max_awards: row.max_awards,
  };
}

function mapTouchZone(row) {
  return {
    id: row.id,
    label: row.label,
    position_percent: row.position_percent === null ? null : Number(row.position_percent),
    start_percent: row.start_percent === null ? null : Number(row.start_percent),
    end_percent: row.end_percent === null ? null : Number(row.end_percent),
    reward_type: row.reward_type,
    reward_value: row.reward_value || {},
    reward_label: row.reward_label,
    reward_conditions: row.reward_conditions,
    max_awards: row.max_awards,
  };
}

function listActivationCatalog(options = {}) {
  const allowedTypes = options.allowedTypes;
  const items = Array.isArray(allowedTypes)
    ? ACTIVATION_CATALOG.filter((item) => allowedTypes.includes(item.type))
    : ACTIVATION_CATALOG;
  const groups = items.reduce((acc, item) => {
    const group = acc.find((entry) => entry.label === item.group);
    if (group) {
      group.items.push(item);
    } else {
      acc.push({ label: item.group, items: [item] });
    }
    return acc;
  }, []);
  return { groups, items };
}

async function assertCampaign(client, businessId, campaignId) {
  if (!campaignId) return null;
  const result = await client.query(
    "select id, name, status from campaigns where id = $1 and business_id = $2",
    [campaignId, businessId]
  );
  const campaign = result.rows[0];
  if (!campaign) {
    throw badRequest("La campana seleccionada no existe para este negocio.");
  }
  if (["FINISHED", "ARCHIVED"].includes(campaign.status)) {
    throw badRequest("La campana seleccionada ya finalizo o esta archivada.");
  }
  return campaign;
}

async function assertBranch(client, businessId, branchId) {
  if (!branchId) return null;
  const result = await client.query(
    "select id, name, is_active from branches where id = $1 and business_id = $2",
    [branchId, businessId]
  );
  const branch = result.rows[0];
  if (!branch || branch.is_active === false) {
    throw badRequest("La sede seleccionada no existe o no está activa para este negocio.");
  }
  return branch;
}

async function assertSeller(client, businessId, sellerUserId) {
  if (!sellerUserId) return null;
  const result = await client.query(
    `select id, full_name, email
       from app_users
      where id = $1
        and business_id = $2
        and is_active = true
        and role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'BUSINESS_SELLER', 'VALIDATOR')`,
    [sellerUserId, businessId]
  );
  if (!result.rowCount) {
    throw badRequest("El vendedor responsable no existe o no esta activo en este negocio.");
  }
  return result.rows[0];
}

async function defaultGameId(client, businessId, campaign = null) {
  if (campaign?.game_id) return campaign.game_id;
  const result = await client.query(
    `select id
     from games
     where business_id = $1 and is_active = true
     order by created_at asc
     limit 1`,
    [businessId]
  );
  return result.rows[0]?.id || null;
}

async function requiredGameId(client, businessId, campaign = null) {
  const gameId = await defaultGameId(client, businessId, campaign);
  if (!gameId) {
    throw badRequest("Este negocio necesita al menos un juego activo para emitir QR validables.");
  }
  return gameId;
}

async function createInteractiveActivation(businessId, user, body) {
  return withTransaction(async (client) => {
    const catalogItem = CATALOG_BY_TYPE.get(body.activation_type);
    if (!catalogItem) {
      throw badRequest("Tipo de activacion no soportado por el catalogo.");
    }
    const [campaign, branch, seller] = await Promise.all([
      assertCampaign(client, businessId, body.campaign_id || null),
      assertBranch(client, businessId, body.branch_id || null),
      assertSeller(client, businessId, body.seller_user_id || null),
    ]);
    const publicSlug = `${slugify(body.title)}-${createSecureToken().slice(0, 8).toLowerCase()}`;
    const rewardConfig = {
      reward_type: normalizeRewardType(body.reward_config?.reward_type || body.benefit?.benefit_type),
      reward_label: body.reward_config?.reward_label || body.benefit?.benefit_label || "Beneficio desbloqueado",
      reward_value: body.reward_config?.reward_value || body.benefit?.benefit_value || {},
      reward_conditions: body.reward_config?.reward_conditions || body.terms || null,
      ...(body.reward_config || {}),
    };
    const captureConfig = normalizeCaptureConfig(body.capture_config || {});

    const result = await client.query(
      `insert into interactive_activations
        (company_id, user_id, campaign_id, branch_id, seller_user_id, title, description, category, activation_type, status,
         reward_ticket_cost, reward_mode, reward_config, game_config, interaction_config,
         capture_config, visual_config, starts_at, ends_at, max_participants, max_rewards,
         public_slug, access_qr_token, terms)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18, $19, $20, $21, $22, $23, $24)
       returning *`,
      [
        businessId,
        user.id,
        body.campaign_id || null,
        body.branch_id || null,
        seller?.id || null,
        body.title,
        body.description || null,
        body.category || catalogItem.category,
        body.activation_type,
        body.status || "active",
        body.reward_ticket_cost || 1,
        body.reward_mode || "fixed",
        jsonParam(rewardConfig, {}),
        jsonParam(body.game_config, {}),
        jsonParam(body.interaction_config, {}),
        jsonParam(captureConfig, {}),
        jsonParam(body.visual_config, {}),
        body.starts_at || null,
        body.ends_at || body.expires_at || null,
        body.max_participants || null,
        body.max_rewards || body.max_winners || null,
        publicSlug,
        createSecureToken(),
        body.terms || null,
      ]
    );
    const activation = result.rows[0];

    if (Array.isArray(body.questions) && body.questions.length) {
      await insertQuestions(client, activation.id, body.questions);
    }
    if (Array.isArray(body.score_rewards) && body.score_rewards.length) {
      await insertScoreRules(client, activation.id, body.score_rewards);
    }
    if (Array.isArray(body.touch_zones) && body.touch_zones.length) {
      await insertTouchZones(client, activation.id, body.touch_zones);
    }

    return {
      activation: mapActivation({ ...activation, campaign_name: campaign?.name || null, branch_name: branch?.name || null, seller_name: seller?.full_name || null }),
    };
  });
}

async function insertQuestions(client, activationId, questions) {
  for (const [index, question] of questions.entries()) {
    await client.query(
      `insert into interactive_activation_questions
        (activation_id, question_text, question_type, options, required, order_index, scoring_rules, branching_rules)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb)`,
      [
        activationId,
        question.question_text || question.question || "Pregunta",
        question.question_type || question.type || "open",
        jsonParam(question.options, []),
        question.required !== false,
        question.order_index ?? index,
        jsonParam(question.scoring_rules),
        jsonParam(question.branching_rules),
      ]
    );
  }
}

async function insertScoreRules(client, activationId, rules) {
  for (const rule of rules) {
    if (!rule.reward_label || String(rule.reward_label).toLowerCase() === "sin beneficio") continue;
    await client.query(
      `insert into interactive_score_reward_rules
        (activation_id, min_score, max_score, reward_type, reward_value, reward_label, reward_conditions, max_awards)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [
        activationId,
        Number(rule.min_score || 0),
        rule.max_score === undefined || rule.max_score === null ? null : Number(rule.max_score),
        normalizeRewardType(rule.reward_type),
        jsonParam(rule.reward_value, {}),
        rule.reward_label,
        rule.reward_conditions || null,
        rule.max_awards || null,
      ]
    );
  }
}

async function insertTouchZones(client, activationId, zones) {
  for (const zone of zones) {
    await client.query(
      `insert into interactive_touch_reward_zones
        (activation_id, label, position_percent, start_percent, end_percent, reward_type, reward_value, reward_label, reward_conditions, max_awards)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
      [
        activationId,
        zone.label || zone.reward_label,
        zone.position_percent ?? null,
        zone.start_percent ?? null,
        zone.end_percent ?? null,
        normalizeRewardType(zone.reward_type),
        jsonParam(zone.reward_value, {}),
        zone.reward_label || zone.label,
        zone.reward_conditions || null,
        zone.max_awards || null,
      ]
    );
  }
}

async function listInteractiveActivations(businessId, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 120), 1), 300);
  const includeArchived = Boolean(options.includeArchived);
  const availableOnly = Boolean(options.availableOnly);
  const campaignId = options.campaignId || null;
  const result = await query(
    `with recent_activations as (
       select *
        from interactive_activations
        where company_id = $1
          and ($5::uuid is null or campaign_id = $5::uuid)
          and ($3::boolean or status <> 'archived')
         and (
           not $4::boolean
           or (status = 'active'
               and (starts_at is null or starts_at <= now())
               and (ends_at is null or ends_at > now()))
         )
       order by created_at desc
       limit $2
     ),
     participant_counts as (
       select activation_id, count(*)::int as participants_count
       from interactive_activation_participants
       where activation_id in (select id from recent_activations)
       group by activation_id
     ),
     reward_counts as (
       select activation_id, count(*)::int as rewards_count
       from interactive_activation_rewards
       where activation_id in (select id from recent_activations)
       group by activation_id
     ),
     asset_download_counts as (
       select activation_id, count(*) filter (where downloaded_at is not null)::int as digital_asset_downloads
       from interactive_activation_asset_downloads
       where activation_id in (select id from recent_activations)
       group by activation_id
     )
     select a.id, a.company_id, a.user_id, a.campaign_id, a.branch_id, a.title, a.description,
            a.category, a.activation_type, a.status, a.reward_ticket_cost, a.reward_mode,
            a.reward_config, a.game_config, a.interaction_config, a.capture_config, a.visual_config,
            a.starts_at, a.ends_at, a.max_participants, a.max_rewards, a.public_slug,
            a.access_qr_token, a.terms, a.created_at, a.updated_at, a.seller_user_id,
            c.name as campaign_name, br.name as branch_name, su.full_name as seller_name,
            coalesce(p.participants_count, 0)::int as participants_count,
            coalesce(r.rewards_count, 0)::int as rewards_count,
            coalesce(d.digital_asset_downloads, 0)::int as digital_asset_downloads
     from recent_activations a
     left join campaigns c on c.id = a.campaign_id and c.business_id = a.company_id
     left join branches br on br.id = a.branch_id and br.business_id = a.company_id
     left join app_users su on su.id = a.seller_user_id and su.business_id = a.company_id
     left join participant_counts p on p.activation_id = a.id
     left join reward_counts r on r.activation_id = a.id
     left join asset_download_counts d on d.activation_id = a.id
     order by a.created_at desc`,
    [businessId, limit, includeArchived, availableOnly, campaignId]
  );
  return result.rows.map(mapActivation);
}

async function updateInteractiveActivation(businessId, activationId, body) {
  const currentResult = await query(
    "select id, status from interactive_activations where id = $1 and company_id = $2",
    [activationId, businessId]
  );
  if (!currentResult.rowCount) throw notFound("Activacion no encontrada.");
  if (Object.prototype.hasOwnProperty.call(body, "branch_id")) {
    await assertBranch({ query }, businessId, body.branch_id || null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "seller_user_id")) {
    await assertSeller({ query }, businessId, body.seller_user_id || null);
  }
  const currentStatus = currentResult.rows[0].status;
  const nextStatus = body.status || currentStatus;
  if (currentStatus === "archived") {
    throw badRequest("Una activacion archivada se conserva solo para consulta; no puede reactivarse desde este contrato.");
  }
  if (body.status) {
    const allowed = {
      draft: new Set(["draft", "active", "archived"]),
      active: new Set(["active", "paused", "closed", "archived"]),
      paused: new Set(["paused", "active", "closed", "archived"]),
      closed: new Set(["closed", "archived"]),
    };
    if (!allowed[currentStatus]?.has(nextStatus)) {
      throw badRequest(`No se puede cambiar una activacion ${currentStatus} a ${nextStatus}.`);
    }
  }
  const fields = [];
  const values = [activationId, businessId];
  const allowed = [
    "activation_type",
    "category",
    "branch_id",
    "seller_user_id",
    "title",
    "description",
    "status",
    "reward_ticket_cost",
    "reward_mode",
    "reward_config",
    "game_config",
    "interaction_config",
    "capture_config",
    "visual_config",
    "starts_at",
    "ends_at",
    "max_participants",
    "max_rewards",
    "terms",
  ];
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const nextValue = key === "capture_config" ? normalizeCaptureConfig(body[key] || {}) : body[key];
    if (JSONB_ACTIVATION_FIELDS.has(key)) {
      values.push(jsonParam(nextValue, {}));
      fields.push(`${key} = $${values.length}::jsonb`);
    } else {
      values.push(nextValue);
      fields.push(`${key} = $${values.length}`);
    }
  }
  if (!fields.length) throw badRequest("No hay campos para actualizar.");
  values.push(new Date().toISOString());
  const result = await query(
    `update interactive_activations
     set ${fields.join(", ")}, updated_at = $${values.length}
     where id = $1 and company_id = $2
     returning *`,
    values
  );
  if (!result.rowCount) throw notFound("Activacion no encontrada.");
  if (currentStatus === "draft") {
    if (Array.isArray(body.questions)) {
      await query("delete from interactive_activation_questions where activation_id = $1", [activationId]);
      await insertQuestions({ query }, activationId, body.questions);
    }
    if (Array.isArray(body.score_rewards)) {
      await query("delete from interactive_score_reward_rules where activation_id = $1", [activationId]);
      await insertScoreRules({ query }, activationId, body.score_rewards);
    }
    if (Array.isArray(body.touch_zones)) {
      await query("delete from interactive_touch_reward_zones where activation_id = $1", [activationId]);
      await insertTouchZones({ query }, activationId, body.touch_zones);
    }
  }
  const sellerResult = result.rows[0].seller_user_id
    ? await query("select full_name from app_users where id = $1 and business_id = $2", [result.rows[0].seller_user_id, businessId])
    : { rows: [] };
  return { activation: mapActivation({ ...result.rows[0], seller_name: sellerResult.rows[0]?.full_name || null }) };
}

async function recycleInteractiveActivation(businessId, user, activationId) {
  return withTransaction(async (client) => {
    const originalResult = await client.query(
      "select * from interactive_activations where id = $1 and company_id = $2",
      [activationId, businessId]
    );
    const original = originalResult.rows[0];
    if (!original) throw notFound("Activacion no encontrada.");

    const publicSlug = `${slugify(`${original.title}-reciclada`)}-${createSecureToken().slice(0, 8).toLowerCase()}`;
    const copyResult = await client.query(
      `insert into interactive_activations
        (company_id, user_id, campaign_id, branch_id, title, description, category, activation_type, status,
         reward_ticket_cost, reward_mode, reward_config, game_config, interaction_config,
         capture_config, visual_config, starts_at, ends_at, max_participants, max_rewards,
         public_slug, access_qr_token, terms)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'draft',
         $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, null, null, $16, $17, $18, $19, $20)
       returning *`,
      [
        original.company_id,
        user.id,
        original.campaign_id || null,
        original.branch_id || null,
        `Copia de ${original.title}`.slice(0, 160),
        original.description || null,
        original.category,
        original.activation_type,
        original.reward_ticket_cost || 1,
        original.reward_mode,
        jsonParam(original.reward_config, {}),
        jsonParam(original.game_config, {}),
        jsonParam(original.interaction_config, {}),
        jsonParam(original.capture_config, {}),
        jsonParam(original.visual_config, {}),
        original.max_participants || null,
        original.max_rewards || null,
        publicSlug,
        createSecureToken(),
        original.terms || null,
      ]
    );
    const copy = copyResult.rows[0];

    await client.query(
      `insert into interactive_activation_questions
        (activation_id, question_text, question_type, options, required, order_index, scoring_rules, branching_rules)
       select $1, question_text, question_type, options, required, order_index, scoring_rules, branching_rules
       from interactive_activation_questions
       where activation_id = $2
       order by order_index asc`,
      [copy.id, original.id]
    );
    await client.query(
      `insert into interactive_score_reward_rules
        (activation_id, min_score, max_score, reward_type, reward_value, reward_label, reward_conditions, max_awards)
       select $1, min_score, max_score, reward_type, reward_value, reward_label, reward_conditions, max_awards
       from interactive_score_reward_rules
       where activation_id = $2
       order by min_score asc`,
      [copy.id, original.id]
    );
    await client.query(
      `insert into interactive_touch_reward_zones
        (activation_id, label, position_percent, start_percent, end_percent, reward_type, reward_value, reward_label, reward_conditions, max_awards)
       select $1, label, position_percent, start_percent, end_percent, reward_type, reward_value, reward_label, reward_conditions, max_awards
       from interactive_touch_reward_zones
       where activation_id = $2
       order by coalesce(position_percent, start_percent, 0) asc`,
      [copy.id, original.id]
    );

    return { activation: mapActivation(copy), source_activation_id: original.id };
  });
}

async function deleteInteractiveActivation(businessId, activationId) {
  return withTransaction(async (client) => {
    const activationResult = await client.query(
      "select * from interactive_activations where id = $1 and company_id = $2 for update",
      [activationId, businessId]
    );
    const activation = activationResult.rows[0];
    if (!activation) throw notFound("Activacion no encontrada.");

    const usageResult = await client.query(
      `select
         (select count(*)::int from interactive_activation_participants where activation_id = $1) as participants,
         (select count(*)::int from interactive_activation_rewards where activation_id = $1) as rewards,
         (select count(*)::int from interactive_ticket_transactions where activation_id = $1) as transactions`,
      [activationId]
    );
    const usage = usageResult.rows[0] || {};
    const hasCommercialHistory = Number(usage.participants || 0) > 0
      || Number(usage.rewards || 0) > 0
      || Number(usage.transactions || 0) > 0;

    if (hasCommercialHistory || activation.status !== "draft") {
      const archived = await client.query(
        `update interactive_activations
         set status = 'archived', updated_at = now()
         where id = $1 and company_id = $2
         returning *`,
        [activationId, businessId]
      );
      return {
        deleted: false,
        archived: true,
        activation: mapActivation(archived.rows[0]),
        message: hasCommercialHistory
          ? "La activacion tenia historial comercial. Se archivo para conservar trazabilidad."
          : "Solo los borradores sin uso se eliminan. Esta activacion se archivo para conservar su historial.",
      };
    }

    await client.query("delete from interactive_activations where id = $1 and company_id = $2", [activationId, businessId]);
    return {
      deleted: true,
      archived: false,
      activation_id: activationId,
      message: "Activacion eliminada.",
    };
  });
}

async function listDeletedInteractiveActivations(businessId) {
  const result = await query(
    `select a.id, a.company_id, a.user_id, a.campaign_id, a.branch_id, a.title, a.description,
            a.category, a.activation_type, a.status, a.reward_ticket_cost, a.reward_mode,
            a.starts_at, a.ends_at, a.max_participants, a.max_rewards, a.public_slug,
            a.access_qr_token, a.terms, a.created_at, a.updated_at,
            c.name as campaign_name, br.name as branch_name,
            count(distinct p.id)::int as participants_count,
            count(distinct r.id)::int as rewards_count
     from interactive_activations a
     left join campaigns c on c.id = a.campaign_id
     left join branches br on br.id = a.branch_id
     left join interactive_activation_participants p on p.activation_id = a.id
     left join interactive_activation_rewards r on r.activation_id = a.id
     where a.company_id = $1 and a.status = 'archived'
     group by a.id, c.name, br.name
     order by a.updated_at desc`,
    [businessId]
  );
  return result.rows.map(mapActivation);
}

function communicationTrackingSource(value) {
  return String(value || "").toLowerCase() === "email" ? "email" : "social";
}
async function communicationAttribution(client, activation, token, source = "social") {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(token || ""))) return null;
  const trackingSource = communicationTrackingSource(source);
  const result = await client.query(
    `select bc.id, bc.campaign_id, bc.channel_id, c.name as campaign_name, ch.name as channel_name
     from business_communications bc
     left join campaigns c on c.id = bc.campaign_id and c.business_id = bc.business_id
     left join business_acquisition_channels ch on ch.id = bc.channel_id and ch.business_id = bc.business_id
     where bc.business_id=$1 and bc.activation_id=$2 and bc.tracking_token=$3
       and (publication_status='PUBLISHED' or ($4 = 'email' and communication_type in ('EMAIL', 'MIXED')))`,
    [activation.company_id, activation.id, token, trackingSource]
  );
  if (result.rowCount) return { ...result.rows[0], communication_id: result.rows[0].id, tracking_source: trackingSource };
  const effort = await client.query(
    `select e.id as effort_id, e.campaign_id, e.channel_id, c.name as campaign_name, ch.name as channel_name
     from business_acquisition_channel_efforts e
     left join campaigns c on c.id=e.campaign_id and c.business_id=e.business_id
     join business_acquisition_channels ch on ch.id=e.channel_id and ch.business_id=e.business_id
     where e.business_id=$1 and e.interactive_activation_id=$2 and e.tracking_token=$3::uuid and e.status='ACTIVE'
     limit 1`,
    [activation.company_id, activation.id, token]
  );
  return effort.rowCount ? { ...effort.rows[0], tracking_source: "acquisition" } : null;
}

function buildBenefitUrl(token) {
  return new URL(`/claim/${encodeURIComponent(token)}`, publicAppBaseUrl()).toString();
}
function communicationAttributionMetadata(attribution) {
  if (!attribution?.id && !attribution?.effort_id) return {};
  return {
    communication_attribution: {
      communication_id: attribution.communication_id || attribution.id || null,
      acquisition_effort_id: attribution.effort_id || null,
      tracking_source: attribution.tracking_source,
      campaign_id: attribution.campaign_id || null,
      channel_id: attribution.channel_id || null,
    },
    communication_campaign_id: attribution.campaign_id || null,
    communication_campaign_name: attribution.campaign_name || null,
    acquisition_channel_id: attribution.channel_id || null,
    acquisition_channel_name_snapshot: attribution.channel_name || null,
    acquisition_channel_source: "COMMUNICATION",
    acquisition_effort_id: attribution.effort_id || null,
    channel: attribution.channel_name || null,
  };
}
async function recordCommunicationEvent(client, activation, attribution, eventType, extra = {}) {
  if (!attribution?.id && !attribution?.effort_id) return;
  if (attribution.communication_id || attribution.id) {
    await client.query("insert into business_communication_events (business_id, communication_id, activation_id, participant_id, qr_code_id, event_type, metadata) values ($1,$2,$3,$4,$5,$6,$7::jsonb)", [activation.company_id, attribution.communication_id || attribution.id, activation.id, extra.participant_id || null, extra.qr_code_id || null, eventType, JSON.stringify({ tracking_source: attribution.tracking_source || null, ...(extra.metadata || {}) })]);
  }
  if (attribution.effort_id) {
    const mappedType = ({ ACTIVATION_VIEWED: "VIEW", ACTIVATION_STARTED: "START", LEAD_CAPTURED: "LEAD", ACTIVATION_COMPLETED: "COMPLETE", REWARD_ISSUED: "QR_GENERATED" })[eventType] || eventType;
    await client.query(
      `insert into business_acquisition_events
        (business_id, effort_id, channel_id, event_type, source_type, source_id, participant_id, lead_id, qr_code_id, dedupe_key, metadata)
       values ($1,$2,$3,$4,'INTERACTIVE_ACTIVATION',$5,$6,$7,$8,$9,$10::jsonb)
       on conflict (business_id, effort_id, dedupe_key) where dedupe_key is not null do nothing`,
      [activation.company_id, attribution.effort_id, attribution.channel_id, mappedType, activation.id, extra.participant_id || null,
        extra.lead_id || null, extra.qr_code_id || null, extra.participant_id ? `${mappedType}:${extra.participant_id}` : null,
        JSON.stringify({ tracking_source: attribution.tracking_source || null, ...(extra.metadata || {}) })]
    );
  }
}

async function getPublicInteractiveActivation(slug, trackingToken = null, trackingSource = null) {
  const activationResult = await query(
    `select a.*, b.name as business_name, b.slug as business_slug, b.settings as business_settings
     from interactive_activations a
     join businesses b on b.id = a.company_id
     where a.public_slug = $1 and b.is_active = true`,
    [slug]
  );
  const activation = activationResult.rows[0];
  if (!activation) {
    throw notFound("Activacion no encontrada.");
  }
  assertActivationOpen(activation);
  const attribution = await communicationAttribution({ query }, activation, trackingToken, trackingSource);
  await recordCommunicationEvent({ query }, activation, attribution, "ACTIVATION_VIEWED");
  const [questions, scoreRules, touchZones] = await Promise.all([
    query("select * from interactive_activation_questions where activation_id = $1 order by order_index asc", [activation.id]),
    query("select * from interactive_score_reward_rules where activation_id = $1 order by min_score asc", [activation.id]),
    query("select * from interactive_touch_reward_zones where activation_id = $1 order by coalesce(position_percent, start_percent, 0) asc", [activation.id]),
  ]);
  return publicActivation(activation, questions.rows, scoreRules.rows, touchZones.rows);
}

async function startInteractiveParticipant(slug, body) {
  return withTransaction(async (client) => {
    const activation = await lockActivationBySlug(client, slug);
    assertActivationOpen(activation);
    assertRequiredCaptureFields(activation, body);
    await assertActivationIdentityConsistency(client, activation, body);
    const existingReward = await existingRewardResponseForIdentity(client, activation, body);
    if (existingReward) return existingReward;
    await assertDuplicateParticipant(client, activation, body);
    const attribution = await communicationAttribution(client, activation, body.metadata?.communication_tracking_token, body.metadata?.communication_tracking_source);
    const attributionMetadata = communicationAttributionMetadata(attribution);
    const gameSessionToken = createSecureToken();
    const contact = await resolveActivationContact(client, activation, body, { status: "started", ...attributionMetadata });
    const metadata = activationFormMetadata(activation, body, { status: "started", ...attributionMetadata });
    const participantResult = await client.query(
      `insert into interactive_activation_participants
        (activation_id, company_id, player_id, source_type, source_id, seller_user_id, name, document, phone, email, metadata, status,
         game_session_token, game_session_started_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'started', $12, now())
       returning *`,
      [
        activation.id,
        activation.company_id,
        contact.player_id,
        contact.source_type,
        contact.source_id,
        activation.seller_user_id || null,
        body.name || null,
        body.document || body.document_id || null,
        body.phone || null,
        body.email || null,
        jsonParam({ ...metadata, crm_contact: contact.reference }, {}),
        gameSessionToken,
      ]
    );
    const participant = participantResult.rows[0];
    await syncInteractiveParticipationToLead(client, activation, participant, {
      status: "started",
      rewarded: false,
      occurred_at: participant.game_session_started_at || new Date().toISOString(),
    });
    await recordCommunicationEvent(client, activation, attribution, "ACTIVATION_STARTED", { participant_id: participant.id, lead_id: participant.player_id || null });
    if (contact.created) {
      await recordCommunicationEvent(client, activation, attribution, "LEAD_CAPTURED", { participant_id: participant.id, lead_id: participant.player_id || null });
    }
    return {
      participant,
      game_session_token: gameSessionToken,
    };
  });
}

async function completeInteractiveParticipant(slug, body) {
  return withTransaction(async (client) => {
    const activation = await lockActivationBySlug(client, slug);
    assertActivationOpen(activation);
    if (!body.participant_id) assertRequiredCaptureFields(activation, body);
    if (!body.participant_id) {
      await assertActivationIdentityConsistency(client, activation, body);
      const existingReward = await existingRewardResponseForIdentity(client, activation, body);
      if (existingReward) return existingReward;
    }
    const participant = body.participant_id
      ? await lockParticipant(client, activation, body.participant_id)
      : await createParticipantInsideCompletion(client, activation, body);

    validateGameSession(activation, participant, body);

    const answers = body.answers || {};
    const score = body.score === undefined || body.score === null
      ? await calculateAnswerScore(client, activation, answers)
      : Number(body.score);
    const resultProfile = body.result_profile || resolveProfile(activation, answers);
    const rewardPayload = await resolveRewardPayload(client, activation, {
      answers,
      score,
      selected_choice: body.selected_choice,
      position_percent: body.position_percent,
      result_profile: resultProfile,
    });

    await persistAnswers(client, activation.id, participant.id, answers);
    const pendingReview = activation.reward_mode === "manual_approval";
    const status = pendingReview ? "pending_review" : rewardPayload ? "rewarded" : "completed";
    const metadata = activationFormMetadata(activation, body, {
      anti_abuse: antiAbuseSummary(activation, participant, body, score),
    });
    const attribution = await communicationAttribution(client, activation, body.metadata?.communication_tracking_token || participant.metadata?.communication_tracking_token, body.metadata?.communication_tracking_source || participant.metadata?.communication_tracking_source);
    if (attribution) Object.assign(metadata, communicationAttributionMetadata(attribution));

    if (!body.participant_id) {
      await recordCommunicationEvent(client, activation, attribution, "ACTIVATION_STARTED", { participant_id: participant.id, lead_id: participant.player_id || null });
      if (participant.metadata?.crm_contact?.created) {
        await recordCommunicationEvent(client, activation, attribution, "LEAD_CAPTURED", { participant_id: participant.id, lead_id: participant.player_id || null });
      }
    }

    await client.query(
      `update interactive_activation_participants
       set score = $2,
           result_profile = $3,
           status = $4,
           completed_at = now(),
           game_session_completed_at = case when game_session_token is not null then now() else game_session_completed_at end,
           metadata = metadata || $5::jsonb,
           updated_at = now()
       where id = $1`,
      [
        participant.id,
        score,
        resultProfile || null,
        status,
        jsonParam(metadata, {}),
      ]
    );
    await syncInteractiveParticipationToLead(client, activation, participant, {
      status,
      score,
      result_profile: resultProfile || null,
      rewarded: Boolean(rewardPayload && !pendingReview),
      occurred_at: new Date().toISOString(),
    });
    await recordCommunicationEvent(client, activation, attribution, "ACTIVATION_COMPLETED", { participant_id: participant.id, lead_id: participant.player_id || null });

    if (!rewardPayload || pendingReview) {
      return {
        participant: { id: participant.id, status, score, result_profile: resultProfile || null },
        rewarded: false,
        message: pendingReview
          ? "Participacion registrada. El beneficio queda pendiente de aprobacion."
          : "Participacion registrada. No alcanzo el rango de beneficio configurado.",
      };
    }

    const reward = await generateInteractiveRewardQr(client, activation, { ...participant, score, result_profile: resultProfile }, rewardPayload, {
      user_id: activation.user_id || null,
    });
    const digitalAsset = await issueInteractiveActivationAssetDownload(client, activation, participant, reward.reward);
    await recordCommunicationEvent(client, activation, attribution, "REWARD_ISSUED", { participant_id: participant.id, lead_id: participant.player_id || null, qr_code_id: reward.qr_code?.id || null });
    const fulfillment = normalizeBenefitFulfillment(rewardPayload.reward_value || {});
    return {
      participant: { id: participant.id, status: "rewarded", score, result_profile: resultProfile || null },
      rewarded: true,
      message: fulfillment.mode === "ECOMMERCE_CODE"
        ? "Beneficio generado. Tu codigo ecommerce esta listo para usar en la tienda online."
        : fulfillment.mode === "DIGITAL_ASSET"
          ? "Completaste la dinamica. Tu activo digital ya esta listo para descargar."
        : "Beneficio generado. El QR esta listo para redimir en tienda.",
      reward: reward.reward,
      qr_code: reward.qr_code,
      validator_url: reward.validator_url,
      benefit_url: reward.benefit_url,
      qr_image_data_url: reward.qr_image_data_url,
      credit_account: reward.credit_account,
      digital_asset: digitalAsset,
    };
  });
}

async function existingRewardResponseForIdentity(client, activation, body) {
  const document = body.document || body.document_id || null;
  const email = body.email || null;
  const phone = body.phone || null;
  if (!document && !email && !phone) return null;
  const result = await client.query(
    `select r.*, q.token as qr_token_value, q.status as qr_status, q.expires_at as qr_expires_at,
            p.id as participant_id, p.status as participant_status, p.score, p.result_profile
     from interactive_activation_participants p
     join interactive_activation_rewards r on r.participant_id = p.id
     join qr_codes q on q.id = r.qr_code_id
     where p.activation_id = $1
       and p.company_id = $2
       and r.status <> 'cancelled'
       and q.status = 'ACTIVE'
       and (q.expires_at is null or q.expires_at > now())
       and (
         ($3::text is not null and p.document = $3)
         or ($4::text is not null and lower(p.email) = lower($4))
         or ($5::text is not null and p.phone = $5)
       )
     order by r.created_at desc
     limit 1`,
    [activation.id, activation.company_id, document, email, phone]
  );
  const reward = result.rows[0];
  if (!reward) return null;
  const validatorUrl = buildValidatorUrl(reward.qr_token_value || reward.qr_token);
  const digitalAsset = await interactiveActivationAssetDownloadForReward(client, reward.id);
  return {
    participant: {
      id: reward.participant_id,
      status: reward.participant_status || "rewarded",
      score: reward.score || null,
      result_profile: reward.result_profile || null,
    },
    rewarded: true,
    recovered: true,
    message: "QR recuperado. Ya habias generado este beneficio; no se desconto otro ticket.",
    reward,
    qr_code: { id: reward.qr_code_id, token: reward.qr_token_value || reward.qr_token, status: reward.qr_status },
    validator_url: validatorUrl,
    benefit_url: buildBenefitUrl(reward.qr_token_value || reward.qr_token),
    qr_image_data_url: await buildInteractiveBrandedQrDataUrl({ validatorUrl, activation, reward }),
    credit_account: null,
    digital_asset: digitalAsset,
  };
}

async function lockActivationBySlug(client, slug) {
  const result = await client.query(
    `select a.*, b.name as business_name, b.settings as business_settings
     from interactive_activations a
     join businesses b on b.id = a.company_id
     where a.public_slug = $1 and b.is_active = true
     for update of a`,
    [slug]
  );
  const activation = result.rows[0];
  if (!activation) throw notFound("Activacion no encontrada.");
  return activation;
}

function assertActivationOpen(activation) {
  if (activation.status !== "active") throw badRequest("Esta activacion no esta activa.");
  const now = new Date();
  if (activation.starts_at && new Date(activation.starts_at) > now) throw badRequest("Esta activacion aun no ha iniciado.");
  if (activation.ends_at && new Date(activation.ends_at) <= now) throw badRequest("Esta activacion ya finalizo.");
}

async function assertDuplicateParticipant(client, activation, body) {
  const document = body.document || body.document_id || null;
  const email = body.email || null;
  const phone = body.phone || null;
  if (!document && !email && !phone) return;
  const participantLock = normalizeParticipantLock(activation.capture_config?.participant_lock || {});
  const scope = participantLock.scope === "company" ? "company" : "activation";
  const scopePredicate = scope === "company" ? "p.company_id = $1" : "p.activation_id = $1";
  const scopeValue = scope === "company" ? activation.company_id : activation.id;
  const cooldownDays = Math.max(0, Number(participantLock.cooldown_days ?? 0));
  const winnerPolicy = participantLock.winner_policy;

  if (winnerPolicy === "block_previous_winners") {
    const previousWinner = await client.query(
      `select p.id
       from interactive_activation_participants p
       where ${scopePredicate}
         and (
           ($2::text is not null and p.document = $2)
           or ($3::text is not null and lower(p.email) = lower($3))
           or ($4::text is not null and p.phone = $4)
         )
         and (
           p.status = 'rewarded'
           or exists (
             select 1
             from interactive_activation_rewards r
             where r.participant_id = p.id
               and r.status <> 'cancelled'
           )
         )
       limit 1`,
      [scopeValue, document, email, phone]
    );
    if (previousWinner.rowCount) {
      throw badRequest("Esta persona ya obtuvo un beneficio en esta activacion y no puede volver a participar.");
    }
  }

  if (cooldownDays > 0) {
    const recentAttempt = await client.query(
      `select p.id
       from interactive_activation_participants p
       where ${scopePredicate}
         and p.created_at >= now() - ($5::int * interval '1 day')
         and (
           ($2::text is not null and p.document = $2)
           or ($3::text is not null and lower(p.email) = lower($3))
           or ($4::text is not null and p.phone = $4)
         )
       limit 1`,
      [scopeValue, document, email, phone, cooldownDays]
    );
    if (recentAttempt.rowCount) {
      throw badRequest(`Esta persona debe esperar ${cooldownDays} dias para tener su proximo intento.`);
    }
  }
}

function customCaptureResponses(body = {}) {
  const source = body.metadata?.activation_form?.responses
    || body.metadata?.custom_form_responses
    || body.custom_form_responses
    || {};
  return source && typeof source === "object" ? source : {};
}

function hasCustomCaptureValue(value) {
  if (Array.isArray(value)) return value.some((item) => String(item || "").trim());
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function activationFormMetadata(activation, body = {}, extra = {}) {
  const captureConfig = normalizeCaptureConfig(activation.capture_config || {});
  const fields = captureConfig.custom_fields || [];
  const productInterest = captureConfig.product_interest || {};
  const responses = customCaptureResponses(body);
  const labels = {};
  const rms = {
    source: "activation_custom_form",
    activation_id: activation.id,
    activation_type: activation.activation_type,
    phase: "recoleccion",
  };
  const summary = [];
  fields.forEach((field) => {
    const value = responses[field.key];
    if (!hasCustomCaptureValue(value)) return;
    labels[field.key] = field.label;
    summary.push({
      key: field.key,
      label: field.label,
      value,
      rms_field: field.rms_field,
    });
    if (field.rms_field && field.rms_field !== "custom") {
      rms[field.rms_field] = value;
    }
  });
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
  if (productInterest.mode === "PROMOTED_PRODUCT" && productInterest.product_name) {
    labels.product_interest = labels.product_interest || "Producto promocionado";
    responses.product_interest = responses.product_interest || productInterest.product_name;
    if (!summary.some((item) => item.key === "product_interest")) {
      summary.unshift({
        key: "product_interest",
        label: "Producto promocionado",
        value: productInterest.product_name,
        rms_field: "interest",
      });
    }
    rms.interest = rms.interest || productInterest.product_name;
    rms.product_interest = productInterest.product_name;
    rms.product_interest_mode = productInterest.mode;
    rms.product_interest_id = productInterest.product_id || null;
  } else if (productInterest.mode && productInterest.mode !== "NO_PRODUCT") {
    rms.product_interest_mode = productInterest.mode;
  }
  const existingActivationForm = metadata.activation_form && typeof metadata.activation_form === "object" ? metadata.activation_form : {};
  const existingRmsIntake = metadata.rms_intake && typeof metadata.rms_intake === "object" ? metadata.rms_intake : {};
  return {
    ...metadata,
    source_url: metadata.source_url || null,
    user_agent: metadata.user_agent || null,
    identity: {
      document_type: normalizeIdentityDocumentType(body.document_type || metadata.identity?.document_type),
      document: String(body.document || body.document_id || "").trim() || null,
      phone: String(body.phone || "").trim() || null,
      email: String(body.email || "").trim().toLowerCase() || null,
    },
    activation_form: {
      schema_version: activation.capture_config?.form_schema_version || 1,
      ...existingActivationForm,
      fields: fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        help_text: field.help_text || null,
        rms_field: field.rms_field,
      })),
      labels: {
        ...(existingActivationForm.labels && typeof existingActivationForm.labels === "object" ? existingActivationForm.labels : {}),
        ...labels,
      },
      responses: {
        ...(existingActivationForm.responses && typeof existingActivationForm.responses === "object" ? existingActivationForm.responses : {}),
        ...responses,
      },
      summary,
    },
    rms_intake: {
      ...existingRmsIntake,
      ...rms,
    },
    ...extra,
  };
}

function normalizeIdentityDocumentType(value) {
  const allowed = new Set(["CC", "CE", "TI", "PASSPORT", "PEP", "NIT", "OTHER"]);
  const type = String(value || "CC").trim().toUpperCase();
  return allowed.has(type) ? type : "OTHER";
}

function assertRequiredCaptureFields(activation, body) {
  const requiredFields = new Set(["name", "phone", "email", "document", ...(activation.capture_config?.required_fields || [])]);
  const document = body.document || body.document_id || "";
  const values = {
    name: body.name || "",
    phone: body.phone || "",
    email: body.email || "",
    document,
  };
  for (const field of requiredFields) {
    if (!String(values[field] || "").trim()) {
      const labels = {
        name: "nombre",
        phone: "telefono",
        email: "correo",
        document: "documento",
      };
      throw badRequest(`El campo ${labels[field] || field} es obligatorio para esta activacion.`);
    }
  }
  const responses = customCaptureResponses(body);
  const customFields = normalizeCaptureConfig(activation.capture_config || {}).custom_fields || [];
  const missingCustomField = customFields.find((field) => field.required && !hasCustomCaptureValue(responses[field.key]));
  if (missingCustomField) {
    throw badRequest(`El campo ${missingCustomField.label} es obligatorio para esta activacion.`);
  }
}

async function lockParticipant(client, activation, participantId) {
  const result = await client.query(
    `select * from interactive_activation_participants
     where id = $1 and activation_id = $2
     for update`,
    [participantId, activation.id]
  );
  const participant = result.rows[0];
  if (!participant) throw notFound("Participacion no encontrada.");
  if (["rewarded", "disqualified"].includes(participant.status)) {
    throw badRequest("Esta participacion ya fue cerrada.");
  }
  return participant;
}

async function createParticipantInsideCompletion(client, activation, body) {
  await assertDuplicateParticipant(client, activation, body);
  const attribution = await communicationAttribution(client, activation, body.metadata?.communication_tracking_token, body.metadata?.communication_tracking_source);
  const attributionMetadata = communicationAttributionMetadata(attribution);
  const contact = await resolveActivationContact(client, activation, body, { status: "completed", ...attributionMetadata });
  const metadata = activationFormMetadata(activation, body, { status: "completed", ...attributionMetadata });
  const result = await client.query(
      `insert into interactive_activation_participants
      (activation_id, company_id, player_id, source_type, source_id, seller_user_id, name, document, phone, email, metadata, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'started')
     returning *`,
    [
      activation.id,
      activation.company_id,
      contact.player_id,
      contact.source_type,
      contact.source_id,
      activation.seller_user_id || null,
      body.name || null,
      body.document || body.document_id || null,
      body.phone || null,
      body.email || null,
      jsonParam({ ...metadata, crm_contact: contact.reference }, {}),
    ]
  );
  return result.rows[0];
}

function activationContactIdentity(body = {}) {
  const documentId = String(body.document || body.document_id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = String(body.email || "").trim().toLowerCase();
  const phoneDigits = String(body.phone || "").replace(/\D/g, "");
  // +57 300... and 300... are the same Colombian contact. Other country
  // prefixes remain untouched, because they are already part of the identity.
  const phone = /^57\d{10}$/.test(phoneDigits) ? phoneDigits.slice(2) : phoneDigits;
  return { documentId: documentId || null, email: email || null, phone: phone || null };
}

// Documento is Qori's primary identity for public activations. A phone or email
// may be added to that document over time, but it must never silently join two
// different documents into the same commercial contact.
async function assertActivationIdentityConsistency(client, activation, body) {
  const identity = activationContactIdentity(body);
  if (!identity.documentId || (!identity.email && !identity.phone)) return;

  const conflict = await client.query(
    `select email_match, phone_match
       from (
         select
           regexp_replace(lower(coalesce(p.document_id, '')), '[^a-z0-9]', '', 'g') as document_identity,
           ($3::text is not null and lower(nullif(p.email, '')) = $3) as email_match,
           ($4::text is not null and regexp_replace(regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1') = $4) as phone_match
         from players p
         where p.business_id = $1
         union all
         select
           regexp_replace(lower(coalesce(a.document_id, '')), '[^a-z0-9]', '', 'g') as document_identity,
           ($3::text is not null and lower(nullif(a.email, '')) = $3) as email_match,
           ($4::text is not null and regexp_replace(regexp_replace(coalesce(a.phone, ''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1') = $4) as phone_match
         from affiliates a
         where a.business_id = $1 and a.status <> 'DELETED'
         union all
         select
           regexp_replace(lower(coalesce(p.document, '')), '[^a-z0-9]', '', 'g') as document_identity,
           ($3::text is not null and lower(nullif(p.email, '')) = $3) as email_match,
           ($4::text is not null and regexp_replace(regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1') = $4) as phone_match
         from interactive_activation_participants p
         where p.company_id = $1
       ) identities
      where document_identity <> ''
        and document_identity <> $2
        and (email_match or phone_match)
      limit 1`,
    [activation.company_id, identity.documentId, identity.email, identity.phone]
  );
  if (!conflict.rowCount) return;
  const row = conflict.rows[0] || {};
  const fields = [row.email_match ? "correo" : "", row.phone_match ? "WhatsApp" : ""].filter(Boolean);
  const dataLabel = fields.length === 2 ? "El correo y el WhatsApp" : `El ${fields[0] || "dato de contacto"}`;
  throw badRequest(`${dataLabel} ya están asociados a otro documento. Revísalos: para participar y redimir el beneficio, deben corresponder al mismo documento de identificación.`);
}

async function resolveActivationContact(client, activation, body, metadata = {}) {
  const identity = activationContactIdentity(body);
  if (identity.documentId || identity.email || identity.phone) {
    const lockKey = [activation.company_id, identity.documentId || identity.email || identity.phone].join(":");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`interactive-contact:${lockKey}`]);
    const existing = await client.query(
      `select *
         from (
           select p.id, 'PLAYER'::text as source_type, p.created_at, 1 as source_rank
             from players p
            where p.business_id = $1
              and (
                ($2::text is not null and regexp_replace(lower(coalesce(p.document_id, '')), '[^a-z0-9]', '', 'g') = $2)
                or ($3::text is not null and lower(nullif(p.email, '')) = $3)
                or ($4::text is not null and regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') = $4)
              )
           union all
           select p.source_id as id, p.source_type, min(p.created_at) as created_at, 0 as source_rank
             from interactive_activation_participants p
            where p.company_id = $1
              and p.source_id is not null
              and p.source_type in ('PLAYER', 'MANUAL', 'AFFILIATE')
              and $2::text is not null
              and regexp_replace(lower(coalesce(p.document, '')), '[^a-z0-9]', '', 'g') = $2
            group by p.source_id, p.source_type
           union all
           select ml.id, 'MANUAL'::text as source_type, ml.created_at, 2 as source_rank
             from business_manual_leads ml
            where ml.business_id = $1
              and (
                ($3::text is not null and lower(nullif(ml.email, '')) = $3)
                or ($4::text is not null and regexp_replace(coalesce(ml.phone, ''), '\\D', '', 'g') = $4)
              )
           union all
           select af.id, 'AFFILIATE'::text as source_type, af.created_at, 3 as source_rank
             from affiliates af
            where af.business_id = $1
              and af.status <> 'DELETED'
              and (
                ($2::text is not null and regexp_replace(lower(coalesce(af.document_id, '')), '[^a-z0-9]', '', 'g') = $2)
                or ($3::text is not null and lower(nullif(af.email, '')) = $3)
                or ($4::text is not null and regexp_replace(coalesce(af.phone, ''), '\\D', '', 'g') = $4)
              )
         ) contacts
        order by source_rank asc, created_at asc
        limit 1`,
      [activation.company_id, identity.documentId, identity.email, identity.phone]
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (activation.seller_user_id) {
        const target = row.source_type === "PLAYER" ? "players" : row.source_type === "MANUAL" ? "business_manual_leads" : null;
        if (target) {
          await client.query(
            `update ${target} set seller_user_id = coalesce(seller_user_id, $3) where id = $1 and business_id = $2`,
            [row.id, activation.company_id, activation.seller_user_id]
          );
        }
      }
      return {
        player_id: row.source_type === "PLAYER" ? row.id : null,
        source_type: row.source_type,
        source_id: row.id,
        created: false,
        reference: { source_type: row.source_type, source_id: row.id, created: false },
      };
    }
  }

  const player = await createPlayer(client, activation, body, metadata);
  return {
    player_id: player.id,
    source_type: "PLAYER",
    source_id: player.id,
    created: player._created !== false,
    reference: { source_type: "PLAYER", source_id: player.id, created: player._created !== false },
  };
}

async function createPlayer(client, activation, body, metadata = {}) {
  const formMetadata = activationFormMetadata(activation, body, metadata);
  const playerMetadata = {
    source: "interactive_activation",
    activation_id: activation.id,
    activation_type: activation.activation_type,
    activation_title: activation.title || null,
    lead_source: "Activacion interactiva",
    lead_origin: "activation_form",
    interest: formMetadata.rms_intake?.interest || null,
    intent: formMetadata.rms_intake?.intent || null,
    lead_priority_signal: formMetadata.rms_intake?.priority || formMetadata.rms_intake?.level || null,
    ...formMetadata,
  };
  const identity = activationContactIdentity(body);

  // The transaction-level identity lock in resolveActivationContact protects all
  // Qori contact sources. This second PLAYER lookup only covers a concurrent
  // player created by a legacy intake path while the activation is being saved.
  if (identity.documentId || identity.email || identity.phone) {
    const lockKey = [activation.company_id, identity.documentId || identity.email || identity.phone].join(":");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`interactive-contact:${lockKey}`]);
    const existing = await client.query(
      `select *
         from players
        where business_id = $1
          and (
            ($2::text is not null and regexp_replace(lower(coalesce(document_id, '')), '[^a-z0-9]', '', 'g') = $2)
            or ($3::text is not null and lower(nullif(email, '')) = $3)
            or ($4::text is not null and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $4)
          )
        order by created_at asc
        limit 1
        for update`,
      [activation.company_id, identity.documentId, identity.email, identity.phone]
    );
    if (existing.rowCount) {
      const current = existing.rows[0];
      if (activation.seller_user_id && !current.seller_user_id) {
        const assigned = await client.query(
          `update players set seller_user_id = $3 where id = $1 and business_id = $2 and seller_user_id is null returning *`,
          [current.id, activation.company_id, activation.seller_user_id]
        );
        return { ...(assigned.rows[0] || current), _created: false };
      }
      return { ...current, _created: false };
    }
  }

  const result = await client.query(
    `insert into players (business_id, campaign_id, branch_id, seller_user_id, game_id, name, email, phone, document_id, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     returning *`,
    [
      activation.company_id,
      activation.campaign_id || null,
      activation.branch_id || null,
      activation.seller_user_id || null,
      await defaultGameId(client, activation.company_id),
      body.name || null,
      body.email || null,
      body.phone || null,
      body.document || body.document_id || null,
      jsonParam(playerMetadata, {}),
    ]
  );
  return { ...result.rows[0], _created: true };
}

// A participation is a commercial signal even if it does not unlock a benefit.
// The participant table retains the complete history; this compact snapshot makes
// the latest attempt immediately visible in the canonical Qori contact record.
async function syncInteractiveParticipationToLead(client, activation, participant, outcome = {}) {
  const sourceType = String(participant?.source_type || (participant?.player_id ? "PLAYER" : "")).toUpperCase();
  const sourceId = participant?.source_id || participant?.player_id || null;
  if (!sourceType || !sourceId) return;
  const status = String(outcome.status || participant.status || "started").toLowerCase();
  const rewarded = outcome.rewarded === true;
  const snapshot = {
    id: activation.id,
    title: activation.title || null,
    type: activation.activation_type || null,
    participant_id: participant.id,
    status,
    outcome: rewarded ? "beneficio_generado" : status === "completed" ? "participacion_sin_beneficio" : status,
    rewarded,
    score: Number.isFinite(Number(outcome.score)) ? Number(outcome.score) : null,
    result_profile: outcome.result_profile || null,
    captured_at: outcome.occurred_at || new Date().toISOString(),
  };
  const snapshotJson = jsonParam(snapshot, {});
  const additionalDataJson = jsonParam(additionalContactData(participant), {});
  if (sourceType === "PLAYER") {
    await client.query(
      `update players
          set seller_user_id = coalesce(seller_user_id, $6),
              metadata = coalesce(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'latest_interactive_activation', $2::jsonb,
              'latest_activation_participation', $2::jsonb,
              'additional_contact_entries', case when $4::text = 'started'
                then coalesce(metadata->'additional_contact_entries', '[]'::jsonb) || jsonb_build_array($3::jsonb)
                else coalesce(metadata->'additional_contact_entries', '[]'::jsonb)
              end
            )
        where id = $1 and business_id = $5`,
      [sourceId, snapshotJson, additionalDataJson, status, activation.company_id, participant.seller_user_id || activation.seller_user_id || null]
    );
  } else if (sourceType === "MANUAL") {
    await client.query(
      `update business_manual_leads
          set seller_user_id = coalesce(seller_user_id, $6),
              metadata = coalesce(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'latest_interactive_activation', $2::jsonb,
              'latest_activation_participation', $2::jsonb,
              'additional_contact_entries', case when $4::text = 'started'
                then coalesce(metadata->'additional_contact_entries', '[]'::jsonb) || jsonb_build_array($3::jsonb)
                else coalesce(metadata->'additional_contact_entries', '[]'::jsonb)
              end
            ),
              updated_at = now()
        where id = $1 and business_id = $5`,
      [sourceId, snapshotJson, additionalDataJson, status, activation.company_id, participant.seller_user_id || activation.seller_user_id || null]
    );
  } else if (sourceType === "AFFILIATE") {
    await client.query(
      `update affiliates
          set card_metadata = coalesce(card_metadata, '{}'::jsonb)
            || jsonb_build_object(
              'latest_interactive_activation', $2::jsonb,
              'latest_activation_participation', $2::jsonb,
              'additional_contact_entries', case when $4::text = 'started'
                then coalesce(card_metadata->'additional_contact_entries', '[]'::jsonb) || jsonb_build_array($3::jsonb)
                else coalesce(card_metadata->'additional_contact_entries', '[]'::jsonb)
              end
            ),
              updated_at = now()
        where id = $1 and business_id = $5`,
      [sourceId, snapshotJson, additionalDataJson, status, activation.company_id]
    );
  }
  await client.query(
    `insert into lead_events
      (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, metadata)
     values ($1, $2, $3, $4, 'interactive_activation_participation', 'Participación en activación', $5, $6::jsonb)`,
    [
      activation.company_id,
      sourceType === "PLAYER" ? sourceId : null,
      sourceType,
      sourceId,
      `${status === "started" ? "Inició" : "Registró"} la activación “${activation.title || "Activación"}”.`,
      snapshotJson,
    ]
  );
}

function additionalContactData(participant = {}) {
  return {
    captured_at: new Date().toISOString(),
    document_type: normalizeIdentityDocumentType(participant.metadata?.identity?.document_type),
    document: String(participant.document || "").trim() || null,
    phone: String(participant.phone || "").trim() || null,
    email: String(participant.email || "").trim().toLowerCase() || null,
  };
}

function validateGameSession(activation, participant, body) {
  if (activation.category !== "minigame") return;
  if (!participant.game_session_token || body.game_session_token !== participant.game_session_token) {
    throw badRequest("Sesion de juego invalida. Reinicia la partida desde la landing.");
  }
  const elapsedMs = body.duration_ms || (Date.now() - new Date(participant.game_session_started_at || participant.started_at).getTime());
  const minMs = Number(activation.game_config?.min_duration_ms ?? 3000);
  const maxMs = Number(activation.game_config?.max_duration_ms ?? (Number(activation.game_config?.duration_seconds || 60) + 10) * 1000);
  if (elapsedMs < minMs || elapsedMs > maxMs) {
    throw badRequest("Duracion de partida fuera del rango permitido.");
  }
  const maxScore = Number(activation.game_config?.max_score || 10000);
  if (Number(body.score || 0) > maxScore) {
    throw badRequest("Score fuera del rango permitido.");
  }
}

function antiAbuseSummary(activation, participant, body, score) {
  return {
    category: activation.category,
    session_required: activation.category === "minigame",
    session_present: Boolean(participant.game_session_token),
    duration_ms: body.duration_ms || null,
    score,
    max_score: activation.game_config?.max_score || null,
  };
}

async function persistAnswers(client, activationId, participantId, answers) {
  const questionResult = await client.query(
    "select id, order_index from interactive_activation_questions where activation_id = $1",
    [activationId]
  );
  const byId = new Map(questionResult.rows.map((row) => [row.id, row]));
  for (const [key, value] of Object.entries(answers || {})) {
    await client.query(
      `insert into interactive_activation_answers
        (activation_id, participant_id, question_id, answer)
       values ($1, $2, $3, $4::jsonb)`,
      [activationId, participantId, byId.has(key) ? key : null, jsonParam({ key, value }, {})]
    );
  }
}

async function calculateAnswerScore(client, activation, answers) {
  const questionResult = await client.query(
    "select id, scoring_rules from interactive_activation_questions where activation_id = $1",
    [activation.id]
  );
  const questionScore = questionResult.rows.reduce((total, question) => {
    const rules = question.scoring_rules || {};
    if (!Object.prototype.hasOwnProperty.call(rules, "correct_answer")) return total;
    const actual = answers?.[question.id];
    return String(actual) === String(rules.correct_answer)
      ? total + Number(rules.points || 1)
      : total;
  }, 0);
  if (questionScore) return questionScore;

  const config = activation.interaction_config || {};
  if (!Array.isArray(config.scored_answers)) return 0;
  return config.scored_answers.reduce((total, rule) => {
    const actual = answers?.[rule.question_id || rule.key];
    return String(actual) === String(rule.value) ? total + Number(rule.points || 0) : total;
  }, 0);
}

function resolveProfile(activation, answers) {
  const profiles = activation.interaction_config?.profiles || [];
  if (!Array.isArray(profiles) || !profiles.length) return null;
  const match = profiles.find((profile) => {
    const rules = profile.rules || [];
    return rules.every((rule) => String(answers?.[rule.key]) === String(rule.value));
  });
  return match?.label || match?.profile || null;
}

async function resolveRewardPayload(client, activation, context) {
  if (activation.reward_mode === "manual_approval") return null;
  if (activation.reward_mode === "by_score") {
    return resolveScoreReward(client, activation, context.score);
  }
  if (activation.reward_mode === "by_position") {
    return resolvePositionReward(client, activation, context.position_percent);
  }
  if (activation.reward_mode === "by_choice") {
    if (activation.activation_type === "SCRATCH_WIN") {
      return rewardFromScratchChoice(activation.reward_config?.choices, context.selected_choice);
    }
    return rewardFromConfigArray(activation.reward_config?.choices, context.selected_choice, "choice");
  }
  if (activation.reward_mode === "by_answer") {
    return rewardFromAnswer(activation.reward_config?.answer_rewards, context.answers);
  }
  if (activation.reward_mode === "by_profile") {
    return rewardFromConfigArray(activation.reward_config?.profiles, context.result_profile, "profile");
  }
  return fixedRewardPayload(activation.reward_config, "fixed");
}

function rewardFromScratchChoice(items = [], selectedValue) {
  if (selectedValue === undefined || selectedValue === null) {
    throw badRequest("Debes raspar una casilla para generar el beneficio.");
  }
  if (!Array.isArray(items) || !items.length) return null;
  const matchIndex = items.findIndex((item, index) => (
    String(item.value || item.key || item.label || item.profile) === String(selectedValue)
    || String(selectedValue) === `scratch-${index}`
  ));
  if (matchIndex < 0) return null;
  const match = items[matchIndex];
  const rewardLabel = match.benefit_label || match.label || match.reward_label;
  const storedRewardValue = match.reward_value || match.benefit_value || { label: match.label || `Casilla ${matchIndex + 1}` };
  const percentageMatch = String(rewardLabel || "").match(/(\d+(?:[.,]\d+)?)\s*%/);
  const labelPercent = percentageMatch ? Number(percentageMatch[1].replace(",", ".")) : 0;
  const rewardValue = normalizeRewardType(match.reward_type || match.benefit_type) === "PERCENT_DISCOUNT"
    && Number.isFinite(labelPercent) && labelPercent > 0 && labelPercent <= 100
    ? { ...storedRewardValue, percent: labelPercent }
    : storedRewardValue;
  return fixedRewardPayload({
    ...match,
    reward_label: rewardLabel,
    reward_value: rewardValue,
  }, "choice", { selected: selectedValue, scratch_index: matchIndex, scratch: true });
}

async function resolveScoreReward(client, activation, score) {
  const result = await client.query(
    `select *
     from interactive_score_reward_rules
     where activation_id = $1
       and min_score <= $2
       and (max_score is null or max_score >= $2)
     order by min_score desc
     limit 1`,
    [activation.id, Number(score || 0)]
  );
  const rule = result.rows[0];
  if (!rule || !rule.reward_label) return null;
  await assertMaxAwards(client, "interactive_score_reward_rules", rule.id, rule.max_awards);
  return fixedRewardPayload({
    reward_type: rule.reward_type,
    reward_value: rule.reward_value,
    reward_label: rule.reward_label,
    reward_conditions: rule.reward_conditions,
  }, "score", { score, rule_id: rule.id });
}

async function resolvePositionReward(client, activation, positionPercent) {
  const position = Number(positionPercent);
  if (!Number.isFinite(position)) return null;
  const zones = await client.query("select * from interactive_touch_reward_zones where activation_id = $1", [activation.id]);
  if (!zones.rowCount) return null;
  const match = zones.rows
    .map((zone) => {
      const hasRange = zone.start_percent !== null && zone.end_percent !== null;
      const distance = hasRange
        ? (position >= Number(zone.start_percent) && position <= Number(zone.end_percent) ? 0 : Math.min(Math.abs(position - Number(zone.start_percent)), Math.abs(position - Number(zone.end_percent))))
        : Math.abs(position - Number(zone.position_percent || 0));
      return { zone, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.zone;
  if (!match) return null;
  await assertMaxAwards(client, "interactive_touch_reward_zones", match.id, match.max_awards);
  return fixedRewardPayload({
    reward_type: match.reward_type,
    reward_value: match.reward_value,
    reward_label: match.reward_label,
    reward_conditions: match.reward_conditions,
  }, "position", { position_percent: position, zone_id: match.id, label: match.label });
}

function rewardFromConfigArray(items = [], selectedValue, source) {
  if (!Array.isArray(items) || !items.length || selectedValue === undefined || selectedValue === null) return null;
  const match = items.find((item, index) => (
    String(item.value || item.key || item.label || item.profile) === String(selectedValue)
    || String(selectedValue) === `scratch-${index}`
  ));
  if (!match) return null;
  return fixedRewardPayload(match, source, { selected: selectedValue });
}

function rewardFromAnswer(items = [], answers = {}) {
  if (!Array.isArray(items)) return null;
  const match = items.find((item) => String(answers[item.key]) === String(item.value));
  return match ? fixedRewardPayload(match, "answer", { key: match.key, value: match.value }) : null;
}

function fixedRewardPayload(config = {}, source = "fixed", sourceData = {}) {
  const label = config.reward_label || config.benefit_label || config.label;
  if (!label) return null;
  const rewardValue = config.reward_value || config.benefit_value || {};
  const fulfillment = normalizeBenefitFulfillment(rewardValue);
  return {
    reward_type: normalizeRewardType(config.reward_type || config.benefit_type),
    reward_value: {
      ...rewardValue,
      fulfillment,
      redemption_channel: fulfillment.channel,
      ...(fulfillment.mode === "ECOMMERCE_CODE" ? {
        ecommerce_code: fulfillment.ecommerce_code,
        ecommerce_url: fulfillment.ecommerce_url,
      } : {}),
    },
    reward_label: label,
    reward_conditions: config.reward_conditions || config.conditions || null,
    reward_source: source,
    source_data: sourceData,
  };
}

async function assertMaxAwards(client, tableName, sourceId, maxAwards) {
  if (!maxAwards) return;
  const sourceKey = tableName === "interactive_score_reward_rules" ? "rule_id" : "zone_id";
  const result = await client.query(
    `select count(*)::int as total
     from interactive_activation_rewards
     where source_data->>$1 = $2`,
    [sourceKey, String(sourceId)]
  );
  if (Number(result.rows[0]?.total || 0) >= Number(maxAwards)) {
    throw badRequest("Este beneficio ya agoto sus cupos.");
  }
}

async function generateInteractiveRewardQr(client, activation, participant, rewardPayload, options = {}) {
  const rewardLimit = await client.query(
    "select count(*)::int as total from interactive_activation_rewards where activation_id = $1 and status <> 'cancelled'",
    [activation.id]
  );
  if (activation.max_rewards && Number(rewardLimit.rows[0]?.total || 0) >= Number(activation.max_rewards)) {
    throw badRequest("Esta activacion ya entrego todos los beneficios disponibles.");
  }

  const cost = Number(activation.reward_ticket_cost || 1);
  const accountBefore = await ensureCreditAccount(client, activation.company_id);
  const token = createSecureToken();
  const publicCode = `IA-${createSecureToken().slice(0, 10).toUpperCase()}`;
  const validatorUrl = buildValidatorUrl(token);

  const questionnaireResult = await client.query(
    `insert into questionnaires
      (business_id, campaign_id, game_id, player_id, interactive_participant_id, answers)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     returning id`,
    [
      activation.company_id,
      activation.campaign_id || null,
      await defaultGameId(client, activation.company_id),
      participant.player_id || null,
      participant.id,
      jsonParam({
        activation_id: activation.id,
        participant_id: participant.id,
        score: participant.score || null,
        result_profile: participant.result_profile || null,
        activation_form: participant.metadata?.activation_form || null,
        rms_intake: participant.metadata?.rms_intake || null,
        reward: rewardPayload,
      }, {}),
    ]
  );

  const qrResult = await client.query(
    `insert into qr_codes
      (business_id, campaign_id, game_id, player_id, reward_id, questionnaire_id, token, status,
       metadata, expires_at, origin_type, benefit_type, benefit_value, claim_required, claimed_at, claimed_by_player_id)
     values ($1, $2, $3, $4, null, $5, $6, 'ACTIVE', $7::jsonb, $8, 'INTERACTIVE_ACTIVATION', $9, $10::jsonb, false, now(), $4)
     returning *`,
    [
      activation.company_id,
      activation.campaign_id || null,
      await defaultGameId(client, activation.company_id),
      participant.player_id || null,
      questionnaireResult.rows[0].id,
      token,
      jsonParam({
        source: "interactive_activation",
        activation_id: activation.id,
        activation_type: activation.activation_type,
        activation_category: activation.category,
        participant_id: participant.id,
        public_code: publicCode,
        score: participant.score || null,
        result_profile: participant.result_profile || null,
        activation_form: participant.metadata?.activation_form || null,
        rms_intake: participant.metadata?.rms_intake || null,
        communication_id: participant.metadata?.communication_attribution?.communication_id || null,
        acquisition_effort_id: participant.metadata?.acquisition_effort_id || participant.metadata?.communication_attribution?.acquisition_effort_id || null,
        reward_source: rewardPayload.reward_source,
        selected_benefit: rewardPayload,
      }, {}),
      activation.ends_at || null,
      normalizeRewardType(rewardPayload.reward_type),
      jsonParam({
        label: rewardPayload.reward_label,
        value: rewardPayload.reward_value || {},
        conditions: rewardPayload.reward_conditions || null,
        public_code: publicCode,
        activation_id: activation.id,
      }, {}),
    ]
  );
  const qr = qrResult.rows[0];
  await registerActivityQrInCollector(client, {
    business_id: activation.company_id,
    source_type: participant.source_type || (participant.player_id ? "PLAYER" : null),
    source_id: participant.source_id || participant.player_id || null,
    lead_id: participant.player_id || null,
    player_id: participant.player_id || null,
    qr_code_id: qr.id,
    campaign_id: activation.campaign_id || null,
    activation_id: activation.id,
    activation_type: activation.activation_type,
    activation_name: activation.title || null,
    participant_id: participant.id,
  });
  const creditAccount = await consumeQrCredits(
    client,
    activation.company_id,
    cost,
    qr.id,
    options.user_id || null,
    `Beneficio QR generado por activacion interactiva ${activation.title}.`
  );

  const ledger = await client.query(
    `select id
     from business_qr_credit_ledger
     where business_id = $1 and qr_code_id = $2
     order by created_at desc
     limit 1`,
    [activation.company_id, qr.id]
  );

  const rewardResult = await client.query(
    `insert into interactive_activation_rewards
      (activation_id, participant_id, company_id, qr_code_id, qr_token, public_code,
       reward_type, reward_value, reward_label, reward_conditions, reward_source,
       source_data, expires_at, ticket_transaction_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12::jsonb, $13, null)
     returning *`,
    [
      activation.id,
      participant.id,
      activation.company_id,
      qr.id,
      token,
      publicCode,
      normalizeRewardType(rewardPayload.reward_type),
      jsonParam(rewardPayload.reward_value, {}),
      rewardPayload.reward_label,
      rewardPayload.reward_conditions || null,
      rewardPayload.reward_source,
      jsonParam(rewardPayload.source_data, {}),
      activation.ends_at || null,
    ]
  );
  const reward = rewardResult.rows[0];

  const txResult = await client.query(
    `insert into interactive_ticket_transactions
      (company_id, user_id, activation_id, participant_id, reward_id, ledger_id,
       tickets_debited, balance_before, balance_after, transaction_type, notes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'reward_qr_generated', $10)
     returning id`,
    [
      activation.company_id,
      options.user_id || null,
      activation.id,
      participant.id,
      reward.id,
      ledger.rows[0]?.id || null,
      cost,
      Number(accountBefore.qr_balance || 0),
      Number(creditAccount?.qr_balance ?? accountBefore.qr_balance ?? 0),
      "Consumo de tickets al generar beneficio QR unico.",
    ]
  );
  await client.query("update interactive_activation_rewards set ticket_transaction_id = $2 where id = $1", [reward.id, txResult.rows[0].id]);
  await client.query("update interactive_activation_participants set status = 'rewarded' where id = $1", [participant.id]);

  await logQrEvent(client, {
    business_id: activation.company_id,
    campaign_id: activation.campaign_id || null,
    qr_code_id: qr.id,
    player_id: participant.player_id || null,
    user_id: options.user_id || null,
    event_type: "QR_CREATED",
    message: "Interactive activation reward QR created.",
    metadata: {
      origin_type: "INTERACTIVE_ACTIVATION",
      activation_id: activation.id,
      activation_type: activation.activation_type,
      reward_id: reward.id,
      tickets_debited: cost,
    },
  });

  return {
    reward: { ...reward, ticket_transaction_id: txResult.rows[0].id },
    qr_code: qr,
    credit_account: mapPublicCreditAccount(creditAccount),
    validator_url: validatorUrl,
    benefit_url: buildBenefitUrl(token),
    qr_image_data_url: await buildInteractiveBrandedQrDataUrl({ validatorUrl, activation, reward }),
  };
}

async function issueInteractiveActivationAssetDownload(client, activation, participant, reward) {
  const fulfillment = normalizeBenefitFulfillment(reward.reward_value || {});
  if (fulfillment.mode !== "DIGITAL_ASSET") return null;
  if (!fulfillment.asset_id) throw badRequest("Selecciona el activo digital que recibira el ganador.");
  const assetResult = await client.query(
    `select id, title, file_name, file_type, file_size
     from digital_assets
     where id = $1 and business_id = $2 and is_active = true
     for share`,
    [fulfillment.asset_id, activation.company_id]
  );
  const asset = assetResult.rows[0];
  if (!asset) throw badRequest("El activo digital seleccionado ya no esta disponible para esta empresa.");
  const downloadToken = createSecureToken();
  const inserted = await client.query(
    `insert into interactive_activation_asset_downloads
      (business_id, activation_id, asset_id, participant_id, reward_id, download_token, metadata)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb)
     on conflict (activation_id, participant_id, asset_id)
     do update set reward_id = excluded.reward_id
     returning download_token`,
    [
      activation.company_id,
      activation.id,
      asset.id,
      participant.id,
      reward.id,
      downloadToken,
      jsonParam({
        activation_title: activation.title,
        campaign_id: activation.campaign_id || null,
        asset_title: asset.title,
        fulfillment: "digital_asset_reward",
      }, {}),
    ]
  );
  return {
    id: asset.id,
    title: asset.title,
    file_name: asset.file_name,
    file_type: asset.file_type,
    file_size: Number(asset.file_size || 0),
    download_url: interactiveAssetDownloadUrl(inserted.rows[0].download_token),
  };
}

async function interactiveActivationAssetDownloadForReward(client, rewardId) {
  if (!rewardId) return null;
  const result = await client.query(
    `select d.download_token, da.id, da.title, da.file_name, da.file_type, da.file_size
     from interactive_activation_asset_downloads d
     join digital_assets da on da.id = d.asset_id and da.is_active = true
     where d.reward_id = $1
     order by d.created_at desc
     limit 1`,
    [rewardId]
  );
  const asset = result.rows[0];
  if (!asset) return null;
  return {
    id: asset.id,
    title: asset.title,
    file_name: asset.file_name,
    file_type: asset.file_type,
    file_size: Number(asset.file_size || 0),
    download_url: interactiveAssetDownloadUrl(asset.download_token),
  };
}

async function downloadInteractiveActivationAsset(token, reqMeta = {}) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `select d.*, da.file_name, da.file_type, da.file_data_url, da.file_size, da.title as asset_title,
              a.status as activation_status, a.starts_at, a.ends_at, a.title as activation_title,
              a.campaign_id, p.player_id
       from interactive_activation_asset_downloads d
       join digital_assets da on da.id = d.asset_id and da.is_active = true
       join interactive_activations a on a.id = d.activation_id and a.company_id = d.business_id
       join interactive_activation_participants p on p.id = d.participant_id and p.activation_id = a.id
       where d.download_token = $1
       for update`,
      [token]
    );
    const row = result.rows[0];
    if (!row) throw notFound("La descarga no esta disponible.");
    assertActivationOpen({ status: row.activation_status, starts_at: row.starts_at, ends_at: row.ends_at });
    const parsed = parseDigitalAssetDataUrl(row.file_data_url);
    await client.query(
      `update interactive_activation_asset_downloads
       set downloaded_at = now(), ip_address = coalesce(ip_address, $2), user_agent = coalesce(user_agent, $3)
       where id = $1`,
      [row.id, reqMeta.ip || null, reqMeta.userAgent || null]
    );
    await client.query(
      `insert into lead_events
        (business_id, lead_id, event_type, event_title, event_description, campaign_id, metadata)
       values ($1, $2, 'interactive_asset_downloaded', 'Activo digital descargado por activacion', $3, $4, $5::jsonb)`,
      [
        row.business_id,
        row.player_id || null,
        `El lead descargo "${row.asset_title || row.file_name}" despues de completar "${row.activation_title}".`,
        row.campaign_id || null,
        jsonParam({
          activation_id: row.activation_id,
          participant_id: row.participant_id,
          reward_id: row.reward_id,
          asset_id: row.asset_id,
          asset_title: row.asset_title,
          source_label: "recompensa_activo_digital",
        }, {}),
      ]
    );
    return { buffer: parsed.buffer, file_name: row.file_name, file_type: row.file_type, file_size: row.file_size };
  });
}

async function getInteractiveActivationReport(businessId, activationId) {
  const activationResult = await query(
    "select * from interactive_activations where id = $1 and company_id = $2",
    [activationId, businessId]
  );
  const activation = activationResult.rows[0];
  if (!activation) throw notFound("Activacion no encontrada.");
  const metrics = await query(
    `select
       count(distinct p.id)::int as participants,
       count(distinct p.id) filter (where p.status in ('completed', 'rewarded'))::int as completed,
       count(distinct p.id) filter (where p.status = 'abandoned')::int as abandoned,
       count(distinct r.id)::int as qr_generated,
       count(distinct iad.id) filter (where iad.downloaded_at is not null)::int as digital_asset_downloads,
       coalesce(sum(tx.tickets_debited), 0)::int as tickets_consumed,
       count(distinct rd.id)::int as redemptions,
       count(distinct bs.id)::int as sales_count,
       coalesce(sum(bs.sale_amount), 0)::numeric as revenue
     from interactive_activations a
     left join interactive_activation_participants p on p.activation_id = a.id
     left join interactive_activation_rewards r on r.activation_id = a.id
     left join interactive_activation_asset_downloads iad on iad.activation_id = a.id
     left join interactive_ticket_transactions tx on tx.reward_id = r.id
     left join qr_codes q on q.id = r.qr_code_id
     left join redemptions rd on rd.qr_code_id = q.id
     left join business_sales bs on bs.qr_code_id = q.id
     where a.id = $1`,
    [activationId]
  );
  const row = metrics.rows[0] || {};
  const [participantHistory, invitationHistory] = await Promise.all([
    query(
      `select p.id as participant_id, p.player_id, p.source_type, p.source_id, p.name, p.document, p.phone, p.email,
              p.score, p.result_profile, p.status as participant_status, p.started_at,
              p.completed_at, p.created_at, p.metadata,
              r.id as reward_id, r.status as reward_status,
              q.id as qr_code_id, q.status as qr_status, q.redeemed_at,
              q.expires_at as qr_expires_at
         from interactive_activation_participants p
         left join interactive_activation_rewards r on r.participant_id = p.id and r.status <> 'cancelled'
         left join qr_codes q on q.id = r.qr_code_id
        where p.activation_id = $1 and p.company_id = $2
        order by coalesce(p.completed_at, p.started_at, p.created_at) desc
        limit 1000`,
      [activationId, businessId]
    ),
    query(
      `select la.id as invitation_id, la.source_type, la.source_id, la.lead_id, la.channel,
              la.status as invitation_status, la.created_at,
              coalesce(p.name, ml.name, af.full_name, 'Contacto sin nombre') as name,
              coalesce(p.document_id, af.document_id) as document,
              coalesce(p.phone, ml.phone, af.phone) as phone,
              coalesce(p.email, ml.email, af.email) as email
         from lead_activations la
         left join players p on p.business_id = la.business_id
           and (p.id = la.lead_id or (la.source_type = 'PLAYER' and p.id = la.source_id))
         left join business_manual_leads ml on ml.business_id = la.business_id
           and la.source_type = 'MANUAL' and ml.id = la.source_id
         left join affiliates af on af.business_id = la.business_id
           and la.source_type = 'AFFILIATE' and af.id = la.source_id
        where la.business_id = $2
          and la.metadata->>'interactive_activation_id' = $1::text
          and not exists (
            select 1
              from interactive_activation_participants p2
             where p2.activation_id = $1
               and p2.company_id = $2
               and (
                 (p.id is not null and p2.player_id = p.id)
                 or (p2.player_id = la.lead_id)
                 or (nullif(coalesce(p.email, ml.email, af.email), '') is not null
                   and lower(coalesce(p2.email, '')) = lower(coalesce(p.email, ml.email, af.email)))
                 or (nullif(regexp_replace(coalesce(p.phone, ml.phone, af.phone, ''), '\\D', '', 'g'), '') is not null
                   and regexp_replace(coalesce(p2.phone, ''), '\\D', '', 'g') = regexp_replace(coalesce(p.phone, ml.phone, af.phone, ''), '\\D', '', 'g'))
               )
          )
        order by la.created_at desc
        limit 1000`,
      [activationId, businessId]
    ),
  ]);
  const participantsHistory = participantHistory.rows.map((participant) => {
    const qrStatus = String(participant.qr_status || '').toUpperCase();
    const participantStatus = String(participant.participant_status || 'started').toLowerCase();
    const state = participant.reward_id
      ? (qrStatus === 'REDEEMED' || participant.redeemed_at ? 'qr_redeemed' : qrStatus === 'ACTIVE' ? 'qr_active' : 'qr_issued')
      : participantStatus === 'completed' ? 'participated_without_benefit' : participantStatus;
    return {
      ...participant,
      kind: 'participant',
      state,
      capture_summary: participant.metadata?.activation_form?.summary || null,
    };
  });
  const invitationsHistory = invitationHistory.rows.map((invitation) => ({
    ...invitation,
    kind: 'invitation',
    state: 'pending_participation',
  }));
  const participants = Number(row.participants || 0);
  const qrGenerated = Number(row.qr_generated || 0);
  const redemptions = Number(row.redemptions || 0);
  return {
    activation: mapActivation(activation),
    metrics: {
      participants,
      completed: Number(row.completed || 0),
      abandoned: Number(row.abandoned || 0),
      qr_generated: qrGenerated,
      digital_asset_downloads: Number(row.digital_asset_downloads || 0),
      tickets_consumed: Number(row.tickets_consumed || 0),
      redemptions,
      sales_count: Number(row.sales_count || 0),
      revenue: Number(row.revenue || 0),
      participation_to_qr_rate: participants ? Number(((qrGenerated / participants) * 100).toFixed(1)) : 0,
      qr_to_redemption_rate: qrGenerated ? Number(((redemptions / qrGenerated) * 100).toFixed(1)) : 0,
    },
    history: {
      participants: participantsHistory,
      invitations_pending: invitationsHistory,
      totals: {
        obtained_qr: participantsHistory.filter((item) => ['qr_active', 'qr_issued', 'qr_redeemed'].includes(item.state)).length,
        qr_active: participantsHistory.filter((item) => item.state === 'qr_active').length,
        qr_redeemed: participantsHistory.filter((item) => item.state === 'qr_redeemed').length,
        participated_without_benefit: participantsHistory.filter((item) => item.state === 'participated_without_benefit').length,
        pending_participation: invitationsHistory.length,
      },
    },
  };
}

async function listInteractiveParticipants(businessId, activationId) {
  await assertActivationOwnership(businessId, activationId);
  const result = await query(
    `select id, activation_id, company_id, name, document, phone, email, score, result_profile,
            status, started_at, completed_at, created_at, updated_at
     from interactive_activation_participants
     where activation_id = $1 and company_id = $2
     order by created_at desc
     limit 1000`,
    [activationId, businessId]
  );
  return result.rows;
}

async function listInteractiveRewards(businessId, activationId) {
  await assertActivationOwnership(businessId, activationId);
  const result = await query(
    `select r.*, q.status as qr_status, q.redeemed_at, q.expires_at as qr_expires_at
     from interactive_activation_rewards r
     left join qr_codes q on q.id = r.qr_code_id
     where r.activation_id = $1 and r.company_id = $2
     order by r.created_at desc
     limit 1000`,
    [activationId, businessId]
  );
  return result.rows;
}

async function assertActivationOwnership(businessId, activationId) {
  const result = await query(
    "select id from interactive_activations where id = $1 and company_id = $2",
    [activationId, businessId]
  );
  if (!result.rowCount) {
    throw notFound("Activacion no encontrada.");
  }
}

module.exports = {
  ACTIVATION_CATALOG,
  completeInteractiveParticipant,
  createInteractiveActivation,
  deleteInteractiveActivation,
  downloadInteractiveActivationAsset,
  generateInteractiveRewardQr,
  getInteractiveActivationReport,
  getPublicInteractiveActivation,
  listActivationCatalog,
  listDeletedInteractiveActivations,
  listInteractiveActivations,
  listInteractiveParticipants,
  listInteractiveRewards,
  recycleInteractiveActivation,
  startInteractiveParticipant,
  updateInteractiveActivation,
};

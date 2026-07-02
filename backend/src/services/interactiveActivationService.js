const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { logQrEvent } = require("./auditService");
const { consumeQrCredits, ensureCreditAccount, mapPublicCreditAccount } = require("./qrCreditService");

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

function brandStyle(settings = {}) {
  return {
    primary: safeBrandColor(settings.brand_primary, "#13212c"),
    secondary: safeBrandColor(settings.brand_secondary, "#945d20"),
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
    current = word.length > maxChars ? `${word.slice(0, Math.max(1, maxChars - 1))}…` : word;
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function brandedQrTextRows({ businessName, activationTitle, rewardLabel, publicCode }) {
  return [
    ...wrapSvgText(businessName || "MarketGamesQR", 34, 1).map((text) => ({ text, size: 30, weight: 900, fill: "#111827" })),
    ...wrapSvgText(rewardLabel || "Beneficio desbloqueado", 42, 2).map((text, index) => ({ text, size: index ? 22 : 25, weight: 800, fill: "#111827" })),
    ...wrapSvgText(activationTitle || "Activacion interactiva", 46, 1).map((text) => ({ text, size: 18, weight: 700, fill: "#4b5563" })),
    { text: publicCode || "QR UNICO", size: 18, weight: 900, fill: "#111827" },
  ].slice(0, 6);
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
  const rows = brandedQrTextRows({
    businessName: activation.business_name,
    activationTitle: activation.title,
    rewardLabel: reward.reward_label,
    publicCode: reward.public_code,
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
  <image href="${escapeSvg(logo)}" x="430" y="96" width="220" height="82" preserveAspectRatio="xMidYMid meet"/>` : `<text x="${width / 2}" y="146" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#ffffff">MarketGamesQR</text>`}
  <rect x="${qrX - 34}" y="${qrY - 34}" width="${qrSize + 68}" height="${qrSize + 68}" rx="40" fill="#ffffff"/>
  <rect x="${qrX - 34}" y="${qrY - 34}" width="${qrSize + 68}" height="${qrSize + 68}" rx="40" fill="none" stroke="${escapeSvg(brand.secondary)}" stroke-width="10"/>
  <image href="${qrImage}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>
  <rect x="136" y="${textPanelY}" width="808" height="240" rx="34" fill="#ffffff" opacity="0.96"/>
  ${rows.map((row, index) => `<text x="${width / 2}" y="${textPanelY + 48 + index * 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${row.size}" font-weight="${row.weight}" fill="${escapeSvg(row.fill)}">${escapeSvg(row.text)}</text>`).join("\n  ")}
  <text x="${width / 2}" y="1260" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="#4b5563">Presenta este QR en el punto físico para redimir</text>
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

function normalizeCaptureConfig(config = {}) {
  const required = new Set(["name", "phone", "email", "document", ...(Array.isArray(config.required_fields) ? config.required_fields : [])]);
  return {
    ...config,
    required_fields: Array.from(required),
    optional_fields: Array.isArray(config.optional_fields)
      ? config.optional_fields.filter((field) => !required.has(field))
      : [],
    participant_lock: normalizeParticipantLock(config.participant_lock || {}),
  };
}

function publicActivation(row, questions = [], scoreRules = [], touchZones = []) {
  const mapped = mapActivation(row);
  return {
    ...mapped,
    business: {
      id: row.company_id,
      name: row.business_name,
      slug: row.business_slug,
    },
    questions: questions.map((question) => ({
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || [],
      required: question.required,
      order_index: question.order_index,
    })),
    score_rewards: scoreRules.map(mapScoreRule),
    touch_zones: touchZones.map(mapTouchZone),
    active: row.status === "active" && (!row.starts_at || new Date(row.starts_at) <= new Date()) && (!row.ends_at || new Date(row.ends_at) > new Date()),
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

function listActivationCatalog() {
  const groups = ACTIVATION_CATALOG.reduce((acc, item) => {
    const group = acc.find((entry) => entry.label === item.group);
    if (group) {
      group.items.push(item);
    } else {
      acc.push({ label: item.group, items: [item] });
    }
    return acc;
  }, []);
  return { groups, items: ACTIVATION_CATALOG };
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
    const campaign = await assertCampaign(client, businessId, body.campaign_id || null);
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
        (company_id, user_id, campaign_id, title, description, category, activation_type, status,
         reward_ticket_cost, reward_mode, reward_config, game_config, interaction_config,
         capture_config, visual_config, starts_at, ends_at, max_participants, max_rewards,
         public_slug, access_qr_token, terms)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17, $18, $19, $20, $21, $22)
       returning *`,
      [
        businessId,
        user.id,
        body.campaign_id || null,
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
      activation: mapActivation({ ...activation, campaign_name: campaign?.name || null }),
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
  const result = await query(
    `with recent_activations as (
       select *
       from interactive_activations
       where company_id = $1 and status <> 'archived'
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
     )
     select a.id, a.company_id, a.user_id, a.campaign_id, a.title, a.description,
            a.category, a.activation_type, a.status, a.reward_ticket_cost, a.reward_mode,
            a.reward_config, a.game_config, a.interaction_config, a.capture_config, a.visual_config,
            a.starts_at, a.ends_at, a.max_participants, a.max_rewards, a.public_slug,
            a.access_qr_token, a.terms, a.created_at, a.updated_at,
            c.name as campaign_name,
            coalesce(p.participants_count, 0)::int as participants_count,
            coalesce(r.rewards_count, 0)::int as rewards_count
     from recent_activations a
     left join campaigns c on c.id = a.campaign_id
     left join participant_counts p on p.activation_id = a.id
     left join reward_counts r on r.activation_id = a.id
     order by a.created_at desc`,
    [businessId, limit]
  );
  return result.rows.map(mapActivation);
}

async function updateInteractiveActivation(businessId, activationId, body) {
  const fields = [];
  const values = [activationId, businessId];
  const allowed = [
    "title",
    "description",
    "status",
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
  return { activation: mapActivation(result.rows[0]) };
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
        (company_id, user_id, campaign_id, title, description, category, activation_type, status,
         reward_ticket_cost, reward_mode, reward_config, game_config, interaction_config,
         capture_config, visual_config, starts_at, ends_at, max_participants, max_rewards,
         public_slug, access_qr_token, terms)
       values ($1, $2, $3, $4, $5, $6, $7, 'draft',
         $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, null, null, $15, $16, $17, $18, $19)
       returning *`,
      [
        original.company_id,
        user.id,
        original.campaign_id || null,
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

    if (hasCommercialHistory) {
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
        message: "La activacion tenia historial comercial. Se archivo y se retiro de la lista visible para conservar trazabilidad.",
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
    `select a.id, a.company_id, a.user_id, a.campaign_id, a.title, a.description,
            a.category, a.activation_type, a.status, a.reward_ticket_cost, a.reward_mode,
            a.starts_at, a.ends_at, a.max_participants, a.max_rewards, a.public_slug,
            a.access_qr_token, a.terms, a.created_at, a.updated_at,
            c.name as campaign_name,
            count(distinct p.id)::int as participants_count,
            count(distinct r.id)::int as rewards_count
     from interactive_activations a
     left join campaigns c on c.id = a.campaign_id
     left join interactive_activation_participants p on p.activation_id = a.id
     left join interactive_activation_rewards r on r.activation_id = a.id
     where a.company_id = $1 and a.status = 'archived'
     group by a.id, c.name
     order by a.updated_at desc`,
    [businessId]
  );
  return result.rows.map(mapActivation);
}

async function getPublicInteractiveActivation(slug) {
  const activationResult = await query(
    `select a.*, b.name as business_name, b.slug as business_slug
     from interactive_activations a
     join businesses b on b.id = a.company_id
     where a.public_slug = $1 and b.is_active = true`,
    [slug]
  );
  const activation = activationResult.rows[0];
  if (!activation) {
    throw notFound("Activacion no encontrada.");
  }
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
    await assertDuplicateParticipant(client, activation, body);
    const gameSessionToken = createSecureToken();
    const player = await createPlayer(client, activation, body, { status: "started" });
    const participantResult = await client.query(
      `insert into interactive_activation_participants
        (activation_id, company_id, player_id, name, document, phone, email, metadata, status,
         game_session_token, game_session_started_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'started', $9, now())
       returning *`,
      [
        activation.id,
        activation.company_id,
        player.id,
        body.name || null,
        body.document || body.document_id || null,
        body.phone || null,
        body.email || null,
        jsonParam(body.metadata, {}),
        gameSessionToken,
      ]
    );
    return {
      participant: participantResult.rows[0],
      game_session_token: gameSessionToken,
    };
  });
}

async function completeInteractiveParticipant(slug, body) {
  return withTransaction(async (client) => {
    const activation = await lockActivationBySlug(client, slug);
    assertActivationOpen(activation);
    if (!body.participant_id) assertRequiredCaptureFields(activation, body);
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
        jsonParam({
          source_url: body.metadata?.source_url || null,
          user_agent: body.metadata?.user_agent || null,
          ip_hint: body.metadata?.ip_hint || null,
          anti_abuse: antiAbuseSummary(activation, participant, body, score),
        }, {}),
      ]
    );

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
    return {
      participant: { id: participant.id, status: "rewarded", score, result_profile: resultProfile || null },
      rewarded: true,
      message: "Beneficio generado. El QR esta listo para redimir en tienda.",
      reward: reward.reward,
      qr_code: reward.qr_code,
      validator_url: reward.validator_url,
      qr_image_data_url: reward.qr_image_data_url,
      credit_account: reward.credit_account,
    };
  });
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
  const player = await createPlayer(client, activation, body, { status: "completed" });
  const result = await client.query(
    `insert into interactive_activation_participants
      (activation_id, company_id, player_id, name, document, phone, email, metadata, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'started')
     returning *`,
    [
      activation.id,
      activation.company_id,
      player.id,
      body.name || null,
      body.document || body.document_id || null,
      body.phone || null,
      body.email || null,
      jsonParam(body.metadata, {}),
    ]
  );
  return result.rows[0];
}

async function createPlayer(client, activation, body, metadata = {}) {
  const result = await client.query(
    `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     returning *`,
    [
      activation.company_id,
      activation.campaign_id || null,
      await requiredGameId(client, activation.company_id),
      body.name || null,
      body.email || null,
      body.phone || null,
      body.document || body.document_id || null,
      jsonParam({
        source: "interactive_activation",
        activation_id: activation.id,
        activation_type: activation.activation_type,
        ...metadata,
      }, {}),
    ]
  );
  return result.rows[0];
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
  const match = items.find((item) => String(item.value || item.key || item.label || item.profile) === String(selectedValue));
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
  return {
    reward_type: normalizeRewardType(config.reward_type || config.benefit_type),
    reward_value: config.reward_value || config.benefit_value || {},
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
    `insert into questionnaires (business_id, campaign_id, game_id, player_id, answers)
     values ($1, $2, $3, $4, $5::jsonb)
     returning id`,
    [
      activation.company_id,
      activation.campaign_id || null,
      await requiredGameId(client, activation.company_id),
      participant.player_id || null,
      jsonParam({
        activation_id: activation.id,
        participant_id: participant.id,
        score: participant.score || null,
        result_profile: participant.result_profile || null,
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
      await requiredGameId(client, activation.company_id),
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
    qr_image_data_url: await buildInteractiveBrandedQrDataUrl({ validatorUrl, activation, reward }),
  };
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
       coalesce(sum(tx.tickets_debited), 0)::int as tickets_consumed,
       count(distinct rd.id)::int as redemptions,
       count(distinct bs.id)::int as sales_count,
       coalesce(sum(bs.sale_amount), 0)::numeric as revenue
     from interactive_activations a
     left join interactive_activation_participants p on p.activation_id = a.id
     left join interactive_activation_rewards r on r.activation_id = a.id
     left join interactive_ticket_transactions tx on tx.reward_id = r.id
     left join qr_codes q on q.id = r.qr_code_id
     left join redemptions rd on rd.qr_code_id = q.id
     left join business_sales bs on bs.qr_code_id = q.id
     where a.id = $1`,
    [activationId]
  );
  const row = metrics.rows[0] || {};
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
      tickets_consumed: Number(row.tickets_consumed || 0),
      redemptions,
      sales_count: Number(row.sales_count || 0),
      revenue: Number(row.revenue || 0),
      participation_to_qr_rate: participants ? Number(((qrGenerated / participants) * 100).toFixed(1)) : 0,
      qr_to_redemption_rate: qrGenerated ? Number(((redemptions / qrGenerated) * 100).toFixed(1)) : 0,
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

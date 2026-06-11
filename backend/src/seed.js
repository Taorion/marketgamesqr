const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { env } = require("./config/env");
const { pool } = require("./config/db");

function seedValue(name, fallback) {
  if (env.isProduction && !process.env[name]) {
    throw new Error(`${name} is required when running seed in production.`);
  }
  return process.env[name] || fallback;
}

async function upsertUser({ businessId, email, password, fullName, role }) {
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `insert into app_users (business_id, email, password_hash, full_name, role)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update
     set password_hash = excluded.password_hash,
         business_id = excluded.business_id,
         full_name = excluded.full_name,
         role = excluded.role,
         is_active = true
     returning id, email, role`,
    [businessId, email, hash, fullName, role]
  );
  return result.rows[0];
}

function token(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(3, "0")}-${crypto.randomBytes(6).toString("hex")}`;
}

async function resetCampaignData(campaignId) {
  await pool.query("delete from attributed_sales where campaign_id = $1", [campaignId]);
  await pool.query("delete from redemptions where campaign_id = $1", [campaignId]);
  await pool.query("delete from validation_logs where campaign_id = $1", [campaignId]);
  await pool.query("delete from qr_codes where campaign_id = $1", [campaignId]);
  await pool.query("delete from questionnaires where campaign_id = $1", [campaignId]);
  await pool.query("delete from players where campaign_id = $1", [campaignId]);
  await pool.query("delete from campaign_sales_snapshots where campaign_id = $1", [campaignId]);
}

async function removeLegacyCampaign(businessId, publicSlug) {
  const legacyResult = await pool.query(
    `select id from campaigns where business_id = $1 and public_slug = $2`,
    [businessId, publicSlug]
  );
  const legacyCampaignId = legacyResult.rows[0]?.id;
  if (!legacyCampaignId) {
    return;
  }

  await resetCampaignData(legacyCampaignId);
  await pool.query("delete from campaigns where id = $1", [legacyCampaignId]);
}

async function seedCampaignPerformance({
  businessId,
  campaignId,
  gameId,
  rewardId,
  validatorUserId,
  branchId,
}) {
  await resetCampaignData(campaignId);

  const leadBlueprints = [
    ["Laura", "Mendoza"], ["Camilo", "Rojas"], ["Natalia", "Vera"], ["Julian", "Castro"], ["Paula", "Arias"],
    ["Daniel", "Lozano"], ["Marcela", "Suarez"], ["Andres", "Pineda"], ["Sofia", "Mejia"], ["Esteban", "Gomez"],
    ["Valentina", "Pena"], ["Santiago", "Morales"], ["Diana", "Navarro"], ["Felipe", "Ruiz"], ["Manuela", "Cortes"],
    ["Juan", "Bohorquez"], ["Andrea", "Beltran"], ["Mateo", "Salazar"], ["Luisa", "Franco"], ["Nicolas", "Parra"],
    ["Carolina", "Reyes"], ["Sebastian", "Duarte"], ["Tatiana", "Gil"], ["Cristian", "Ortega"], ["Alejandra", "Leon"],
    ["Miguel", "Acosta"], ["Viviana", "Rincon"], ["Kevin", "Mora"], ["Lorena", "Diaz"], ["Oscar", "Herrera"],
    ["Paola", "Barrios"], ["Tomas", "Serrano"], ["Isabella", "Forero"], ["David", "Cardona"],
  ];
  const leadProfiles = [
    {
      source: "instagram",
      favoriteProduct: "chaqueta",
      purchaseWindow: "hoy",
      giftBudget: "120000-200000",
      preferredChannel: "whatsapp",
      purchaseIntent: "regalo-padre",
      stylePreference: "clasico",
      usageContext: "regalo-especial",
      preferredContactTime: "manana",
    },
    {
      source: "tiktok",
      favoriteProduct: "morral",
      purchaseWindow: "esta-semana",
      giftBudget: "80000-120000",
      preferredChannel: "instagram",
      purchaseIntent: "compra-propia",
      stylePreference: "casual",
      usageContext: "viaje",
      preferredContactTime: "noche",
    },
    {
      source: "facebook",
      favoriteProduct: "billetera",
      purchaseWindow: "este-mes",
      giftBudget: "50000-80000",
      preferredChannel: "correo",
      purchaseIntent: "regalo-padre",
      stylePreference: "clasico",
      usageContext: "diario",
      preferredContactTime: "tarde",
    },
    {
      source: "instagram",
      favoriteProduct: "maletin",
      purchaseWindow: "esta-semana",
      giftBudget: "200000+",
      preferredChannel: "whatsapp",
      purchaseIntent: "compra-propia",
      stylePreference: "ejecutivo",
      usageContext: "oficina",
      preferredContactTime: "manana",
    },
    {
      source: "facebook",
      favoriteProduct: "correa",
      purchaseWindow: "solo-explorando",
      giftBudget: "50000-80000",
      preferredChannel: "facebook",
      purchaseIntent: "regalo-pareja",
      stylePreference: "moderno",
      usageContext: "diario",
      preferredContactTime: "tarde",
    },
    {
      source: "tiktok",
      favoriteProduct: "chaqueta",
      purchaseWindow: "hoy",
      giftBudget: "200000+",
      preferredChannel: "whatsapp",
      purchaseIntent: "compra-propia",
      stylePreference: "moderno",
      usageContext: "viaje",
      preferredContactTime: "noche",
    },
    {
      source: "instagram",
      favoriteProduct: "morral",
      purchaseWindow: "este-mes",
      giftBudget: "120000-200000",
      preferredChannel: "correo",
      purchaseIntent: "regalo-padre",
      stylePreference: "casual",
      usageContext: "regalo-especial",
      preferredContactTime: "tarde",
    },
    {
      source: "facebook",
      favoriteProduct: "billetera",
      purchaseWindow: "esta-semana",
      giftBudget: "80000-120000",
      preferredChannel: "instagram",
      purchaseIntent: "otro",
      stylePreference: "ejecutivo",
      usageContext: "oficina",
      preferredContactTime: "manana",
    },
  ];
  const redeemedIndexes = new Set(Array.from({ length: 27 }, (_, index) => index));
  const saleBlueprints = [
    { amount: 82000, product: "Billetera de cuero classic", payment: "Tarjeta", saleDate: "2026-06-07T16:25:00.000Z" },
    { amount: 94000, product: "Correa ejecutiva", payment: "Efectivo", saleDate: "2026-06-07T18:10:00.000Z" },
    { amount: 110000, product: "Morral urbano cuero", payment: "Tarjeta", saleDate: "2026-06-08T14:05:00.000Z" },
    { amount: 76000, product: "Billetera bifold", payment: "Transferencia", saleDate: "2026-06-08T16:40:00.000Z" },
    { amount: 128000, product: "Chaqueta cuero ligera", payment: "Tarjeta", saleDate: "2026-06-08T19:20:00.000Z" },
    { amount: 89000, product: "Correa casual", payment: "Efectivo", saleDate: "2026-06-09T13:15:00.000Z" },
    { amount: 137000, product: "Maletin ejecutivo", payment: "Tarjeta", saleDate: "2026-06-09T18:00:00.000Z" },
    { amount: 99000, product: "Morral compacto", payment: "Transferencia", saleDate: "2026-06-10T15:25:00.000Z" },
    { amount: 145000, product: "Chaqueta cuero cafe", payment: "Tarjeta", saleDate: "2026-06-10T20:10:00.000Z" },
    { amount: 87000, product: "Billetera slim", payment: "Efectivo", saleDate: "2026-06-11T12:35:00.000Z" },
    { amount: 104000, product: "Correa premium", payment: "Tarjeta", saleDate: "2026-06-11T17:30:00.000Z" },
    { amount: 118000, product: "Morral canvas cuero", payment: "Transferencia", saleDate: "2026-06-12T14:45:00.000Z" },
    { amount: 92000, product: "Billetera vertical", payment: "Tarjeta", saleDate: "2026-06-12T18:20:00.000Z" },
    { amount: 149000, product: "Maletin premium", payment: "Tarjeta", saleDate: "2026-06-13T16:55:00.000Z" },
    { amount: 108000, product: "Chaqueta cuero negra", payment: "Efectivo", saleDate: "2026-06-13T19:15:00.000Z" },
    { amount: 97000, product: "Correa clasica", payment: "Transferencia", saleDate: "2026-06-14T13:35:00.000Z" },
    { amount: 121000, product: "Morral office", payment: "Tarjeta", saleDate: "2026-06-14T17:05:00.000Z" },
    { amount: 85000, product: "Billetera compacta", payment: "Efectivo", saleDate: "2026-06-15T12:20:00.000Z" },
    { amount: 132000, product: "Chaqueta cuero miel", payment: "Tarjeta", saleDate: "2026-06-15T18:40:00.000Z" },
    { amount: 91000, product: "Correa formal", payment: "Transferencia", saleDate: "2026-06-16T14:15:00.000Z" },
    { amount: 115000, product: "Morral weekend", payment: "Tarjeta", saleDate: "2026-06-16T18:55:00.000Z" },
    { amount: 78000, product: "Billetera esencial", payment: "Efectivo", saleDate: "2026-06-17T11:50:00.000Z" },
    { amount: 126000, product: "Chaqueta liviana cuero", payment: "Tarjeta", saleDate: "2026-06-17T16:10:00.000Z" },
    { amount: 101000, product: "Correa trenzada", payment: "Transferencia", saleDate: "2026-06-18T15:05:00.000Z" },
    { amount: 139000, product: "Maletin urbano", payment: "Tarjeta", saleDate: "2026-06-18T19:25:00.000Z" },
  ];
  const saleBlueprintByIndex = new Map(saleBlueprints.map((sale, index) => [index, sale]));

  for (const [index, lead] of leadBlueprints.entries()) {
    const [firstName, lastName] = lead;
    const documentId = `103245${String(6701 + index).padStart(4, "0")}`;
    const phone = `310456${String(7812 + index).padStart(4, "0")}`;
    const email = `${firstName}.${lastName}${index + 1}@example.com`.toLowerCase();
    const profile = leadProfiles[index % leadProfiles.length];
    const {
      source,
      favoriteProduct,
      purchaseWindow,
      giftBudget,
      preferredChannel,
      purchaseIntent,
      stylePreference,
      usageContext,
      preferredContactTime,
    } = profile;
    const createdAt = new Date(Date.UTC(2026, 3, 18 + index, 10 + (index % 6), (index % 4) * 10, 0)).toISOString();

    const playerResult = await pool.query(
      `insert into players
        (business_id, game_id, campaign_id, name, email, phone, document_id, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       returning id`,
      [
        businessId,
        gameId,
        campaignId,
        `${firstName} ${lastName}`,
        email,
        phone,
        documentId,
        JSON.stringify({
          source,
          campaign_label: "Dia del Padre Cuero",
          favorite_product: favoriteProduct,
          purchase_intent: purchaseIntent,
          gift_budget: giftBudget,
          purchase_window: purchaseWindow,
          preferred_channel: preferredChannel,
          style_preference: stylePreference,
          usage_context: usageContext,
          preferred_contact_time: preferredContactTime,
          lead_temperature: purchaseWindow === "hoy" ? "hot" : purchaseWindow === "esta-semana" ? "warm" : "cold",
        }),
        createdAt,
      ]
    );

    const playerId = playerResult.rows[0].id;
    const questionnaireResult = await pool.query(
      `insert into questionnaires
        (business_id, game_id, player_id, campaign_id, answers, created_at)
       values ($1, $2, $3, $4, $5::jsonb, $6)
       returning id`,
      [
        businessId,
        gameId,
        playerId,
        campaignId,
        JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          document_id: documentId,
          email,
          phone,
          favorite_product: favoriteProduct,
          purchase_window: purchaseWindow,
          gift_budget: giftBudget,
          preferred_channel: preferredChannel,
          purchase_intent: purchaseIntent,
          style_preference: stylePreference,
          usage_context: usageContext,
          preferred_contact_time: preferredContactTime,
          source,
          campaign_label: "Dia del Padre Cuero",
        }),
        createdAt,
      ]
    );

    const saleBlueprint = saleBlueprintByIndex.get(index);
    const redeemedAt = saleBlueprint ? saleBlueprint.saleDate : null;
    const qrStatus = redeemedIndexes.has(index) ? "REDEEMED" : "ACTIVE";

    const qrResult = await pool.query(
      `insert into qr_codes
        (business_id, campaign_id, game_id, player_id, reward_id, questionnaire_id, token, status, metadata, created_at, expires_at, redeemed_at, redeemed_by_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8::qr_status, $9::jsonb, $10, $11, $12, $13)
       returning id`,
      [
        businessId,
        campaignId,
        gameId,
        playerId,
        rewardId,
        questionnaireResult.rows[0].id,
        token("padre", index),
        qrStatus,
        JSON.stringify({
          source,
          landing: "campana-productos",
          coupon_value: 30000,
          minimum_purchase: 50000,
        }),
        createdAt,
        new Date(new Date(createdAt).getTime() + (24 * 10 * 60 * 60 * 1000)).toISOString(),
        redeemedAt,
        redeemedAt ? validatorUserId : null,
      ]
    );

    if (!redeemedAt) {
      continue;
    }

    const redemptionResult = await pool.query(
      `insert into redemptions
        (business_id, campaign_id, game_id, qr_code_id, reward_id, player_id, redeemed_by_user_id, redeemed_at, branch_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       returning id`,
      [
        businessId,
        campaignId,
        gameId,
        qrResult.rows[0].id,
        rewardId,
        playerId,
        validatorUserId,
        redeemedAt,
        branchId,
        JSON.stringify({
          validated_document: true,
          coupon_value: 30000,
          minimum_purchase: 50000,
        }),
      ]
    );

    await pool.query(
      `insert into attributed_sales
        (business_id, campaign_id, qr_code_id, redemption_id, player_id, sale_amount, currency, sale_confirmed_by_user_id, branch_id, payment_method, product_or_service, notes, created_at, sale_type)
       values ($1, $2, $3, $4, $5, $6, 'COP', $7, $8, $9, $10, $11, $12, 'DIRECT_REDEMPTION')`,
      [
        businessId,
        campaignId,
        qrResult.rows[0].id,
        redemptionResult.rows[0].id,
        playerId,
        saleBlueprint.amount,
        validatorUserId,
        branchId,
        saleBlueprint.payment,
        saleBlueprint.product,
        "Venta atribuida a landing de Dia del Padre con bono QR de 30000 COP.",
        redeemedAt,
      ]
    );
  }

  const snapshots = [
    ["BEFORE", "2026-05-10", "2026-05-24", 4200000, 49, "Ventas base del almacén antes de pauta de Dia del Padre."],
    ["DURING", "2026-06-05", "2026-06-20", 5340000, 61, "Periodo de pauta en Instagram, TikTok y Facebook con link en bio y descripcion."],
    ["AFTER", "2026-06-21", "2026-06-30", 4680000, 53, "Semana posterior con efecto residual de recordacion y recompras."],
  ];

  for (const [periodType, startDate, endDate, totalSalesAmount, totalOrders, notes] of snapshots) {
    await pool.query(
      `insert into campaign_sales_snapshots
        (business_id, campaign_id, period_type, start_date, end_date, total_sales_amount, total_orders, notes, created_by_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [businessId, campaignId, periodType, startDate, endDate, totalSalesAmount, totalOrders, notes, validatorUserId]
    );
  }
}

async function main() {
  const business = await pool.query(
    `insert into businesses (name, slug, settings, plan_code, subscription_status, subscription_started_at)
     values ($1, 'demo-store', '{"player_fields":["name","email","phone","document_id"]}', 'GROWTH', 'ACTIVE', now())
     on conflict (slug) do update
       set name = excluded.name,
           plan_code = 'GROWTH',
           subscription_status = 'ACTIVE'
     returning id, name`,
    [process.env.SEED_BUSINESS_NAME || "Demo Store"]
  );

  const businessId = business.rows[0].id;
  const branch = await pool.query(
    `insert into branches (business_id, name, slug, address)
     values ($1, 'Sede principal', 'sede-principal', 'Direccion demo')
     on conflict (business_id, slug) do update set name = excluded.name
     returning id, name`,
    [businessId]
  );

  const rawApiKey = `game_${crypto.randomBytes(24).toString("base64url")}`;
  const apiKeyHash = await bcrypt.hash(rawApiKey, 12);

  const game = await pool.query(
    `insert into games (business_id, name, slug, api_key_hash, metadata)
     values ($1, 'Demo Microgame', 'demo-microgame', $2, '{"type":"demo"}')
     on conflict (business_id, slug) do update set api_key_hash = excluded.api_key_hash
     returning id, name`,
    [businessId, apiKeyHash]
  );

  const reward = await pool.query(
    `insert into rewards (business_id, name, description, display_in_validator)
     values ($1, '15% de descuento', 'Aplicar 15% de descuento en caja.', 'Entregar 15% de descuento')
     on conflict (business_id, name) do update set description = excluded.description
     returning id, name`,
    [businessId]
  );

  const fatherReward = await pool.query(
    `insert into rewards (business_id, name, description, display_in_validator, metadata)
     values ($1, 'Bono de 30000 COP', 'Aplicar bono de 30000 COP en compras superiores a 50000 COP.', 'Validar compra minima de 50000 COP y descontar 30000 COP', '{"coupon_value":30000,"minimum_purchase":50000,"currency":"COP"}')
     on conflict (business_id, name) do update
     set description = excluded.description,
         display_in_validator = excluded.display_in_validator,
         metadata = excluded.metadata
     returning id, name`,
    [businessId]
  );

  await removeLegacyCampaign(businessId, "preferencias-producto");

  const motoCampaign = await pool.query(
    `insert into campaigns
      (business_id, game_id, reward_id, name, slug, type, status, public_slug,
       max_qr_total, max_redemptions_total, max_qr_per_person, qr_expires_after_hours,
       budget_total, expected_sales_goal, objective, strategy_summary)
     values ($1, $2, $3, 'MotoPescuezo Juego', 'moto-pescuezo', 'GAME', 'ACTIVE', 'moto-pescuezo',
       1000, 1000, 1, 168, 500000, 1600000,
       'Atraer clientes a tienda con un juego promocional',
       'Juego corto de habilidad que entrega QR unico al ganar y permite medir redenciones reales.')
     on conflict (business_id, public_slug) do update
     set game_id = excluded.game_id,
         reward_id = excluded.reward_id,
         status = 'ACTIVE',
         budget_total = 500000,
         expected_sales_goal = 1600000,
         objective = 'Atraer clientes a tienda con un juego promocional',
         strategy_summary = 'Juego corto de habilidad que entrega QR unico al ganar y permite medir redenciones reales.'
     returning id, name`,
    [businessId, game.rows[0].id, reward.rows[0].id]
  );

  const productCampaign = await pool.query(
    `insert into campaigns
      (business_id, game_id, reward_id, name, slug, type, status, public_slug,
       max_qr_total, max_redemptions_total, max_qr_per_person, qr_expires_after_hours,
       budget_total, expected_sales_goal, expected_leads_goal, expected_redemptions_goal,
       objective, strategy_summary, starts_at, ends_at, launch_channels, client_notes,
       activated_at, client_setup_completed_at, delivered_assets)
     values ($1, $2, $3, 'Dia del Padre Almacen de Cuero', 'dia-del-padre-cuero', 'FORM', 'ACTIVE', 'dia-del-padre-cuero',
       3000, 400, 1, 240, 500000, 2300000, 30, 24,
       'Captar leads desde redes sociales y convertirlos en ventas medibles para Dia del Padre',
       'Landing compartida en Instagram, TikTok y Facebook. El usuario deja sus datos, responde preguntas de interes de compra y recibe un QR para redimir un bono de 30000 COP por compras desde 50000 COP.',
       '2026-06-05T00:00:00.000Z', '2026-06-21T23:59:59.000Z', '["Instagram","TikTok","Facebook"]'::jsonb,
       'Inversion publicitaria total de 500000 COP distribuida entre pauta en Meta y TikTok. Link publicado en bio, historias y descripciones.',
       '2026-06-05T08:00:00.000Z', '2026-06-04T17:00:00.000Z',
       '{"landing_url":"http://localhost:3000/campana-productos","creative_pack":["reel-vertical","story-1080x1920","post-cuadrado"],"coupon":"BONO30000PADRE"}'::jsonb)
     on conflict (business_id, public_slug) do update
     set game_id = excluded.game_id,
         reward_id = excluded.reward_id,
         status = 'ACTIVE',
         budget_total = excluded.budget_total,
         expected_sales_goal = excluded.expected_sales_goal,
         expected_leads_goal = excluded.expected_leads_goal,
         expected_redemptions_goal = excluded.expected_redemptions_goal,
         objective = excluded.objective,
         strategy_summary = excluded.strategy_summary,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         launch_channels = excluded.launch_channels,
         client_notes = excluded.client_notes,
         activated_at = excluded.activated_at,
         client_setup_completed_at = excluded.client_setup_completed_at,
         delivered_assets = excluded.delivered_assets
     returning id, name`,
    [businessId, game.rows[0].id, fatherReward.rows[0].id]
  );

  const admin = await upsertUser({
    businessId: null,
    email: seedValue("SEED_ADMIN_EMAIL", "admin@example.com"),
    password: seedValue("SEED_ADMIN_PASSWORD", "ChangeMe123!"),
    fullName: "General Admin",
    role: "ADMIN_MARKET_GAMES",
  });

  const owner = await upsertUser({
    businessId,
    email: seedValue("SEED_OWNER_EMAIL", "owner@example.com"),
    password: seedValue("SEED_OWNER_PASSWORD", "ChangeMe123!"),
    fullName: "Business Owner",
    role: "BUSINESS_OWNER",
  });

  const validator = await upsertUser({
    businessId,
    email: seedValue("SEED_VALIDATOR_EMAIL", "validator@example.com"),
    password: seedValue("SEED_VALIDATOR_PASSWORD", "ChangeMe123!"),
    fullName: "Store Validator",
    role: "VALIDATOR",
  });
  await pool.query("update app_users set branch_id = $1 where id = $2", [branch.rows[0].id, validator.id]);

  await seedCampaignPerformance({
    businessId,
    campaignId: productCampaign.rows[0].id,
    gameId: game.rows[0].id,
    rewardId: fatherReward.rows[0].id,
    validatorUserId: validator.id,
    branchId: branch.rows[0].id,
  });

  console.log("Seed complete.");
  console.table({
    business_id: businessId,
    game_id: game.rows[0].id,
    reward_id: reward.rows[0].id,
    father_reward_id: fatherReward.rows[0].id,
    moto_campaign_id: motoCampaign.rows[0].id,
    product_campaign_id: productCampaign.rows[0].id,
    branch_id: branch.rows[0].id,
    admin: admin.email,
    owner: owner.email,
    validator: validator.email,
    game_api_key: rawApiKey,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

const bcrypt = require("bcryptjs");
const { pool, withTransaction } = require("../backend/src/config/db");
const { PLAN_CATALOG } = require("../backend/src/services/subscriptionService");

const DEMO_PASSWORD = "MarketGames2026!";
const BUSINESS_SLUG = "atelier-de-coleccion-demo";
const OWNER_EMAIL = "owner.growth@demo.local";
const VALIDATOR_EMAIL = "validator.growth@demo.local";
const SELLER_EMAIL = "seller.growth@demo.local";

const CLEAN_TABLES = [
  "campaign_sales_snapshots",
  "attributed_sales",
  "redemptions",
  "validation_logs",
  "qr_event_logs",
  "qr_claims",
  "business_sales",
  "qr_codes",
  "questionnaires",
  "players",
  "affiliate_point_ledger",
  "affiliates",
  "qr_batches",
  "business_qr_credit_ledger",
  "business_qr_credit_accounts",
  "subscription_usage_events",
  "campaigns",
  "rewards",
  "games",
  "branches",
  "app_users"
];

const CUSTOMER_NAMES = [
  "Valentina Rojas",
  "Camila Torres",
  "Daniela Vargas",
  "Laura Martinez",
  "Natalia Gomez",
  "Andrea Cardenas",
  "Paula Restrepo",
  "Juliana Pardo",
  "Mariana Castillo",
  "Isabella Moreno",
  "Carolina Arias",
  "Fernanda Molina",
  "Gabriela Ruiz",
  "Manuela Ortega",
  "Diana Salazar",
  "Catalina Herrera",
  "Santiago Mejia",
  "Juan Pablo Rios",
  "Mateo Cifuentes",
  "Sebastian Leon",
  "Nicolas Acosta",
  "Alejandro Prieto",
  "Sara Bernal",
  "Luisa Ramirez",
  "Marcela Ospina",
  "Angela Suarez",
  "Claudia Mendez",
  "Tatiana Beltran",
  "Maria Camila Ortiz",
  "Antonia Caceres",
  "Sofia Valderrama",
  "Veronica Parra",
  "Melissa Duarte",
  "Daniela Cifuentes",
  "Ana Maria Londoño",
  "Lina Escobar"
];

const AFFILIATE_NAMES = [
  "Paola Serrano",
  "Julian Nieto",
  "Marcela Suarez",
  "Angela Perez",
  "Ricardo Luna",
  "Tatiana Beltran",
  "Claudia Mendez",
  "Felipe Duarte"
];

const CHANNEL_LABELS = {
  SOCIAL_MEDIA: "Instagram / redes sociales",
  PAID_ADS: "Pauta digital",
  FRIEND_REFERRAL: "Referidos",
  FAIR_EVENT: "Feria o evento",
  STORE_WALK_IN: "Vitrina / punto de venta",
  INTERNET_SEARCH: "Internet / buscador",
  QR_SCAN: "QR fisico / impreso"
};

const CAMPAIGN_SPECS = [
  {
    name: "Feria Junio Looks Premium",
    slug: "feria-junio-looks-premium",
    reward: "15% descuento feria",
    channels: ["FAIR_EVENT", "QR_SCAN", "STORE_WALK_IN"],
    qrOrigin: "BULK_PACKAGE",
    budget: 850000,
    leadCount: 42,
    redeemedCount: 20,
    expiredCount: 8,
    ticketBase: 98000,
    ticketStep: 14000,
    expectedSales: 2800000
  },
  {
    name: "Instagram Drop Denim",
    slug: "instagram-drop-denim",
    reward: "Bono de bienvenida denim",
    channels: ["SOCIAL_MEDIA", "PAID_ADS", "QR_SCAN"],
    qrOrigin: "CAMPAIGN_GAME",
    budget: 1200000,
    leadCount: 58,
    redeemedCount: 15,
    expiredCount: 11,
    ticketBase: 82000,
    ticketStep: 9000,
    expectedSales: 3200000
  },
  {
    name: "Referidos Clientas VIP",
    slug: "referidos-clientas-vip",
    reward: "Bono referido VIP",
    channels: ["FRIEND_REFERRAL", "SOCIAL_MEDIA", "STORE_WALK_IN"],
    qrOrigin: "AFFILIATE_REFERRAL",
    budget: 320000,
    leadCount: 32,
    redeemedCount: 18,
    expiredCount: 4,
    ticketBase: 175000,
    ticketStep: 22000,
    expectedSales: 4200000
  }
];

function daysAgo(days, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function pick(items, index) {
  return items[index % items.length];
}

function money(value) {
  return Math.round(value / 1000) * 1000;
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function existingTables(client, names) {
  const { rows } = await client.query(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])`,
    [names]
  );
  return new Set(rows.map((row) => row.table_name));
}

async function deleteBusinessData(client, businessId) {
  const existing = await existingTables(client, [
    ...CLEAN_TABLES,
    "password_reset_tokens",
    "businesses"
  ]);
  const { rows: users } = await client.query(
    `select id from app_users where business_id = $1`,
    [businessId]
  );
  const userIds = users.map((row) => row.id);

  if (existing.has("password_reset_tokens") && userIds.length) {
    await client.query(`delete from password_reset_tokens where user_id = any($1::uuid[])`, [userIds]);
  }

  for (const table of CLEAN_TABLES) {
    if (existing.has(table)) {
      await client.query(`delete from ${quoteIdent(table)} where business_id = $1`, [businessId]);
    }
  }

  if (existing.has("businesses")) {
    await client.query(`delete from businesses where id = $1`, [businessId]);
  }
}

async function findExistingBusiness(client) {
  const { rows } = await client.query(
    `select b.id
       from businesses b
      where b.slug = $1
         or exists (
              select 1
                from app_users u
               where u.business_id = b.id
                 and lower(u.email) in (lower($2), lower($3), lower($4))
            )
      limit 1`,
    [BUSINESS_SLUG, OWNER_EMAIL, VALIDATOR_EMAIL, SELLER_EMAIL]
  );
  return rows[0]?.id || null;
}

async function insertBusiness(client) {
  const plan = PLAN_CATALOG.GROWTH;
  const settings = {
    ...(plan.defaultSettings || {}),
    demo: true,
    demoProfile: "Sofia Growth",
    contactName: "Sofia Growth",
    businessCategory: "Moda premium y accesorios",
    rmsNarrative:
      "Simulacion realista para demostrar como MarketGamesQR conecta campanas, QR, referidos, redenciones y revenue.",
    seededAt: new Date().toISOString()
  };

  const { rows } = await client.query(
    `insert into businesses (
       name, slug, plan_code, subscription_status,
       subscription_started_at, subscription_current_period_ends_at,
       settings, is_active
     )
     values ($1, $2, 'GROWTH', 'ACTIVE', now(), now() + interval '30 days', $3::jsonb, true)
     returning id`,
    ["Atelier de Coleccion", BUSINESS_SLUG, JSON.stringify(settings)]
  );
  return rows[0].id;
}

async function insertUsers(client, businessId) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [
    [OWNER_EMAIL, "Sofia Growth", "BUSINESS_OWNER", null],
    [VALIDATOR_EMAIL, "Validador Growth", "VALIDATOR", null],
    [SELLER_EMAIL, "Camila Rojas", "VALIDATOR", null]
  ];

  const inserted = {};
  for (const [email, fullName, role, branchId] of users) {
    const { rows } = await client.query(
      `insert into app_users (business_id, email, password_hash, full_name, role, branch_id, is_active)
       values ($1, $2, $3, $4, $5::user_role, $6, true)
       returning id, email`,
      [businessId, email, passwordHash, fullName, role, branchId]
    );
    inserted[email] = rows[0].id;
  }
  return inserted;
}

async function insertBranches(client, businessId) {
  const branchRows = [
    ["Showroom Oeste", "showroom-oeste", "Calle 82 #14-22, Bogota"],
    ["Pop-up Centro", "pop-up-centro", "Cra 7 #24-18, Bogota"]
  ];
  const branches = [];
  for (const [name, slug, address] of branchRows) {
    const { rows } = await client.query(
      `insert into branches (business_id, name, slug, address, is_active)
       values ($1, $2, $3, $4, true)
       returning id, name`,
      [businessId, name, slug, address]
    );
    branches.push(rows[0]);
  }
  return branches;
}

async function insertGame(client, businessId) {
  const { rows } = await client.query(
    `insert into games (business_id, name, slug, metadata, is_active)
     values ($1, 'RMS Style Match', 'rms-style-match', $2::jsonb, true)
     returning id`,
    [
      businessId,
      JSON.stringify({
        demo: true,
        category: "lead-capture",
        promise: "Capturar preferencia de estilo y conectar QR con venta"
      })
    ]
  );
  return rows[0].id;
}

async function insertRewards(client, businessId) {
  const rewards = {};
  for (const spec of CAMPAIGN_SPECS) {
    const { rows } = await client.query(
      `insert into rewards (business_id, name, description, display_in_validator, metadata, is_active)
       values ($1, $2, $3, true, $4::jsonb, true)
       returning id`,
      [
        businessId,
        spec.reward,
        `Beneficio demo para ${spec.name}`,
        JSON.stringify({
          demo: true,
          value: spec.reward,
          decisionUse: "Medir si el incentivo mueve redencion y venta"
        })
      ]
    );
    rewards[spec.slug] = rows[0].id;
  }
  return rewards;
}

async function insertCampaigns(client, businessId, gameId, rewardIds, ownerId) {
  const campaigns = {};
  for (let index = 0; index < CAMPAIGN_SPECS.length; index += 1) {
    const spec = CAMPAIGN_SPECS[index];
    const { rows } = await client.query(
      `insert into campaigns (
         business_id, game_id, reward_id, name, type, status, public_slug,
         starts_at, ends_at, max_qr_total, max_redemptions_total,
         max_qr_per_person, qr_expires_after_hours, metadata, slug,
         objective, strategy_summary, budget_total, expected_sales_goal,
         expected_leads_goal, expected_redemptions_goal, launch_channels,
         client_notes, activated_at, client_setup_completed_at, created_by_admin_id
       )
       values (
         $1, $2, $3, $4, 'FORM', 'ACTIVE', $5,
         $6, $7, $8, $9,
         1, 168, $10::jsonb, $11,
         $12, $13, $14, $15,
         $16, $17, $18::jsonb,
         $19, now() - interval '31 days', now() - interval '31 days', $20
       )
       returning id, name`,
      [
        businessId,
        gameId,
        rewardIds[spec.slug],
        spec.name,
        spec.slug,
        daysAgo(32, 8),
        daysAgo(-10, 23),
        spec.leadCount + 25,
        spec.redeemedCount + 10,
        JSON.stringify({
          demo: true,
          primaryChannel: spec.channels[0],
          insight:
            spec.slug === "referidos-clientas-vip"
              ? "Menor volumen, mejor ticket promedio"
              : "Campana activa para lectura RMS"
        }),
        spec.slug,
        "Convertir audiencia de moda en clientes medibles",
        `Medir ${CHANNEL_LABELS[spec.channels[0]]} desde lead hasta revenue atribuido.`,
        spec.budget,
        spec.expectedSales,
        spec.leadCount,
        spec.redeemedCount,
        JSON.stringify(spec.channels),
        "Datos demo logicos para que Sofia Growth pueda presentar la lectura comercial.",
        ownerId
      ]
    );
    campaigns[spec.slug] = rows[0];
  }
  return campaigns;
}

async function insertBatches(client, businessId, campaignMap, rewardIds, ownerId) {
  const batches = {};
  for (const spec of CAMPAIGN_SPECS) {
    const channel = spec.channels[0];
    const { rows } = await client.query(
      `insert into qr_batches (
         business_id, campaign_id, reward_id, name, description, quantity,
         qr_origin_type, benefit_type, benefit_value, expires_at,
         expiration_days, channel_use, status, created_by_user_id, metadata
       )
       values ($1, $2, $3, $4, $5, $6, $7::qr_origin_type, 'FIXED_AMOUNT_DISCOUNT'::benefit_type,
               $8::jsonb, $9, 7, $10, 'ACTIVE', $11, $12::jsonb)
       returning id`,
      [
        businessId,
        campaignMap[spec.slug].id,
        rewardIds[spec.slug],
        `Lote ${spec.name}`,
        `QR demo para ${CHANNEL_LABELS[channel]}`,
        spec.leadCount + 15,
        spec.qrOrigin,
        JSON.stringify({ amount: spec.slug === "referidos-clientas-vip" ? 30000 : 20000, currency: "COP" }),
        daysAgo(-10, 23),
        channel,
        ownerId,
        JSON.stringify({
          demo: true,
          channelLabel: CHANNEL_LABELS[channel],
          purpose: "Alimentar matriz, funnel y heatmap RMS"
        })
      ]
    );
    batches[spec.slug] = rows[0].id;
  }
  return batches;
}

async function insertAffiliates(client, businessId, ownerId) {
  const affiliates = [];
  for (let index = 0; index < AFFILIATE_NAMES.length; index += 1) {
    const name = AFFILIATE_NAMES[index];
    const points = [420, 260, 310, 180, 90, 160, 240, 120][index];
    const { rows } = await client.query(
      `insert into affiliates (
         business_id, created_by_user_id, full_name, document_id, phone, email,
         qr_token, points_total, status, notes, card_metadata
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10::jsonb)
       returning id, full_name`,
      [
        businessId,
        ownerId,
        name,
        `CC-SG-${1000 + index}`,
        `300555${String(1200 + index).padStart(4, "0")}`,
        `${name.toLowerCase().replace(/\s+/g, ".")}@demo.local`,
        `SOFIA-AFF-${index + 1}`,
        points,
        "Afiliado demo para red de referidos Sofia Growth",
        JSON.stringify({
          demo: true,
          tier: points > 250 ? "VIP" : "Activo",
          suggestedAction: points > 250 ? "Escalar QR de recomendacion" : "Activar con incentivo"
        })
      ]
    );
    affiliates.push({ ...rows[0], points });
  }
  return affiliates;
}

async function insertLeadsQrRedemptionsAndSales({
  client,
  businessId,
  gameId,
  campaignMap,
  rewardIds,
  batches,
  branches,
  users,
  affiliates
}) {
  const totals = {
    players: 0,
    qr: 0,
    redemptions: 0,
    attributedSales: 0
  };
  const heatmapHours = [16, 17, 18, 19, 12, 13, 15, 11];

  for (let campaignIndex = 0; campaignIndex < CAMPAIGN_SPECS.length; campaignIndex += 1) {
    const spec = CAMPAIGN_SPECS[campaignIndex];
    const campaign = campaignMap[spec.slug];
    for (let index = 0; index < spec.leadCount; index += 1) {
      const leadName = pick(CUSTOMER_NAMES, index + campaignIndex * 9);
      const channel = pick(spec.channels, index + campaignIndex);
      const branch = pick(branches, index + campaignIndex);
      const affiliate = spec.slug === "referidos-clientas-vip" ? pick(affiliates, index) : null;
      const createdAt = daysAgo(((index * 3 + campaignIndex * 5) % 28) + 1, pick([9, 10, 11, 14, 16, 18], index));
      const emailStem = leadName.toLowerCase().replace(/\s+/g, ".");

      const { rows: playerRows } = await client.query(
        `insert into players (
           business_id, game_id, campaign_id, external_id, name, email, phone,
           document_id, metadata, created_at
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
         returning id`,
        [
          businessId,
          gameId,
          campaign.id,
          `SG-${spec.slug}-${index + 1}`,
          leadName,
          `${emailStem}.${index + 1}@demo.local`,
          `310${String(7000000 + campaignIndex * 100000 + index * 37).slice(0, 7)}`,
          `CC-${campaignIndex + 1}${String(50000 + index).padStart(5, "0")}`,
          JSON.stringify({
            demo: true,
            source: channel,
            preferred_channel: channel,
            preferredChannelLabel: CHANNEL_LABELS[channel],
            branch: branch.name,
            persona: pick(["Compradora premium", "Buscadora de oferta", "Cliente recurrente", "Referida VIP"], index)
          }),
          createdAt
        ]
      );
      totals.players += 1;

      const playerId = playerRows[0].id;
      const { rows: questionnaireRows } = await client.query(
        `insert into questionnaires (business_id, game_id, campaign_id, player_id, answers, created_at)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         returning id`,
        [
          businessId,
          gameId,
          campaign.id,
          playerId,
          JSON.stringify({
            preferred_channel: channel,
            source: channel,
            estilo: pick(["Denim premium", "Look oficina", "Accesorios", "Vestido evento"], index),
            intencion_compra: pick(["Alta", "Media", "Comparando opciones"], index),
            canal_label: CHANNEL_LABELS[channel]
          }),
          addMinutes(createdAt, 3)
        ]
      );

      let status = "ACTIVE";
      if (index < spec.redeemedCount) {
        status = "REDEEMED";
      } else if (index < spec.redeemedCount + spec.expiredCount) {
        status = "EXPIRED";
      }

      const redeemedAt =
        status === "REDEEMED"
          ? daysAgo(((index * 2 + campaignIndex * 3) % 24) + 1, pick(heatmapHours, index), pick([5, 15, 30, 45], index))
          : null;
      const expiresAt = status === "EXPIRED" ? daysAgo(((index + 1) % 10) + 1, 23) : daysAgo(-7, 23);
      const token = `SOFIA-${spec.slug.toUpperCase().replace(/-/g, "")}-${String(index + 1).padStart(3, "0")}`;

      const { rows: qrRows } = await client.query(
        `insert into qr_codes (
           business_id, game_id, campaign_id, player_id, reward_id, questionnaire_id,
           token, status, metadata, created_at, expires_at, redeemed_at, redeemed_by_user_id,
           batch_id, origin_type, benefit_type, benefit_value, affiliate_id, claim_required, claimed_at
         )
         values (
           $1, $2, $3, $4, $5, $6,
           $7, $8::qr_status, $9::jsonb, $10, $11, $12, $13,
           $14, $15::qr_origin_type, 'FIXED_AMOUNT_DISCOUNT'::benefit_type, $16::jsonb, $17, false, $18
         )
         returning id`,
        [
          businessId,
          gameId,
          campaign.id,
          playerId,
          rewardIds[spec.slug],
          questionnaireRows[0].id,
          token,
          status,
          JSON.stringify({
            demo: true,
            channel,
            channelLabel: CHANNEL_LABELS[channel],
            branch: branch.name,
            qrUse: spec.qrOrigin,
            diagnostic:
              status === "EXPIRED"
                ? "Oportunidad perdida por beneficio no usado"
                : status === "REDEEMED"
                  ? "QR convertido en visita medible"
                  : "QR activo pendiente de redencion"
          }),
          addMinutes(createdAt, 5),
          expiresAt,
          redeemedAt,
          status === "REDEEMED" ? pick([users[VALIDATOR_EMAIL], users[SELLER_EMAIL]], index) : null,
          batches[spec.slug],
          spec.qrOrigin,
          JSON.stringify({ amount: spec.slug === "referidos-clientas-vip" ? 30000 : 20000, currency: "COP" }),
          affiliate?.id || null,
          status === "REDEEMED" ? addMinutes(redeemedAt, -8) : null
        ]
      );
      totals.qr += 1;

      if (status === "REDEEMED") {
        const { rows: redemptionRows } = await client.query(
          `insert into redemptions (
             business_id, game_id, qr_code_id, reward_id, player_id,
             redeemed_by_user_id, redeemed_at, metadata, campaign_id, branch_id
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
           returning id`,
          [
            businessId,
            gameId,
            qrRows[0].id,
            rewardIds[spec.slug],
            playerId,
            pick([users[VALIDATOR_EMAIL], users[SELLER_EMAIL]], index),
            redeemedAt,
            JSON.stringify({
              demo: true,
              channel,
              branch: branch.name,
              customerSignal: "Redencion validada en punto de venta"
            }),
            campaign.id,
            branch.id
          ]
        );
        totals.redemptions += 1;

        if (index % 5 !== 4) {
          const saleAmount = money(spec.ticketBase + spec.ticketStep * ((index % 7) + 1) + campaignIndex * 12000);
          await client.query(
            `insert into attributed_sales (
               business_id, campaign_id, qr_code_id, redemption_id, player_id,
               sale_amount, currency, sale_confirmed_by_user_id, branch_id,
               payment_method, product_or_service, notes, created_at, sale_type
             )
             values ($1, $2, $3, $4, $5, $6, 'COP', $7, $8, $9, $10, $11, $12, 'DIRECT_REDEMPTION')`,
            [
              businessId,
              campaign.id,
              qrRows[0].id,
              redemptionRows[0].id,
              playerId,
              saleAmount,
              pick([users[VALIDATOR_EMAIL], users[SELLER_EMAIL]], index),
              branch.id,
              pick(["CARD", "CASH", "TRANSFER"], index),
              pick(["Set denim premium", "Vestido evento", "Bolso artesanal", "Look oficina"], index),
              `Venta atribuida a ${spec.name} desde ${CHANNEL_LABELS[channel]}`,
              addMinutes(redeemedAt, 35)
            ]
          );
          totals.attributedSales += 1;
        }
      }
    }
  }
  return totals;
}

async function insertBusinessSalesAndPostSaleQr({
  client,
  businessId,
  gameId,
  campaignMap,
  rewardIds,
  branches,
  users,
  affiliates
}) {
  const sales = [];
  const directSalesPlan = [
    ["instagram-drop-denim", "SOCIAL_MEDIA", 9, 132000],
    ["instagram-drop-denim", "PAID_ADS", 7, 118000],
    ["feria-junio-looks-premium", "FAIR_EVENT", 8, 156000],
    ["feria-junio-looks-premium", "STORE_WALK_IN", 5, 188000],
    ["referidos-clientas-vip", "FRIEND_REFERRAL", 14, 245000],
    ["referidos-clientas-vip", "SOCIAL_MEDIA", 4, 192000],
    ["instagram-drop-denim", "INTERNET_SEARCH", 3, 104000]
  ];

  for (const [campaignSlug, channel, count, baseAmount] of directSalesPlan) {
    const campaign = campaignMap[campaignSlug];
    for (let index = 0; index < count; index += 1) {
      const branch = pick(branches, index + count);
      const customerName = pick(CUSTOMER_NAMES, index + count * 2);
      const affiliate = channel === "FRIEND_REFERRAL" ? pick(affiliates, index) : null;
      const createdAt = daysAgo(((index * 4 + count) % 30) + 1, pick([12, 15, 16, 18, 19], index), pick([0, 20, 40], index));
      const saleAmount = money(baseAmount + index * 17000 + (affiliate ? 36000 : 0));
      const { rows } = await client.query(
        `insert into business_sales (
           business_id, campaign_id, customer_name, customer_phone, customer_email,
           product_name, sale_amount, currency, seller_user_id, branch_id, notes,
           created_at, metadata, acquisition_source, acquisition_channel,
           referred_affiliate_id, referral_points_awarded
         )
         values (
           $1, $2, $3, $4, $5,
           $6, $7, 'COP', $8, $9, $10,
           $11, $12::jsonb, $13, $14,
           $15, $16
         )
         returning id, sale_amount, created_at`,
        [
          businessId,
          campaign.id,
          customerName,
          `320${String(6100000 + index * 97).slice(0, 7)}`,
          `${customerName.toLowerCase().replace(/\s+/g, ".")}.sale${index + 1}@demo.local`,
          pick(["Compra look completo", "Accesorios premium", "Denim + blusa", "Gift card recompra"], index),
          saleAmount,
          pick([users[VALIDATOR_EMAIL], users[SELLER_EMAIL]], index),
          branch.id,
          `Venta Sales Tracker desde ${CHANNEL_LABELS[channel]}`,
          createdAt,
          JSON.stringify({
            demo: true,
            source: channel,
            channelLabel: CHANNEL_LABELS[channel],
            decisionSignal:
              channel === "FRIEND_REFERRAL"
                ? "Referidos con ticket superior al promedio"
                : "Venta registrada para atribucion RMS"
          }),
          channel,
          channel,
          affiliate?.id || null,
          affiliate ? Math.round(saleAmount / 10000) : 0
        ]
      );
      sales.push({ ...rows[0], campaignSlug, channel, branchId: branch.id, affiliateId: affiliate?.id || null });

      if (affiliate) {
        await client.query(
          `insert into affiliate_point_ledger (
             business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata, created_at
           )
           values ($1, $2, $3, $4, $5, 'PURCHASE', $6::jsonb, $7)`,
          [
            businessId,
            affiliate.id,
            users[VALIDATOR_EMAIL],
            saleAmount,
            Math.round(saleAmount / 10000),
            JSON.stringify({ demo: true, saleId: rows[0].id, reason: "Compra referida Sofia Growth" }),
            createdAt
          ]
        );
      }
    }
  }

  for (let index = 0; index < Math.min(22, sales.length); index += 1) {
    const sale = sales[index];
    const campaign = campaignMap[sale.campaignSlug];
    const redeemed = index % 3 !== 0;
    await client.query(
      `insert into qr_codes (
         business_id, game_id, campaign_id, reward_id, token, status, metadata,
         created_at, expires_at, redeemed_at, redeemed_by_user_id, origin_type,
         benefit_type, benefit_value, sale_id, claim_required
       )
       values (
         $1, $2, $3, $4, $5, $6::qr_status, $7::jsonb,
         $8, $9, $10, $11, 'POST_SALE'::qr_origin_type,
         'FIXED_AMOUNT_DISCOUNT'::benefit_type, $12::jsonb, $13, false
       )`,
      [
        businessId,
        gameId,
        campaign.id,
        rewardIds[sale.campaignSlug],
        `SOFIA-POSTSALE-${String(index + 1).padStart(3, "0")}`,
        redeemed ? "REDEEMED" : "ACTIVE",
        JSON.stringify({
          demo: true,
          channel: "POST_SALE",
          originalChannel: sale.channel,
          decisionSignal: "QR postventa para medir recompra"
        }),
        addMinutes(sale.created_at, 20),
        daysAgo(-14, 23),
        redeemed ? addMinutes(sale.created_at, 60 * 24 * ((index % 5) + 1)) : null,
        redeemed ? pick([users[VALIDATOR_EMAIL], users[SELLER_EMAIL]], index) : null,
        JSON.stringify({ amount: 25000, currency: "COP" }),
        sale.id
      ]
    );
  }

  return { businessSales: sales.length, postSaleQr: Math.min(22, sales.length) };
}

async function insertSnapshots(client, businessId, campaignMap, ownerId) {
  for (const spec of CAMPAIGN_SPECS) {
    const campaign = campaignMap[spec.slug];
    const periods = [
      ["BEFORE", daysAgo(60, 0), daysAgo(31, 23), spec.expectedSales * 0.32, 8],
      ["DURING", daysAgo(30, 0), daysAgo(8, 23), spec.expectedSales * 0.78, spec.redeemedCount],
      ["AFTER", daysAgo(7, 0), daysAgo(0, 23), spec.expectedSales * 0.26, Math.max(3, Math.round(spec.redeemedCount * 0.28))]
    ];
    for (const [periodType, startDate, endDate, revenue, transactions] of periods) {
      await client.query(
        `insert into campaign_sales_snapshots (
           business_id, campaign_id, period_type, start_date, end_date,
           total_sales_amount, total_orders, notes, created_by_user_id
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          businessId,
          campaign.id,
          periodType,
          startDate,
          endDate,
          money(revenue),
          transactions,
          periodType === "DURING"
            ? "Campana con mayor actividad comercial durante ejecucion"
            : "Base comparativa para modo ejecutivo",
          ownerId
        ]
      );
    }
  }
}

async function insertUsage(client, businessId, ownerId, qrTotals) {
  const { rows } = await client.query(
    `insert into business_qr_credit_accounts (
       business_id, current_package_size, qr_balance, qr_purchased_total,
       qr_used_total, public_label, last_purchase_at
     )
     values ($1, 0, 0, 0, $2, 'Cuota mensual incluida', now())
     returning id`,
    [businessId, qrTotals]
  );

  await client.query(
    `insert into subscription_usage_events (business_id, user_id, event_type, quantity, metadata, created_at)
     values ($1, $2, 'qr_generated', $3, $4::jsonb, now() - interval '2 days')`,
    [
      businessId,
      ownerId,
      qrTotals,
      JSON.stringify({
        demo: true,
        profile: "Sofia Growth",
        note: "Uso mensual simulado para lectura de plan Growth"
      })
    ]
  );

  await client.query(
    `insert into business_qr_credit_ledger (
       business_id, account_id, entry_type, delta_qr, balance_after,
       public_label, notes, created_by_user_id
     )
     values ($1, $2, 'SUBSCRIPTION_INCLUDED', $3, 0, $4, $5, $6)`,
    [
      businessId,
      rows[0].id,
      -qrTotals,
      `${qrTotals} QR de cuota mensual usados`,
      "Uso demo descontado de la cuota mensual incluida.",
      ownerId
    ]
  );
}

async function verify(client, businessId) {
  const tables = [
    "players",
    "questionnaires",
    "qr_codes",
    "redemptions",
    "attributed_sales",
    "business_sales",
    "affiliates",
    "affiliate_point_ledger",
    "campaigns",
    "qr_batches"
  ];
  const summary = {};
  for (const table of tables) {
    const { rows } = await client.query(`select count(*)::int as count from ${quoteIdent(table)} where business_id = $1`, [
      businessId
    ]);
    summary[table] = rows[0].count;
  }
  const { rows: revenueRows } = await client.query(
    `select
       coalesce((select sum(sale_amount) from attributed_sales where business_id = $1), 0)
       + coalesce((select sum(sale_amount) from business_sales where business_id = $1), 0) as revenue`,
    [businessId]
  );
  summary.revenue_cop = Number(revenueRows[0].revenue || 0);
  return summary;
}

async function main() {
  const summary = await withTransaction(async (client) => {
    const existingBusinessId = await findExistingBusiness(client);
    if (existingBusinessId) {
      await deleteBusinessData(client, existingBusinessId);
    }

    const businessId = await insertBusiness(client);
    const users = await insertUsers(client, businessId);
    const branches = await insertBranches(client, businessId);
    await client.query(`update app_users set branch_id = $2 where id = $1`, [users[VALIDATOR_EMAIL], branches[0].id]);
    await client.query(`update app_users set branch_id = $2 where id = $1`, [users[SELLER_EMAIL], branches[1].id]);

    const gameId = await insertGame(client, businessId);
    const rewardIds = await insertRewards(client, businessId);
    const campaigns = await insertCampaigns(client, businessId, gameId, rewardIds, users[OWNER_EMAIL]);
    const batches = await insertBatches(client, businessId, campaigns, rewardIds, users[OWNER_EMAIL]);
    const affiliates = await insertAffiliates(client, businessId, users[OWNER_EMAIL]);

    const qrFlowTotals = await insertLeadsQrRedemptionsAndSales({
      client,
      businessId,
      gameId,
      campaignMap: campaigns,
      rewardIds,
      batches,
      branches,
      users,
      affiliates
    });
    const salesTotals = await insertBusinessSalesAndPostSaleQr({
      client,
      businessId,
      gameId,
      campaignMap: campaigns,
      rewardIds,
      branches,
      users,
      affiliates
    });
    await insertSnapshots(client, businessId, campaigns, users[OWNER_EMAIL]);
    await insertUsage(client, businessId, users[OWNER_EMAIL], qrFlowTotals.qr + salesTotals.postSaleQr);

    const verified = await verify(client, businessId);
    return {
      businessId,
      owner: OWNER_EMAIL,
      validator: VALIDATOR_EMAIL,
      seller: SELLER_EMAIL,
      password: DEMO_PASSWORD,
      flow: qrFlowTotals,
      sales: salesTotals,
      verified
    };
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

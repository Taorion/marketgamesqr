const bcrypt = require("bcryptjs");
const { pool, withTransaction } = require("../backend/src/config/db");
const { PLAN_CATALOG } = require("../backend/src/services/subscriptionService");

const CONFIRM_FLAG = "--confirm-reset";
const DEMO_PASSWORD = process.env.RESET_DEMO_PASSWORD || "MarketGames2026!";

const TABLES_TO_RESET = [
  "password_reset_tokens",
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
  "package_sales_requests",
  "qr_credit_purchase_orders",
  "business_qr_credit_ledger",
  "business_qr_credit_accounts",
  "subscription_usage_events",
  "campaigns",
  "rewards",
  "games",
  "branches",
  "app_users",
  "businesses",
];

const DEMO_COMPANIES = [
  {
    plan_code: "PREPAID_QR",
    name: "Bodega QR Express",
    slug: "bodega-qr-express",
    nit: "900111001-1",
    city: "Bogota",
    phone: "3001110001",
    owner: "Laura Prepago",
    owner_email: "owner.prepago@demo.local",
    validator: "Validador Prepago",
    validator_email: "validator.prepago@demo.local",
    branches: ["Mostrador principal"],
    prepaid: { package_size: 100, purchased: 100, used: 18, balance: 82 },
    monthly_used: 0,
    campaigns: 1,
    affiliates: 0,
  },
  {
    plan_code: "STARTER",
    name: "Cafe Barrio Norte",
    slug: "cafe-barrio-norte",
    nit: "900222002-2",
    city: "Medellin",
    phone: "3002220002",
    owner: "Mateo Starter",
    owner_email: "owner.starter@demo.local",
    validator: "Validador Starter",
    validator_email: "validator.starter@demo.local",
    branches: ["Sede Cafe"],
    prepaid: { package_size: 0, purchased: 0, used: 0, balance: 0 },
    monthly_used: 120,
    campaigns: 2,
    affiliates: 0,
  },
  {
    plan_code: "GROWTH",
    name: "Atelier de Coleccion",
    slug: "atelier-de-coleccion-demo",
    nit: "900333003-3",
    city: "Cali",
    phone: "3003330003",
    owner: "Sofia Growth",
    owner_email: "owner.growth@demo.local",
    validator: "Validador Growth",
    validator_email: "validator.growth@demo.local",
    branches: ["Showroom Oeste", "Pop-up Centro"],
    prepaid: { package_size: 0, purchased: 0, used: 0, balance: 0 },
    monthly_used: 640,
    campaigns: 3,
    affiliates: 8,
  },
  {
    plan_code: "PRO",
    name: "Market Pro Retail",
    slug: "market-pro-retail",
    nit: "900444004-4",
    city: "Barranquilla",
    phone: "3004440004",
    owner: "Daniel Pro",
    owner_email: "owner.pro@demo.local",
    validator: "Validador Pro",
    validator_email: "validator.pro@demo.local",
    branches: ["Flagship", "Outlet Norte", "Mall Plaza"],
    prepaid: { package_size: 0, purchased: 0, used: 0, balance: 0 },
    monthly_used: 1800,
    campaigns: 4,
    affiliates: 16,
  },
];

function assertConfirmed() {
  if (!process.argv.includes(CONFIRM_FLAG)) {
    throw new Error(`Reset bloqueado. Ejecuta con ${CONFIRM_FLAG} para confirmar la limpieza.`);
  }
  if (/PROJECT_REF|YOUR_PASSWORD/.test(process.env.DATABASE_URL || "")) {
    throw new Error("DATABASE_URL contiene valores placeholder. Configura la URL real antes de limpiar la base.");
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_RESET !== "true") {
    throw new Error("Reset bloqueado en produccion. Define ALLOW_PRODUCTION_RESET=true solo si sabes que esta base debe limpiarse.");
  }
}

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function existingResetTables(client) {
  const result = await client.query(
    `select tablename
     from pg_tables
     where schemaname = 'public'
       and tablename = any($1::text[])`,
    [TABLES_TO_RESET]
  );
  const existing = new Set(result.rows.map((row) => row.tablename));
  return TABLES_TO_RESET.filter((table) => existing.has(table));
}

async function clearData(client) {
  const tables = await existingResetTables(client);
  if (!tables.length) {
    return;
  }
  await client.query(`truncate table ${tables.map(quoteIdent).join(", ")} restart identity cascade`);
}

async function insertUser(client, { businessId = null, email, fullName, role, branchId = null }) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const result = await client.query(
    `insert into app_users (business_id, email, password_hash, full_name, role, branch_id, is_active)
     values ($1, $2, $3, $4, $5, $6, true)
     returning id, email, role`,
    [businessId, email, passwordHash, fullName, role, branchId]
  );
  return result.rows[0];
}

function subscriptionSettings(company, plan) {
  return {
    nit: company.nit,
    contact_name: company.owner,
    contact_email: company.owner_email,
    phone: company.phone,
    city: company.city,
    address: `${company.city} - direccion demo`,
    signup_type: company.plan_code === "PREPAID_QR" ? "demo_prepaid_validator" : "demo_portal_subscription",
    subscription: {
      plan_code: company.plan_code,
      status: "ACTIVE",
      seeded_demo: true,
      access_summary: plan.access_summary,
    },
  };
}

async function insertBusiness(client, company) {
  const plan = PLAN_CATALOG[company.plan_code];
  const result = await client.query(
    `insert into businesses
      (name, slug, settings, plan_code, subscription_status, subscription_started_at, subscription_current_period_ends_at, is_active)
     values ($1, $2, $3::jsonb, $4, 'ACTIVE', now(), now() + interval '1 month', true)
     returning *`,
    [company.name, company.slug, JSON.stringify(subscriptionSettings(company, plan)), company.plan_code]
  );
  return result.rows[0];
}

async function insertBranches(client, businessId, branchNames) {
  const branches = [];
  for (const name of branchNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const result = await client.query(
      `insert into branches (business_id, name, slug, address)
       values ($1, $2, $3, $4)
       returning *`,
      [businessId, name, slug, `Direccion demo ${name}`]
    );
    branches.push(result.rows[0]);
  }
  return branches;
}

async function insertCreditAccount(client, businessId, company, ownerId) {
  const account = await client.query(
    `insert into business_qr_credit_accounts
      (business_id, current_package_size, qr_balance, qr_purchased_total, qr_used_total, public_label, last_purchase_at)
     values ($1, $2, $3, $4, $5, $6, now())
     returning *`,
    [
      businessId,
      company.prepaid.package_size,
      company.prepaid.balance,
      company.prepaid.purchased,
      company.prepaid.used + company.monthly_used,
      company.plan_code === "PREPAID_QR" ? `${company.prepaid.balance} creditos prepago disponibles` : "Cuota mensual incluida",
    ]
  );

  if (company.prepaid.purchased > 0) {
    await client.query(
      `insert into business_qr_credit_ledger
        (business_id, account_id, entry_type, package_size, delta_qr, balance_after, internal_unit_price_cop, internal_total_cop, public_label, notes, created_by_user_id)
       values ($1, $2, 'PACKAGE_PURCHASE', $3, $4, $5, 1000, $6, $7, $8, $9)`,
      [
        businessId,
        account.rows[0].id,
        company.prepaid.package_size,
        company.prepaid.purchased,
        company.prepaid.purchased,
        company.prepaid.purchased * 1000,
        `Paquete x${company.prepaid.package_size}`,
        "Compra prepago demo aprobada.",
        ownerId,
      ]
    );
  }

  if (company.prepaid.used > 0) {
    await client.query(
      `insert into business_qr_credit_ledger
        (business_id, account_id, entry_type, delta_qr, balance_after, public_label, notes, created_by_user_id)
       values ($1, $2, 'QR_CONSUMED', $3, $4, $5, $6, $7)`,
      [
        businessId,
        account.rows[0].id,
        -company.prepaid.used,
        company.prepaid.balance,
        `${company.prepaid.used} creditos consumidos`,
        "Uso demo de QR prepago.",
        ownerId,
      ]
    );
  }

  if (company.monthly_used > 0) {
    await client.query(
      `insert into subscription_usage_events (business_id, user_id, event_type, quantity, metadata)
       values ($1, $2, 'qr_generated', $3, '{"seed":"demo-reset"}'::jsonb)`,
      [businessId, ownerId, company.monthly_used]
    );
    await client.query(
      `insert into business_qr_credit_ledger
        (business_id, account_id, entry_type, delta_qr, balance_after, public_label, notes, created_by_user_id)
       values ($1, $2, 'SUBSCRIPTION_INCLUDED', $3, 0, $4, $5, $6)`,
      [
        businessId,
        account.rows[0].id,
        -company.monthly_used,
        `${company.monthly_used} QR de cuota mensual usados`,
        "Uso demo descontado de la cuota mensual incluida.",
        ownerId,
      ]
    );
  }
}

async function insertCampaignData(client, { business, company, branches, owner, validator }) {
  const game = await client.query(
    `insert into games (business_id, name, slug, metadata)
     values ($1, 'Demo QR Experience', 'demo-qr-experience', '{"seed":"demo-reset"}'::jsonb)
     returning *`,
    [business.id]
  );
  const reward = await client.query(
    `insert into rewards (business_id, name, description, display_in_validator, metadata)
     values ($1, 'Beneficio demo', 'Beneficio de muestra para validar QR.', 'Aplicar beneficio demo', '{"seed":"demo-reset"}'::jsonb)
     returning *`,
    [business.id]
  );

  for (let index = 0; index < company.campaigns; index += 1) {
    const campaign = await client.query(
      `insert into campaigns
        (business_id, game_id, reward_id, name, slug, type, status, public_slug, max_qr_total, max_redemptions_total,
         budget_total, expected_sales_goal, expected_leads_goal, expected_redemptions_goal, objective, strategy_summary,
         launch_channels, activated_at, client_setup_completed_at, delivered_assets)
       values ($1, $2, $3, $4, $5, 'FORM', 'ACTIVE', $5, 1000, 500,
         $6, $7, $8, $9, $10, $11, '["Instagram","WhatsApp","Punto de venta"]'::jsonb,
         now() - interval '10 days', now() - interval '9 days', '{"landing":"demo"}'::jsonb)
       returning *`,
      [
        business.id,
        game.rows[0].id,
        reward.rows[0].id,
        `Campana Demo ${index + 1}`,
        `campana-demo-${index + 1}`,
        250000 + index * 100000,
        900000 + index * 300000,
        80 + index * 25,
        20 + index * 8,
        "Captar clientes y medir redenciones con QR.",
        "Campana demo sembrada para validar permisos, dashboard y ventas atribuidas.",
      ]
    );

    const qrCount = company.plan_code === "PREPAID_QR" ? 8 : 14 + index * 4;
    for (let qrIndex = 0; qrIndex < qrCount; qrIndex += 1) {
      const player = await client.query(
        `insert into players (business_id, game_id, campaign_id, name, email, phone, document_id, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, '{"source":"seed"}'::jsonb, now() - ($8 || ' days')::interval)
         returning *`,
        [
          business.id,
          game.rows[0].id,
          campaign.rows[0].id,
          `Cliente ${company.slug} ${index + 1}-${qrIndex + 1}`,
          `cliente.${company.slug}.${index + 1}.${qrIndex + 1}@demo.local`,
          `310${String(index + 1).padStart(2, "0")}${String(qrIndex + 1).padStart(6, "0")}`,
          `10${String(index + 1).padStart(2, "0")}${String(qrIndex + 1000).padStart(6, "0")}`,
          String(qrIndex + 1),
        ]
      );
      const questionnaire = await client.query(
        `insert into questionnaires (business_id, game_id, player_id, campaign_id, answers)
         values ($1, $2, $3, $4, $5::jsonb)
         returning *`,
        [
          business.id,
          game.rows[0].id,
          player.rows[0].id,
          campaign.rows[0].id,
          JSON.stringify({ interes: qrIndex % 2 ? "compra" : "visita", canal: "demo" }),
        ]
      );
      const redeemed = qrIndex % 3 === 0;
      const qr = await client.query(
        `insert into qr_codes
          (business_id, campaign_id, game_id, player_id, reward_id, questionnaire_id, token, status, origin_type, benefit_type, benefit_value, metadata, expires_at, redeemed_at, redeemed_by_user_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8::qr_status, 'CAMPAIGN_FORM', 'FIXED_AMOUNT_DISCOUNT',
           '{"amount":10000,"currency":"COP","label":"Bono demo"}'::jsonb, '{"seed":"demo-reset"}'::jsonb,
           now() + interval '30 days', $9, $10)
         returning *`,
        [
          business.id,
          campaign.rows[0].id,
          game.rows[0].id,
          player.rows[0].id,
          reward.rows[0].id,
          questionnaire.rows[0].id,
          `demo-${company.slug}-${index + 1}-${qrIndex + 1}`,
          redeemed ? "REDEEMED" : "ACTIVE",
          redeemed ? new Date().toISOString() : null,
          redeemed ? validator.id : null,
        ]
      );

      if (redeemed) {
        const branch = branches[qrIndex % branches.length];
        const redemption = await client.query(
          `insert into redemptions
            (business_id, campaign_id, game_id, qr_code_id, reward_id, player_id, redeemed_by_user_id, branch_id, metadata)
           values ($1, $2, $3, $4, $5, $6, $7, $8, '{"seed":"demo-reset"}'::jsonb)
           returning *`,
          [
            business.id,
            campaign.rows[0].id,
            game.rows[0].id,
            qr.rows[0].id,
            reward.rows[0].id,
            player.rows[0].id,
            validator.id,
            branch.id,
          ]
        );
        await client.query(
          `insert into attributed_sales
            (business_id, campaign_id, qr_code_id, redemption_id, player_id, sale_amount, sale_confirmed_by_user_id, branch_id, payment_method, product_or_service, notes)
           values ($1, $2, $3, $4, $5, $6, $7, $8, 'Tarjeta', 'Producto demo', 'Venta atribuida demo')`,
          [
            business.id,
            campaign.rows[0].id,
            qr.rows[0].id,
            redemption.rows[0].id,
            player.rows[0].id,
            45000 + qrIndex * 2500,
            validator.id,
            branch.id,
          ]
        );
      }
    }
  }

  if (company.affiliates > 0) {
    for (let index = 0; index < company.affiliates; index += 1) {
      const affiliate = await client.query(
        `insert into affiliates
          (business_id, created_by_user_id, full_name, document_id, phone, email, qr_token, points_total, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, 'Afiliado demo')
         returning *`,
        [
          business.id,
          owner.id,
          `Afiliado ${company.slug} ${index + 1}`,
          `20${String(index + 1).padStart(8, "0")}`,
          `320${String(index + 1).padStart(7, "0")}`,
          `afiliado.${company.slug}.${index + 1}@demo.local`,
          `aff-${company.slug}-${index + 1}`,
          50 + index * 10,
        ]
      );
      await client.query(
        `insert into affiliate_point_ledger
          (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
         values ($1, $2, $3, $4, $5, 'PURCHASE', '{"seed":"demo-reset"}'::jsonb)`,
        [business.id, affiliate.rows[0].id, owner.id, 80000 + index * 5000, 10 + index]
      );
    }
  }
}

async function seedCompany(client, company) {
  const plan = PLAN_CATALOG[company.plan_code];
  if (!plan) {
    throw new Error(`Plan no encontrado: ${company.plan_code}`);
  }

  const business = await insertBusiness(client, company);
  const branches = await insertBranches(client, business.id, company.branches);
  const owner = await insertUser(client, {
    businessId: business.id,
    email: company.owner_email,
    fullName: company.owner,
    role: "BUSINESS_OWNER",
  });
  const validator = await insertUser(client, {
    businessId: business.id,
    email: company.validator_email,
    fullName: company.validator,
    role: "VALIDATOR",
    branchId: branches[0].id,
  });

  await insertCreditAccount(client, business.id, company, owner.id);
  await insertCampaignData(client, { business, company, branches, owner, validator });

  return {
    empresa: business.name,
    plan: `${plan.code} - ${plan.name}`,
    owner: company.owner_email,
    validator: company.validator_email,
  };
}

async function main() {
  assertConfirmed();

  const summary = await withTransaction(async (client) => {
    await clearData(client);
    const admin = await insertUser(client, {
      email: "admin@marketgames.local",
      fullName: "Admin Market Games",
      role: "ADMIN_MARKET_GAMES",
    });
    const companies = [];
    for (const company of DEMO_COMPANIES) {
      companies.push(await seedCompany(client, company));
    }
    return { admin: admin.email, companies };
  });

  console.log("Base limpiada y demo sembrado.");
  console.log(`Password demo: ${DEMO_PASSWORD}`);
  console.table([
    { empresa: "Market Games Admin", plan: "ADMIN", owner: summary.admin, validator: "-" },
    ...summary.companies,
  ]);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

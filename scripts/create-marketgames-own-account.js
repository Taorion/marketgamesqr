const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const password = process.env.MGQR_SEED_PASSWORD;

if (!password) {
  throw new Error("Define MGQR_SEED_PASSWORD antes de ejecutar este script.");
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || /PROJECT_REF|YOUR_PASSWORD/.test(databaseUrl)) {
  throw new Error("DATABASE_URL no esta configurado con una base real.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

const BUSINESS_SLUG = "marketgames-qr";
const TARGET_TICKET_BALANCE = 10000;

async function upsertUser(client, { businessId, email, fullName, role, passwordHash }) {
  const result = await client.query(
    `insert into app_users (business_id, email, password_hash, full_name, role, can_redeem_cross_business, is_active)
     values ($1, lower($2), $3, $4, $5::user_role, false, true)
     on conflict (email) do update
     set business_id = excluded.business_id,
         password_hash = excluded.password_hash,
         full_name = excluded.full_name,
         role = excluded.role,
         is_active = true,
         updated_at = now()
     returning id, email, full_name, role, is_active`,
    [businessId, email, passwordHash, fullName, role]
  );
  return result.rows[0];
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("alter type user_role add value if not exists 'BUSINESS_MANAGER'");
    await client.query("begin");

    const settings = {
      nit: "1020770449",
      contact_name: "Administrador MarketGames QR",
      contact_email: "contacto@marketgamesqr.com",
      phone: "3057724185",
      city: "Bogota",
      address: "Calle 187 #46-55",
      signup_type: "own_marketgames_account",
      internal_account: true,
      account_document_type: "CEDULA",
      subscription: {
        plan_code: "PRO",
        status: "ACTIVE",
        billing_cycle: "lifetime",
        monthly_payment_required: false,
        lifetime_access: true,
        notes: "Cuenta propia MarketGames QR para operar clientes internos.",
      },
      access: {
        plan_type: "premium_monthly",
        portal_status: "ACTIVE",
        lifetime_access: true,
        source: "internal_seed",
      },
    };

    const businessResult = await client.query(
      `insert into businesses
        (name, slug, settings, plan_code, plan_type, portal_status,
         portal_activated_at, subscription_status, subscription_started_at,
         subscription_current_period_ends_at, is_active)
       values ($1, $2, $3::jsonb, 'PRO', 'premium_monthly', 'ACTIVE',
         now(), 'ACTIVE', now(), null, true)
       on conflict (slug) do update
       set name = excluded.name,
           settings = coalesce(businesses.settings, '{}'::jsonb) || excluded.settings,
           plan_code = 'PRO',
           plan_type = 'premium_monthly',
           portal_status = 'ACTIVE',
           portal_activated_at = coalesce(businesses.portal_activated_at, now()),
           subscription_status = 'ACTIVE',
           subscription_started_at = coalesce(businesses.subscription_started_at, now()),
           subscription_current_period_ends_at = null,
           is_active = true,
           updated_at = now()
       returning id, name, slug`,
      ["MarketGames QR", BUSINESS_SLUG, JSON.stringify(settings)]
    );
    const business = businessResult.rows[0];

    const branchResult = await client.query(
      `insert into branches (business_id, name, slug, address, is_active)
       values ($1, 'Sede principal', 'sede-principal', $2, true)
       on conflict (business_id, slug) do update
       set name = excluded.name,
           address = excluded.address,
           is_active = true,
           updated_at = now()
       returning id, name`,
      [business.id, "Calle 187 #46-55, Bogota"]
    );

    const gameResult = await client.query(
      `insert into games (business_id, name, slug, metadata, is_active)
       values ($1, 'MarketGames QR Motor Comercial', 'marketgames-qr-motor', $2::jsonb, true)
       on conflict (business_id, slug) do update
       set name = excluded.name,
           metadata = excluded.metadata,
           is_active = true,
           updated_at = now()
       returning id, name`,
      [business.id, JSON.stringify({ type: "internal_operations", source: "marketgames_own_account" })]
    );

    const rewardResult = await client.query(
      `insert into rewards (business_id, name, description, display_in_validator, metadata, is_active)
       values ($1, 'Beneficio MarketGames QR', 'Beneficio configurable para operaciones internas de MarketGames QR.', 'Validar beneficio MarketGames QR en punto fisico.', $2::jsonb, true)
       on conflict (business_id, name) do update
       set description = excluded.description,
           display_in_validator = excluded.display_in_validator,
           metadata = excluded.metadata,
           is_active = true,
           updated_at = now()
       returning id, name`,
      [business.id, JSON.stringify({ internal_default: true })]
    );

    const passwordHash = await bcrypt.hash(password, 12);
    const users = [];
    users.push(await upsertUser(client, {
      businessId: business.id,
      email: "contacto@marketgamesqr.com",
      fullName: "Administrador MarketGames QR",
      role: "BUSINESS_OWNER",
      passwordHash,
    }));
    users.push(await upsertUser(client, {
      businessId: business.id,
      email: "sandral.casallasr@gmail.com",
      fullName: "Sandra Casallas",
      role: "BUSINESS_MANAGER",
      passwordHash,
    }));
    users.push(await upsertUser(client, {
      businessId: business.id,
      email: "bhleadershope@hotmail.com",
      fullName: "Sergio Adrian Vasquez Salinas",
      role: "BUSINESS_MANAGER",
      passwordHash,
    }));

    const existingAccount = await client.query(
      "select * from business_qr_credit_accounts where business_id = $1 for update",
      [business.id]
    );
    const currentBalance = Number(existingAccount.rows[0]?.qr_balance || 0);
    const nextBalance = Math.max(currentBalance, TARGET_TICKET_BALANCE);
    const delta = nextBalance - currentBalance;

    const accountResult = await client.query(
      `insert into business_qr_credit_accounts
        (business_id, current_package_size, qr_balance, qr_purchased_total,
         public_label, internal_unit_price_cop, last_purchase_at)
       values ($1, $2, $3, $3, $4, 0, now())
       on conflict (business_id) do update
       set current_package_size = greatest(business_qr_credit_accounts.current_package_size, excluded.current_package_size),
           qr_balance = greatest(business_qr_credit_accounts.qr_balance, excluded.qr_balance),
           qr_purchased_total = greatest(business_qr_credit_accounts.qr_purchased_total, business_qr_credit_accounts.qr_used_total + excluded.qr_balance),
           public_label = excluded.public_label,
           internal_unit_price_cop = 0,
           last_purchase_at = now(),
           updated_at = now()
       returning *`,
      [business.id, TARGET_TICKET_BALANCE, TARGET_TICKET_BALANCE, "10.000 tickets internos MarketGames QR"]
    );

    if (delta > 0) {
      await client.query(
        `insert into business_qr_credit_ledger
          (business_id, account_id, entry_type, package_size, delta_qr, balance_after,
           internal_unit_price_cop, internal_total_cop, public_label, notes, created_by_user_id)
         values ($1, $2, 'MANUAL_ADJUSTMENT', $3, $4, $5, 0, 0, $6, $7, $8)`,
        [
          business.id,
          accountResult.rows[0].id,
          TARGET_TICKET_BALANCE,
          delta,
          accountResult.rows[0].qr_balance,
          "10.000 tickets internos MarketGames QR",
          "Carga inicial/vitalicia para cuenta propia MarketGames QR.",
          users[0].id,
        ]
      );
    }

    await client.query("commit");
    console.log(JSON.stringify({
      business,
      branch: branchResult.rows[0],
      game: gameResult.rows[0],
      reward: rewardResult.rows[0],
      users,
      credit_account: {
        qr_balance: Number(accountResult.rows[0].qr_balance || 0),
        qr_purchased_total: Number(accountResult.rows[0].qr_purchased_total || 0),
        internal_unit_price_cop: Number(accountResult.rows[0].internal_unit_price_cop || 0),
      },
    }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const crypto = require("crypto");
const QRCode = require("qrcode");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { canAccessBusiness } = require("../middleware/auth");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { createSecureToken, normalizeToken } = require("../utils/token");
const { ensureCreditAccount, trafficLabel } = require("./qrCreditService");
const { logQrEvent } = require("./auditService");
const { assertStandaloneBusinessFeature } = require("./subscriptionService");
const { ensureRewardPassContact, registerRedemptionIntake } = require("./redemptionLeadIntakeService");

const DEFAULT_TICKET_COST = 1;
const DEFAULT_TERMS = `Esta Gift Card Digital / Reward Pass es emitida directamente por [Nombre de la Empresa] y administrada tecnologicamente por Qori GOS Portal. Es redimible unicamente en el negocio emisor o en las sedes autorizadas por este. No constituye dinero electronico, producto financiero, deposito, credito ni medio de pago universal. No genera intereses. Su uso esta sujeto a validacion por QR y documento de identidad. La factura electronica de venta sera expedida por el comercio emisor al momento de la redencion, cuando se entreguen los productos o servicios correspondientes.

Condiciones sugeridas:
- Redimible unicamente en el negocio emisor.
- No canjeable por efectivo, salvo autorizacion expresa del emisor o norma aplicable.
- Permite redenciones parciales si asi fue configurado.
- Si el valor de compra supera el saldo disponible, el beneficiario paga el excedente.
- Si el valor de compra es menor y la gift card permite saldo parcial, el saldo restante queda disponible hasta el vencimiento.
- La redencion parcial no prorroga automaticamente la vigencia.
- La vigencia por defecto debe ser de 12 meses desde la activacion, salvo que el emisor configure un plazo mayor.
- Vencida la vigencia, el saldo no utilizado podra perderse segun condiciones aceptadas al momento de adquisicion.
- El emisor es responsable de la redencion comercial.
- Qori solo presta la tecnologia de administracion, QR, validacion y trazabilidad.`;

const REWARD_PASS_EFFECTIVE_STATUS_SQL = `case
  when rp.status = 'cancelled' then 'cancelled'
  when rp.current_balance_cop <= 0 then 'fully_redeemed'
  when rp.expires_at < now() then 'expired'
  when nullif(btrim(rp.beneficiary_name), '') is null or nullif(btrim(rp.beneficiary_document), '') is null then 'pending_claim'
  when rp.status = 'partially_redeemed' then 'partially_redeemed'
  when rp.status = 'extended' then 'extended'
  else 'active'
end`;

const REWARD_PASS_BRANCH_SCOPES = Object.freeze({
  ALL: "ALL_BRANCHES",
  SPECIFIC: "SPECIFIC_BRANCH",
});

function rewardPassBranchLabel(pass = {}) {
  if (pass.branch_authorization_scope === REWARD_PASS_BRANCH_SCOPES.ALL) return "Todas las Sedes";
  return cleanText(pass.authorized_branch_name || pass.authorized_branch, "Todas las Sedes");
}

function normalizeIdentity(value) {
  return cleanText(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function secureTextMatches(left, right) {
  const leftBuffer = Buffer.from(cleanText(left));
  const rightBuffer = Buffer.from(cleanText(right));
  if (!leftBuffer.length || leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function defaultTermsForBusiness(name) {
  return DEFAULT_TERMS.replace(/\[Nombre de la Empresa\]/g, cleanText(name, "el negocio emisor"));
}

function userBusinessId(user) {
  if (!user?.business_id) {
    throw forbidden("Este usuario no esta asignado a una empresa.");
  }
  return user.business_id;
}

function canManageRewardPass(user) {
  return ["BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"].includes(user?.role);
}

function canValidateRewardPass(user) {
  return ["BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR", "ADMIN", "ADMIN_MARKET_GAMES"].includes(user?.role);
}

function assertManager(user) {
  if (!canManageRewardPass(user)) {
    throw forbidden("Solo el owner o admin del negocio puede administrar Reward Pass.");
  }
}

function assertValidator(user) {
  if (!canValidateRewardPass(user)) {
    throw forbidden("Este rol no puede validar Reward Pass.");
  }
}

function moneyNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function addMonths(date, months) {
  const target = new Date(date);
  target.setUTCMonth(target.getUTCMonth() + months);
  return target;
}

function defaultExpiresAt(issuedAt = new Date()) {
  return addMonths(issuedAt, 12).toISOString();
}

function maskDocument(value) {
  const text = cleanText(value);
  if (text.length <= 4) return text;
  return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
}

function statusMessage(status) {
  const messages = {
    pending_claim: "Estas a un paso de descubrir y activar tu Gift Card.",
    active: "Reward Pass valido. Confirma documento de identidad antes de registrar la redencion.",
    partially_redeemed: "Reward Pass valido con saldo parcial disponible.",
    fully_redeemed: "Este Reward Pass ya fue redimido totalmente.",
    expired: "Este Reward Pass se encuentra vencido y no puede ser redimido.",
    cancelled: "Este Reward Pass fue anulado por el emisor.",
    extended: "Reward Pass prorrogado y disponible para redencion.",
  };
  return messages[status] || "Reward Pass no disponible.";
}

function effectiveStatus(row) {
  if (!row) return null;
  const balance = moneyNumber(row.current_balance_cop);
  if (balance <= 0) return "fully_redeemed";
  if (row.status === "cancelled") return "cancelled";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "expired";
  if (!cleanText(row.beneficiary_name) || !cleanText(row.beneficiary_document)) return "pending_claim";
  if (row.valid_from && new Date(row.valid_from) > new Date()) return "active";
  if (row.status === "partially_redeemed") return "partially_redeemed";
  if (row.status === "extended") return "extended";
  return "active";
}

async function syncEffectiveStatus(clientOrQuery, row) {
  const status = effectiveStatus(row);
  if (!status || status === row.status) return { ...row, status };
  const runQuery = typeof clientOrQuery === "function" ? clientOrQuery : clientOrQuery.query.bind(clientOrQuery);
  const updated = await runQuery(
    `update reward_passes
     set status = $2
     where id = $1 and status <> 'cancelled'
     returning *`,
    [row.id, status]
  );
  return updated.rows[0] || { ...row, status };
}

function buildPublicUrl(publicCode) {
  return new URL(`/rp/${encodeURIComponent(publicCode)}`, env.publicAppUrl || "http://localhost:3000").toString();
}

function buildValidatorUrl(token) {
  const target = new URL("/empresa/", env.publicAppUrl || "http://localhost:3000");
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  target.searchParams.set("type", "reward-pass");
  return target.toString();
}

function getRewardPassTicketCostFromSettings(settings = {}) {
  const raw = Number(settings.reward_pass_ticket_cost ?? settings.rewardPassTicketCost ?? DEFAULT_TICKET_COST);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_TICKET_COST;
}

async function loadBusinessForUpdate(client, businessId) {
  const result = await client.query(
    `select id, name, slug, settings
     from businesses
     where id = $1 and is_active = true
     for update`,
    [businessId]
  );
  const business = result.rows[0];
  if (!business) {
    throw notFound("Empresa emisora no encontrada.");
  }
  return business;
}

async function loadBusiness(businessId) {
  const result = await query(
    `select id, name, slug, settings
     from businesses
     where id = $1 and is_active = true`,
    [businessId]
  );
  const business = result.rows[0];
  if (!business) {
    throw notFound("Empresa emisora no encontrada.");
  }
  return business;
}

async function uniquePublicCode(client) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `SM-RP-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
    const existing = await client.query("select id from reward_passes where public_code = $1", [code]);
    if (!existing.rowCount) return code;
  }
  throw new Error("No se pudo generar un codigo publico unico.");
}

async function uniqueQrToken(client) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = `rp_${createSecureToken()}`;
    const existing = await client.query("select id from reward_passes where qr_token = $1", [token]);
    if (!existing.rowCount) return token;
  }
  throw new Error("No se pudo generar un token QR unico.");
}

function mapBusiness(row, includeLogo = false) {
  const settings = row?.settings || {};
  return {
    id: row?.id,
    name: row?.name || "",
    slug: row?.slug || "",
    nit: settings.nit || "",
    contact_name: settings.contact_name || "",
    contact_email: settings.contact_email || settings.email || "",
    phone: settings.phone || "",
    website: settings.website || "",
    city: settings.city || "",
    address: settings.address || "",
    logo_data_url: includeLogo ? (settings.logo_data_url || "") : "",
    logo_url: settings.logo_url || "",
  };
}

function mapRewardPass(row, options = {}) {
  if (!row) return null;
  const company = mapBusiness({
    id: row.company_id,
    name: row.company_name,
    slug: row.company_slug,
    settings: row.company_settings || {},
  }, options.includeLogo);
  const status = row.status || effectiveStatus(row);
  return {
    id: row.id,
    company_id: row.company_id,
    user_id: row.user_id,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name || null,
    buyer_name: options.publicView ? undefined : row.buyer_name,
    buyer_document: options.publicView ? undefined : row.buyer_document,
    buyer_email: options.publicView ? undefined : row.buyer_email,
    buyer_phone: options.publicView ? undefined : row.buyer_phone,
    beneficiary_name: row.beneficiary_name,
    beneficiary_document: options.publicView ? maskDocument(row.beneficiary_document) : row.beneficiary_document,
    beneficiary_email: options.publicView ? null : row.beneficiary_email,
    beneficiary_phone: options.publicView ? null : row.beneficiary_phone,
    initial_value_cop: options.publicView && !options.revealPublicValue ? undefined : moneyNumber(row.initial_value_cop),
    current_balance_cop: options.publicView && !options.revealPublicValue ? undefined : moneyNumber(row.current_balance_cop),
    issued_at: row.issued_at,
    valid_from: row.valid_from,
    expires_at: row.expires_at,
    status,
    status_message: statusMessage(status),
    qr_token: options.includeToken ? row.qr_token : undefined,
    public_code: row.public_code,
    security_pin: options.includePrivate ? row.security_pin : undefined,
    transferable: Boolean(row.transferable),
    partial_redemption_allowed: Boolean(row.partial_redemption_allowed),
    authorized_branch: row.authorized_branch,
    authorized_branch_id: row.authorized_branch_id || null,
    authorized_branch_name: row.authorized_branch_name || row.authorized_branch || null,
    branch_authorization_scope: row.branch_authorization_scope || null,
    authorized_branch_label: rewardPassBranchLabel(row),
    terms: row.terms,
    internal_notes: options.includePrivate ? row.internal_notes : undefined,
    digital_card_image_path: row.digital_card_image_path,
    digital_card_pdf_path: row.digital_card_pdf_path,
    acquisition_receipt_pdf_path: row.acquisition_receipt_pdf_path,
    payment_method_received: row.payment_method_received,
    claimed_at: row.claimed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    company,
    public_url: buildPublicUrl(row.public_code),
    validator_url: options.includeToken ? buildValidatorUrl(row.qr_token) : undefined,
  };
}

async function getRewardPassQrDataUrl(pass) {
  return QRCode.toDataURL(buildValidatorUrl(pass.qr_token), {
    margin: 1,
    width: 520,
    errorCorrectionLevel: "M",
  });
}

async function getQrDataUrlForUrl(url) {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 520,
    errorCorrectionLevel: "M",
  });
}

async function listRewardPasses(user, filters = {}) {
  const businessId = userBusinessId(user);
  const params = [businessId];
  const clauses = ["rp.company_id = $1"];
  if (filters.status) {
    if (filters.status === "used") {
      clauses.push("rp.current_balance_cop < rp.initial_value_cop");
    } else if (filters.status === "with_balance") {
      clauses.push(`rp.current_balance_cop > 0 and (${REWARD_PASS_EFFECTIVE_STATUS_SQL}) not in ('cancelled', 'expired', 'fully_redeemed')`);
    } else {
      params.push(filters.status);
      clauses.push(`(${REWARD_PASS_EFFECTIVE_STATUS_SQL}) = $${params.length}`);
    }
  }
  if (filters.search) {
    params.push(`%${String(filters.search).trim()}%`);
    clauses.push(`(
      rp.public_code ilike $${params.length}
      or rp.beneficiary_name ilike $${params.length}
      or rp.beneficiary_document ilike $${params.length}
      or rp.buyer_name ilike $${params.length}
    )`);
  }
  if (filters.pendingBalance === true) {
    clauses.push("rp.current_balance_cop > 0");
  }
  if (filters.expired === true) {
    clauses.push("rp.expires_at < now() and rp.current_balance_cop > 0");
  }
  if (filters.partiallyRedeemed === true) {
    clauses.push(`(${REWARD_PASS_EFFECTIVE_STATUS_SQL}) = 'partially_redeemed'`);
  }
  if (filters.branchId) {
    params.push(filters.branchId);
    clauses.push(`(rp.authorized_branch_id = $${params.length} or rp.branch_authorization_scope = 'ALL_BRANCHES')`);
  }

  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  params.push(limit, offset);
  const limitParam = `$${params.length - 1}`;
  const offsetParam = `$${params.length}`;

  const result = await query(
    `select rp.*, b.name as company_name, b.slug as company_slug, b.settings as company_settings,
            c.name as campaign_name, br.name as authorized_branch_name,
            (${REWARD_PASS_EFFECTIVE_STATUS_SQL}) as effective_status,
            count(*) over()::int as total_count
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
     left join branches br on br.id = rp.authorized_branch_id and br.business_id = rp.company_id
     where ${clauses.join(" and ")}
     order by rp.created_at desc
     limit ${limitParam} offset ${offsetParam}`,
    params
  );
  const rows = result.rows.map((row) => mapRewardPass({ ...row, status: row.effective_status }, { includeToken: true }));
  const total = Number(result.rows[0]?.total_count || 0);
  return {
    rows,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + rows.length < total,
    },
  };
}

async function rewardPassMetrics(user) {
  const businessId = userBusinessId(user);
  const result = await query(
    `with scoped as (
       select rp.*, (${REWARD_PASS_EFFECTIVE_STATUS_SQL}) as effective_status
       from reward_passes rp
       where rp.company_id = $1
     )
     select
       count(*)::int as issued_count,
       coalesce(sum(initial_value_cop), 0)::numeric as total_issued_cop,
       coalesce(sum(initial_value_cop - current_balance_cop), 0)::numeric as total_redeemed_cop,
       coalesce(sum(current_balance_cop) filter (where effective_status not in ('cancelled', 'expired', 'fully_redeemed')), 0)::numeric as pending_balance_cop,
       coalesce(sum(current_balance_cop) filter (where effective_status = 'expired'), 0)::numeric as expired_balance_cop,
       count(*) filter (where effective_status in ('active', 'extended'))::int as active_count,
       count(*) filter (where effective_status = 'pending_claim')::int as pending_claim_count,
       count(*) filter (where effective_status = 'partially_redeemed')::int as partially_redeemed_count,
       count(*) filter (where effective_status = 'expired')::int as expired_count,
       count(*) filter (where effective_status = 'cancelled')::int as cancelled_count,
       count(*) filter (where effective_status = 'fully_redeemed')::int as fully_redeemed_count,
       count(*) filter (where effective_status not in ('cancelled', 'expired', 'fully_redeemed') and expires_at between now() and now() + interval '30 days')::int as expiring_soon_count
     from scoped`,
    [businessId]
  );
  const redemptionResult = await query(
    `select
       count(*)::int as redemption_count,
       coalesce(avg(redeemed_value_cop), 0)::numeric as average_redemption_cop
     from reward_pass_redemptions
     where company_id = $1`,
    [businessId]
  );
  const ticketResult = await query(
    `select coalesce(sum(tickets_debited), 0)::int as tickets_consumed
     from reward_pass_ticket_transactions
     where company_id = $1 and transaction_type = 'reward_pass_issue'`,
    [businessId]
  );
  const byBranch = await query(
    `select coalesce(nullif(branch, ''), 'Sin sede') as branch,
            count(*)::int as redemptions,
            coalesce(sum(redeemed_value_cop), 0)::numeric as total_redeemed_cop
     from reward_pass_redemptions
     where company_id = $1
     group by coalesce(nullif(branch, ''), 'Sin sede')
     order by total_redeemed_cop desc
     limit 12`,
    [businessId]
  );
  const byCashier = await query(
    `select coalesce(u.full_name, 'Sin vendedor') as cashier,
            count(rpr.*)::int as redemptions,
            coalesce(sum(rpr.redeemed_value_cop), 0)::numeric as total_redeemed_cop
     from reward_pass_redemptions rpr
     left join app_users u on u.id = rpr.cashier_user_id
     where rpr.company_id = $1
     group by coalesce(u.full_name, 'Sin vendedor')
     order by total_redeemed_cop desc
     limit 12`,
    [businessId]
  );

  const row = result.rows[0] || {};
  const redemptions = redemptionResult.rows[0] || {};
  return {
    issued_count: Number(row.issued_count || 0),
    total_issued_cop: moneyNumber(row.total_issued_cop),
    total_redeemed_cop: moneyNumber(row.total_redeemed_cop),
    pending_balance_cop: moneyNumber(row.pending_balance_cop),
    expired_balance_cop: moneyNumber(row.expired_balance_cop),
    active_count: Number(row.active_count || 0),
    pending_claim_count: Number(row.pending_claim_count || 0),
    partially_redeemed_count: Number(row.partially_redeemed_count || 0),
    expired_count: Number(row.expired_count || 0),
    cancelled_count: Number(row.cancelled_count || 0),
    fully_redeemed_count: Number(row.fully_redeemed_count || 0),
    expiring_soon_count: Number(row.expiring_soon_count || 0),
    redemption_count: Number(redemptions.redemption_count || 0),
    average_redemption_cop: moneyNumber(redemptions.average_redemption_cop),
    tickets_consumed: Number(ticketResult.rows[0]?.tickets_consumed || 0),
    redemptions_by_branch: byBranch.rows.map((item) => ({
      ...item,
      total_redeemed_cop: moneyNumber(item.total_redeemed_cop),
    })),
    redemptions_by_cashier: byCashier.rows.map((item) => ({
      ...item,
      total_redeemed_cop: moneyNumber(item.total_redeemed_cop),
    })),
  };
}

async function getTicketContext(user) {
  const businessId = userBusinessId(user);
  const business = await loadBusiness(businessId);
  const accountResult = await query(
    "select * from business_qr_credit_accounts where business_id = $1",
    [businessId]
  );
  const account = accountResult.rows[0] || {
    qr_balance: 0,
    qr_purchased_total: 0,
    qr_used_total: 0,
  };
  return {
    business_name: business.name,
    reward_pass_ticket_cost: getRewardPassTicketCostFromSettings(business.settings || {}),
    ticket_balance: Number(account.qr_balance || 0),
    qr_purchased_total: Number(account.qr_purchased_total || 0),
    qr_used_total: Number(account.qr_used_total || 0),
  };
}

async function createRewardPass(user, payload) {
  assertManager(user);
  const businessId = userBusinessId(user);
  const issuedAt = payload.issued_at ? new Date(payload.issued_at) : new Date();
  const expiresAt = payload.expires_at ? new Date(payload.expires_at) : new Date(defaultExpiresAt(issuedAt));
  if (expiresAt <= issuedAt) {
    throw badRequest("La fecha de vencimiento debe ser posterior a la emision.");
  }
  const initialValue = moneyNumber(payload.initial_value_cop);
  if (initialValue <= 0) {
    throw badRequest("El valor inicial debe ser mayor que 0.");
  }

  const created = await withTransaction(async (client) => {
    const business = await loadBusinessForUpdate(client, businessId);
    const issuanceKey = cleanText(payload.idempotency_key);
    if (issuanceKey) {
      const existing = await client.query(
        "select id from reward_passes where company_id = $1 and issuance_key = $2",
        [businessId, issuanceKey]
      );
      if (existing.rowCount) return { id: existing.rows[0].id, idempotent: true };
    }
    const ticketCost = getRewardPassTicketCostFromSettings(business.settings || {});
    const account = await ensureCreditAccount(client, businessId);
    const balanceBefore = Number(account.qr_balance || 0);
    if (balanceBefore < ticketCost) {
      throw badRequest("No tienes tickets suficientes para emitir este Reward Pass.");
    }

    if (payload.campaign_id) {
      const campaign = await client.query(
        "select id from campaigns where id = $1 and business_id = $2",
        [payload.campaign_id, businessId]
      );
      if (!campaign.rowCount) {
        throw badRequest("La campana asociada no pertenece a esta empresa.");
      }
    }

    let branchAuthorizationScope = cleanText(payload.branch_authorization_scope).toUpperCase();
    if (!branchAuthorizationScope) {
      branchAuthorizationScope = payload.authorized_branch_id
        ? REWARD_PASS_BRANCH_SCOPES.SPECIFIC
        : payload.authorized_branch
          ? null
          : REWARD_PASS_BRANCH_SCOPES.ALL;
    }
    if (branchAuthorizationScope === REWARD_PASS_BRANCH_SCOPES.ALL && payload.authorized_branch_id) {
      throw badRequest("El alcance Todas las Sedes no admite una sede específica.");
    }
    if (branchAuthorizationScope === REWARD_PASS_BRANCH_SCOPES.SPECIFIC && !payload.authorized_branch_id) {
      throw badRequest("Selecciona la sede específica autorizada.");
    }
    if (branchAuthorizationScope && !Object.values(REWARD_PASS_BRANCH_SCOPES).includes(branchAuthorizationScope)) {
      throw badRequest("El alcance de sedes del Reward Pass no es válido.");
    }
    if (branchAuthorizationScope === REWARD_PASS_BRANCH_SCOPES.ALL) {
      const activeBranches = await client.query(
        "select 1 from branches where business_id = $1 and is_active = true limit 1",
        [businessId]
      );
      if (!activeBranches.rowCount) {
        throw badRequest("No tienes sedes activas. Crea una sede en Opera → Sedes antes de emitir el Reward Pass.");
      }
    }

    let authorizedBranch = null;
    if (payload.authorized_branch_id) {
      const branchResult = await client.query(
        "select id, name from branches where id = $1 and business_id = $2 and is_active = true",
        [payload.authorized_branch_id, businessId]
      );
      authorizedBranch = branchResult.rows[0] || null;
      if (!authorizedBranch) throw badRequest("La sede autorizada no pertenece a este negocio o está inactiva.");
    }

    const qrToken = await uniqueQrToken(client);
    const publicCode = await uniquePublicCode(client);
    const terms = cleanText(payload.terms, defaultTermsForBusiness(business.name))
      .replace(/\[Nombre de la Empresa\]/g, business.name);
    const securityPin = payload.security_pin || crypto.randomInt(100000, 999999).toString();
    const beneficiaryName = cleanText(payload.beneficiary_name);
    const beneficiaryDocument = cleanText(payload.beneficiary_document);
    const initialStatus = beneficiaryName && beneficiaryDocument ? "active" : "pending_claim";
    const passResult = await client.query(
      `insert into reward_passes (
         company_id, user_id, campaign_id, buyer_name, buyer_document, buyer_email, buyer_phone,
         beneficiary_name, beneficiary_document, beneficiary_email, beneficiary_phone,
         initial_value_cop, current_balance_cop, issued_at, valid_from, expires_at, status,
         qr_token, public_code, security_pin, transferable, partial_redemption_allowed,
         authorized_branch, authorized_branch_id, branch_authorization_scope, terms, internal_notes, payment_method_received,
         source_sale_id, rms_post_sale_action_id, issuance_key
       )
       values (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11,
         $12, $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21,
         $22, $23, $24, $25, $26, $27, $28, $29, $30
       )
       returning *`,
      [
        businessId,
        user.id,
        payload.campaign_id || null,
        payload.buyer_name,
        payload.buyer_document || null,
        payload.buyer_email || null,
        payload.buyer_phone || null,
        beneficiaryName || null,
        beneficiaryDocument || null,
        payload.beneficiary_email || null,
        payload.beneficiary_phone || null,
        initialValue,
        issuedAt.toISOString(),
        payload.valid_from || null,
        expiresAt.toISOString(),
        initialStatus,
        qrToken,
        publicCode,
        securityPin,
        Boolean(payload.transferable),
        payload.partial_redemption_allowed !== false,
        branchAuthorizationScope === REWARD_PASS_BRANCH_SCOPES.ALL
          ? "Todas las Sedes"
          : authorizedBranch?.name || payload.authorized_branch || null,
        authorizedBranch?.id || null,
        branchAuthorizationScope,
        terms,
        payload.internal_notes || null,
        payload.payment_method_received || null,
        payload.source_sale_id || null,
        payload.rms_post_sale_action_id || null,
        issuanceKey || null,
      ]
    );
    const pass = passResult.rows[0];
    const balanceAfter = balanceBefore - ticketCost;
    await client.query(
      `update business_qr_credit_accounts
       set qr_balance = $2,
           qr_used_total = qr_used_total + $3,
           updated_at = now()
       where business_id = $1`,
      [businessId, balanceAfter, ticketCost]
    );
    await client.query(
      `insert into business_qr_credit_ledger
        (business_id, account_id, entry_type, delta_qr, balance_after, public_label, notes, created_by_user_id)
       values ($1, $2, 'QR_CONSUMED', $3, $4, $5, $6, $7)`,
      [
        businessId,
        account.id,
        -ticketCost,
        balanceAfter,
        trafficLabel(ticketCost),
        `Reward Pass ${publicCode} emitido. Derecho tecnologico Qori descontado.`,
        user.id,
      ]
    );
    await client.query(
      `insert into reward_pass_ticket_transactions
        (company_id, user_id, reward_pass_id, tickets_debited, balance_before, balance_after, transaction_type, notes)
       values ($1, $2, $3, $4, $5, $6, 'reward_pass_issue', $7)`,
      [
        businessId,
        user.id,
        pass.id,
        ticketCost,
        balanceBefore,
        balanceAfter,
        "Emision de Reward Pass. El saldo COP comercial no se mezcla con tickets.",
      ]
    );
    await logQrEvent(client, {
      business_id: businessId,
      campaign_id: payload.campaign_id || null,
      user_id: user.id,
      event_type: "REWARD_PASS_ISSUED",
      message: `Reward Pass ${publicCode} emitido.`,
      metadata: {
        reward_pass_id: pass.id,
        public_code: publicCode,
        ticket_cost: ticketCost,
        initial_value_cop: initialValue,
      },
    });
    return { id: pass.id, idempotent: false };
  });

  const rewardPass = await getRewardPassById(user, created.id);
  rewardPass.idempotent = Boolean(created.idempotent);
  return rewardPass;
}

async function getRewardPassById(user, id) {
  const businessId = userBusinessId(user);
  const result = await query(
    `select rp.*, b.name as company_name, b.slug as company_slug, b.settings as company_settings,
            c.name as campaign_name, br.name as authorized_branch_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
     left join branches br on br.id = rp.authorized_branch_id and br.business_id = rp.company_id
     where rp.id = $1 and rp.company_id = $2`,
    [id, businessId]
  );
  let pass = result.rows[0];
  if (!pass) throw notFound("Reward Pass no encontrado.");
  pass = await syncEffectiveStatus(query, pass);
  const redemptions = await query(
    `select rpr.*, u.full_name as cashier_name
     from reward_pass_redemptions rpr
     left join app_users u on u.id = rpr.cashier_user_id
     where rpr.reward_pass_id = $1
     order by rpr.redeemed_at desc`,
    [id]
  );
  const ticketTransactions = await query(
    `select *
     from reward_pass_ticket_transactions
     where reward_pass_id = $1
     order by created_at desc`,
    [id]
  );
  const mapped = mapRewardPass(pass, { includeToken: true, includePrivate: true, includeLogo: true });
  mapped.qr_image_data_url = await getRewardPassQrDataUrl(pass);
  mapped.redemptions = redemptions.rows.map((row) => ({
    ...row,
    redeemed_value_cop: moneyNumber(row.redeemed_value_cop),
    balance_before_cop: moneyNumber(row.balance_before_cop),
    balance_after_cop: moneyNumber(row.balance_after_cop),
    purchase_value_cop: row.purchase_value_cop === null ? null : moneyNumber(row.purchase_value_cop),
  }));
  mapped.ticket_transactions = ticketTransactions.rows;
  return mapped;
}

async function getPublicRewardPass(publicCode) {
  const result = await query(
    `select rp.*, b.name as company_name, b.slug as company_slug,
            (b.settings - 'logo_data_url') as company_settings,
            c.name as campaign_name, br.name as authorized_branch_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
     left join branches br on br.id = rp.authorized_branch_id and br.business_id = rp.company_id
     where lower(rp.public_code) = lower($1)`,
    [publicCode]
  );
  let pass = result.rows[0];
  if (!pass) throw notFound("Reward Pass no encontrado.");
  pass = await syncEffectiveStatus(query, pass);
  const status = effectiveStatus(pass);
  const isPendingClaim = status === "pending_claim";
  const mapped = mapRewardPass(pass, {
    publicView: true,
    includeToken: !isPendingClaim,
    revealPublicValue: !isPendingClaim,
  });
  delete mapped.qr_token;
  mapped.claim_required = isPendingClaim;
  mapped.qr_image_data_url = isPendingClaim ? "" : await getRewardPassQrDataUrl(pass);
  mapped.instructions = isPendingClaim
    ? "Completa tus datos para descubrir el valor disponible y obtener el QR final de tu Gift Card. Ese QR sera el que presentes en el negocio para redimirla."
    : "Presenta este QR junto con tu documento de identidad en el negocio emisor.";
  mapped.can_redeem_publicly = false;
  return mapped;
}

async function getPublicRewardPassPdf(publicCode) {
  const result = await query(
    `select rp.*, b.name as company_name, b.slug as company_slug,
            (b.settings - 'logo_data_url') as company_settings,
            c.name as campaign_name, br.name as authorized_branch_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
     left join branches br on br.id = rp.authorized_branch_id and br.business_id = rp.company_id
     where lower(rp.public_code) = lower($1)`,
    [publicCode]
  );
  let pass = result.rows[0];
  if (!pass) throw notFound("Reward Pass no encontrado.");
  pass = await syncEffectiveStatus(query, pass);
  const status = effectiveStatus(pass);
  if (status === "pending_claim") {
    throw badRequest("Activa la Gift Card con tus datos antes de descargar el PDF oficial.");
  }
  if (status === "cancelled") {
    throw badRequest("Este Reward Pass fue anulado por el emisor.");
  }
  return buildRewardPassPdf(pass, "card");
}

async function claimRewardPass(publicCode, payload) {
  const beneficiaryName = cleanText(payload.beneficiary_name);
  const beneficiaryDocument = cleanText(payload.beneficiary_document);
  if (!beneficiaryName || !beneficiaryDocument) {
    throw badRequest("Nombre y documento del beneficiario son obligatorios para activar la Gift Card oficial.");
  }

  const claimedPublicCode = await withTransaction(async (client) => {
    const result = await client.query(
      `select *
       from reward_passes
       where lower(public_code) = lower($1)
       for update`,
      [publicCode]
    );
    let pass = result.rows[0];
    if (!pass) throw notFound("Reward Pass no encontrado.");
    if (!secureTextMatches(payload.security_pin, pass.security_pin)) {
      throw badRequest("El PIN de activación no es válido. Solicítalo al negocio emisor.");
    }
    pass = await syncEffectiveStatus(client, pass);
    const status = effectiveStatus(pass);
    if (status === "cancelled" || status === "expired" || status === "fully_redeemed") {
      throw badRequest(statusMessage(status));
    }
    if (status !== "pending_claim" && pass.claimed_at) {
      throw badRequest("Este Reward Pass ya fue activado.");
    }
    const updated = await client.query(
      `update reward_passes
       set beneficiary_name = $2,
           beneficiary_document = $3,
           beneficiary_email = $4,
           beneficiary_phone = $5,
           status = 'active',
           claimed_at = now(),
           updated_at = now()
       where id = $1
       returning *`,
      [
        pass.id,
        beneficiaryName,
        beneficiaryDocument,
        payload.beneficiary_email || null,
        payload.beneficiary_phone || null,
      ]
    );
    await logQrEvent(client, {
      business_id: pass.company_id,
      campaign_id: pass.campaign_id || null,
      event_type: "REWARD_PASS_CLAIMED",
      message: `Reward Pass ${pass.public_code} activado por beneficiario.`,
      metadata: { reward_pass_id: pass.id, public_code: pass.public_code },
    });
    return updated.rows[0].public_code;
  });
  return getPublicRewardPass(claimedPublicCode);
}

async function validateRewardPassToken(user, rawToken) {
  assertValidator(user);
  const token = normalizeToken(rawToken);
  const result = await query(
    `select rp.*, b.name as company_name, b.slug as company_slug, b.settings as company_settings,
            c.name as campaign_name, br.name as authorized_branch_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
     left join branches br on br.id = rp.authorized_branch_id and br.business_id = rp.company_id
     where rp.qr_token = $1`,
    [token]
  );
  let pass = result.rows[0];
  if (!pass) {
    throw notFound("Reward Pass no encontrado.");
  }
  if (!canAccessBusiness(user, pass.company_id)) {
    throw forbidden("Este Reward Pass pertenece a otro negocio.");
  }
  await assertStandaloneBusinessFeature(user, pass.company_id, "qr_validator");
  pass = await syncEffectiveStatus(query, pass);
  const status = effectiveStatus(pass);
  const notStarted = pass.valid_from && new Date(pass.valid_from) > new Date();
  const allowed = !notStarted && ["active", "partially_redeemed", "extended"].includes(status) && moneyNumber(pass.current_balance_cop) > 0;
  await logQrEvent(query, {
    business_id: pass.company_id,
    campaign_id: pass.campaign_id || null,
    user_id: user.id,
    event_type: "REWARD_PASS_VALIDATED",
    message: `Reward Pass ${pass.public_code} validado con estado ${status}.`,
    metadata: { reward_pass_id: pass.id, public_code: pass.public_code, status },
  });
  const mapped = mapRewardPass(pass, { includeToken: true, includePrivate: true });
  return {
    kind: "reward_pass",
    status,
    allowed,
    message: notStarted ? "Este Reward Pass todavia no esta vigente." : statusMessage(status),
    reward_pass: mapped,
    business: mapped.company,
    reward: {
      name: "Reward Pass",
      display: status === "pending_claim" ? "Pendiente de activacion por beneficiario" : "Gift Card Digital Propia",
    },
    player: {
      name: pass.beneficiary_name,
      document_id: pass.beneficiary_document,
      email: pass.beneficiary_email,
      phone: pass.beneficiary_phone,
    },
    qr_code: {
      origin_type: "REWARD_PASS",
      created_at: pass.created_at,
      expires_at: pass.expires_at,
    },
  };
}

async function redeemRewardPass(user, rawToken, payload) {
  assertValidator(user);
  const token = normalizeToken(rawToken);
  const purchaseValue = moneyNumber(payload.purchase_value_cop || 0);
  let redeemValue = moneyNumber(payload.redeemed_value_cop || 0);
  if (redeemValue <= 0) {
    throw badRequest("El valor a redimir debe ser mayor que 0.");
  }
  if (!payload.invoice_number) {
    throw badRequest("El numero de factura electronica es obligatorio.");
  }

  const accessResult = await query("select company_id from reward_passes where qr_token = $1", [token]);
  const accessRow = accessResult.rows[0];
  if (accessRow) {
    if (!canAccessBusiness(user, accessRow.company_id)) {
      throw forbidden("Este Reward Pass pertenece a otro negocio.");
    }
    await assertStandaloneBusinessFeature(user, accessRow.company_id, "qr_validator");
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `select *
       from reward_passes
       where qr_token = $1
       for update`,
      [token]
    );
    let pass = result.rows[0];
    if (!pass) throw notFound("Reward Pass no encontrado.");
    if (!canAccessBusiness(user, pass.company_id)) {
      throw forbidden("Este Reward Pass pertenece a otro negocio.");
    }
    pass = await syncEffectiveStatus(client, pass);
    const status = effectiveStatus(pass);
    if (pass.valid_from && new Date(pass.valid_from) > new Date()) {
      throw badRequest("Este Reward Pass todavia no esta vigente.");
    }
    if (!["active", "partially_redeemed", "extended"].includes(status)) {
      throw badRequest(statusMessage(status));
    }
    const idempotencyKey = cleanText(payload.idempotency_key);
    if (idempotencyKey) {
      const existingRedemption = await client.query(
        `select * from reward_pass_redemptions
         where company_id = $1 and idempotency_key = $2`,
        [pass.company_id, idempotencyKey]
      );
      if (existingRedemption.rowCount) {
        const beneficiaryContact = await ensureRewardPassContact(client, pass);
        await registerRedemptionIntake(client, {
          businessId: pass.company_id,
          contact: beneficiaryContact,
          userId: user.id,
          campaignId: pass.campaign_id || null,
          origin: "Reward Pass",
          dedupeKey: `REWARD_PASS_REDEMPTION:${existingRedemption.rows[0].id}`,
          description: `Reward Pass ${pass.public_code} redimido y enviado al Recolector.`,
          metadata: { reward_pass_id: pass.id, reward_pass_redemption_id: existingRedemption.rows[0].id },
        });
        return {
          message: "Esta redención ya había sido registrada. No se descontó saldo nuevamente.",
          redemption: existingRedemption.rows[0],
          reward_pass: mapRewardPass(pass, { includeToken: true, includePrivate: true }),
          idempotent: true,
        };
      }
    }
    const duplicateInvoice = await client.query(
      `select id from reward_pass_redemptions
       where reward_pass_id = $1 and lower(btrim(invoice_number)) = lower(btrim($2))`,
      [pass.id, payload.invoice_number]
    );
    if (duplicateInvoice.rowCount) {
      throw badRequest("Esta factura ya fue registrada para este Reward Pass.");
    }
    const balanceBefore = moneyNumber(pass.current_balance_cop);
    if (balanceBefore <= 0) {
      throw badRequest("Este Reward Pass ya fue redimido totalmente.");
    }
    if (redeemValue > balanceBefore) {
      throw badRequest("No puedes redimir mas que el saldo disponible.");
    }
    if (purchaseValue > 0 && redeemValue > purchaseValue) {
      throw badRequest("El valor a redimir no puede superar el total de la factura electronica.");
    }
    if (purchaseValue > 0 && purchaseValue > balanceBefore && redeemValue !== balanceBefore) {
      throw badRequest("Si la compra supera el saldo, redime el saldo total disponible.");
    }
    let forceFullConsumption = false;
    if (!pass.partial_redemption_allowed && redeemValue < balanceBefore) {
      if (!payload.confirm_full_consumption) {
        throw badRequest("Este Reward Pass es de un solo uso. Confirma las condiciones aceptadas por el consumidor antes de consumir el saldo restante.");
      }
      forceFullConsumption = true;
    }
    const balanceAfter = forceFullConsumption ? 0 : moneyNumber(balanceBefore - redeemValue);
    const nextStatus = balanceAfter <= 0 ? "fully_redeemed" : "partially_redeemed";
    const documentChecked = cleanText(payload.document_checked || "");
    if (!documentChecked) throw badRequest("Confirma el documento del beneficiario antes de redimir.");
    const documentMatch = normalizeIdentity(documentChecked) === normalizeIdentity(pass.beneficiary_document);
    if (!documentMatch) throw badRequest("El documento presentado no coincide con el beneficiario del Reward Pass.");
    const branchId = payload.branch_id || user.branch_id || null;
    const branchScope = pass.branch_authorization_scope || null;
    if ([REWARD_PASS_BRANCH_SCOPES.ALL, REWARD_PASS_BRANCH_SCOPES.SPECIFIC].includes(branchScope) && !branchId) {
      throw badRequest("Selecciona una sede activa para registrar la redención.");
    }
    let branchName = cleanText(payload.branch || "") || null;
    if (branchId) {
      const branchResult = await client.query(
        "select id, name from branches where id = $1 and business_id = $2 and is_active = true",
        [branchId, pass.company_id]
      );
      const branch = branchResult.rows[0];
      if (!branch) throw badRequest("La sede de redención no pertenece al negocio o está inactiva.");
      branchName = branch.name;
    }
    if (pass.authorized_branch_id) {
      const authorizedResult = await client.query(
        "select id, name, is_active from branches where id = $1 and business_id = $2",
        [pass.authorized_branch_id, pass.company_id]
      );
      const authorized = authorizedResult.rows[0];
      const authorizedName = authorized?.name || pass.authorized_branch || "la sede autorizada";
      if (!authorized || authorized.is_active === false) {
        throw badRequest(`La sede autorizada ${authorizedName} ya no está activa. No se descontó saldo.`);
      }
      if (String(branchId || "") !== String(pass.authorized_branch_id)) {
        throw badRequest(`Este Reward Pass solo puede redimirse en la sede: ${authorizedName}.`);
      }
    }
    const redemptionType = balanceAfter <= 0 ? "full" : "partial";

    const redemption = await client.query(
      `insert into reward_pass_redemptions (
         reward_pass_id, company_id, branch, branch_id, cashier_user_id, invoice_number, invoice_file_path,
         redeemed_value_cop, balance_before_cop, balance_after_cop, redemption_type,
         purchase_value_cop, document_checked, document_match, observations, idempotency_key
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       returning *`,
      [
        pass.id,
        pass.company_id,
        branchName,
        branchId,
        user.id,
        payload.invoice_number,
        payload.invoice_file_path || null,
        redeemValue,
        balanceBefore,
        balanceAfter,
        redemptionType,
        purchaseValue || null,
        documentChecked || null,
        documentMatch,
        payload.observations || null,
        idempotencyKey || null,
      ]
    );
    const updated = await client.query(
      `update reward_passes
       set current_balance_cop = $2,
           status = $3,
           updated_at = now()
       where id = $1
       returning *`,
      [pass.id, balanceAfter, nextStatus]
    );
    await logQrEvent(client, {
      business_id: pass.company_id,
      campaign_id: pass.campaign_id || null,
      user_id: user.id,
      event_type: "REWARD_PASS_REDEEMED",
      message: `Reward Pass ${pass.public_code} redimido por ${redeemValue} COP.`,
      metadata: {
        reward_pass_id: pass.id,
        public_code: pass.public_code,
        balance_before_cop: balanceBefore,
        balance_after_cop: balanceAfter,
        invoice_number: payload.invoice_number,
      },
    });
    const beneficiaryContact = await ensureRewardPassContact(client, pass);
    await registerRedemptionIntake(client, {
      businessId: pass.company_id,
      contact: beneficiaryContact,
      userId: user.id,
      campaignId: pass.campaign_id || null,
      origin: "Reward Pass",
      dedupeKey: `REWARD_PASS_REDEMPTION:${redemption.rows[0].id}`,
      description: `Reward Pass ${pass.public_code} redimido ${redemptionType === "partial" ? "parcialmente" : "en su totalidad"}.`,
      metadata: { reward_pass_id: pass.id, reward_pass_redemption_id: redemption.rows[0].id, redemption_type: redemptionType },
    });
    return {
      message: forceFullConsumption
        ? `Redencion registrada correctamente. Se aplicaron $${redeemValue.toLocaleString("es-CO")} COP a la factura y el saldo restante quedo consumido por condicion de un solo uso.`
        : `Redencion registrada correctamente. Nuevo saldo disponible: $${balanceAfter.toLocaleString("es-CO")} COP.`,
      redemption: redemption.rows[0],
      reward_pass: mapRewardPass(updated.rows[0], { includeToken: true, includePrivate: true }),
      idempotent: false,
    };
  });
}

async function cancelRewardPass(user, id, notes = "") {
  assertManager(user);
  const businessId = userBusinessId(user);
  return withTransaction(async (client) => {
    const result = await client.query(
      "select * from reward_passes where id = $1 and company_id = $2 for update",
      [id, businessId]
    );
    const pass = result.rows[0];
    if (!pass) throw notFound("Reward Pass no encontrado.");
    if (moneyNumber(pass.current_balance_cop) < moneyNumber(pass.initial_value_cop)) {
      throw badRequest("No puedes anular un Reward Pass que ya tuvo redenciones.");
    }
    const updated = await client.query(
      `update reward_passes
       set status = 'cancelled',
           internal_notes = concat_ws(E'\n', internal_notes, $3),
           updated_at = now()
       where id = $1 and company_id = $2
       returning *`,
      [id, businessId, notes || "Anulado por el emisor."]
    );
    await logQrEvent(client, {
      business_id: businessId,
      campaign_id: pass.campaign_id || null,
      user_id: user.id,
      event_type: "REWARD_PASS_CANCELLED",
      message: `Reward Pass ${pass.public_code} anulado.`,
      metadata: { reward_pass_id: pass.id, public_code: pass.public_code },
    });
    return mapRewardPass(updated.rows[0], { includeToken: true, includePrivate: true });
  });
}

async function extendRewardPass(user, id, expiresAt, notes = "") {
  assertManager(user);
  const businessId = userBusinessId(user);
  const nextExpiresAt = new Date(expiresAt);
  if (!expiresAt || Number.isNaN(nextExpiresAt.getTime())) {
    throw badRequest("Fecha de prorroga invalida.");
  }
  return withTransaction(async (client) => {
    const result = await client.query(
      "select * from reward_passes where id = $1 and company_id = $2 for update",
      [id, businessId]
    );
    const pass = result.rows[0];
    if (!pass) throw notFound("Reward Pass no encontrado.");
    if (pass.status === "cancelled" || moneyNumber(pass.current_balance_cop) <= 0) {
      throw badRequest("No puedes prorrogar un Reward Pass anulado o sin saldo.");
    }
    if (nextExpiresAt <= new Date(pass.expires_at)) {
      throw badRequest("La nueva vigencia debe ser posterior a la vigente.");
    }
    const updated = await client.query(
      `update reward_passes
       set status = 'extended',
           expires_at = $3,
           internal_notes = concat_ws(E'\n', internal_notes, $4),
           updated_at = now()
       where id = $1 and company_id = $2
       returning *`,
      [id, businessId, nextExpiresAt.toISOString(), notes || "Vigencia prorrogada por el emisor."]
    );
    await logQrEvent(client, {
      business_id: businessId,
      campaign_id: pass.campaign_id || null,
      user_id: user.id,
      event_type: "REWARD_PASS_EXTENDED",
      message: `Reward Pass ${pass.public_code} prorrogado.`,
      metadata: { reward_pass_id: pass.id, public_code: pass.public_code, expires_at: nextExpiresAt.toISOString() },
    });
    return mapRewardPass(updated.rows[0], { includeToken: true, includePrivate: true });
  });
}

function wrapText(text, maxChars) {
  const words = cleanText(text).split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}

function truncateTextToWidth(text, font, size, maxWidth) {
  const clean = cleanText(text);
  if (!clean) return "";
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  const suffix = "...";
  let output = clean;
  while (output.length > 0 && font.widthOfTextAtSize(`${output}${suffix}`, size) > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output.trimEnd()}${suffix}`;
}

function wrapTextByWidth(text, font, size, maxWidth, maxLines = Infinity) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = `${current} ${word}`.trim();
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      return;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    current = font.widthOfTextAtSize(word, size) <= maxWidth
      ? word
      : truncateTextToWidth(word, font, size, maxWidth);
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = truncateTextToWidth(visible[maxLines - 1], font, size, maxWidth);
  return visible;
}

function drawWrappedText(page, text, options) {
  const {
    x,
    y,
    maxWidth,
    size,
    font,
    color,
    lineHeight = Math.round(size * 1.25),
    maxLines = Infinity,
    align = "left",
  } = options;
  const lines = wrapTextByWidth(text, font, size, maxWidth, maxLines);
  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, size);
    const offset = align === "center" ? Math.max(0, (maxWidth - lineWidth) / 2) : 0;
    page.drawText(line, { x: x + offset, y: y - (index * lineHeight), size, font, color });
  });
  return y - (lines.length * lineHeight);
}

function drawCardField(page, label, value, options) {
  const { x, y, maxWidth, font, bold, color, mutedColor } = options;
  page.drawText(label, { x, y, size: 9, font: bold, color: mutedColor });
  return drawWrappedText(page, value || "-", {
    x,
    y: y - 15,
    maxWidth,
    size: 12,
    font,
    color,
    lineHeight: 15,
    maxLines: 2,
  }) - 8;
}

async function buildRewardPassPdf(pass, kind = "card") {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([900, 520]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const isPendingClaim = pass.status === "pending_claim" || !cleanText(pass.beneficiary_name) || !cleanText(pass.beneficiary_document);
  const qrDataUrl = isPendingClaim ? await getQrDataUrlForUrl(pass.public_url || buildPublicUrl(pass.public_code)) : await getRewardPassQrDataUrl(pass);
  const qrPng = await pdf.embedPng(Buffer.from(qrDataUrl.split(",")[1], "base64"));
  const white = rgb(1, 1, 1);
  const gold = rgb(0.95, 0.72, 0.27);
  const muted = rgb(0.7, 0.78, 0.86);
  const soft = rgb(0.86, 0.9, 0.94);
  const dark = rgb(0.03, 0.08, 0.12);
  const panel = rgb(0.05, 0.12, 0.17);
  const leftX = 58;
  const leftW = 520;
  const rightX = 626;
  const rightW = 216;

  page.drawRectangle({ x: 0, y: 0, width: 900, height: 520, color: dark });
  page.drawRectangle({ x: 28, y: 28, width: 844, height: 464, borderColor: gold, borderWidth: 2 });
  page.drawRectangle({ x: rightX - 18, y: 78, width: rightW + 36, height: 360, color: panel, borderColor: rgb(0.16, 0.24, 0.31), borderWidth: 1 });

  const title = kind === "receipt" ? "COMPROBANTE DE ADQUISICION" : "REWARD PASS";
  page.drawText(title, {
    x: leftX,
    y: 438,
    size: kind === "receipt" ? 25 : 42,
    font: bold,
    color: white,
  });
  page.drawText("Gift Card Digital", { x: leftX, y: 410, size: 16, font, color: gold });

  drawWrappedText(page, pass.company_name || pass.company?.name || "Empresa emisora", {
    x: leftX,
    y: 374,
    maxWidth: leftW,
    size: 20,
    font: bold,
    color: white,
    lineHeight: 24,
    maxLines: 2,
  });

  page.drawRectangle({ x: leftX, y: 274, width: leftW, height: 58, color: rgb(0.09, 0.14, 0.17), borderColor: rgb(0.35, 0.29, 0.16), borderWidth: 1 });
  page.drawText(isPendingClaim ? "ESTAS A UN PASO" : "GIFT CARD OFICIAL", { x: leftX + 18, y: 310, size: 20, font: bold, color: gold });
  drawWrappedText(page, isPendingClaim ? "Completa tus datos para descubrir el valor y obtener el QR final." : `Saldo disponible: $${moneyNumber(pass.current_balance_cop || pass.initial_value_cop).toLocaleString("es-CO")} COP`, {
    x: leftX + 18,
    y: 292,
    maxWidth: leftW - 36,
    size: 12,
    font,
    color: soft,
    lineHeight: 15,
    maxLines: 2,
  });

  let detailsY = 244;
  detailsY = drawCardField(page, "BENEFICIARIO", isPendingClaim ? "Pendiente de activacion" : pass.beneficiary_name, { x: leftX, y: detailsY, maxWidth: 250, font, bold, color: white, mutedColor: gold });
  detailsY = drawCardField(page, "DOCUMENTO", isPendingClaim ? "Se solicita al activar" : pass.beneficiary_document, { x: leftX, y: detailsY, maxWidth: 250, font, bold, color: soft, mutedColor: gold });
  const rightDetailsX = leftX + 292;
  drawCardField(page, "CODIGO", pass.public_code, { x: rightDetailsX, y: 244, maxWidth: 220, font: bold, bold, color: white, mutedColor: gold });
  drawCardField(page, "VIGENCIA", new Date(pass.expires_at).toLocaleDateString("es-CO"), { x: rightDetailsX, y: 190, maxWidth: 220, font, bold, color: soft, mutedColor: gold });
  drawCardField(page, "SEDE AUTORIZADA", rewardPassBranchLabel(pass), { x: rightDetailsX, y: 136, maxWidth: 220, font, bold, color: soft, mutedColor: gold });

  page.drawRectangle({ x: rightX + 8, y: 196, width: 200, height: 200, color: white });
  page.drawImage(qrPng, { x: rightX + 18, y: 206, width: 180, height: 180 });
  drawWrappedText(page, isPendingClaim ? "Escanea, activa y recibe tu QR final redimible." : "Presenta este QR junto con tu documento de identidad.", {
    x: rightX,
    y: 168,
    maxWidth: rightW,
    size: 11,
    font: bold,
    color: white,
    lineHeight: 14,
    maxLines: 3,
    align: "center",
  });

  drawWrappedText(page, "Redimible unicamente en el negocio emisor. No canjeable por efectivo salvo autorizacion del emisor.", {
    x: leftX,
    y: 104,
    maxWidth: 520,
    size: 10,
    font,
    color: soft,
    lineHeight: 13,
    maxLines: 2,
  });
  const partialText = pass.partial_redemption_allowed
    ? "Permite redenciones parciales hasta agotar saldo o hasta la fecha de vencimiento."
    : "De un solo uso segun condiciones del emisor.";
  drawWrappedText(page, partialText, { x: leftX, y: 78, maxWidth: 520, size: 10, font, color: soft, lineHeight: 13, maxLines: 2 });
  drawWrappedText(page, `Emitido por ${pass.company_name || pass.company?.name || "Empresa"}. Administrado tecnologicamente por Qori GOS Portal.`, {
    x: leftX,
    y: 52,
    maxWidth: 760,
    size: 9,
    font,
    color: muted,
    lineHeight: 12,
    maxLines: 2,
  });
  if (kind === "receipt") {
    const receiptPage = pdf.addPage([612, 792]);
    receiptPage.drawText("Comprobante de adquisicion de Gift Card Digital / Reward Pass", { x: 48, y: 730, size: 18, font: bold });
    const lines = [
      `Empresa emisora: ${pass.company_name || pass.company?.name || ""}`,
      `Comprador: ${pass.buyer_name || ""}`,
      `Beneficiario: ${pass.beneficiary_name || ""}`,
      `Valor: $${moneyNumber(pass.initial_value_cop).toLocaleString("es-CO")} COP`,
      `Codigo: ${pass.public_code}`,
      `Fecha emision: ${new Date(pass.issued_at).toLocaleDateString("es-CO")}`,
      `Fecha vencimiento: ${new Date(pass.expires_at).toLocaleDateString("es-CO")}`,
      `Sede autorizada: ${rewardPassBranchLabel(pass)}`,
      `Medio de pago recibido por el comercio: ${pass.payment_method_received || "Registrado por el emisor"}`,
    ];
    let y = 690;
    lines.forEach((line) => {
      receiptPage.drawText(line, { x: 48, y, size: 12, font });
      y -= 24;
    });
    wrapText("Este documento soporta la adquisicion de una gift card digital emitida por la empresa emisora. No constituye factura electronica de venta de bienes o servicios. La factura electronica sera expedida por el comercio emisor al momento de la redencion, cuando se concrete la entrega de los productos o servicios seleccionados.", 86).forEach((line) => {
      receiptPage.drawText(line, { x: 48, y, size: 10, font });
      y -= 16;
    });
  }
  return Buffer.from(await pdf.save());
}

module.exports = {
  DEFAULT_TERMS,
  DEFAULT_TICKET_COST,
  buildRewardPassPdf,
  buildPublicUrl,
  buildValidatorUrl,
  cancelRewardPass,
  claimRewardPass,
  createRewardPass,
  defaultExpiresAt,
  extendRewardPass,
  getPublicRewardPass,
  getPublicRewardPassPdf,
  getRewardPassById,
  getTicketContext,
  listRewardPasses,
  redeemRewardPass,
  rewardPassMetrics,
  validateRewardPassToken,
};

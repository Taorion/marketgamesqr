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

const DEFAULT_TICKET_COST = 1;
const DEFAULT_TERMS = `Esta Gift Card Digital / Reward Pass es emitida directamente por [Nombre de la Empresa] y administrada tecnologicamente por MarketGames QR Portal. Es redimible unicamente en el negocio emisor o en las sedes autorizadas por este. No constituye dinero electronico, producto financiero, deposito, credito ni medio de pago universal. No genera intereses. Su uso esta sujeto a validacion por QR y documento de identidad. La factura electronica de venta sera expedida por el comercio emisor al momento de la redencion, cuando se entreguen los productos o servicios correspondientes.

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
- MarketGames solo presta la tecnologia de administracion, QR, validacion y trazabilidad.`;

function userBusinessId(user) {
  if (!user?.business_id) {
    throw forbidden("Este usuario no esta asignado a una empresa.");
  }
  return user.business_id;
}

function canManageRewardPass(user) {
  return ["BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"].includes(user?.role);
}

function canValidateRewardPass(user) {
  return ["BUSINESS_OWNER", "VALIDATOR", "ADMIN", "ADMIN_MARKET_GAMES"].includes(user?.role);
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
    pending_claim: "Este Reward Pass debe ser activado por el beneficiario antes de redimirse.",
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
    const code = `MG-RP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
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
    buyer_name: row.buyer_name,
    buyer_document: row.buyer_document,
    buyer_email: row.buyer_email,
    buyer_phone: row.buyer_phone,
    beneficiary_name: row.beneficiary_name,
    beneficiary_document: options.publicView ? maskDocument(row.beneficiary_document) : row.beneficiary_document,
    beneficiary_email: options.publicView ? null : row.beneficiary_email,
    beneficiary_phone: options.publicView ? null : row.beneficiary_phone,
    initial_value_cop: options.publicView ? undefined : moneyNumber(row.initial_value_cop),
    current_balance_cop: options.publicView ? undefined : moneyNumber(row.current_balance_cop),
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
    params.push(filters.status);
    clauses.push(`rp.status = $${params.length}`);
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
    clauses.push("rp.status = 'partially_redeemed'");
  }

  const result = await query(
    `select rp.*, b.name as company_name, b.slug as company_slug, b.settings as company_settings,
            c.name as campaign_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
     where ${clauses.join(" and ")}
     order by rp.created_at desc
     limit 200`,
    params
  );
  return result.rows.map((row) => mapRewardPass(row, { includeToken: true }));
}

async function rewardPassMetrics(user) {
  const businessId = userBusinessId(user);
  const result = await query(
    `select
       count(*)::int as issued_count,
       coalesce(sum(initial_value_cop), 0)::numeric as total_issued_cop,
       coalesce(sum(initial_value_cop - current_balance_cop), 0)::numeric as total_redeemed_cop,
       coalesce(sum(current_balance_cop) filter (where status not in ('cancelled', 'fully_redeemed')), 0)::numeric as pending_balance_cop,
       coalesce(sum(current_balance_cop) filter (where expires_at < now() and current_balance_cop > 0 and status <> 'cancelled'), 0)::numeric as expired_balance_cop,
       count(*) filter (where status in ('active', 'extended'))::int as active_count,
       count(*) filter (where status = 'partially_redeemed')::int as partially_redeemed_count,
       count(*) filter (where status = 'expired' or (expires_at < now() and current_balance_cop > 0 and status <> 'cancelled'))::int as expired_count,
       count(*) filter (where status = 'fully_redeemed')::int as fully_redeemed_count
     from reward_passes
     where company_id = $1`,
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
    partially_redeemed_count: Number(row.partially_redeemed_count || 0),
    expired_count: Number(row.expired_count || 0),
    fully_redeemed_count: Number(row.fully_redeemed_count || 0),
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

    const qrToken = await uniqueQrToken(client);
    const publicCode = await uniquePublicCode(client);
    const terms = cleanText(payload.terms, DEFAULT_TERMS.replace("[Nombre de la Empresa]", business.name));
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
         authorized_branch, terms, internal_notes, payment_method_received
       )
       values (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11,
         $12, $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21,
         $22, $23, $24, $25
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
        payload.authorized_branch || null,
        terms,
        payload.internal_notes || null,
        payload.payment_method_received || null,
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
        `Reward Pass ${publicCode} emitido. Derecho tecnologico MarketGames descontado.`,
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
    return pass;
  });

  return getRewardPassById(user, created.id);
}

async function getRewardPassById(user, id) {
  const businessId = userBusinessId(user);
  const result = await query(
    `select rp.*, b.name as company_name, b.slug as company_slug, b.settings as company_settings,
            c.name as campaign_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
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
            c.name as campaign_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
     where lower(rp.public_code) = lower($1)`,
    [publicCode]
  );
  let pass = result.rows[0];
  if (!pass) throw notFound("Reward Pass no encontrado.");
  pass = await syncEffectiveStatus(query, pass);
  const status = effectiveStatus(pass);
  const mapped = mapRewardPass(pass, { publicView: true, includeToken: status !== "pending_claim" });
  delete mapped.qr_token;
  mapped.claim_required = status === "pending_claim";
  mapped.qr_image_data_url = status === "pending_claim"
    ? await getQrDataUrlForUrl(mapped.public_url)
    : await getRewardPassQrDataUrl(pass);
  mapped.instructions = status === "pending_claim"
    ? "Escanea este QR, completa tus datos y activa tu Gift Card Digital oficial."
    : "Presenta este QR junto con tu documento de identidad en el negocio emisor.";
  mapped.can_redeem_publicly = false;
  return mapped;
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
            c.name as campaign_name
     from reward_passes rp
     join businesses b on b.id = rp.company_id
     left join campaigns c on c.id = rp.campaign_id
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
    const balanceBefore = moneyNumber(pass.current_balance_cop);
    if (balanceBefore <= 0) {
      throw badRequest("Este Reward Pass ya fue redimido totalmente.");
    }
    if (redeemValue > balanceBefore) {
      throw badRequest("No puedes redimir mas que el saldo disponible.");
    }
    if (purchaseValue > 0 && purchaseValue > balanceBefore && redeemValue !== balanceBefore) {
      throw badRequest("Si la compra supera el saldo, redime el saldo total disponible.");
    }
    if (!pass.partial_redemption_allowed && redeemValue < balanceBefore) {
      if (!payload.confirm_full_consumption) {
        throw badRequest("Este Reward Pass es de un solo uso. Confirma que se consumira todo el saldo.");
      }
      redeemValue = balanceBefore;
    }
    const balanceAfter = moneyNumber(balanceBefore - redeemValue);
    const nextStatus = balanceAfter <= 0 ? "fully_redeemed" : "partially_redeemed";
    const documentChecked = cleanText(payload.document_checked || "");
    const documentMatch = documentChecked
      ? documentChecked.replace(/\s+/g, "") === cleanText(pass.beneficiary_document).replace(/\s+/g, "")
      : null;
    const redemptionType = balanceAfter <= 0 ? "full" : "partial";

    const redemption = await client.query(
      `insert into reward_pass_redemptions (
         reward_pass_id, company_id, branch, cashier_user_id, invoice_number, invoice_file_path,
         redeemed_value_cop, balance_before_cop, balance_after_cop, redemption_type,
         purchase_value_cop, document_checked, document_match, observations
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning *`,
      [
        pass.id,
        pass.company_id,
        payload.branch || user.branch_id || null,
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
    return {
      message: `Redencion registrada correctamente. Nuevo saldo disponible: $${balanceAfter.toLocaleString("es-CO")} COP.`,
      redemption: redemption.rows[0],
      reward_pass: mapRewardPass(updated.rows[0], { includeToken: true, includePrivate: true }),
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

async function buildRewardPassPdf(pass, kind = "card") {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([900, 520]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const isPendingClaim = pass.status === "pending_claim" || !cleanText(pass.beneficiary_name) || !cleanText(pass.beneficiary_document);
  const qrDataUrl = isPendingClaim ? await getQrDataUrlForUrl(pass.public_url || buildPublicUrl(pass.public_code)) : await getRewardPassQrDataUrl(pass);
  const qrPng = await pdf.embedPng(Buffer.from(qrDataUrl.split(",")[1], "base64"));
  page.drawRectangle({ x: 0, y: 0, width: 900, height: 520, color: rgb(0.03, 0.08, 0.12) });
  page.drawRectangle({ x: 28, y: 28, width: 844, height: 464, borderColor: rgb(0.95, 0.72, 0.27), borderWidth: 3 });
  page.drawText(kind === "receipt" ? "COMPROBANTE DE ADQUISICION" : "REWARD PASS", {
    x: 58,
    y: 438,
    size: kind === "receipt" ? 27 : 46,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Gift Card Digital", { x: 60, y: 410, size: 18, font, color: rgb(0.95, 0.72, 0.27) });
  page.drawText(pass.company_name || pass.company?.name || "Empresa emisora", { x: 60, y: 372, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText(isPendingClaim ? "Activacion requerida" : "Gift Card oficial", { x: 60, y: 332, size: 30, font: bold, color: rgb(0.95, 0.72, 0.27) });
  page.drawText(`Beneficiario: ${pass.beneficiary_name || "Pendiente de activacion"}`, { x: 60, y: 292, size: 17, font, color: rgb(1, 1, 1) });
  page.drawText(`Documento: ${pass.beneficiary_document || "Se solicita al activar"}`, { x: 60, y: 266, size: 14, font, color: rgb(0.86, 0.9, 0.94) });
  page.drawText(`Codigo: ${pass.public_code}`, { x: 60, y: 240, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Vigencia: ${new Date(pass.expires_at).toLocaleDateString("es-CO")}`, { x: 60, y: 214, size: 14, font, color: rgb(0.86, 0.9, 0.94) });
  page.drawImage(qrPng, { x: 642, y: 178, width: 188, height: 188 });
  page.drawText(isPendingClaim ? "Escanea para activar la gift card oficial." : "Presenta este QR junto con tu documento de identidad.", { x: 594, y: 148, size: 12, font, color: rgb(1, 1, 1) });
  page.drawText("Redimible unicamente en el negocio emisor. No canjeable por efectivo salvo autorizacion del emisor.", {
    x: 60,
    y: 116,
    size: 11,
    font,
    color: rgb(0.86, 0.9, 0.94),
  });
  const partialText = pass.partial_redemption_allowed
    ? "Permite redenciones parciales hasta agotar saldo o hasta la fecha de vencimiento."
    : "De un solo uso segun condiciones del emisor.";
  page.drawText(partialText, { x: 60, y: 94, size: 11, font, color: rgb(0.86, 0.9, 0.94) });
  page.drawText(`Emitido por ${pass.company_name || pass.company?.name || "Empresa"}. Administrado tecnologicamente por MarketGames QR Portal.`, {
    x: 60,
    y: 58,
    size: 10,
    font,
    color: rgb(0.7, 0.78, 0.86),
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
  getRewardPassById,
  getTicketContext,
  listRewardPasses,
  redeemRewardPass,
  rewardPassMetrics,
  validateRewardPassToken,
};

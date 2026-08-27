const crypto = require("crypto");
const { randomUUID } = require("crypto");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { canAccessBusiness } = require("../middleware/auth");
const { findPackageOffer } = require("./packageCatalog");
const {
  addQrCredits,
  ensureCreditAccount,
  grantFirstSubscriptionCourtesyTickets,
  mapPublicCreditAccount,
  trafficLabel,
} = require("./qrCreditService");
const {
  BASE_PORTAL_MIN_TICKETS,
  PLAN_CODES,
  getBusinessSubscription,
  listPlans,
} = require("./subscriptionService");
const { storageAddonOffer, approveStorageAddonOrder } = require("./storageQuotaService");

const MP_API_BASE = "https://api.mercadopago.com";

function requireMercadoPagoConfig() {
  if (!env.mercadoPagoAccessToken) {
    throw badRequest("Mercado Pago no esta configurado. Define MERCADO_PAGO_ACCESS_TOKEN.");
  }
  if (!env.mercadoPagoWebhookSecret) {
    throw badRequest("Mercado Pago no esta configurado. Define MERCADO_PAGO_WEBHOOK_SECRET.");
  }
}

function appUrl(path = "") {
  return `${env.publicAppUrl.replace(/\/$/, "")}${path}`;
}

function shouldEnableAutoReturn() {
  const baseUrl = env.publicAppUrl || "";
  return !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl);
}

function webhookUrl() {
  return env.mercadoPagoWebhookUrl || appUrl("/api/payments/mercadopago/webhook");
}

function digitalOnlyPaymentMethods() {
  return {
    excluded_payment_methods: [
      { id: "efecty" },
    ],
    excluded_payment_types: [
      { id: "ticket" },
      { id: "atm" },
    ],
    installments: 12,
  };
}

function nextSubscriptionChargeDate(currentPeriodEndsAt) {
  const now = new Date();
  const currentEnd = currentPeriodEndsAt ? new Date(currentPeriodEndsAt) : null;
  if (currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd > now) {
    return currentEnd;
  }
  return now;
}

function nextAutoRenewalChargeDate(currentPeriodEndsAt) {
  const now = new Date();
  const currentEnd = currentPeriodEndsAt ? new Date(currentPeriodEndsAt) : null;
  if (!currentEnd || Number.isNaN(currentEnd.getTime())) {
    throw badRequest("No hay una fecha oficial de renovacion activa. Configura o renueva primero la mensualidad antes de inscribir la tarjeta.");
  }
  if (currentEnd <= now) {
    throw badRequest("La mensualidad ya esta vencida. Renueva el periodo actual antes de activar el cobro automatico.");
  }
  return currentEnd;
}

function normalizeBillingCycle(value) {
  return value === "annual" ? "annual" : "monthly";
}

function planBillingFrequency(plan) {
  return {
    frequency: Number(plan.billing_frequency || 1),
    frequency_type: plan.billing_frequency_type || "months",
  };
}

function billingPeriodLabel(plan, fallback = "mensualidad") {
  return plan.billing_label || (plan.billing_period === "3_days" ? "cada 3 dias" : fallback);
}

function planChargeCop(plan, billingCycle) {
  if (billingCycle === "annual") {
    return Number(plan.annual_price_cop || (Number(plan.monthly_price_cop || 0) * 12 * 0.7));
  }
  return Number(plan.monthly_price_cop || 0);
}

function addPlanBillingPeriod(date, plan, billingCycle = "monthly") {
  const next = new Date(date.getTime());
  const { frequency, frequency_type: frequencyType } = planBillingFrequency(plan || {});
  if (billingCycle === "annual") {
    next.setUTCMonth(next.getUTCMonth() + 12);
    return next;
  }
  if (frequencyType === "days") {
    next.setUTCDate(next.getUTCDate() + frequency);
    return next;
  }
  next.setUTCMonth(next.getUTCMonth() + frequency);
  return next;
}

function firstAutoRenewalChargeDate(plan, currentPeriodEndsAt) {
  if (plan.testing_plan && plan.billing_frequency_type === "days") {
    return addPlanBillingPeriod(new Date(), plan);
  }
  return nextAutoRenewalChargeDate(currentPeriodEndsAt);
}

function parseDealDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthlyChargeForBusiness(plan, business = {}, effectiveDate = new Date()) {
  const standardPriceCop = Number(plan.monthly_price_cop || 0);
  const deal = business.settings?.commercial_deal;
  const terms = deal?.terms || {};
  const dealPlanCode = terms.active_plan_code || terms.normal_price_plan_code;
  const discountedPriceCop = Number(terms.discounted_monthly_price_cop || deal?.discounted_monthly_price_cop || 0);
  const discountedStartsAt = parseDealDate(deal?.discounted_period_started_at || terms.discounted_period_started_at);
  const discountedEndsAt = parseDealDate(deal?.discounted_period_ends_at || terms.discounted_period_ends_at);
  const chargeDate = effectiveDate instanceof Date && !Number.isNaN(effectiveDate.getTime())
    ? effectiveDate
    : new Date();

  if (
    deal?.status
    && dealPlanCode === plan.code
    && discountedPriceCop > 0
    && (!discountedStartsAt || chargeDate >= discountedStartsAt)
    && (!discountedEndsAt || chargeDate < discountedEndsAt)
  ) {
    return {
      price_cop: discountedPriceCop,
      standard_price_cop: standardPriceCop,
      special_pricing_applied: true,
      special_pricing_label: deal.first_year_price_label || deal.summary || "Precio especial activo",
      special_pricing_ends_at: discountedEndsAt ? discountedEndsAt.toISOString() : null,
    };
  }

  return {
    price_cop: standardPriceCop,
    standard_price_cop: standardPriceCop,
    special_pricing_applied: false,
    special_pricing_label: null,
    special_pricing_ends_at: null,
  };
}

function isBaseAccessPackage(packageSize) {
  return Number(packageSize || 0) >= BASE_PORTAL_MIN_TICKETS;
}

async function assertActiveSubscriptionForTicketPurchase(user) {
  const subscription = await getBusinessSubscription(user.business_id);
  const plan = subscription.plan || {};
  if (plan.category !== "subscription" || plan.raw_status !== "ACTIVE" || !plan.portal_access_allowed) {
    throw badRequest("Para comprar tickets internos primero debes activar un plan de suscripcion.");
  }
  return subscription;
}

const CHECKOUT_CREATION_STALE_MS = 2 * 60 * 1000;

function checkoutKey(body = {}) {
  return body.idempotency_key || randomUUID();
}

async function createPortalCheckoutIntent(user, details, body = {}) {
  const key = checkoutKey(body);
  const inserted = await query(
    `insert into qr_credit_purchase_orders
      (business_id, created_by_user_id, package_code, package_size, package_title, price_cop,
       external_reference, metadata, checkout_key, checkout_expires_at)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7, $8, now() + interval '24 hours')
     on conflict (business_id, checkout_key) where checkout_key is not null do nothing
     returning *`,
    [
      user.business_id,
      user.id,
      details.package_code,
      details.package_size,
      details.package_title,
      details.price_cop,
      details.metadata,
      key,
    ]
  );
  if (inserted.rows[0]) return { order: inserted.rows[0], reused: false };

  const existingResult = await query(
    `select * from qr_credit_purchase_orders where business_id = $1 and checkout_key = $2 limit 1`,
    [user.business_id, key]
  );
  const existing = existingResult.rows[0];
  if (!existing) throw badRequest("No se pudo recuperar el intento de pago. Intenta nuevamente.");
  if (existing.checkout_url || existing.sandbox_checkout_url) return { order: existing, reused: true };

  const ageMs = Date.now() - new Date(existing.updated_at || existing.created_at).getTime();
  if (existing.status === "PENDING" && ageMs < CHECKOUT_CREATION_STALE_MS) {
    throw badRequest("Tu pago ya se esta preparando. Espera unos segundos y vuelve a intentarlo.");
  }

  const reclaimed = await query(
    `update qr_credit_purchase_orders
     set status = 'PENDING', checkout_error = null, updated_at = now()
     where id = $1 and (status = 'ERROR' or updated_at < now() - interval '2 minutes')
     returning *`,
    [existing.id]
  );
  if (!reclaimed.rows[0]) {
    throw badRequest("Tu pago ya se esta preparando. Espera unos segundos y vuelve a intentarlo.");
  }
  return { order: reclaimed.rows[0], reused: false };
}

async function saveCheckoutReady(orderId, providerPayload) {
  const updated = await query(
    `update qr_credit_purchase_orders
     set mercado_pago_preference_id = $2,
         checkout_url = $3,
         sandbox_checkout_url = $4,
         payment_payload = $5,
         checkout_error = null,
         checkout_expires_at = coalesce($6::timestamptz, checkout_expires_at),
         updated_at = now()
     where id = $1
     returning *`,
    [
      orderId,
      providerPayload.id || null,
      providerPayload.init_point || null,
      providerPayload.sandbox_init_point || null,
      providerPayload,
      providerPayload.expiration_date_to || null,
    ]
  );
  return updated.rows[0];
}

async function saveCheckoutError(orderId, error) {
  const safeMessage = String(error?.message || "Mercado Pago no pudo crear el checkout").slice(0, 500);
  await query(
    `update qr_credit_purchase_orders
     set status = 'ERROR', checkout_error = $2, updated_at = now()
     where id = $1 and credited_at is null`,
    [orderId, safeMessage]
  );
}

async function activateTicketBaseAccess(client, businessId, userId = null, extraSettings = {}) {
  await client.query(
    `update businesses
     set is_active = true,
         plan_code = case when plan_code in ('STARTER', 'GROWTH', 'PRO', 'GLOBAL') then plan_code else $2 end,
         plan_type = case when plan_type = 'premium_monthly' or plan_code in ('STARTER', 'GROWTH', 'PRO', 'GLOBAL') then 'premium_monthly' else 'ticket_base' end,
         portal_status = 'ACTIVE',
         portal_activated_at = coalesce(portal_activated_at, now()),
         subscription_status = 'ACTIVE',
         subscription_started_at = coalesce(subscription_started_at, now()),
         settings = jsonb_set(
           jsonb_set(
             jsonb_set(coalesce(settings, '{}'::jsonb), '{access,plan_type}', to_jsonb(case when plan_type = 'premium_monthly' or plan_code in ('STARTER', 'GROWTH', 'PRO', 'GLOBAL') then 'premium_monthly' else 'ticket_base' end), true),
             '{access,portal_status}', to_jsonb('ACTIVE'::text), true
           ),
           '{access,source}', to_jsonb($3::text), true
         ) || $4::jsonb,
         updated_at = now()
     where id = $1`,
    [
      businessId,
      PLAN_CODES.TICKET_BASE,
      extraSettings.source || "ticket_purchase",
      JSON.stringify(extraSettings.settings || {}),
    ]
  );
  if (userId) {
    await client.query(
      `update app_users
       set is_active = true,
           updated_at = now()
       where id = $1 and business_id = $2`,
      [userId, businessId]
    );
  }
}

async function activateGrowthTemporalAccess(client, businessId, userId = null, source = "gamified_campaign_service") {
  await activateTicketBaseAccess(client, businessId, userId, { source });
  await client.query(
    `update businesses
     set plan_code = case when plan_code in ('STARTER', 'GROWTH', 'PRO', 'GLOBAL') then plan_code else $2 end,
         plan_type = case when plan_type = 'premium_monthly' or plan_code in ('STARTER', 'GROWTH', 'PRO', 'GLOBAL') then 'premium_monthly' else 'growth_temporal' end,
         portal_status = 'ACTIVE',
         growth_started_at = coalesce(growth_started_at, now()),
         growth_expires_at = now() + interval '3 months',
         growth_source = $3,
         settings = jsonb_set(
           jsonb_set(
             jsonb_set(
               jsonb_set(coalesce(settings, '{}'::jsonb), '{access,plan_type}', to_jsonb(case when plan_type = 'premium_monthly' or plan_code in ('STARTER', 'GROWTH', 'PRO', 'GLOBAL') then 'premium_monthly' else 'growth_temporal' end), true),
               '{access,growth_source}', to_jsonb($3::text), true
             ),
             '{access,growth_started_at}', to_jsonb(now()::text), true
           ),
           '{access,growth_expires_at}', to_jsonb((now() + interval '3 months')::text), true
         ),
         updated_at = now()
     where id = $1`,
    [businessId, PLAN_CODES.TICKET_BASE, source]
  );
}

async function mpRequest(path, options = {}) {
  requireMercadoPagoConfig();
  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw badRequest(data.message || data.error || "Mercado Pago rechazo la operacion.", data);
  }
  return data;
}

function verifyWebhookSignature(req) {
  if (!env.mercadoPagoWebhookSecret) {
    throw forbidden("Webhook Mercado Pago no configurado.");
  }

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  if (!signature || !requestId) {
    throw forbidden("Webhook Mercado Pago sin firma.");
  }

  const parts = String(signature).split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key?.trim()] = value?.trim();
    return acc;
  }, {});
  const ts = parts.ts;
  const hash = parts.v1;
  const dataId = req.query["data.id"] || req.body?.data?.id || req.body?.id || "";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", env.mercadoPagoWebhookSecret)
    .update(manifest)
    .digest("hex");

  const received = Buffer.from(hash || "", "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (!hash || received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) {
    throw forbidden("Firma Mercado Pago invalida.");
  }
}

async function createCreditCheckout(user, body) {
  if (!user.business_id) {
    throw badRequest("Este usuario no tiene negocio asignado.");
  }
  if (!canAccessBusiness(user, user.business_id)) {
    throw forbidden("No puedes comprar tickets QR para este negocio.");
  }

  const offer = findPackageOffer(body.package_code);
  if (!offer) {
    throw badRequest("Paquete QR no disponible.");
  }
  await assertActiveSubscriptionForTicketPurchase(user);
  if (!offer.subscriber_allowed) {
    throw badRequest("Paquete QR no disponible para suscriptores.");
  }

  const intent = await createPortalCheckoutIntent(user, {
    package_code: offer.code,
    package_size: offer.package_size,
    package_title: offer.title,
    price_cop: offer.price_cop,
    metadata: {
        source: "business_portal",
        requested_by_email: user.email,
      },
  }, body);
  const purchaseOrder = intent.order;
  if (intent.reused) return mapPurchaseOrder(purchaseOrder);

  let preference;
  try {
    preference = await mpRequest("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
      items: [
        {
          id: offer.code,
          title: `${offer.title} - ${trafficLabel(offer.package_size)}`,
          quantity: 1,
          unit_price: Number(offer.price_cop),
          currency_id: "COP",
        },
      ],
      payer: {
        email: user.email,
        name: user.full_name || undefined,
      },
      external_reference: purchaseOrder.external_reference,
      notification_url: webhookUrl(),
      back_urls: {
        success: appUrl("/empresa/?payment=success"),
        failure: appUrl("/empresa/?payment=failure"),
        pending: appUrl("/empresa/?payment=pending"),
      },
      metadata: {
        order_id: purchaseOrder.id,
        business_id: user.business_id,
        package_code: offer.code,
      },
      payment_methods: digitalOnlyPaymentMethods(),
      ...(shouldEnableAutoReturn() ? { auto_return: "approved" } : {}),
      }),
    });
  } catch (error) {
    await saveCheckoutError(purchaseOrder.id, error);
    throw error;
  }

  return mapPurchaseOrder(await saveCheckoutReady(purchaseOrder.id, preference));
}

async function createStorageAddonCheckout(user, body) {
  if (!user.business_id || !canAccessBusiness(user, user.business_id)) {
    throw forbidden("No puedes comprar almacenamiento para este negocio.");
  }
  await assertActiveSubscriptionForTicketPurchase(user);
  const offer = storageAddonOffer(body.addon_code);
  if (!offer) throw badRequest("Ampliacion de almacenamiento no disponible.");
  const orderResult = await query(
    `insert into business_storage_addon_orders
      (business_id, created_by_user_id, addon_code, addon_name, storage_bytes, price_cop, external_reference)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text)
     returning *`,
    [user.business_id, user.id, offer.code, offer.name, offer.storage_bytes, offer.price_cop]
  );
  const order = orderResult.rows[0];
  const preference = await mpRequest("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ id: offer.code, title: `Qori - ${offer.name} de almacenamiento`, quantity: 1, unit_price: Number(offer.price_cop), currency_id: "COP" }],
      payer: { email: user.email, name: user.full_name || undefined },
      external_reference: order.external_reference,
      notification_url: webhookUrl(),
      back_urls: { success: appUrl("/empresa/?payment=success&storage=success"), failure: appUrl("/empresa/?payment=failure&storage=failure"), pending: appUrl("/empresa/?payment=pending&storage=pending") },
      metadata: { storage_addon_order_id: order.id, business_id: user.business_id, addon_code: offer.code },
      payment_methods: digitalOnlyPaymentMethods(),
      ...(shouldEnableAutoReturn() ? { auto_return: "approved" } : {}),
    }),
  });
  const updated = await query(
    `update business_storage_addon_orders set mercado_pago_preference_id = $2, checkout_url = $3,
       sandbox_checkout_url = $4, payment_payload = $5::jsonb, updated_at = now() where id = $1 returning *`,
    [order.id, preference.id || null, preference.init_point || null, preference.sandbox_init_point || null, JSON.stringify(preference)]
  );
  return updated.rows[0];
}

async function createSubscriptionRenewalCheckout(user, body) {
  if (!user.business_id) {
    throw badRequest("Este usuario no tiene negocio asignado.");
  }
  if (!canAccessBusiness(user, user.business_id)) {
    throw forbidden("No puedes renovar la suscripcion de este negocio.");
  }

  const plan = listPlans().find((item) => (
    item.code === body.plan_code
    && item.category === "subscription"
    && item.public_signup_available !== false
    && !item.testing_plan
  ));
  if (!plan || !plan.monthly_price_cop) {
    throw badRequest("Plan mensual no disponible para renovacion automatica.");
  }

  const currentBusiness = await query(
    `select plan_code, settings, subscription_current_period_ends_at
     from businesses
     where id = $1`,
    [user.business_id]
  );
  const currentPlan = listPlans().find((item) => item.code === currentBusiness.rows[0]?.plan_code);
  if (!currentPlan || !["subscription", "ticket_base", "growth_temporal", "prepaid"].includes(currentPlan.category)) {
    throw badRequest("Este negocio no puede activar una mensualidad del portal.");
  }

  const monthlyQrIncluded = Number(plan.limits?.monthly_qr_included || plan.qr_monthly_included || 0);
  const chargeStartDate = nextSubscriptionChargeDate(currentBusiness.rows[0]?.subscription_current_period_ends_at);
  const charge = monthlyChargeForBusiness(plan, currentBusiness.rows[0], chargeStartDate);
  const periodLabel = billingPeriodLabel(plan);
  const intent = await createPortalCheckoutIntent(user, {
    package_code: plan.code,
    package_size: monthlyQrIncluded,
    package_title: `${plan.name} - renovacion ${periodLabel}`,
    price_cop: charge.price_cop,
    metadata: {
        source: "business_portal_subscription_renewal",
        requested_by_email: user.email,
        special_pricing: charge.special_pricing_applied ? {
          label: charge.special_pricing_label,
          standard_price_cop: charge.standard_price_cop,
          charged_price_cop: charge.price_cop,
          ends_at: charge.special_pricing_ends_at,
        } : null,
        signup: {
          type: "portal_monthly_subscription",
          business_id: user.business_id,
          user_id: user.id,
          email: user.email,
          plan_code: plan.code,
          plan_price_cop: charge.price_cop,
          standard_plan_price_cop: charge.standard_price_cop,
          billing_period: plan.billing_period || "monthly",
          billing_frequency: plan.billing_frequency || 1,
          billing_frequency_type: plan.billing_frequency_type || "months",
          renewal: true,
        },
      },
  }, body);
  const purchaseOrder = intent.order;
  if (intent.reused) return mapPurchaseOrder(purchaseOrder);

  let preference;
  try {
    preference = await mpRequest("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
      items: [
        {
          id: plan.code,
          title: `${plan.name} - renovacion ${periodLabel} Sales Machine`,
          quantity: 1,
          unit_price: Number(charge.price_cop),
          currency_id: "COP",
        },
      ],
      payer: {
        email: user.email,
        name: user.full_name || undefined,
      },
      external_reference: purchaseOrder.external_reference,
      notification_url: webhookUrl(),
      back_urls: {
        success: appUrl("/empresa/?payment=success&renewal=success"),
        failure: appUrl("/empresa/?payment=failure&renewal=failure"),
        pending: appUrl("/empresa/?payment=pending&renewal=pending"),
      },
      metadata: {
        order_id: purchaseOrder.id,
        business_id: user.business_id,
        user_id: user.id,
        plan_code: plan.code,
        plan_price_cop: charge.price_cop,
        special_pricing_applied: charge.special_pricing_applied,
        signup_type: "portal_monthly_subscription",
        renewal: true,
      },
      payment_methods: digitalOnlyPaymentMethods(),
      ...(shouldEnableAutoReturn() ? { auto_return: "approved" } : {}),
      }),
    });
  } catch (error) {
    await saveCheckoutError(purchaseOrder.id, error);
    throw error;
  }

  return mapPurchaseOrder(await saveCheckoutReady(purchaseOrder.id, preference));
}

async function createSubscriptionAutoRenewal(user, body) {
  if (!user.business_id) {
    throw badRequest("Este usuario no tiene negocio asignado.");
  }
  if (!canAccessBusiness(user, user.business_id)) {
    throw forbidden("No puedes configurar cobro automatico para este negocio.");
  }

  const plan = listPlans().find((item) => (
    item.code === body.plan_code
    && item.category === "subscription"
    && item.public_signup_available !== false
    && !item.testing_plan
  ));
  if (!plan || !plan.monthly_price_cop) {
    throw badRequest("Plan mensual no disponible para cobro automatico.");
  }

  const currentBusiness = await query(
    `select plan_code, settings, subscription_current_period_ends_at
     from businesses
     where id = $1 and is_active = true`,
    [user.business_id]
  );
  const currentPlan = listPlans().find((item) => item.code === currentBusiness.rows[0]?.plan_code);
  if (currentPlan?.category !== "subscription" && !plan.testing_plan) {
    throw badRequest("Este negocio no tiene una mensualidad del portal para activar cobro automatico.");
  }

  const monthlyQrIncluded = Number(plan.limits?.monthly_qr_included || plan.qr_monthly_included || 0);
  const chargeStartDate = firstAutoRenewalChargeDate(plan, currentBusiness.rows[0]?.subscription_current_period_ends_at);
  const charge = monthlyChargeForBusiness(plan, currentBusiness.rows[0], chargeStartDate);
  const { frequency, frequency_type: frequencyType } = planBillingFrequency(plan);
  const periodLabel = billingPeriodLabel(plan);
  const intent = await createPortalCheckoutIntent(user, {
    package_code: plan.code,
    package_size: monthlyQrIncluded,
    package_title: `${plan.name} - cobro automatico ${periodLabel}`,
    price_cop: charge.price_cop,
    metadata: {
        source: "business_portal_subscription_auto_renewal",
        requested_by_email: user.email,
        special_pricing: charge.special_pricing_applied ? {
          label: charge.special_pricing_label,
          standard_price_cop: charge.standard_price_cop,
          charged_price_cop: charge.price_cop,
          ends_at: charge.special_pricing_ends_at,
        } : null,
        signup: {
          type: "portal_monthly_subscription_auto_renewal",
          business_id: user.business_id,
          user_id: user.id,
          email: user.email,
          plan_code: plan.code,
          plan_price_cop: charge.price_cop,
          standard_plan_price_cop: charge.standard_price_cop,
          billing_period: plan.billing_period || "monthly",
          billing_frequency: frequency,
          billing_frequency_type: frequencyType,
          auto_renew: true,
        },
      },
  }, body);
  const purchaseOrder = intent.order;
  if (intent.reused) {
    return {
      order: mapPurchaseOrder(purchaseOrder),
      auto_renewal: {
        status: purchaseOrder.status,
        mercado_pago_preapproval_id: purchaseOrder.mercado_pago_preference_id,
        checkout_url: purchaseOrder.checkout_url,
        sandbox_checkout_url: purchaseOrder.sandbox_checkout_url,
        first_charge_at: chargeStartDate.toISOString(),
      },
    };
  }

  let preapproval;
  try {
    preapproval = await mpRequest("/preapproval", {
      method: "POST",
      body: JSON.stringify({
      reason: `${plan.name} - portal Sales Machine (${periodLabel})`,
      external_reference: purchaseOrder.external_reference,
      payer_email: user.email,
      back_url: appUrl("/empresa/?subscription=automatic"),
      status: "pending",
      auto_recurring: {
        frequency,
        frequency_type: frequencyType,
        transaction_amount: Number(charge.price_cop),
        currency_id: "COP",
        start_date: chargeStartDate.toISOString(),
        ...(charge.special_pricing_applied && charge.special_pricing_ends_at ? { end_date: charge.special_pricing_ends_at } : {}),
      },
      }),
    });
  } catch (error) {
    await saveCheckoutError(purchaseOrder.id, error);
    throw error;
  }

  const updatedOrder = await saveCheckoutReady(purchaseOrder.id, preapproval);

  await query(
    `update businesses
     set subscription_auto_renew_enabled = false,
         subscription_auto_renew_status = $2,
         mercado_pago_preapproval_id = $3,
         subscription_auto_renew_checkout_url = $4,
         subscription_auto_renew_cancelled_at = null,
         settings = jsonb_set(
           jsonb_set(coalesce(settings, '{}'::jsonb), '{subscription,auto_renew_status}', to_jsonb($2::text), true),
           '{subscription,auto_renew_plan_code}', to_jsonb($5::text), true
         ),
         updated_at = now()
     where id = $1`,
    [
      user.business_id,
      String(preapproval.status || "pending").toUpperCase(),
      preapproval.id || null,
      preapproval.init_point || preapproval.sandbox_init_point || null,
      plan.code,
    ]
  );

  return {
    order: mapPurchaseOrder(updatedOrder),
    auto_renewal: {
      status: String(preapproval.status || "pending").toUpperCase(),
      mercado_pago_preapproval_id: preapproval.id || null,
      checkout_url: preapproval.init_point || null,
      sandbox_checkout_url: preapproval.sandbox_init_point || null,
      first_charge_at: chargeStartDate.toISOString(),
    },
  };
}

async function createPrepaidSignupCheckout(client, payload) {
  const offer = findPackageOffer(payload.package_code);
  if (!offer || !offer.base_access_allowed || !isBaseAccessPackage(offer.package_size)) {
    throw badRequest("Compra T200 o superior para activar tu Portal RMS sin mensualidad.");
  }

  const order = await client.query(
    `insert into qr_credit_purchase_orders
      (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7::jsonb)
     returning *`,
    [
      payload.business_id,
      payload.user_id,
      offer.code,
      offer.package_size,
      offer.title,
      offer.price_cop,
      JSON.stringify({
        source: "public_ticket_base_signup",
        signup: {
          type: "ticket_base_access",
          business_id: payload.business_id,
          user_id: payload.user_id,
          email: payload.email,
          plan_type: "ticket_base",
          initial_package_code: offer.code,
          initial_package_size: offer.package_size,
        },
      }),
    ]
  );
  const purchaseOrder = order.rows[0];

  const preference = await mpRequest("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: offer.code,
          title: `${offer.title} - activacion Portal RMS Base`,
          quantity: 1,
          unit_price: Number(offer.price_cop),
          currency_id: "COP",
        },
      ],
      payer: {
        email: payload.email,
        name: payload.full_name || undefined,
      },
      external_reference: purchaseOrder.external_reference,
      notification_url: webhookUrl(),
      back_urls: {
        success: appUrl("/paquetes/?signup=success"),
        failure: appUrl("/paquetes/?signup=failure"),
        pending: appUrl("/paquetes/?signup=pending"),
      },
      metadata: {
        order_id: purchaseOrder.id,
        business_id: payload.business_id,
        user_id: payload.user_id,
        package_code: offer.code,
        signup_type: "ticket_base_access",
      },
      payment_methods: digitalOnlyPaymentMethods(),
      ...(shouldEnableAutoReturn() ? { auto_return: "approved" } : {}),
    }),
  });

  const updated = await client.query(
    `update qr_credit_purchase_orders
     set mercado_pago_preference_id = $2,
         checkout_url = $3,
         sandbox_checkout_url = $4,
         payment_payload = $5,
         updated_at = now()
     where id = $1
     returning *`,
    [
      purchaseOrder.id,
      preference.id || null,
      preference.init_point || null,
      preference.sandbox_init_point || null,
      preference,
    ]
  );

  return mapPurchaseOrder(updated.rows[0]);
}

async function createPortalSignupCheckout(client, payload) {
  const plan = listPlans().find((item) => (
    item.code === payload.plan_code
    && item.category === "subscription"
    && item.public_signup_available !== false
    && !item.testing_plan
  ));
  if (!plan || !plan.monthly_price_cop) {
    throw badRequest("Plan mensual no disponible para pago automatico.");
  }

  const billingCycle = normalizeBillingCycle(payload.billing_cycle);
  const planPriceCop = planChargeCop(plan, billingCycle);
  const subscriptionType = billingCycle === "annual" ? "portal_annual_subscription" : "portal_monthly_subscription";
  const billingLabel = billingCycle === "annual" ? "anualidad" : "mensualidad";
  const firstChargeDate = new Date(Date.now() + 5 * 60 * 1000);
  const recurringFrequency = billingCycle === "annual"
    ? { frequency: 12, frequency_type: "months" }
    : planBillingFrequency(plan);
  const order = await client.query(
    `insert into qr_credit_purchase_orders
      (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7::jsonb)
     returning *`,
    [
      payload.business_id,
      payload.user_id,
      plan.code,
      0,
      `${plan.name} - suscripcion ${billingLabel}`,
      planPriceCop,
      JSON.stringify({
        source: "public_portal_signup",
        signup: {
          type: subscriptionType,
          activation_flow: "card_preapproval",
          requires_card_enrollment: true,
          business_id: payload.business_id,
          user_id: payload.user_id,
          email: payload.email,
          plan_code: plan.code,
          billing_cycle: billingCycle,
          courtesy_tickets_quantity: 10,
          plan_price_cop: planPriceCop,
        },
      }),
    ]
  );
  const purchaseOrder = order.rows[0];

  const preapproval = await mpRequest("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `${plan.name} - portal Qori (${billingLabel})`,
      external_reference: purchaseOrder.external_reference,
      payer_email: payload.email,
      back_url: appUrl("/paquetes/?signup=card"),
      notification_url: webhookUrl(),
      auto_recurring: {
        frequency: recurringFrequency.frequency,
        frequency_type: recurringFrequency.frequency_type,
        transaction_amount: planPriceCop,
        currency_id: "COP",
        start_date: firstChargeDate.toISOString(),
      },
    }),
  });

  const updated = await client.query(
    `update qr_credit_purchase_orders
     set mercado_pago_preference_id = $2,
         checkout_url = $3,
         sandbox_checkout_url = $4,
         payment_payload = $5,
         updated_at = now()
     where id = $1
     returning *`,
    [
      purchaseOrder.id,
      preapproval.id || null,
      preapproval.init_point || null,
      preapproval.sandbox_init_point || null,
      preapproval,
    ]
  );

  return mapPurchaseOrder(updated.rows[0]);
}

async function listCreditOrders(user, options = {}) {
  if (!user.business_id) {
    return [];
  }
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 40);
  const result = await query(
    `select *
     from qr_credit_purchase_orders
     where business_id = $1
     order by created_at desc
     limit $2`,
    [user.business_id, limit]
  );
  return result.rows.map(mapPurchaseOrder);
}

async function processPreapprovalWebhook(preapprovalId) {
  if (!preapprovalId) {
    return { ignored: true, reason: "missing_preapproval_id" };
  }
  const preapproval = await mpRequest(`/preapproval/${encodeURIComponent(preapprovalId)}`, { method: "GET" });
  const status = String(preapproval.status || "pending").toUpperCase();
  const externalReference = preapproval.external_reference;

  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `select *
       from qr_credit_purchase_orders
       where mercado_pago_preference_id = $1
          or external_reference = $2
       order by created_at desc
       limit 1
       for update`,
      [String(preapproval.id || preapprovalId), externalReference || ""]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return { ignored: true, reason: "auto_renewal_order_not_found", preapproval_id: preapprovalId };
    }

    await client.query(
      `update qr_credit_purchase_orders
       set payment_payload = $2,
           updated_at = now()
       where id = $1`,
      [order.id, preapproval]
    );

    await client.query(
      `update businesses
       set subscription_auto_renew_enabled = $2,
           subscription_auto_renew_status = $3,
           mercado_pago_preapproval_id = $4,
           subscription_auto_renew_checkout_url = coalesce($5, subscription_auto_renew_checkout_url),
           subscription_auto_renew_authorized_at = case when $2 then coalesce(subscription_auto_renew_authorized_at, now()) else subscription_auto_renew_authorized_at end,
           subscription_auto_renew_cancelled_at = case when not $2 and $3 in ('CANCELLED', 'PAUSED') then now() else subscription_auto_renew_cancelled_at end,
           settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{subscription,auto_renew_status}', to_jsonb($3::text), true),
           updated_at = now()
       where id = $1`,
      [
        order.business_id,
        status === "AUTHORIZED",
        status,
        preapproval.id || preapprovalId,
        preapproval.init_point || preapproval.sandbox_init_point || null,
      ]
    );

    return {
      auto_renewal: {
        business_id: order.business_id,
        status,
        enabled: status === "AUTHORIZED",
        mercado_pago_preapproval_id: preapproval.id || preapprovalId,
      },
    };
  });
}

function normalizeMercadoPagoWebhookTopic(value) {
  const topic = String(value || "").trim().toLowerCase();
  if (["preapproval", "subscription_preapproval"].includes(topic)) {
    return "subscription_preapproval";
  }
  if (topic === "subscription_authorized_payment") {
    return "subscription_authorized_payment";
  }
  if (["payment", "payments"].includes(topic)) {
    return "payment";
  }
  return topic;
}

function approvedPaymentIdFromAuthorizedInvoice(invoice) {
  const payment = invoice?.payment || {};
  if (String(payment.status || "").toLowerCase() !== "approved" || !payment.id) {
    return null;
  }
  return String(payment.id);
}

async function processMercadoPagoWebhook(req) {
  verifyWebhookSignature(req);
  const rawTopic = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
  const topic = normalizeMercadoPagoWebhookTopic(rawTopic);
  const resourceId = req.query["data.id"] || req.body?.data?.id || req.body?.id;
  if (topic === "subscription_preapproval") {
    return processPreapprovalWebhook(resourceId);
  }
  if (topic && !["payment", "subscription_authorized_payment"].includes(topic)) {
    return { ignored: true, topic: rawTopic };
  }

  let paymentId = resourceId;
  let authorizedInvoice = null;
  if (topic === "subscription_authorized_payment") {
    if (!resourceId) {
      return { ignored: true, reason: "missing_authorized_payment_id" };
    }
    authorizedInvoice = await mpRequest(`/authorized_payments/${encodeURIComponent(resourceId)}`, { method: "GET" });
    paymentId = approvedPaymentIdFromAuthorizedInvoice(authorizedInvoice);
    if (!paymentId) {
      return {
        authorized_payment: {
          id: authorizedInvoice?.id || resourceId,
          status: authorizedInvoice?.payment?.status || authorizedInvoice?.summarized || authorizedInvoice?.status || "pending",
          credited: false,
        },
      };
    }
  }

  if (!paymentId) {
    return { ignored: true, reason: "missing_payment_id" };
  }

  const payment = await mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
  const externalReference = payment.external_reference || authorizedInvoice?.external_reference;
  const preapprovalId = authorizedInvoice?.preapproval_id || "";
  if (!externalReference && !preapprovalId) {
    return { ignored: true, reason: "missing_external_reference" };
  }

  return withTransaction(async (client) => {
    const storageOrderResult = await client.query(
      `select * from business_storage_addon_orders where external_reference = $1 for update`,
      [externalReference || ""]
    );
    if (storageOrderResult.rowCount) {
      const storageOrder = storageOrderResult.rows[0];
      const storageStatus = mapPaymentStatus(payment.status);
      if (storageStatus !== "APPROVED") {
        const updated = await client.query(
          `update business_storage_addon_orders set status = $2, mercado_pago_payment_id = coalesce(mercado_pago_payment_id, $3),
             payment_payload = $4::jsonb, updated_at = now() where id = $1 returning *`,
          [storageOrder.id, storageStatus, String(payment.id), JSON.stringify(payment)]
        );
        return { storage_order: updated.rows[0], credited: false };
      }
      return { storage_order: await approveStorageAddonOrder(client, storageOrder, payment), credited: false, storage_added: true };
    }
    const orderResult = await client.query(
      `select *
       from qr_credit_purchase_orders
       where external_reference = $1
          or ($2 <> '' and mercado_pago_preference_id = $2)
       order by created_at desc
       limit 1
       for update`,
      [externalReference || "", String(preapprovalId)]
    );
    const order = orderResult.rows[0];
    if (!order) {
      throw notFound("Orden de recarga de tickets no encontrada.");
    }

    let payableOrder = order;
    const signup = order.metadata?.signup;
    const isRecurringSubscription = [
      "portal_monthly_subscription",
      "portal_annual_subscription",
      "portal_monthly_subscription_auto_renewal",
    ].includes(signup?.type);
    if (isRecurringSubscription && order.credited_at) {
      const existingPayment = await client.query(
        `select id
         from qr_credit_purchase_orders
         where mercado_pago_payment_id = $1
         limit 1`,
        [String(payment.id)]
      );
      if (existingPayment.rowCount) {
        return { order: mapPurchaseOrder(order), credited: false, duplicate: true };
      }
      const recurringOrder = await client.query(
        `insert into qr_credit_purchase_orders
          (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [
          order.business_id,
          order.created_by_user_id,
          order.package_code,
          order.package_size,
          `${order.package_title} - ${String(payment.id)}`,
          order.price_cop,
          `${order.external_reference}:${payment.id}`,
          {
            ...order.metadata,
            source: "mercado_pago_auto_renewal_payment",
            parent_external_reference: order.external_reference,
            parent_order_id: order.id,
          },
        ]
      );
      payableOrder = recurringOrder.rows[0];
    }

    const status = mapPaymentStatus(payment.status);

    if (status !== "APPROVED") {
      const updated = await client.query(
        `update qr_credit_purchase_orders
         set status = $2,
             mercado_pago_payment_id = coalesce(mercado_pago_payment_id, $3),
             payment_payload = $4,
             updated_at = now()
         where id = $1
         returning *`,
        [payableOrder.id, status, String(payment.id), payment]
      );
      return { order: mapPurchaseOrder(updated.rows[0]), credited: false };
    }

    return finalizeApprovedCreditPurchase(client, payableOrder, payment, {
      publicLabel: `${payableOrder.package_title} comprado en Mercado Pago`,
      notes: `Recarga automatica Mercado Pago. Payment ID ${payment.id}.`,
    });
  });
}

async function createDemoCreditPurchase(user, body) {
  if (!user.business_id) {
    throw badRequest("Este usuario no tiene negocio asignado.");
  }
  if (!canAccessBusiness(user, user.business_id)) {
    throw forbidden("No puedes comprar tickets QR para este negocio.");
  }

  const offer = findPackageOffer(body.package_code);
  if (!offer) {
    throw badRequest("Paquete QR no disponible.");
  }
  await assertActiveSubscriptionForTicketPurchase(user);
  if (!offer.subscriber_allowed) {
    throw badRequest("Paquete QR no disponible para suscriptores.");
  }

  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `insert into qr_credit_purchase_orders
        (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata, status)
       values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7, 'PENDING')
       returning *`,
      [
        user.business_id,
        user.id,
        offer.code,
        offer.package_size,
        offer.title,
        offer.price_cop,
        {
          source: "business_portal_demo",
          requested_by_email: user.email,
          simulated: true,
        },
      ]
    );
    const order = orderResult.rows[0];
    const payment = {
      id: `SIM-${randomUUID()}`,
      status: "approved",
      transaction_amount: Number(offer.price_cop),
      external_reference: order.external_reference,
      payment_type_id: "simulation",
      date_approved: new Date().toISOString(),
      simulated: true,
      title: `${offer.title} - ${trafficLabel(offer.package_size)}`,
    };

    return finalizeApprovedCreditPurchase(client, order, payment, {
      publicLabel: `${offer.title} comprado en simulación`,
      notes: `Recarga simulada para pruebas. Payment ID ${payment.id}.`,
    });
  });
}

function mapPaymentStatus(status) {
  if (status === "approved") return "APPROVED";
  if (["rejected", "cancelled"].includes(status)) return "REJECTED";
  if (status === "refunded") return "CANCELLED";
  return "PENDING";
}

async function finalizeApprovedCreditPurchase(client, order, payment, options = {}) {
  if (order.credited_at) {
    return { order: mapPurchaseOrder(order), credited: false, duplicate: true };
  }

  const amount = Number(payment.transaction_amount || 0);
  if (amount < Number(order.price_cop)) {
    throw badRequest("El pago aprobado no cubre el valor del paquete.");
  }

  const signup = order.metadata?.signup;
  if (["portal_monthly_subscription", "portal_annual_subscription", "portal_monthly_subscription_auto_renewal"].includes(signup?.type)) {
    return finalizeApprovedPortalSubscription(client, order, payment, signup);
  }

  const account = await addQrCredits(client, {
    business_id: order.business_id,
    package_size: order.package_size,
    public_label: options.publicLabel || `${order.package_title} comprado en Mercado Pago`,
    notes: options.notes || `Recarga automatica Mercado Pago. Payment ID ${payment.id}.`,
    created_by_user_id: order.created_by_user_id,
  });

  if (isBaseAccessPackage(order.package_size)) {
    await activateTicketBaseAccess(client, order.business_id, order.created_by_user_id, {
      source: signup?.type || "ticket_purchase",
    });
  }

  if (signup?.growth_source === "gamified_campaign_service" || signup?.service === "gamified_campaign_service") {
    await activateGrowthTemporalAccess(client, order.business_id, order.created_by_user_id, "gamified_campaign_service");
  }

  const updated = await client.query(
    `update qr_credit_purchase_orders
     set status = 'APPROVED',
         mercado_pago_payment_id = coalesce(mercado_pago_payment_id, $2),
         payment_payload = $3,
         credited_at = now(),
         updated_at = now()
     where id = $1
     returning *`,
    [order.id, String(payment.id), payment]
  );

  if (signup?.type === "prepaid_qr_validator") {
    await activateTicketBaseAccess(client, order.business_id, order.created_by_user_id, {
      source: "legacy_prepaid_qr_validator",
    });
  }

  return {
    order: mapPurchaseOrder(updated.rows[0]),
    credit_account: mapPublicCreditAccount(account),
    credited: true,
  };
}

async function finalizeApprovedPortalSubscription(client, order, payment, signup) {
  if (order.credited_at) {
    return { order: mapPurchaseOrder(order), credited: false, duplicate: true };
  }

  const planCode = signup.plan_code || order.package_code;
  const plan = listPlans().find((item) => (
    item.code === planCode
    && item.category === "subscription"
    && item.public_signup_available !== false
    && !item.testing_plan
  ));
  if (!plan || order.package_code !== planCode) {
    throw badRequest("La orden aprobada no coincide con un plan canonico activable.");
  }
  const currentPeriod = await client.query(
    `select subscription_current_period_ends_at
     from businesses
     where id = $1
     for update`,
    [order.business_id]
  );
  const currentEnd = currentPeriod.rows[0]?.subscription_current_period_ends_at
    ? new Date(currentPeriod.rows[0].subscription_current_period_ends_at)
    : null;
  const now = new Date();
  const periodEnd = currentEnd && currentEnd > now ? currentEnd : now;
  const billingCycle = normalizeBillingCycle(signup.billing_cycle || (signup.type === "portal_annual_subscription" ? "annual" : "monthly"));
  const nextPeriodEnd = addPlanBillingPeriod(periodEnd, plan, billingCycle);

  await ensureCreditAccount(client, order.business_id);
  let account = null;
  let courtesyTicketsGranted = false;
  if (signup.initial_package_code && Number(order.package_size || 0) > 0) {
    account = await addQrCredits(client, {
      business_id: order.business_id,
      package_size: order.package_size,
      public_label: `${order.package_title} comprado al activar el portal`,
      notes: `Paquete inicial de tickets al activar Portal RMS. Payment ID ${payment.id}.`,
      created_by_user_id: order.created_by_user_id,
    });
  }
  const previousSubscriptionOrder = await client.query(
    `select id
     from qr_credit_purchase_orders
     where business_id = $1
       and id <> $2
       and status = 'APPROVED'
       and (metadata->'signup'->>'type') in (
         'portal_monthly_subscription',
         'portal_annual_subscription',
         'portal_monthly_subscription_auto_renewal'
       )
     limit 1`,
    [order.business_id, order.id]
  );
  if (!previousSubscriptionOrder.rowCount) {
    const courtesy = await grantFirstSubscriptionCourtesyTickets(client, {
      business_id: order.business_id,
      created_by_user_id: order.created_by_user_id,
      public_label: "10 tickets de cortesia de bienvenida",
      notes: "Cortesia de bienvenida por primera suscripcion del cliente.",
    });
    account = courtesy.account || account;
    courtesyTicketsGranted = Boolean(courtesy.granted);
  }
  const updated = await client.query(
    `update qr_credit_purchase_orders
     set status = 'APPROVED',
         mercado_pago_payment_id = coalesce(mercado_pago_payment_id, $2),
         payment_payload = $3,
         credited_at = now(),
         updated_at = now()
     where id = $1
     returning *`,
    [order.id, String(payment.id), payment]
  );

  await client.query(
    `update businesses
     set is_active = true,
         plan_code = $2,
         plan_type = 'premium_monthly',
         portal_status = 'ACTIVE',
         portal_activated_at = coalesce(portal_activated_at, now()),
         subscription_status = 'ACTIVE',
         subscription_started_at = coalesce(subscription_started_at, now()),
         subscription_current_period_ends_at = $3,
         settings = jsonb_set(
           jsonb_set(
             jsonb_set(coalesce(settings, '{}'::jsonb), '{subscription,plan_code}', to_jsonb($2::text), true),
             '{subscription,status}', to_jsonb('ACTIVE'::text), true
           ),
           '{subscription,billing_cycle}', to_jsonb($4::text), true
         ),
         updated_at = now()
     where id = $1`,
    [order.business_id, planCode, nextPeriodEnd.toISOString(), billingCycle]
  );

  if (order.created_by_user_id) {
    await client.query(
      `update app_users
       set is_active = true,
           updated_at = now()
       where id = $1 and business_id = $2`,
      [order.created_by_user_id, order.business_id]
    );
  }

  return {
    order: mapPurchaseOrder(updated.rows[0]),
    subscription: {
      business_id: order.business_id,
      plan_code: planCode,
      status: "ACTIVE",
      billing_cycle: billingCycle,
      current_period_ends_at: nextPeriodEnd.toISOString(),
    },
    credit_account: account ? mapPublicCreditAccount(account) : null,
    courtesy_tickets_granted: courtesyTicketsGranted,
    credited: Boolean(account),
  };
}

function mapPurchaseOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    business_id: row.business_id,
    package_code: row.package_code,
    package_size: Number(row.package_size || 0),
    package_title: row.package_title,
    price_cop: Number(row.price_cop || 0),
    currency: row.currency,
    status: row.status,
    checkout_url: row.checkout_url,
    sandbox_checkout_url: row.sandbox_checkout_url,
    checkout_expires_at: row.checkout_expires_at,
    checkout_error: row.checkout_error,
    order_type: row.metadata?.source || "unknown",
    mercado_pago_preference_id: row.mercado_pago_preference_id,
    mercado_pago_payment_id: row.mercado_pago_payment_id,
    credited_at: row.credited_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  __testing: {
    approvedPaymentIdFromAuthorizedInvoice,
    normalizeMercadoPagoWebhookTopic,
  },
  createCreditCheckout,
  createStorageAddonCheckout,
  createDemoCreditPurchase,
  createPrepaidSignupCheckout,
  createPortalSignupCheckout,
  createSubscriptionAutoRenewal,
  createSubscriptionRenewalCheckout,
  listCreditOrders,
  processMercadoPagoWebhook,
};

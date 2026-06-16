const crypto = require("crypto");
const { randomUUID } = require("crypto");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { canAccessBusiness } = require("../middleware/auth");
const { findPackageOffer } = require("./packageCatalog");
const { addQrCredits, ensureCreditAccount, mapPublicCreditAccount, trafficLabel } = require("./qrCreditService");
const { listPlans } = require("./subscriptionService");

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

function nextSubscriptionChargeDate(currentPeriodEndsAt) {
  const now = new Date();
  const currentEnd = currentPeriodEndsAt ? new Date(currentPeriodEndsAt) : null;
  if (currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd > now) {
    return currentEnd;
  }
  return now;
}

function normalizeBillingCycle(value) {
  return value === "annual" ? "annual" : "monthly";
}

function planChargeCop(plan, billingCycle) {
  if (billingCycle === "annual") {
    return Number(plan.annual_price_cop || (Number(plan.monthly_price_cop || 0) * 12 * 0.7));
  }
  return Number(plan.monthly_price_cop || 0);
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
  const businessPlan = await query(
    `select plan_code
     from businesses
     where id = $1`,
    [user.business_id]
  );
  const plan = listPlans().find((item) => item.code === businessPlan.rows[0]?.plan_code);
  const isSubscription = plan?.category === "subscription";
  if (!isSubscription && !offer.prepaid_allowed) {
    throw badRequest("Tu acceso prepago solo permite recargar 50 o 200 tickets. Para comprar paquetes superiores activa Portal RMS mensual.");
  }
  if (isSubscription && !offer.subscriber_allowed) {
    throw badRequest("Paquete QR no disponible para suscriptores.");
  }

  const order = await query(
    `insert into qr_credit_purchase_orders
      (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7)
     returning *`,
    [
      user.business_id,
      user.id,
      offer.code,
      offer.package_size,
      offer.title,
      offer.price_cop,
      {
        source: "business_portal",
        requested_by_email: user.email,
      },
    ]
  );
  const purchaseOrder = order.rows[0];

  const preference = await mpRequest("/checkout/preferences", {
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
      ...(shouldEnableAutoReturn() ? { auto_return: "approved" } : {}),
    }),
  });

  const updated = await query(
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

async function createSubscriptionRenewalCheckout(user, body) {
  if (!user.business_id) {
    throw badRequest("Este usuario no tiene negocio asignado.");
  }
  if (!canAccessBusiness(user, user.business_id)) {
    throw forbidden("No puedes renovar la suscripcion de este negocio.");
  }

  const plan = listPlans().find((item) => item.code === body.plan_code && item.category === "subscription");
  if (!plan || !plan.monthly_price_cop) {
    throw badRequest("Plan mensual no disponible para renovacion automatica.");
  }

  const currentBusiness = await query(
    `select plan_code
     from businesses
     where id = $1`,
    [user.business_id]
  );
  const currentPlan = listPlans().find((item) => item.code === currentBusiness.rows[0]?.plan_code);
  if (currentPlan?.category !== "subscription") {
    throw badRequest("Este negocio no tiene una mensualidad activa para renovar.");
  }

  const monthlyQrIncluded = Number(plan.limits?.monthly_qr_included || plan.qr_monthly_included || 0);
  const order = await query(
    `insert into qr_credit_purchase_orders
      (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7)
     returning *`,
    [
      user.business_id,
      user.id,
      plan.code,
      monthlyQrIncluded,
      `${plan.name} - renovacion mensual`,
      plan.monthly_price_cop,
      {
        source: "business_portal_subscription_renewal",
        requested_by_email: user.email,
        signup: {
          type: "portal_monthly_subscription",
          business_id: user.business_id,
          user_id: user.id,
          email: user.email,
          plan_code: plan.code,
          renewal: true,
        },
      },
    ]
  );
  const purchaseOrder = order.rows[0];

  const preference = await mpRequest("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: plan.code,
          title: `${plan.name} - renovacion mensual Market Games`,
          quantity: 1,
          unit_price: Number(plan.monthly_price_cop),
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
        signup_type: "portal_monthly_subscription",
        renewal: true,
      },
      ...(shouldEnableAutoReturn() ? { auto_return: "approved" } : {}),
    }),
  });

  const updated = await query(
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

async function createSubscriptionAutoRenewal(user, body) {
  if (!user.business_id) {
    throw badRequest("Este usuario no tiene negocio asignado.");
  }
  if (!canAccessBusiness(user, user.business_id)) {
    throw forbidden("No puedes configurar cobro automatico para este negocio.");
  }

  const plan = listPlans().find((item) => item.code === body.plan_code && item.category === "subscription");
  if (!plan || !plan.monthly_price_cop) {
    throw badRequest("Plan mensual no disponible para cobro automatico.");
  }

  const currentBusiness = await query(
    `select plan_code, subscription_current_period_ends_at
     from businesses
     where id = $1 and is_active = true`,
    [user.business_id]
  );
  const currentPlan = listPlans().find((item) => item.code === currentBusiness.rows[0]?.plan_code);
  if (currentPlan?.category !== "subscription") {
    throw badRequest("Este negocio no tiene una mensualidad del portal para activar cobro automatico.");
  }

  const monthlyQrIncluded = Number(plan.limits?.monthly_qr_included || plan.qr_monthly_included || 0);
  const chargeStartDate = nextSubscriptionChargeDate(currentBusiness.rows[0]?.subscription_current_period_ends_at);
  const order = await query(
    `insert into qr_credit_purchase_orders
      (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7)
     returning *`,
    [
      user.business_id,
      user.id,
      plan.code,
      monthlyQrIncluded,
      `${plan.name} - cobro mensual automatico`,
      plan.monthly_price_cop,
      {
        source: "business_portal_subscription_auto_renewal",
        requested_by_email: user.email,
        signup: {
          type: "portal_monthly_subscription_auto_renewal",
          business_id: user.business_id,
          user_id: user.id,
          email: user.email,
          plan_code: plan.code,
          auto_renew: true,
        },
      },
    ]
  );
  const purchaseOrder = order.rows[0];

  const preapproval = await mpRequest("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `${plan.name} - mensualidad portal Market Games`,
      external_reference: purchaseOrder.external_reference,
      payer_email: user.email,
      back_url: appUrl("/empresa/?subscription=automatic"),
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(plan.monthly_price_cop),
        currency_id: "COP",
        start_date: chargeStartDate.toISOString(),
      },
    }),
  });

  const updated = await query(
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
    order: mapPurchaseOrder(updated.rows[0]),
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
  if (!offer || !offer.prepaid_allowed) {
    throw badRequest("El QR Validator prepago solo permite paquetes de 50 o 200 tickets.");
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
        source: "public_prepaid_signup",
        signup: {
          type: "prepaid_qr_validator",
          business_id: payload.business_id,
          user_id: payload.user_id,
          email: payload.email,
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
          title: `${offer.title} - activacion QR Validator`,
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
        signup_type: "prepaid_qr_validator",
      },
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
  const plan = listPlans().find((item) => item.code === payload.plan_code && item.category === "subscription");
  if (!plan || !plan.monthly_price_cop) {
    throw badRequest("Plan mensual no disponible para pago automatico.");
  }
  const offer = findPackageOffer(payload.package_code);
  if (!offer || !offer.subscriber_allowed) {
    throw badRequest("Paquete inicial QR no disponible para suscriptores.");
  }

  const billingCycle = normalizeBillingCycle(payload.billing_cycle);
  const planPriceCop = planChargeCop(plan, billingCycle);
  const totalPriceCop = planPriceCop + Number(offer.price_cop);
  const subscriptionType = billingCycle === "annual" ? "portal_annual_subscription" : "portal_monthly_subscription";
  const billingLabel = billingCycle === "annual" ? "anualidad" : "mensualidad";
  const order = await client.query(
    `insert into qr_credit_purchase_orders
      (business_id, created_by_user_id, package_code, package_size, package_title, price_cop, external_reference, metadata)
     values ($1, $2, $3, $4, $5, $6, gen_random_uuid()::text, $7::jsonb)
     returning *`,
    [
      payload.business_id,
      payload.user_id,
      plan.code,
      offer.package_size,
      `${plan.name} + ${offer.title}`,
      totalPriceCop,
      JSON.stringify({
        source: "public_portal_signup",
        signup: {
          type: subscriptionType,
          business_id: payload.business_id,
          user_id: payload.user_id,
          email: payload.email,
          plan_code: plan.code,
          billing_cycle: billingCycle,
          initial_package_code: offer.code,
          initial_package_size: offer.package_size,
          initial_package_price_cop: offer.price_cop,
          plan_price_cop: planPriceCop,
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
          id: plan.code,
          title: `${plan.name} - ${billingLabel} portal Market Games`,
          quantity: 1,
          unit_price: planPriceCop,
          currency_id: "COP",
        },
        {
          id: offer.code,
          title: `${offer.title} - tickets iniciales QR`,
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
        success: appUrl("/paquetes/?signup=success&mode=portal"),
        failure: appUrl("/paquetes/?signup=failure&mode=portal"),
        pending: appUrl("/paquetes/?signup=pending&mode=portal"),
      },
      metadata: {
        order_id: purchaseOrder.id,
        business_id: payload.business_id,
        user_id: payload.user_id,
        plan_code: plan.code,
        package_code: offer.code,
        billing_cycle: billingCycle,
        signup_type: subscriptionType,
      },
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

async function listCreditOrders(user) {
  if (!user.business_id) {
    return [];
  }
  const result = await query(
    `select *
     from qr_credit_purchase_orders
     where business_id = $1
     order by created_at desc
     limit 40`,
    [user.business_id]
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

async function processMercadoPagoWebhook(req) {
  verifyWebhookSignature(req);
  const topic = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
  const paymentId = req.query["data.id"] || req.body?.data?.id || req.body?.id;
  if (topic === "preapproval") {
    return processPreapprovalWebhook(paymentId);
  }
  if (topic && topic !== "payment") {
    return { ignored: true, topic };
  }
  if (!paymentId) {
    return { ignored: true, reason: "missing_payment_id" };
  }

  const payment = await mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
  const externalReference = payment.external_reference;
  if (!externalReference) {
    return { ignored: true, reason: "missing_external_reference" };
  }

  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `select *
       from qr_credit_purchase_orders
       where external_reference = $1
       for update`,
      [externalReference]
    );
    const order = orderResult.rows[0];
    if (!order) {
      throw notFound("Orden de recarga QR no encontrada.");
    }

    let payableOrder = order;
    const signup = order.metadata?.signup;
    if (signup?.type === "portal_monthly_subscription_auto_renewal" && order.credited_at) {
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
  const businessPlan = await query(
    `select plan_code
     from businesses
     where id = $1`,
    [user.business_id]
  );
  const plan = listPlans().find((item) => item.code === businessPlan.rows[0]?.plan_code);
  if (plan?.category !== "subscription" && !offer.prepaid_allowed) {
    throw badRequest("Tu acceso prepago solo permite recargar 50 o 200 tickets. Para comprar paquetes superiores activa Portal RMS mensual.");
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
    await client.query(
      `update businesses
       set is_active = true,
           subscription_status = 'ACTIVE',
           subscription_started_at = coalesce(subscription_started_at, now()),
           updated_at = now()
       where id = $1`,
      [order.business_id]
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
  }

  return {
    order: mapPurchaseOrder(updated.rows[0]),
    credit_account: mapPublicCreditAccount(account),
    credited: true,
  };
}

async function finalizeApprovedPortalSubscription(client, order, payment, signup) {
  const planCode = signup.plan_code || order.package_code;
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
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + (billingCycle === "annual" ? 12 : 1));

  await ensureCreditAccount(client, order.business_id);
  let account = null;
  if (signup.initial_package_code && Number(order.package_size || 0) > 0) {
    account = await addQrCredits(client, {
      business_id: order.business_id,
      package_size: order.package_size,
      public_label: `${order.package_title} comprado al activar el portal`,
      notes: `Paquete inicial de tickets al activar Portal RMS. Payment ID ${payment.id}.`,
      created_by_user_id: order.created_by_user_id,
    });
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
    [order.business_id, planCode, periodEnd.toISOString(), billingCycle]
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
      current_period_ends_at: periodEnd.toISOString(),
    },
    credit_account: account ? mapPublicCreditAccount(account) : null,
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
    mercado_pago_preference_id: row.mercado_pago_preference_id,
    mercado_pago_payment_id: row.mercado_pago_payment_id,
    credited_at: row.credited_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  createCreditCheckout,
  createDemoCreditPurchase,
  createPrepaidSignupCheckout,
  createPortalSignupCheckout,
  createSubscriptionAutoRenewal,
  createSubscriptionRenewalCheckout,
  listCreditOrders,
  processMercadoPagoWebhook,
};

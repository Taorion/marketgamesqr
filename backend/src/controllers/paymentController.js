const { z } = require("zod");
const { validate } = require("../utils/validators");
const { badRequest } = require("../utils/http");
const { subscriberPackageOffers } = require("../services/packageCatalog");
const {
  createCreditCheckout,
  createSubscriptionAutoRenewal,
  createSubscriptionRenewalCheckout,
  listCreditOrders,
  processMercadoPagoWebhook,
} = require("../services/mercadoPagoService");
const { getBusinessSubscription } = require("../services/subscriptionService");

const creditCheckoutSchema = z.object({
  package_code: z.string().trim().min(2).max(40),
});

const subscriptionRenewalSchema = z.object({
  plan_code: z.string().trim().min(2).max(40),
});

async function createQrCreditCheckout(req, res, next) {
  try {
    const body = validate(creditCheckoutSchema, req.body);
    const order = await createCreditCheckout(req.user, body);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

async function listQrCreditOffers(req, res, next) {
  try {
    if (!req.user.business_id) {
      throw badRequest("Este usuario no tiene negocio asignado.");
    }
    const subscription = await getBusinessSubscription(req.user.business_id);
    const plan = subscription.plan || {};
    if (plan.category !== "subscription" || plan.raw_status !== "ACTIVE" || !plan.portal_access_allowed) {
      throw badRequest("Para comprar tickets internos primero debes activar un plan de suscripcion.");
    }
    res.json({
      packages: subscriberPackageOffers(),
      pricing: {
        display_currency: "COP",
        payment_currency: "COP",
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createSubscriptionCheckout(req, res, next) {
  try {
    const body = validate(subscriptionRenewalSchema, req.body);
    const order = await createSubscriptionRenewalCheckout(req.user, body);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

async function createSubscriptionAutoRenewalCheckout(req, res, next) {
  try {
    const body = validate(subscriptionRenewalSchema, req.body);
    const result = await createSubscriptionAutoRenewal(req.user, body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listQrCreditOrders(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 40);
    res.json({ orders: await listCreditOrders(req.user, { limit }) });
  } catch (error) {
    next(error);
  }
}

async function mercadoPagoWebhook(req, res, next) {
  try {
    const result = await processMercadoPagoWebhook(req);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createQrCreditCheckout,
  createSubscriptionAutoRenewalCheckout,
  createSubscriptionCheckout,
  listQrCreditOffers,
  listQrCreditOrders,
  mercadoPagoWebhook,
};

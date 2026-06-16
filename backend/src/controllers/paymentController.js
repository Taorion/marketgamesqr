const { z } = require("zod");
const { validate } = require("../utils/validators");
const {
  createCreditCheckout,
  createSubscriptionAutoRenewal,
  createSubscriptionRenewalCheckout,
  listCreditOrders,
  processMercadoPagoWebhook,
} = require("../services/mercadoPagoService");

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
    res.json({ orders: await listCreditOrders(req.user) });
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
  listQrCreditOrders,
  mercadoPagoWebhook,
};

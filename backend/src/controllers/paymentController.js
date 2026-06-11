const { z } = require("zod");
const { env } = require("../config/env");
const { validate } = require("../utils/validators");
const {
  createCreditCheckout,
  createDemoCreditPurchase,
  listCreditOrders,
  processMercadoPagoWebhook,
} = require("../services/mercadoPagoService");

const creditCheckoutSchema = z.object({
  package_code: z.string().trim().min(2).max(40),
});

function demoModeEnabled() {
  return env.enableDemoTools && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(env.publicAppUrl || "");
}

async function createQrCreditCheckout(req, res, next) {
  try {
    const body = validate(creditCheckoutSchema, req.body);
    const order = await createCreditCheckout(req.user, body);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

async function createQrCreditDemoPurchase(req, res, next) {
  try {
    if (!demoModeEnabled()) {
      return res.status(403).json({
        error: "El modo de simulacion solo esta disponible en desarrollo local.",
      });
    }
    const body = validate(creditCheckoutSchema, req.body);
    const result = await createDemoCreditPurchase(req.user, body);
    res.status(201).json({ order: result.order, credit_account: result.credit_account, demo: true });
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
  createQrCreditDemoPurchase,
  listQrCreditOrders,
  mercadoPagoWebhook,
};

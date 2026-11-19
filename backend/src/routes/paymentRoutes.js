const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  createQrCreditCheckout,
  createSubscriptionAutoRenewalCheckout,
  createSubscriptionCheckout,
  createStorageCheckout,
  listQrCreditOffers,
  listQrCreditOrders,
  mercadoPagoWebhook,
} = require("../controllers/paymentController");

const router = express.Router();
const requireBillingAdmin = requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES");

router.post("/mercadopago/webhook", mercadoPagoWebhook);
router.get("/qr-credits/offers", authRequired, requireBillingAdmin, listQrCreditOffers);
router.get("/qr-credits/orders", authRequired, requireBillingAdmin, listQrCreditOrders);
router.post("/qr-credits/checkout", authRequired, requireBillingAdmin, createQrCreditCheckout);
router.post("/tickets/checkout", authRequired, requireBillingAdmin, createQrCreditCheckout);
router.post("/subscriptions/checkout", authRequired, requireBillingAdmin, createSubscriptionCheckout);
router.post("/storage/checkout", authRequired, requireBillingAdmin, createStorageCheckout);
router.post("/subscriptions/auto-renewal", authRequired, requireBillingAdmin, createSubscriptionAutoRenewalCheckout);

for (const [path, action] of [['refresh','refresh'],['cancel','cancel']]) {
  router.post('/subscriptions/auto-renewal/'+path, authRequired, requireBillingAdmin, async (req,res,next) => {
    try { res.json({subscription:await require('../services/subscriptionAutoRenewalService')[action](req.user)}); }
    catch(error) { next(error); }
  });
}
module.exports = router;

const express = require("express");
const { authRequired } = require("../middleware/auth");
const {
  createQrCreditCheckout,
  createSubscriptionAutoRenewalCheckout,
  createSubscriptionCheckout,
  listQrCreditOrders,
  mercadoPagoWebhook,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/mercadopago/webhook", mercadoPagoWebhook);
router.get("/qr-credits/orders", authRequired, listQrCreditOrders);
router.post("/qr-credits/checkout", authRequired, createQrCreditCheckout);
router.post("/tickets/checkout", authRequired, createQrCreditCheckout);
router.post("/subscriptions/checkout", authRequired, createSubscriptionCheckout);
router.post("/subscriptions/auto-renewal", authRequired, createSubscriptionAutoRenewalCheckout);

module.exports = router;

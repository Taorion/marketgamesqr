const express = require("express");
const { authRequired } = require("../middleware/auth");
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

router.post("/mercadopago/webhook", mercadoPagoWebhook);
router.get("/qr-credits/offers", authRequired, listQrCreditOffers);
router.get("/qr-credits/orders", authRequired, listQrCreditOrders);
router.post("/qr-credits/checkout", authRequired, createQrCreditCheckout);
router.post("/tickets/checkout", authRequired, createQrCreditCheckout);
router.post("/subscriptions/checkout", authRequired, createSubscriptionCheckout);
router.post("/storage/checkout", authRequired, createStorageCheckout);
router.post("/subscriptions/auto-renewal", authRequired, createSubscriptionAutoRenewalCheckout);

module.exports = router;

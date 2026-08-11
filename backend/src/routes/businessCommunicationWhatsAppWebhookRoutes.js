const express = require("express");
const { receive, verify } = require("../controllers/businessCommunicationWhatsAppWebhookController");

const router = express.Router();

router.get("/whatsapp", verify);
router.post("/whatsapp", receive);

module.exports = router;

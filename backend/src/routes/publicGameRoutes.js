const express = require("express");
const { createMotoRewardQr, createDemoQr, createProductPreferenceQr } = require("../controllers/publicGameController");

const router = express.Router();

router.post("/moto-pescuezo/qr", createMotoRewardQr);
router.post("/demo/:type/qr", createDemoQr);
router.post("/product-preferences/qr", createProductPreferenceQr);

module.exports = router;

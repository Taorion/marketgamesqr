const express = require("express");
const { claimDetails, claimStrategicQr } = require("../controllers/publicQrController");

const router = express.Router();

router.get("/claim/:token", claimDetails);
router.post("/qr/claim/:token", claimStrategicQr);

module.exports = router;

const express = require("express");
const {
  getPublicAffiliateDigitalCard,
} = require("../controllers/affiliateController");

const router = express.Router();

router.get("/affiliates/:token/card", getPublicAffiliateDigitalCard);

module.exports = router;

const express = require("express");
const { authRequired } = require("../middleware/auth");
const { createAttributedSale } = require("../controllers/salesController");
const { invalidateBusinessResponseCache } = require("../middleware/businessResponseCache");

const router = express.Router();

router.post("/redemptions/:id/attributed-sale", authRequired, invalidateBusinessResponseCache(), createAttributedSale);

module.exports = router;

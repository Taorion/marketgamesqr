const express = require("express");
const { authRequired } = require("../middleware/auth");
const { createAttributedSale } = require("../controllers/salesController");

const router = express.Router();

router.post("/redemptions/:id/attributed-sale", authRequired, createAttributedSale);

module.exports = router;

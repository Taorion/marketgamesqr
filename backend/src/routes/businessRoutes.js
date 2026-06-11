const express = require("express");
const { businessRedemptions } = require("../controllers/businessController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/:id/redemptions", authRequired, businessRedemptions);

module.exports = router;

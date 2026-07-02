const express = require("express");
const { submitContact } = require("../controllers/contactController");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/contact", rateLimit({ keyPrefix: "public-contact", max: 5, windowMs: 15 * 60_000 }), submitContact);

module.exports = router;

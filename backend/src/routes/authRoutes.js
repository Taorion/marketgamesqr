const express = require("express");
const { authRequired } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");
const {
  login,
  requestPasswordReset,
  resetPassword,
  changePassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", rateLimit({ keyPrefix: "login", max: 8, windowMs: 15 * 60_000 }), login);
router.post("/password/request-reset", rateLimit({ keyPrefix: "password-reset-request", max: 5, windowMs: 15 * 60_000 }), requestPasswordReset);
router.post("/password/reset", rateLimit({ keyPrefix: "password-reset", max: 8, windowMs: 15 * 60_000 }), resetPassword);
router.post("/password/change", authRequired, rateLimit({ keyPrefix: "password-change", max: 8, windowMs: 15 * 60_000 }), changePassword);

module.exports = router;

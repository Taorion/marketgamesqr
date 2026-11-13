const express = require("express");
const { authRequired } = require("../middleware/auth");
const { rateLimit, emailRateLimit } = require("../middleware/rateLimit");
const {
  login,
  me,
  requestPasswordReset,
  resetPassword,
  changePassword,
} = require("../controllers/authController");

const router = express.Router();

const credentialLimit=emailRateLimit({keyPrefix:'login-email',max:8,windowMs:15*60_000});
router.post("/login", rateLimit({ keyPrefix: "login", max: 8, windowMs: 15 * 60_000 }), credentialLimit, login);
router.post('/admin/login',rateLimit({keyPrefix:'login',max:8,windowMs:15*60_000}),credentialLimit,(req,res,next)=>login(req,res,next,false,true));
router.post("/demo/login", rateLimit({keyPrefix:"login",max:8,windowMs:15*60_000}), credentialLimit, (req,res,next)=>login(req,res,next,true));
router.get("/me", authRequired, me);
router.post("/password/request-reset", rateLimit({ keyPrefix: "password-reset-request", max: 5, windowMs: 15 * 60_000 }), emailRateLimit({keyPrefix:'reset-email',max:5,windowMs:15*60_000}), requestPasswordReset);
router.post("/password/reset", rateLimit({ keyPrefix: "password-reset", max: 8, windowMs: 15 * 60_000 }), resetPassword);
router.post("/password/change", authRequired, rateLimit({ keyPrefix: "password-change", max: 8, windowMs: 15 * 60_000 }), changePassword);

module.exports = router;

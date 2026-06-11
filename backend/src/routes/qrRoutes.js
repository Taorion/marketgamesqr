const express = require("express");
const { generate, validateQr, redeem, myQrCredits } = require("../controllers/qrController");
const { authRequired } = require("../middleware/auth");
const { optionalGameApiKey } = require("../middleware/gameApiKey");

const router = express.Router();

router.post("/generate", optionalGameApiKey, (req, res, next) => {
  if (req.gameAuth) {
    return generate(req, res, next);
  }
  return authRequired(req, res, (error) => {
    if (error) {
      return next(error);
    }
    return generate(req, res, next);
  });
});
router.get("/validate/:token", authRequired, validateQr);
router.post("/redeem/:token", authRequired, redeem);
router.get("/credits/me", authRequired, myQrCredits);

module.exports = router;

const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  create,
  list,
  patchStatus,
} = require("../controllers/digitalAssetController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));

router.get("/", list);
router.post("/", create);
router.patch("/:id/status", patchStatus);

module.exports = router;

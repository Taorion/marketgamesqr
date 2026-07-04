const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  create,
  detail,
  exportCsv,
  list,
  patchStatus,
} = require("../controllers/leadCaptureController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));

router.get("/", list);
router.post("/", create);
router.get("/:id", detail);
router.patch("/:id/status", patchStatus);
router.get("/:id/export.csv", exportCsv);

module.exports = router;

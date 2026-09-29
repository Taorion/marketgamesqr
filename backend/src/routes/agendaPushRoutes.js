const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const { requirePortalAccess, requireBusinessFeature } = require("../middleware/subscription");
const { rateLimit } = require("../middleware/rateLimit");
const { env } = require("../config/env");
const { pool } = require("../config/db");
const push = require("../services/agendaPushService");

const router = express.Router();
router.use(authRequired, requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES", "ADMIN_Qori"));
router.get("/config", (_req, res) => res.json({
  enabled: push.pushConfigured(), public_key: push.pushConfigured() ? env.agendaPushPublicKey : null,
  offsets_minutes: push.OFFSETS,
}));
// Revocation remains available even if a plan no longer permits agenda access.
router.delete("/subscription", async (req, res) => {
  await push.unsubscribe(req.user, req.body?.endpoint);
  res.json({ ok: true });
});
router.post("/status", async (req, res) => {
  const { rowCount } = await pool.query(
    `select 1 from agenda_push_subscriptions where user_id = $1 and business_id = $2
       and endpoint = $3 and active and password_version = $4`,
    [req.user.id, req.user.business_id, String(req.body?.endpoint || ""), Number(req.user.password_version || 0)]
  );
  res.json({ active: Boolean(rowCount) });
});
router.use(requirePortalAccess, requireBusinessFeature("contact_directory"), requireBusinessFeature("agenda"));
router.post("/subscription", rateLimit({ keyPrefix: "agenda-push-subscribe", max: 15 }), async (req, res) => {
  res.json(await push.subscribe(req.user, req.body || {}));
});
router.post("/test", rateLimit({ keyPrefix: "agenda-push-test", max: 3 }), async (req, res) => {
  await push.sendTest(req.user, req.body?.endpoint);
  res.json({ ok: true });
});
module.exports = router;

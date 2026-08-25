const express = require("express");
const { show, unsubscribe } = require("../controllers/publicCommunicationPreferenceController");

const router = express.Router();
router.get("/communications/unsubscribe/:token", show);
router.post("/communications/unsubscribe/:token", unsubscribe);

module.exports = router;

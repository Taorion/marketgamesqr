const express = require("express");
const { gamePlayers } = require("../controllers/gameController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/:id/players", authRequired, gamePlayers);

module.exports = router;

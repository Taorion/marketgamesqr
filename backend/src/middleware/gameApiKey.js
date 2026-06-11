const bcrypt = require("bcryptjs");
const { query } = require("../config/db");

async function optionalGameApiKey(req, _res, next) {
  try {
    const apiKey = req.headers["x-game-api-key"];
    if (!apiKey) {
      return next();
    }

    const { game_id: gameId } = req.body || {};
    if (!gameId) {
      return next();
    }

    const result = await query(
      `select id, business_id, api_key_hash, is_active
       from games
       where id = $1`,
      [gameId]
    );
    const game = result.rows[0];
    if (game && game.is_active && game.api_key_hash && await bcrypt.compare(String(apiKey), game.api_key_hash)) {
      req.gameAuth = game;
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { optionalGameApiKey };

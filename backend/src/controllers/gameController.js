const { query } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { forbidden, notFound } = require("../utils/http");

async function gamePlayers(req, res, next) {
  try {
    const game = await query("select id, business_id, name from games where id = $1", [req.params.id]);
    if (!game.rowCount) {
      throw notFound("Game not found.");
    }
    if (!canAccessBusiness(req.user, game.rows[0].business_id)) {
      throw forbidden("You cannot view players for this game.");
    }

    const players = await query(
      `select id, external_id, name, email, phone, document_id, created_at, metadata
       from players
       where game_id = $1
       order by created_at desc
       limit 500`,
      [req.params.id]
    );

    res.json({ game: game.rows[0], players: players.rows });
  } catch (error) {
    next(error);
  }
}

module.exports = { gamePlayers };

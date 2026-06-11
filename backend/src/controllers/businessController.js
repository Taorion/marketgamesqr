const { query } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { forbidden } = require("../utils/http");

async function businessRedemptions(req, res, next) {
  try {
    const businessId = req.params.id;
    if (!canAccessBusiness(req.user, businessId)) {
      throw forbidden("You cannot view redemptions for this business.");
    }

    const result = await query(
      `select
         rd.id,
         rd.redeemed_at,
         rd.qr_code_id,
         rw.name as reward_name,
         p.name as player_name,
         p.email as player_email,
         p.phone as player_phone,
         u.full_name as redeemed_by
       from redemptions rd
       join rewards rw on rw.id = rd.reward_id
       join players p on p.id = rd.player_id
       left join app_users u on u.id = rd.redeemed_by_user_id
       where rd.business_id = $1
       order by rd.redeemed_at desc
       limit 200`,
      [businessId]
    );

    res.json({ redemptions: result.rows });
  } catch (error) {
    next(error);
  }
}

module.exports = { businessRedemptions };

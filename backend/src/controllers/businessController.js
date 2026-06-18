const { query } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { forbidden } = require("../utils/http");
const { getBusinessSubscription } = require("../services/subscriptionService");

const PREPAID_HISTORY_SAMPLE_LIMIT = 20;

async function businessRedemptions(req, res, next) {
  try {
    const businessId = req.params.id;
    if (!canAccessBusiness(req.user, businessId)) {
      throw forbidden("You cannot view redemptions for this business.");
    }

    const subscription = await getBusinessSubscription(businessId);
    const isPrepaid = subscription.plan.category === "prepaid";
    const limit = isPrepaid ? PREPAID_HISTORY_SAMPLE_LIMIT : 200;
    const [result, countResult] = await Promise.all([
      query(
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
         limit $2`,
        [businessId, limit]
      ),
      query("select count(*)::int as total from redemptions where business_id = $1", [businessId]),
    ]);
    const total = Number(countResult.rows[0]?.total || 0);

    res.json({
      redemptions: result.rows,
      lead_gate: isPrepaid
        ? {
            locked: true,
            sample_limit: PREPAID_HISTORY_SAMPLE_LIMIT,
            total_available: total,
            hidden_count: Math.max(0, total - result.rows.length),
            upgrade_url: "/paquetes/?mode=portal&plan=STARTER",
            title: "Tu historial ya probo valor. Desbloquea el portal.",
            message: `El acceso legacy solo muestra ${PREPAID_HISTORY_SAMPLE_LIMIT} registros recientes. Compra T200 para activar Portal Base o sube a Growth/Premium para historial completo, exportaciones y revenue avanzado.`,
          }
        : {
            locked: false,
            sample_limit: null,
            total_available: total,
            hidden_count: 0,
          },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { businessRedemptions };

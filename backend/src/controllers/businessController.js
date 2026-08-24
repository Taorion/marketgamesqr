const { query } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { forbidden } = require("../utils/http");
const {
  assertStandaloneBusinessFeature,
  getBusinessSubscription,
} = require("../services/subscriptionService");

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

async function validatorHistory(req, res, next) {
  try {
    const businessId = req.params.id;
    if (!canAccessBusiness(req.user, businessId)) {
      throw forbidden("No puedes consultar el historial de este negocio.");
    }
    const subscription = await assertStandaloneBusinessFeature(req.user, businessId, "qr_validator");
    const requestedLimit = Math.max(1, Math.min(Number(req.query.limit || 120), 200));
    const limit = subscription.plan.category === "prepaid"
      ? Math.min(requestedLimit, PREPAID_HISTORY_SAMPLE_LIMIT)
      : requestedLimit;

    const [historyResult, summaryResult] = await Promise.all([
      query(
        `select *
         from (
           select
             rd.id,
             'qr'::text as kind,
             rd.redeemed_at,
             coalesce(rw.name, q.benefit_value->>'label', 'Beneficio QR') as reward_name,
             coalesce(p.name, p.email, p.phone, 'Cliente sin identificar') as customer_name,
             p.email as customer_email,
             p.phone as customer_phone,
             p.document_id as customer_document,
             coalesce(br.name, 'Sin sede') as location_name,
             coalesce(u.full_name, u.email, 'Usuario no disponible') as redeemed_by,
             c.name as campaign_name,
             q.origin_type::text as source_label,
             q.id::text as reference,
             null::text as invoice_number,
             coalesce(s.sale_amount, 0)::numeric as sale_amount,
             null::numeric as redeemed_value,
             null::numeric as balance_after,
             (s.id is not null) as sale_recorded,
             null::boolean as document_match,
             coalesce(s.purchase_subtotal, s.sale_amount, 0)::numeric as purchase_subtotal,
             coalesce(s.benefit_discount_amount, 0)::numeric as benefit_discount_amount,
             coalesce(s.application_summary, rd.metadata->'benefit_application', '{}'::jsonb) as application_summary
           from redemptions rd
           join qr_codes q on q.id = rd.qr_code_id
           left join rewards rw on rw.id = rd.reward_id
           left join players p on p.id = rd.player_id
           left join app_users u on u.id = rd.redeemed_by_user_id
           left join branches br on br.id = rd.branch_id
           left join campaigns c on c.id = rd.campaign_id
           left join attributed_sales s on s.redemption_id = rd.id
           where rd.business_id = $1

           union all

           select
             rpr.id,
             'reward_pass'::text as kind,
             rpr.redeemed_at,
             concat('Reward Pass ', rp.public_code) as reward_name,
             coalesce(rp.beneficiary_name, rp.beneficiary_email, rp.beneficiary_phone, 'Beneficiario') as customer_name,
             rp.beneficiary_email as customer_email,
             rp.beneficiary_phone as customer_phone,
             rp.beneficiary_document as customer_document,
             coalesce(rpr.branch, rp.authorized_branch, 'Sin sede') as location_name,
             coalesce(u.full_name, u.email, 'Usuario no disponible') as redeemed_by,
             c.name as campaign_name,
             'REWARD_PASS'::text as source_label,
             rp.public_code as reference,
             rpr.invoice_number,
             coalesce(rpr.purchase_value_cop, 0)::numeric as sale_amount,
             rpr.redeemed_value_cop::numeric as redeemed_value,
             rpr.balance_after_cop::numeric as balance_after,
             true as sale_recorded,
             rpr.document_match,
             coalesce(rpr.purchase_value_cop, 0)::numeric as purchase_subtotal,
             0::numeric as benefit_discount_amount,
             jsonb_build_object('mode', 'REWARD_PASS', 'summary', 'Reward Pass aplicado a la compra') as application_summary
           from reward_pass_redemptions rpr
           join reward_passes rp on rp.id = rpr.reward_pass_id
           left join app_users u on u.id = rpr.cashier_user_id
           left join campaigns c on c.id = rp.campaign_id
           where rpr.company_id = $1
         ) validator_history
         order by redeemed_at desc, id desc
         limit $2`,
        [businessId, limit]
      ),
      query(
        `select
           (select count(*) from redemptions where business_id = $1)::int as qr_redemptions,
           (select count(*) from reward_pass_redemptions where company_id = $1)::int as reward_pass_redemptions,
           (
             select count(*) from (
               select redeemed_at from redemptions where business_id = $1
               union all
               select redeemed_at from reward_pass_redemptions where company_id = $1
             ) today_rows
             where redeemed_at >= current_date
           )::int as today_redemptions,
           (
             coalesce((select sum(sale_amount) from attributed_sales where business_id = $1), 0)
             + coalesce((select sum(purchase_value_cop) from reward_pass_redemptions where company_id = $1), 0)
           )::numeric as attributed_revenue_cop`,
        [businessId]
      ),
    ]);

    const summary = summaryResult.rows[0] || {};
    const total = Number(summary.qr_redemptions || 0) + Number(summary.reward_pass_redemptions || 0);
    res.json({
      history: historyResult.rows,
      summary: {
        total,
        today: Number(summary.today_redemptions || 0),
        qr_redemptions: Number(summary.qr_redemptions || 0),
        reward_pass_redemptions: Number(summary.reward_pass_redemptions || 0),
        attributed_revenue_cop: Number(summary.attributed_revenue_cop || 0),
      },
      gate: subscription.plan.category === "prepaid"
        ? {
            locked: total > limit,
            sample_limit: limit,
            hidden_count: Math.max(0, total - historyResult.rows.length),
          }
        : { locked: false, sample_limit: null, hidden_count: 0 },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { businessRedemptions, validatorHistory };

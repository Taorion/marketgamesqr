const { query } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { forbidden } = require("../utils/http");
const { getBusinessSubscription } = require("../services/subscriptionService");

function countBy(rows, field) {
  return rows.reduce((accumulator, row) => {
    const value = row[field] || "Sin respuesta";
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
}

function initHourBuckets() {
  return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
}

function initLastDays(days = 14) {
  const buckets = [];
  const today = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    buckets.push({
      date: date.toISOString().slice(0, 10),
      count: 0,
    });
  }
  return buckets;
}

function initWeekdayBuckets() {
  return [
    { dow: 1, label: "Lun", count: 0 },
    { dow: 2, label: "Mar", count: 0 },
    { dow: 3, label: "Mie", count: 0 },
    { dow: 4, label: "Jue", count: 0 },
    { dow: 5, label: "Vie", count: 0 },
    { dow: 6, label: "Sab", count: 0 },
    { dow: 0, label: "Dom", count: 0 },
  ];
}

async function businessDashboard(req, res, next) {
  try {
    const businessId = req.params.id;
    if (!canAccessBusiness(req.user, businessId)) {
      throw forbidden("You cannot view this business dashboard.");
    }

    const [
      summary,
      rewards,
      recentRedemptions,
      questionnaireRows,
      recentPlayers,
      qrByHour,
      redemptionsByHour,
      leadsByDay,
      redemptionsByDay,
      salesByDay,
      qrByWeekday,
      redemptionsByWeekday,
      qrStatus,
      campaignPerformance,
      originPerformance,
      branchPerformance,
      paymentMethods,
      acquisitionSourcePerformance,
      recentAcquisitionSales,
      businessSalesByDay,
      validationByHour,
      claimsByDay,
      claimsByHour,
      strategicSummary,
    ] = await Promise.all([
      query(
        `select
           count(distinct p.id)::int as players,
           count(distinct q.id)::int as qr_generated,
           count(distinct rd.id)::int as redemptions,
           count(distinct case when q.status = 'ACTIVE' then q.id end)::int as active_qr,
           count(distinct case when q.status = 'REDEEMED' then q.id end)::int as redeemed_qr,
           count(distinct case when q.status = 'EXPIRED' then q.id end)::int as expired_qr,
           count(distinct case when q.origin_type = 'POST_SALE' then q.id end)::int as post_sale_qr,
           count(distinct case when q.origin_type = 'POST_SALE' and q.status = 'REDEEMED' then q.id end)::int as post_sale_redeemed,
           count(distinct case when q.origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD') then q.id end)::int as strategic_qr,
           count(distinct case when q.origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD') and q.status = 'UNCLAIMED' then q.id end)::int as strategic_unclaimed,
           count(distinct case when q.origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD') and q.status in ('CLAIMED', 'ACTIVE', 'REDEEMED') then q.id end)::int as strategic_claimed_or_active,
           count(distinct case when q.origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD') and q.status = 'REDEEMED' then q.id end)::int as strategic_redeemed
         from businesses b
         left join players p on p.business_id = b.id
         left join qr_codes q on q.business_id = b.id
         left join redemptions rd on rd.business_id = b.id
         where b.id = $1`,
        [businessId]
      ),
      query(
        `select
           coalesce(rw.name, q.benefit_value->>'label', 'Beneficio estrategico') as name,
           count(distinct q.id)::int as generated,
           count(distinct rd.id)::int as redeemed
         from qr_codes q
         left join rewards rw on rw.id = q.reward_id
         left join redemptions rd on rd.qr_code_id = q.id
         where q.business_id = $1
         group by coalesce(rw.name, q.benefit_value->>'label', 'Beneficio estrategico')
         order by generated desc, name asc`,
        [businessId]
      ),
      query(
        `select
           rd.redeemed_at,
           coalesce(rw.name, q.benefit_value->>'label', 'Beneficio estrategico') as reward_name,
           q.origin_type,
           p.name as player_name,
           p.document_id,
           p.phone,
           u.full_name as validator
         from redemptions rd
         join qr_codes q on q.id = rd.qr_code_id
         left join rewards rw on rw.id = rd.reward_id
         left join players p on p.id = rd.player_id
         left join app_users u on u.id = rd.redeemed_by_user_id
         where rd.business_id = $1
         order by rd.redeemed_at desc
         limit 20`,
        [businessId]
      ),
      query(
        `select
           qu.answers,
           qu.created_at,
           p.name,
           p.document_id,
           p.phone,
           p.email
         from questionnaires qu
         join players p on p.id = qu.player_id
         where qu.business_id = $1
         order by qu.created_at desc
         limit 500`,
        [businessId]
      ),
      query(
        `select name, document_id, phone, email, created_at
         from players
         where business_id = $1
         order by created_at desc
       limit 25`,
        [businessId]
      ),
      query(
        `select extract(hour from created_at)::int as hour, count(*)::int as count
         from qr_codes
         where business_id = $1
         group by hour
         order by hour`,
        [businessId]
      ),
      query(
        `select extract(hour from redeemed_at)::int as hour, count(*)::int as count
         from redemptions
         where business_id = $1
         group by hour
         order by hour`,
        [businessId]
      ),
      query(
        `select to_char(created_at::date, 'YYYY-MM-DD') as date, count(*)::int as count
         from players
         where business_id = $1 and created_at >= now() - interval '14 days'
         group by created_at::date
         order by created_at::date`,
        [businessId]
      ),
      query(
        `select to_char(redeemed_at::date, 'YYYY-MM-DD') as date, count(*)::int as count
         from redemptions
         where business_id = $1 and redeemed_at >= now() - interval '14 days'
         group by redeemed_at::date
         order by redeemed_at::date`,
        [businessId]
      ),
      query(
        `select to_char(created_at::date, 'YYYY-MM-DD') as date,
                count(*)::int as sales,
                coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue
         from attributed_sales
         where business_id = $1 and created_at >= now() - interval '14 days'
         group by created_at::date
         order by created_at::date`,
        [businessId]
      ),
      query(
        `select extract(dow from created_at)::int as dow, count(*)::int as count
         from qr_codes
         where business_id = $1
         group by dow
         order by dow`,
        [businessId]
      ),
      query(
        `select extract(dow from redeemed_at)::int as dow, count(*)::int as count
         from redemptions
         where business_id = $1
         group by dow
         order by dow`,
        [businessId]
      ),
      query(
        `select status, count(*)::int as count
         from qr_codes
         where business_id = $1
         group by status
         order by status`,
        [businessId]
      ),
      query(
        `select
           coalesce(c.name, 'Sin campana') as campaign_name,
           count(distinct q.id)::int as qr_generated,
           count(distinct rd.id)::int as redemptions,
           count(distinct p.id)::int as leads
         from qr_codes q
         left join campaigns c on c.id = q.campaign_id
         left join redemptions rd on rd.qr_code_id = q.id
         left join players p on p.id = q.player_id
         where q.business_id = $1
         group by c.name
         order by qr_generated desc
         limit 8`,
        [businessId]
      ),
      query(
        `select
           q.origin_type,
           count(distinct q.id)::int as qr_generated,
           count(distinct qc.id)::int as claims,
           count(distinct rd.id)::int as redemptions
         from qr_codes q
         left join qr_claims qc on qc.qr_code_id = q.id
         left join redemptions rd on rd.qr_code_id = q.id
         where q.business_id = $1
         group by q.origin_type
         order by qr_generated desc, q.origin_type asc`,
        [businessId]
      ),
      query(
        `select
           coalesce(br.name, 'Sin sucursal') as branch_name,
           coalesce(br.address, 'Sin direccion') as address,
           count(distinct rd.id)::int as redemptions,
           count(distinct s.id)::int as sales,
           coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
         from redemptions rd
         left join branches br on br.id = rd.branch_id
         left join attributed_sales s on s.redemption_id = rd.id
         where rd.business_id = $1
         group by br.id, br.name, br.address
         order by revenue desc, redemptions desc, branch_name asc`,
        [businessId]
      ),
      query(
        `select coalesce(payment_method, 'Sin especificar') as payment_method,
                count(*)::int as count,
                coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue
         from attributed_sales
         where business_id = $1
         group by payment_method
         order by revenue desc, count desc`,
        [businessId]
      ),
      query(
        `select
           coalesce(acquisition_source, 'OTHER') as acquisition_source,
           coalesce(nullif(acquisition_channel, ''), 'Sin canal especifico') as acquisition_channel,
           count(*)::int as count,
           coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue,
           coalesce(sum(referral_points_awarded), 0)::int as referral_points_awarded
         from business_sales
         where business_id = $1 and acquisition_source is not null
         group by coalesce(acquisition_source, 'OTHER'), coalesce(nullif(acquisition_channel, ''), 'Sin canal especifico')
         order by revenue desc, count desc`,
        [businessId]
      ),
      query(
        `select
           bs.id,
           bs.customer_name,
           bs.customer_phone,
           bs.customer_email,
           bs.product_name,
           bs.sale_amount,
           bs.currency,
           bs.acquisition_source,
           bs.acquisition_channel,
           bs.referral_points_awarded,
           bs.notes,
           bs.created_at,
           a.full_name as referred_affiliate_name
         from business_sales bs
         left join affiliates a on a.id = bs.referred_affiliate_id
         where bs.business_id = $1
         order by bs.created_at desc
         limit 25`,
        [businessId]
      ),
      query(
        `select to_char(created_at::date, 'YYYY-MM-DD') as date,
                count(*)::int as sales,
                coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue
         from business_sales
         where business_id = $1 and created_at >= now() - interval '14 days'
         group by created_at::date
         order by created_at::date`,
        [businessId]
      ),
      query(
        `select extract(hour from created_at)::int as hour, count(*)::int as count
         from validation_logs
         where business_id = $1
         group by hour
         order by hour`,
        [businessId]
      ),
      query(
        `select to_char(claimed_at::date, 'YYYY-MM-DD') as date, count(*)::int as count
         from qr_claims
         where business_id = $1 and claimed_at >= now() - interval '14 days'
         group by claimed_at::date
         order by claimed_at::date`,
        [businessId]
      ),
      query(
        `select extract(hour from claimed_at)::int as hour, count(*)::int as count
         from qr_claims
         where business_id = $1
         group by hour
         order by hour`,
        [businessId]
      ),
      query(
        `select
           count(*) filter (where origin_type = 'POST_SALE')::int as post_sale_generated,
           count(*) filter (where origin_type = 'POST_SALE' and status = 'REDEEMED')::int as post_sale_redeemed,
           count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD'))::int as strategic_generated,
           count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD') and status = 'UNCLAIMED')::int as strategic_unclaimed,
           count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD') and status in ('CLAIMED', 'ACTIVE', 'REDEEMED'))::int as strategic_claimed_or_active,
           count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD') and status = 'REDEEMED')::int as strategic_redeemed,
           count(distinct batch_id)::int as strategic_batches
         from qr_codes
         where business_id = $1`,
        [businessId]
      ),
    ]);

    const answerRows = questionnaireRows.rows.map((row) => ({
      ...row,
      favorite_product: row.answers.favorite_product,
      purchase_frequency: row.answers.purchase_frequency,
      preferred_channel: row.answers.preferred_channel,
      price_sensitivity: row.answers.price_sensitivity,
      wants_samples: row.answers.wants_samples,
      campaign_label: row.answers.campaign_label,
      source: row.answers.source,
    }));

    const qrHourBuckets = initHourBuckets();
    qrByHour.rows.forEach((row) => {
      qrHourBuckets[row.hour].count = row.count;
    });
    const redemptionHourBuckets = initHourBuckets();
    redemptionsByHour.rows.forEach((row) => {
      redemptionHourBuckets[row.hour].count = row.count;
    });

    const leadDayBuckets = initLastDays();
    leadsByDay.rows.forEach((row) => {
      const bucket = leadDayBuckets.find((item) => item.date === row.date);
      if (bucket) bucket.count = row.count;
    });
    const redemptionDayBuckets = initLastDays();
    redemptionsByDay.rows.forEach((row) => {
      const bucket = redemptionDayBuckets.find((item) => item.date === row.date);
      if (bucket) bucket.count = row.count;
    });
    const salesDayBuckets = initLastDays();
    salesByDay.rows.forEach((row) => {
      const bucket = salesDayBuckets.find((item) => item.date === row.date);
      if (bucket) {
        bucket.count = row.sales;
        bucket.revenue = Number(row.revenue || 0);
      }
    });
    businessSalesByDay.rows.forEach((row) => {
      const bucket = salesDayBuckets.find((item) => item.date === row.date);
      if (bucket) {
        bucket.count = row.sales;
        bucket.revenue = Number(row.revenue || 0);
      }
    });
    const claimsDayBuckets = initLastDays();
    claimsByDay.rows.forEach((row) => {
      const bucket = claimsDayBuckets.find((item) => item.date === row.date);
      if (bucket) bucket.count = row.count;
    });

    const qrWeekdayBuckets = initWeekdayBuckets();
    qrByWeekday.rows.forEach((row) => {
      const bucket = qrWeekdayBuckets.find((item) => item.dow === row.dow);
      if (bucket) bucket.count = row.count;
    });
    const redemptionWeekdayBuckets = initWeekdayBuckets();
    redemptionsByWeekday.rows.forEach((row) => {
      const bucket = redemptionWeekdayBuckets.find((item) => item.dow === row.dow);
      if (bucket) bucket.count = row.count;
    });
    const validationHourBuckets = initHourBuckets();
    validationByHour.rows.forEach((row) => {
      validationHourBuckets[row.hour].count = row.count;
    });
    const claimHourBuckets = initHourBuckets();
    claimsByHour.rows.forEach((row) => {
      claimHourBuckets[row.hour].count = row.count;
    });

    const summaryRow = summary.rows[0];
    const redemptionRate = summaryRow.qr_generated
      ? Number(((summaryRow.redemptions / summaryRow.qr_generated) * 100).toFixed(1))
      : 0;
    const strategicSummaryRow = strategicSummary.rows[0] || {};
    const postSaleRate = Number(summaryRow.post_sale_qr || 0)
      ? Number(((Number(summaryRow.post_sale_redeemed || 0) / Number(summaryRow.post_sale_qr || 0)) * 100).toFixed(1))
      : 0;
    const strategicClaimRate = Number(strategicSummaryRow.strategic_generated || 0)
      ? Number(((Number(strategicSummaryRow.strategic_claimed_or_active || 0) / Number(strategicSummaryRow.strategic_generated || 0)) * 100).toFixed(1))
      : 0;
    const strategicRedemptionRate = Number(strategicSummaryRow.strategic_generated || 0)
      ? Number(((Number(strategicSummaryRow.strategic_redeemed || 0) / Number(strategicSummaryRow.strategic_generated || 0)) * 100).toFixed(1))
      : 0;

    res.json({
      subscription: await getBusinessSubscription(businessId),
      summary: summary.rows[0],
      derived: {
        redemption_rate: redemptionRate,
        post_sale_redemption_rate: postSaleRate,
        strategic_claim_rate: strategicClaimRate,
        strategic_redemption_rate: strategicRedemptionRate,
      },
      strategic_summary: strategicSummaryRow,
      rewards: rewards.rows,
      recent_redemptions: recentRedemptions.rows,
      recent_players: recentPlayers.rows,
      time_stats: {
        qr_by_hour: qrHourBuckets,
        redemptions_by_hour: redemptionHourBuckets,
        leads_by_day: leadDayBuckets,
        redemptions_by_day: redemptionDayBuckets,
        sales_by_day: salesDayBuckets,
        claims_by_day: claimsDayBuckets,
        qr_by_weekday: qrWeekdayBuckets,
        redemptions_by_weekday: redemptionWeekdayBuckets,
        validations_by_hour: validationHourBuckets,
        claims_by_hour: claimHourBuckets,
      },
      qr_status: qrStatus.rows,
      campaign_performance: campaignPerformance.rows,
      origin_performance: originPerformance.rows,
      branch_performance: branchPerformance.rows,
      payment_methods: paymentMethods.rows,
      acquisition_sources: acquisitionSourcePerformance.rows,
      recent_acquisition_sales: recentAcquisitionSales.rows,
      answer_stats: {
        favorite_product: countBy(answerRows, "favorite_product"),
        purchase_frequency: countBy(answerRows, "purchase_frequency"),
        preferred_channel: countBy(answerRows, "preferred_channel"),
        price_sensitivity: countBy(answerRows, "price_sensitivity"),
        wants_samples: countBy(answerRows, "wants_samples"),
        campaign_label: countBy(answerRows, "campaign_label"),
        source: countBy(answerRows, "source"),
      },
      answers: answerRows.slice(0, 100),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { businessDashboard };

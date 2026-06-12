const { query } = require("../config/db");

function safeDivide(numerator, denominator) {
  const top = Number(numerator || 0);
  const bottom = Number(denominator || 0);
  if (!bottom) {
    return null;
  }
  return Number((top / bottom).toFixed(2));
}

function safeRate(numerator, denominator) {
  const value = safeDivide(numerator, denominator);
  return value === null ? 0 : Number((value * 100).toFixed(1));
}

function safeRoi(revenue, budget) {
  const totalBudget = Number(budget || 0);
  if (!totalBudget) {
    return null;
  }
  return Number(((Number(revenue || 0) - totalBudget) / totalBudget).toFixed(2));
}

function normalizeCampaign(row) {
  return {
    ...row,
    budget_total: Number(row.budget_total || 0),
    expected_sales_goal: row.expected_sales_goal === null ? null : Number(row.expected_sales_goal || 0),
    expected_leads_goal: row.expected_leads_goal === null ? null : Number(row.expected_leads_goal || 0),
    expected_redemptions_goal: row.expected_redemptions_goal === null ? null : Number(row.expected_redemptions_goal || 0),
    launch_channels: Array.isArray(row.launch_channels) ? row.launch_channels : [],
    delivered_assets: row.delivered_assets || {},
    attributed_revenue: Number(row.attributed_revenue || 0),
    baseline_sales: Number(row.baseline_sales || 0),
    campaign_period_sales: Number(row.campaign_period_sales || 0),
    after_sales: Number(row.after_sales || 0),
    total_investment: Number(row.budget_total || 0),
    total_leads: Number(row.total_leads || 0),
    total_qr_generated: Number(row.total_qr_generated || 0),
    total_qr_redeemed: Number(row.total_qr_redeemed || 0),
    direct_sales_count: Number(row.direct_sales_count || 0),
    attributed_sales_count: Number(row.direct_sales_count || 0),
  };
}

function decorateCampaignMetrics(rawRow) {
  const row = normalizeCampaign(rawRow);
  const salesUplift = Number((row.campaign_period_sales - row.baseline_sales).toFixed(2));

  return {
    ...row,
    redemption_rate: safeRate(row.total_qr_redeemed, row.total_qr_generated),
    cost_per_lead: safeDivide(row.budget_total, row.total_leads),
    cost_per_redeemed_qr: safeDivide(row.budget_total, row.total_qr_redeemed),
    cost_per_acquired_customer: safeDivide(row.budget_total, row.direct_sales_count),
    estimated_roi: safeRoi(row.attributed_revenue, row.budget_total),
    sales_uplift: salesUplift,
    estimated_uplift_roi: safeRoi(salesUplift, row.budget_total),
  };
}

const campaignMetricsSelect = `
  select
    c.id,
    c.business_id,
    c.name,
    c.slug,
    c.public_slug,
    c.type,
    c.objective,
    c.strategy_summary,
    c.status,
    c.starts_at,
    c.ends_at,
    c.activated_at,
    c.budget_total,
    c.expected_sales_goal,
    c.expected_leads_goal,
    c.expected_redemptions_goal,
    c.launch_channels,
    c.client_notes,
    c.client_setup_completed_at,
    c.delivered_assets,
    c.metadata,
    coalesce((select count(*)::int from players p where p.campaign_id = c.id), 0) as total_leads,
    coalesce((select count(*)::int from qr_codes q where q.campaign_id = c.id), 0) as total_qr_generated,
    coalesce((select count(*)::int from qr_codes q where q.campaign_id = c.id and q.status = 'REDEEMED'), 0) as total_qr_redeemed,
    coalesce((
      select count(*)::int
      from attributed_sales s
      where s.campaign_id = c.id and s.sale_type = 'DIRECT_REDEMPTION'
    ), 0) as direct_sales_count,
    coalesce((select sum(s.sale_amount) from attributed_sales s where s.campaign_id = c.id), 0)::numeric(14, 2) as attributed_revenue,
    coalesce((
      select sum(css.total_sales_amount)
      from campaign_sales_snapshots css
      where css.campaign_id = c.id and css.period_type = 'BEFORE'
    ), 0)::numeric(14, 2) as baseline_sales,
    coalesce((
      select sum(css.total_sales_amount)
      from campaign_sales_snapshots css
      where css.campaign_id = c.id and css.period_type = 'DURING'
    ), 0)::numeric(14, 2) as campaign_period_sales,
    coalesce((
      select sum(css.total_sales_amount)
      from campaign_sales_snapshots css
      where css.campaign_id = c.id and css.period_type = 'AFTER'
    ), 0)::numeric(14, 2) as after_sales
  from campaigns c
`;

async function getCampaignMetrics(campaignId, businessId = null) {
  const result = await query(
    `${campaignMetricsSelect}
     where c.id = $1 and ($2::uuid is null or c.business_id = $2)`,
    [campaignId, businessId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return decorateCampaignMetrics(row);
}

async function getBusinessCampaignMetrics(businessId) {
  const result = await query(
    `${campaignMetricsSelect}
     where c.business_id = $1
     order by c.created_at desc`,
    [businessId]
  );
  return result.rows.map(decorateCampaignMetrics);
}

async function getBusinessSummary(businessId) {
  const campaigns = await getBusinessCampaignMetrics(businessId);
  const totals = campaigns.reduce((acc, campaign) => {
    acc.ready_for_client_setup += campaign.status === "READY_FOR_CLIENT_SETUP" ? 1 : 0;
    acc.scheduled_campaigns += campaign.status === "SCHEDULED" ? 1 : 0;
    acc.active_campaigns += campaign.status === "ACTIVE" ? 1 : 0;
    acc.finished_campaigns += campaign.status === "FINISHED" ? 1 : 0;
    acc.total_leads += campaign.total_leads;
    acc.total_qr_generated += campaign.total_qr_generated;
    acc.total_qr_redeemed += campaign.total_qr_redeemed;
    acc.direct_sales_count += campaign.direct_sales_count;
    acc.attributed_revenue += campaign.attributed_revenue;
    acc.total_investment += campaign.budget_total;
    acc.baseline_sales += campaign.baseline_sales;
    acc.campaign_period_sales += campaign.campaign_period_sales;
    return acc;
  }, {
    ready_for_client_setup: 0,
    scheduled_campaigns: 0,
    active_campaigns: 0,
    finished_campaigns: 0,
    total_leads: 0,
    total_qr_generated: 0,
    total_qr_redeemed: 0,
    direct_sales_count: 0,
    attributed_revenue: 0,
    total_investment: 0,
    baseline_sales: 0,
    campaign_period_sales: 0,
  });

  const strategicResult = await query(
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
  );

  const strategic = strategicResult.rows[0] || {};
  totals.post_sale_generated = Number(strategic.post_sale_generated || 0);
  totals.post_sale_redeemed = Number(strategic.post_sale_redeemed || 0);
  totals.strategic_generated = Number(strategic.strategic_generated || 0);
  totals.strategic_unclaimed = Number(strategic.strategic_unclaimed || 0);
  totals.strategic_claimed_or_active = Number(strategic.strategic_claimed_or_active || 0);
  totals.strategic_redeemed = Number(strategic.strategic_redeemed || 0);
  totals.strategic_batches = Number(strategic.strategic_batches || 0);

  const observedSalesResult = await query(
    `select
       count(*)::int as observed_sales_count,
       coalesce(sum(sale_amount), 0)::numeric(14, 2) as observed_revenue,
       count(*) filter (where referred_affiliate_id is not null)::int as referral_sales_count,
       coalesce(sum(referral_points_awarded), 0)::int as referral_points_awarded
     from business_sales
     where business_id = $1`,
    [businessId]
  );
  const observed = observedSalesResult.rows[0] || {};
  totals.observed_sales_count = Number(observed.observed_sales_count || 0);
  totals.observed_revenue = Number(observed.observed_revenue || 0);
  totals.referral_sales_count = Number(observed.referral_sales_count || 0);
  totals.referral_points_awarded = Number(observed.referral_points_awarded || 0);

  const salesUplift = Number((totals.campaign_period_sales - totals.baseline_sales).toFixed(2));

  return {
    ...totals,
    redemption_rate: safeRate(totals.total_qr_redeemed, totals.total_qr_generated),
    cost_per_lead: safeDivide(totals.total_investment, totals.total_leads),
    cost_per_redeemed_qr: safeDivide(totals.total_investment, totals.total_qr_redeemed),
    cost_per_acquired_customer: safeDivide(totals.total_investment, totals.direct_sales_count),
    cost_per_observed_customer: safeDivide(totals.total_investment, totals.observed_sales_count),
    estimated_roi: safeRoi(totals.attributed_revenue, totals.total_investment),
    observed_roi: safeRoi(totals.observed_revenue, totals.total_investment),
    observed_avg_ticket: safeDivide(totals.observed_revenue, totals.observed_sales_count),
    sales_uplift: salesUplift,
    estimated_uplift_roi: safeRoi(salesUplift, totals.total_investment),
    post_sale_redemption_rate: safeRate(totals.post_sale_redeemed, totals.post_sale_generated),
    strategic_claim_rate: safeRate(totals.strategic_claimed_or_active, totals.strategic_generated),
    strategic_redemption_rate: safeRate(totals.strategic_redeemed, totals.strategic_generated),
  };
}

module.exports = {
  safeDivide,
  safeRate,
  safeRoi,
  getCampaignMetrics,
  getBusinessCampaignMetrics,
  getBusinessSummary,
  decorateCampaignMetrics,
};

const { query } = require("../config/db");

const DEFAULT_AFFILIATE_POINT_AMOUNT_COP = 1000;
const DEFAULT_REFERRAL_POINTS_RATE = 0.2;
const DEFAULT_REFERRAL_ROUNDING = "ceil";

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function referralRounding(value) {
  return value === "floor" ? "floor" : DEFAULT_REFERRAL_ROUNDING;
}

function rulesFromSettings(settings = {}) {
  const affiliatePoints = settings.affiliate_points || {};
  return {
    point_amount_cop: positiveNumber(
      affiliatePoints.point_amount_cop
        ?? affiliatePoints.point_value_cop
        ?? settings.affiliate_point_amount_cop
        ?? settings.affiliate_point_value_cop,
      DEFAULT_AFFILIATE_POINT_AMOUNT_COP
    ),
    referral_rate: positiveNumber(
      affiliatePoints.referral_rate ?? settings.affiliate_referral_points_rate,
      DEFAULT_REFERRAL_POINTS_RATE
    ),
    referral_rounding: referralRounding(affiliatePoints.referral_rounding),
  };
}

async function getAffiliatePointRules(businessId, db = query) {
  const runner = typeof db === "function" ? db : db.query.bind(db);
  const result = await runner(
    "select settings from businesses where id = $1",
    [businessId]
  );
  return rulesFromSettings(result.rows[0]?.settings || {});
}

function affiliatePointsForAmount(amount, rules) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.max(0, Math.floor(value / rules.point_amount_cop));
}

function referralPointsForAmount(amount, rules) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  const rawPoints = (value / rules.point_amount_cop) * rules.referral_rate;
  const roundedPoints = rules.referral_rounding === "floor"
    ? Math.floor(rawPoints)
    : Math.ceil(rawPoints);
  return Math.max(0, roundedPoints);
}

function affiliatePointRuleMetadata(rules) {
  return {
    affiliate_point_amount_cop: rules.point_amount_cop,
    referral_points_rate: rules.referral_rate,
    referral_points_rounding: rules.referral_rounding,
  };
}

module.exports = {
  DEFAULT_AFFILIATE_POINT_AMOUNT_COP,
  DEFAULT_REFERRAL_POINTS_RATE,
  affiliatePointRuleMetadata,
  affiliatePointsForAmount,
  getAffiliatePointRules,
  referralPointsForAmount,
  rulesFromSettings,
};

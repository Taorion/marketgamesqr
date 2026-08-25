const { query } = require("../config/db");

const DEFAULT_AFFILIATE_POINT_AMOUNT_COP = 1000;
const DEFAULT_REFERRAL_POINTS_RATE = 1;
const DEFAULT_REFERRAL_ROUNDING = "floor";
const DEFAULT_REFERRAL_REGISTRATION_POINTS = 0;

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function referralRounding(value) {
  return value === "ceil" ? "ceil" : DEFAULT_REFERRAL_ROUNDING;
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
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
      affiliatePoints.referral_rate
        ?? affiliatePoints.points_per_amount
        ?? settings.affiliate_referral_points_rate,
      DEFAULT_REFERRAL_POINTS_RATE
    ),
    referral_rounding: referralRounding(affiliatePoints.referral_rounding ?? settings.affiliate_referral_points_rounding),
    referral_registration_points: nonNegativeInteger(
      affiliatePoints.referral_registration_points ?? settings.affiliate_referral_registration_points,
      DEFAULT_REFERRAL_REGISTRATION_POINTS
    ),
    referral_purchase_points: nonNegativeInteger(
      affiliatePoints.referral_purchase_points ?? settings.affiliate_referral_purchase_points,
      0
    ),
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
  if (Number(rules?.referral_purchase_points || 0) > 0) {
    return Number(rules.referral_purchase_points);
  }
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  const rawPoints = (value / rules.point_amount_cop) * rules.referral_rate;
  const roundedPoints = rules.referral_rounding === "ceil"
    ? Math.ceil(rawPoints)
    : Math.floor(rawPoints);
  return Math.max(0, roundedPoints);
}

function referralRegistrationPoints(rules) {
  return Math.max(0, Number(rules?.referral_registration_points || 0));
}

function affiliatePointRuleMetadata(rules) {
  return {
    affiliate_point_amount_cop: rules.point_amount_cop,
    referral_points_rate: rules.referral_rate,
    referral_points_rounding: rules.referral_rounding,
    referral_registration_points: rules.referral_registration_points,
    referral_purchase_points: rules.referral_purchase_points,
  };
}

module.exports = {
  DEFAULT_AFFILIATE_POINT_AMOUNT_COP,
  DEFAULT_REFERRAL_POINTS_RATE,
  DEFAULT_REFERRAL_REGISTRATION_POINTS,
  affiliatePointRuleMetadata,
  affiliatePointsForAmount,
  getAffiliatePointRules,
  referralPointsForAmount,
  referralRegistrationPoints,
  rulesFromSettings,
};

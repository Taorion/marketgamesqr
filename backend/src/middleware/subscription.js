const {
  assertFeatureForRequest,
  assertPortalAccess,
  assertLimitForBusiness,
} = require("../services/subscriptionService");

function requirePortalAccess(req, _res, next) {
  assertPortalAccess(req).then(() => next()).catch(next);
}

function requireBusinessFeature(feature, businessIdResolver = (req) => req.user.business_id) {
  return (req, _res, next) => {
    Promise.resolve()
      .then(() => {
        const businessId = businessIdResolver(req);
        return assertFeatureForRequest(req, businessId, feature);
      })
      .then(() => next())
      .catch(next);
  };
}

function requireBusinessLimit(limitKey, currentResolver, label, businessIdResolver = (req) => req.user.business_id) {
  return (req, _res, next) => {
    Promise.resolve()
      .then(async () => {
        const businessId = businessIdResolver(req);
        const current = await currentResolver(req, businessId);
        return assertLimitForBusiness(businessId, limitKey, current, label);
      })
      .then(() => next())
      .catch(next);
  };
}

module.exports = {
  requirePortalAccess,
  requireBusinessFeature,
  requireBusinessLimit,
};

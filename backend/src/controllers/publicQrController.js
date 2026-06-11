const { validate, qrClaimSchema } = require("../utils/validators");
const { getClaimDetails, claimQr } = require("../services/strategicQrService");

async function claimDetails(req, res, next) {
  try {
    res.json(await getClaimDetails(req.params.token));
  } catch (error) {
    next(error);
  }
}

async function claimStrategicQr(req, res, next) {
  try {
    const body = validate(qrClaimSchema, req.body);
    res.json(await claimQr(req.params.token, body));
  } catch (error) {
    next(error);
  }
}

module.exports = { claimDetails, claimStrategicQr };

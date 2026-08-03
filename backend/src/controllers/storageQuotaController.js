const { getStorageSummary } = require("../services/storageQuotaService");

async function storageSummary(req, res, next) {
  try {
    res.json({ storage: await getStorageSummary(req.user.business_id) });
  } catch (error) {
    next(error);
  }
}

module.exports = { storageSummary };

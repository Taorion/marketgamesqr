const { query } = require('../config/db');
const { env } = require('../config/env');
async function releaseDueCommissions(db = { query }, businessId = null) {
  return (await db.query('select qori_release_seller_commissions($1::uuid) released', [businessId])).rows[0].released;
}
function startSellerCommissionWorker() {
  if (!env.databaseConfigured || process.env.SELLER_COMMISSION_WORKER_ENABLED === 'false') return async () => {};
  let inFlight = null;
  const run = () => {
    if (inFlight) return;
    inFlight = releaseDueCommissions().catch(error => console.error('Seller commission release:', error.message)).finally(() => { inFlight = null; });
  };
  const timer = setInterval(run, 60000); timer.unref(); run();
  return async () => { clearInterval(timer); if (inFlight) await inFlight; };
}
module.exports = { releaseDueCommissions, startSellerCommissionWorker };

const { planFromBusiness } = require('./subscriptionService');
const { forbidden, notFound } = require('../utils/http');

// All affiliate writers call this inside the transaction that inserts the row.
async function assertAffiliateCapacity(client, businessId) {
  await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`qori:affiliate-quota:${businessId}`]);
  const business = await client.query('select * from businesses where id = $1 and is_active = true', [businessId]);
  if (!business.rows[0]) throw notFound('Business not found.');
  const plan = planFromBusiness(business.rows[0]);
  if (!plan.features.affiliates || !plan.portal_access_allowed) {
    throw forbidden('Tu plan no permite crear afiliados.');
  }
  const limitKey = 'affiliates';
  const limit = plan.limits[limitKey];
  if (limit === null || limit === undefined) return;
  const count = await client.query(
    `select count(*)::int as total from affiliates
     where business_id = $1 and status <> 'DELETED'`,
    [businessId]
  );
  const current = Number(count.rows[0]?.total || 0);
  if (current >= Number(limit)) {
    const label = 'afiliados';
    throw forbidden(`Tu plan ${plan.name} permite hasta ${limit} ${label}. Alcanzaste el limite.`, {
      plan_gate: { reason: 'limit_reached', limit_key: limitKey, current, limit,
        current_plan_code: plan.code, current_plan_name: plan.name, label },
    });
  }
}

module.exports = { assertAffiliateCapacity };

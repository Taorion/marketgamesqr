const { badRequest } = require('../utils/http');

// Only applies an explicit preference attached to canonical contacts by the orders flow.
// Existing contacts with no such preference keep their current consent checks.
async function assertOrderContactConsent(db, businessId, contacts) {
  const ids = contacts.filter(c => String(c.source_type).toUpperCase() === 'MANUAL').map(c => c.source_id || c.id).filter(Boolean);
  if (!ids.length) return;
  const blocked = await db.query("select 1 from business_manual_leads where business_id=$1 and id=any($2::uuid[]) and metadata->>'catalog_order_marketing_allowed'='false' limit 1", [businessId, ids]);
  if (blocked.rowCount) throw badRequest('Un contacto de pedidos no tiene autorización comercial vigente. Retíralo de este envío; sus datos solo pueden usarse para atender su pedido.');
}
module.exports = { assertOrderContactConsent };

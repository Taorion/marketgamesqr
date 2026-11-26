const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { validate } = require('../utils/validators');
const { badRequest, notFound } = require('../utils/http');
const { requireSuperadmin } = require('./commercialAuthorization');
const { modules, limitLabels } = require('./subscriptionAddons');
const { planFromBusiness } = require('./subscriptionService');
const limitsSchema = z.object(Object.fromEntries(Object.keys(limitLabels).map(k => [k, z.number().int().min(0).max(1000000).optional()]))).strict();
async function context(business, db = { query }) {
  const plan = planFromBusiness(business);
  const payment = (await db.query(`select id,package_code,price_cop,credited_at from qr_credit_purchase_orders
    where business_id=$1 and package_code=$2 and status='APPROVED' and credited_at is not null and price_cop>0
      and metadata->'signup'->>'type' in ('portal_monthly_subscription','portal_annual_subscription','portal_monthly_subscription_auto_renewal')
    order by credited_at desc,id desc limit 1`, [business.id, plan.code])).rows[0] || null;
  const paidActive = business.is_active && !business.archived_at && plan.raw_status === 'ACTIVE'
    && plan.category === 'subscription' && plan.monthly_price_cop > 0 && plan.code !== 'DESCUBRE'
    && (plan.billing_period === 'prepaid' || new Date(plan.current_period_ends_at) > new Date());
  return { eligible: Boolean(paidActive && payment), payment, current: business.settings?.subscription_addons || null,
    modules, limit_labels: limitLabels,
    message: paidActive && payment ? 'Pago confirmado. Puedes añadir módulos y ampliar cupos de este plan.' : 'Primero el negocio debe pagar y activar su plan. La prueba gratuita y los pagos pendientes no habilitan ampliaciones.' };
}
async function update(user, id, payload) {
  requireSuperadmin(user);
  validate(z.string().uuid(), id);
  const body = validate(z.object({
    modules: z.array(z.enum(Object.keys(modules))).max(Object.keys(modules).length),
    limits: limitsSchema, expires_at: z.string().datetime().nullable(),
    expected_updated_at: z.string().datetime(), reason: z.string().trim().min(10).max(1000),
  }).strict(), payload);
  return withTransaction(async db => {
    const business = (await db.query('select * from businesses where id=$1 and archived_at is null for update', [id])).rows[0];
    if (!business) throw notFound('Empresa no encontrada.');
    if (new Date(business.updated_at).getTime() !== new Date(body.expected_updated_at).getTime()) throw badRequest('La cuenta cambió. Actualiza la ficha antes de guardar.');
    const removing = body.modules.length === 0 && Object.keys(body.limits).length === 0;
    const state = await context(business, db);
    if (!removing && !state.eligible) throw badRequest(state.message);
    if (!removing && body.expires_at && new Date(body.expires_at) <= new Date()) throw badRequest('Elige una fecha futura para el vencimiento de los adicionales.');
    const next = removing ? null : { plan_code: business.plan_code, modules: [...new Set(body.modules)], limits: body.limits,
      expires_at: body.expires_at, approved_by: user.id, payment_order_id: state.payment.id, updated_at: new Date().toISOString() };
    await db.query(`update businesses set settings=jsonb_set(coalesce(settings,'{}'::jsonb),'{subscription_addons}',$2::jsonb,true),updated_at=clock_timestamp() where id=$1`, [id, JSON.stringify(next)]);
    await db.query(`insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail)
      values($1,'ACCOUNT_SUBSCRIPTION_ADDONS_UPDATED','business',$2,$3::jsonb)`, [user.id, id, JSON.stringify({ reason: body.reason, before: state.current, after: next, payment_recorded: false })]);
    return { ok: true };
  });
}
module.exports = { context, update };

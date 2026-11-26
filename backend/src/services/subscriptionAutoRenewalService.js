const { pool, query } = require('../config/db');
const { env } = require('../config/env');
const { badRequest, forbidden } = require('../utils/http');
const { getBusinessSubscription } = require('./subscriptionService');
const payments = () => require('./mercadoPagoService');
const TERMINAL = new Set(['CANCELLED', 'EXPIRED']);

// Session locks serialize provider operations across web/worker instances without
// holding a database transaction open during network requests.
async function withBusinessLock(businessId, action) {
  const db = await pool.connect();
  let locked = false;
  try {
    locked = (await db.query("select pg_try_advisory_lock(hashtextextended($1, 0)) locked", ['qori-autorenew:' + businessId])).rows[0].locked;
    if (!locked) throw badRequest('Hay una actualización del cobro automático en curso. Intenta de nuevo en unos segundos.');
    return await action();
  } finally {
    let discard = false;
    if (locked) await db.query('select pg_advisory_unlock(hashtextextended($1, 0))', ['qori-autorenew:' + businessId]).catch(() => { discard = true; });
    db.release(discard);
  }
}

function assertOwner(user) {
  if (!user?.business_id || !['BUSINESS_OWNER', 'ADMIN', 'ADMIN_MARKET_GAMES'].includes(user.role)) {
    throw forbidden('Solo el administrador del negocio puede gestionar el cobro automático.');
  }
}

async function business(businessId) {
  return (await query('select * from businesses where id=$1', [businessId])).rows[0];
}

async function currentMandate(b) {
  if (!b?.mercado_pago_preapproval_id) return null;
  const result = await payments().processPreapprovalWebhook(b.mercado_pago_preapproval_id);
  if (result.ignored) throw badRequest('La autorización requiere revisión antes de continuar.');
  return business(b.id);
}

async function create(user, body) {
  assertOwner(user);
  return withBusinessLock(user.business_id, async () => {
    let b = await business(user.business_id);
    if (!b?.is_active) throw badRequest('El negocio no está activo.');
    if (b.mercado_pago_preapproval_id) {
      b = await currentMandate(b);
      if (!TERMINAL.has(b.subscription_auto_renew_status)) {
        const existingPlan = b.settings?.subscription?.auto_renew_plan_code;
        if (existingPlan && existingPlan !== body.plan_code) throw badRequest('Cancela la autorización anterior antes de cambiar el plan del cobro automático.');
        if (b.subscription_auto_renew_status === 'PAUSED') throw badRequest('La autorización está pausada. Cancélala antes de inscribir nuevamente la tarjeta.');
        const pendingOrder = (await query("select metadata from qr_credit_purchase_orders where business_id=$1 and mercado_pago_preference_id=$2 limit 1", [b.id,b.mercado_pago_preapproval_id])).rows[0];
        if (!b.subscription_auto_renew_enabled && !pendingOrder?.metadata?.signup?.initial_checkout && new Date(b.subscription_current_period_ends_at) <= new Date()) throw badRequest('La autorización pendiente corresponde a un periodo vencido. Cancélala y renueva el plan antes de inscribir la tarjeta.');
        return { reused: true, auto_renewal: {
          enabled: b.subscription_auto_renew_enabled, status: b.subscription_auto_renew_status,
          checkout_url: b.subscription_auto_renew_enabled ? null : b.subscription_auto_renew_checkout_url,
          initial_checkout: Boolean(pendingOrder?.metadata?.signup?.initial_checkout),
          first_charge_at: b.settings?.subscription?.auto_renew_next_payment_at || (pendingOrder?.metadata?.signup?.initial_checkout
            ? pendingOrder.metadata.signup.first_charge_at || null : b.subscription_current_period_ends_at),
        } };
      }
    }
    const { plan } = await getBusinessSubscription(b.id);
    if (plan.code !== body.plan_code || plan.billing_period !== 'monthly' || plan.raw_status !== 'ACTIVE' || !plan.portal_access_allowed || plan.lifetime_access) {
      throw badRequest('Activa primero el plan mensual seleccionado. Despega prepago no admite débito automático.');
    }
    // Stable across tabs, retries and a provider response lost after creation.
    const hex = require('crypto').createHash('sha256').update([b.id, body.plan_code, b.subscription_current_period_ends_at, b.subscription_auto_renew_cancelled_at].join(':')).digest('hex');
    const key = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
    return payments().createSubscriptionAutoRenewal(user, { ...body, idempotency_key: key });
  });
}

async function reconcile(businessId) {
  return withBusinessLock(businessId, async () => {
    let b = await business(businessId);
    if (!b?.mercado_pago_preapproval_id) return getBusinessSubscription(businessId);
    const id = b.mercado_pago_preapproval_id;
    b = await currentMandate(b);
    // Pagination prevents a missed notification from disappearing behind newer
    // invoices. Only the provider's fully verified payment can extend access.
    let invoiceError;
    for (let offset = 0; ;) {
      const page = await payments().mpRequest('/authorized_payments/search?' + new URLSearchParams({ preapproval_id: id, offset }));
      const invoices = page.results || [];
      for (const invoice of invoices) {
        if (String(invoice.preapproval_id) !== String(id)) throw badRequest('La factura no corresponde a esta autorización.');
        if (invoice.payment?.id) {
          try { await payments().processMercadoPagoResource('subscription_authorized_payment', invoice.id); }
          catch (error) { invoiceError = error; }
        }
      }
      if (!invoices.length || offset + invoices.length >= Number(page.paging?.total || invoices.length)) break;
      offset += invoices.length;
      if (offset >= 5000) throw badRequest('Hay más facturas por verificar. Requiere revisión administrativa.');
    }
    if (invoiceError) throw invoiceError;
    await query(`update businesses set settings=jsonb_set(coalesce(settings,'{}'),'{subscription}',
      coalesce(settings->'subscription','{}') || jsonb_build_object('auto_renew_checked_at',now(),'auto_renew_sync_error',null,'auto_renew_sync_detail',null),true) where id=$1`, [businessId]);
    return getBusinessSubscription(businessId);
  });
}

async function refresh(user) { assertOwner(user); return reconcile(user.business_id); }

async function cancel(user) {
  assertOwner(user);
  return withBusinessLock(user.business_id, async () => {
    const b = await business(user.business_id);
    if (!b?.mercado_pago_preapproval_id) return getBusinessSubscription(user.business_id);
    const remote = await payments().mpRequest('/preapproval/' + encodeURIComponent(b.mercado_pago_preapproval_id), { method: 'GET' });
    if (!TERMINAL.has(String(remote.status).toUpperCase())) {
      const result = await payments().mpRequest('/preapproval/' + encodeURIComponent(b.mercado_pago_preapproval_id), {
        method: 'PUT', body: JSON.stringify({ status: 'cancelled' }),
      });
      if (String(result.status).toUpperCase() !== 'CANCELLED') throw badRequest('Mercado Pago aún no confirmó la cancelación. Actualiza el estado antes de reintentar.');
    }
    await payments().processPreapprovalWebhook(b.mercado_pago_preapproval_id);
    return getBusinessSubscription(user.business_id);
  });
}

async function runBatch() {
  const rows = (await query(`select id from businesses where mercado_pago_preapproval_id is not null
    and (subscription_auto_renew_status not in ('CANCELLED','EXPIRED') or subscription_auto_renew_cancelled_at > now()-interval '7 days')
    order by settings->'subscription'->>'auto_renew_attempted_at' nulls first, id limit 20`)).rows;
  let failed = 0;
  for (const row of rows) {
    await query(`update businesses set settings=jsonb_set(coalesce(settings,'{}'),'{subscription}',
      coalesce(settings->'subscription','{}') || jsonb_build_object('auto_renew_attempted_at',now()),true) where id=$1`, [row.id]);
    try { await reconcile(row.id); } catch (error) {
      failed++;
      await query(`update businesses set settings=jsonb_set(coalesce(settings,'{}'),'{subscription}',
        coalesce(settings->'subscription','{}') || jsonb_build_object('auto_renew_sync_error','No se pudo verificar con Mercado Pago. Reintento automático pendiente.','auto_renew_sync_detail',$2::text),true) where id=$1`,
        [row.id, String(error.message || 'Provider request failed').replace(/https?:\/\/\S+/g, '[provider]').slice(0,240)]);
      console.error('Subscription reconciliation failed:', row.id, error.status || error.statusCode || 'provider_error');
    }
  }
  return { checked: rows.length, failed };
}

function start() {
  if (!env.databaseConfigured || !env.mercadoPagoAccessToken || !env.mercadoPagoWebhookSecret || process.env.SUBSCRIPTION_RECONCILIATION_ENABLED === 'false') return async () => {};
  let pending;
  const run = () => { if (!pending) pending = runBatch().catch(() => console.error('Subscription reconciliation unavailable')).finally(() => { pending = null; }); };
  const timer = setInterval(run, 5 * 60 * 1000); timer.unref(); run();
  return async () => { clearInterval(timer); if (pending) await pending; };
}

module.exports = { create, refresh, cancel, reconcile, runBatch, start, withBusinessLock };

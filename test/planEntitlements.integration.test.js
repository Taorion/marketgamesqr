const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID: uuid } = require('node:crypto');
process.env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL = 'false';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'plan-entitlements-local-qa-only';
process.env.AGENDA_PUSH_WORKER_ENABLED = 'false';
const { query, pool, withTransaction } = require('../backend/src/config/db');
const { app } = require('../backend/src/app');
const { env } = require('../backend/src/config/env');
const jwt = require('jsonwebtoken');
const payments = require('../backend/src/services/mercadoPagoService');
const { planFromBusiness } = require('../backend/src/services/subscriptionService');
const originalFetch = global.fetch;
let server, base, requests = 0;
const accounts = {};
async function api(path, user, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + path, { method, headers: {
    'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.' + (++requests % 250),
    ...(user ? { Authorization: 'Bearer ' + jwt.sign({ sub: user.id, password_version: user.password_version || 0 }, env.jwtSecret) } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
  return { status: response.status, data, cacheControl: response.headers.get('cache-control') };
}
const routes = [
  ['dashboard_basic', '/api/dashboard/businesses/ID'],
  ['products', '/api/business/inventory/products'],
  ['contact_directory', '/api/business/contacts/feed'],
  ['campaigns', '/api/business/campaigns'],
  ['campaigns', '/api/portal/businesses/ID/campaigns'],
  ['showcase', '/api/business/catalogs'],
  ['gift_cards', '/api/business/reward-passes'],
  ['gift_cards', '/api/business/customer/gift-orders'],
  ['redemptions', '/api/businesses/ID/redemptions'],
  ['qr_batch_generator', '/api/business/qr/batches'],
  ['qr_simple_generator', '/api/business/qr/history'],
  ['qr_simple_generator', '/api/business/qr/metrics'],
  ['brand_assets', '/api/business/digital-assets'],
  ['product_gifts', '/api/business/customer/product-gifts/catalog'],
  ['product_gifts', '/api/business/customer/courtesies'],
  ['affiliates', '/api/portal/businesses/ID/affiliates'],
  ['quotes', '/api/business/quotes'],
  ['stamp_cards', '/api/business/stamp-cards/context'],
  ['interactive_activations', '/api/business/interactive-activations'],
  ['communications', '/api/business/communications'],
  ['multi_branch', '/api/business/branches'],
  ['sales_tracker', '/api/business/sales/attributed'],
  ['competitive_radar', '/api/business/competitive-radar/summary'],
  ['rms_core', '/api/business/rms-machine'],
  ['team_management', '/api/business/users'],
  ['acquisition_channels', '/api/business/channels'],
  ['qr_validator', '/api/businesses/ID/validator-history'],
];
after(async () => { global.fetch = originalFetch; if (server) await new Promise(r => server.close(r)); await pool.end(); });
test('Paid signup, payment, complete module access matrix and plan transitions', async t => {
  assert.equal((await query('select current_database() n')).rows[0].n, 'qori_customer_qa');
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = 'http://127.0.0.1:' + server.address().port;
  env.mercadoPagoAccessToken = 'TEST-local-only'; env.mercadoPagoWebhookSecret = 'local-only';
  global.fetch = async (input, options) => {
    if (String(input).startsWith('https://api.mercadopago.com/')) {
      assert.ok(String(input).endsWith('/checkout/preferences'));
      return new Response(JSON.stringify({ id: uuid(), init_point: 'https://example.test/checkout' }), { status: 201 });
    }
    assert.ok(String(input).startsWith(base), 'No external requests in QA'); return originalFetch(input, options);
  };
  const published = await api('/api/public/subscription-plans');
  assert.equal(published.status, 200);
  assert.equal(published.data.free_plans.length, 4);
  for (const code of ['DESPEGA', 'STARTER', 'GROWTH', 'PRO']) {
    await t.test(code + ': pending signup and verified payment activate the purchased plan only', async () => {
      const result = await api('/api/public/signup/portal', null, { company_name: 'Plan QA ' + uuid(), contact_name: 'Responsable QA', email: uuid() + '@example.test', phone: '3100000000', nit: uuid(), password: 'LocalPrueba!2026', password_confirm: 'LocalPrueba!2026', terms_accepted: true, privacy_accepted: true, plan_code: code });
      assert.equal(result.status, 201, JSON.stringify(result));
      const id = result.data.business.id;
      const user = (await query('select * from app_users where business_id=$1', [id])).rows[0];
      assert.equal((await api('/api/business/interactive-activations', user)).status, 401, 'unpaid account remains inactive');
      await withTransaction(async db => {
        const order = (await db.query('select * from qr_credit_purchase_orders where id=$1 for update', [result.data.order.id])).rows[0];
        await payments.__testing.finalizeApprovedCreditPurchase(db, order, { id: uuid(), status: 'approved', transaction_amount: Number(order.price_cop), currency_id: 'COP' });
      });
      const business = (await query('select * from businesses where id=$1', [id])).rows[0];
      const plan = planFromBusiness(business); accounts[code] = { id, user, plan };
      assert.equal(plan.code, code); assert.equal(plan.portal_access_allowed, true);
      const advertised = published.data.plans.find(p => p.code === code);
      assert.deepEqual(plan.features, advertised.features, 'all advertised features activate exactly');
      assert.deepEqual(plan.limits, advertised.limits, 'all advertised limits activate exactly');
      assert.equal((await api('/api/business/access', user)).status, 200);
    });
    await t.test(code + ': included modules respond and excluded modules reject direct API access', async () => {
      const { id, user, plan } = accounts[code]; const failures = [];
      for (const [feature, pattern] of routes) {
        const path = pattern.replace('ID', id); const result = await api(path, user);
        const expected = plan.features[feature] ? 200 : 403;
        if (result.status !== expected) failures.push({ feature, path, expected, ...result });
      }
      assert.deepEqual(failures, []);
    });
    await t.test(code + ': excluded write operations cannot create records', async () => {
      const { user, plan } = accounts[code];
      for (const [feature, path] of [['products', '/api/business/inventory/products'], ['campaigns', '/api/business/campaigns'], ['communications', '/api/business/communications'], ['gift_cards', '/api/business/reward-passes'], ['multi_branch', '/api/business/branches'], ['quotes', '/api/business/quotes']]) {
        if (!plan.features[feature]) assert.equal((await api(path, user, {})).status, 403, code + ' ' + path);
      }
    });
  }
  await t.test('paid users cannot grant themselves another plan or access another business', async () => {
    const { id, user, plan } = accounts.DESPEGA;
    await api('/api/business/profile', user, { plan_code: 'PRO', settings: { subscription: { lifetime_access: true }, commercial_entitlements: { features: { campaigns: true } } } }, 'PATCH');
    const actual = planFromBusiness((await query('select * from businesses where id=$1', [id])).rows[0]);
    assert.equal(actual.code, 'DESPEGA'); assert.deepEqual(actual.features, plan.features);
    assert.equal((await api('/api/portal/businesses/' + accounts.PRO.id + '/campaigns', user)).status, 403);
    assert.equal((await api('/api/businesses/' + accounts.PRO.id + '/redemptions', user)).status, 403);
  });
  await t.test('downgrade, upgrade, suspension and expiry take effect for the same session', async () => {
    const { id, user } = accounts.PRO;
    assert.equal((await api('/api/dashboard/businesses/' + id, user)).data.dashboard_level, 'full');
    assert.match((await api('/api/dashboard/businesses/' + id, user)).cacheControl, /no-store/);
    await query("update businesses set plan_code='STARTER' where id=$1", [id]);
    assert.equal((await api('/api/dashboard/businesses/' + id, user)).data.dashboard_level, 'basic', 'a downgrade must not reuse premium dashboard data');
    assert.equal((await api('/api/business/qr/batches', user)).status, 200);
    await query("update businesses set plan_code='DESPEGA' where id=$1", [id]);
    assert.equal((await api('/api/business/qr/batches', user)).status, 200, 'Despega includes QR batches');
    assert.equal((await api('/api/business/communications', user)).status, 403);
    assert.equal((await api('/api/business/reward-passes', user, {})).status, 403);
    await query("update businesses set plan_code='PRO' where id=$1", [id]);
    assert.equal((await api('/api/business/communications', user)).status, 200);
    await query("update businesses set subscription_status='SUSPENDED' where id=$1", [id]);
    assert.equal((await api('/api/business/communications', user)).status, 403);
    assert.equal((await api('/api/business/qr/batches', user)).status, 403, 'cached QR responses must not bypass suspension');
    await query("update businesses set subscription_status='ACTIVE',subscription_current_period_ends_at=now()-interval '40 days' where id=$1", [id]);
    assert.equal((await api('/api/business/communications', user)).status, 403);
    for (const path of ['/api/business/qr/batches', '/api/business/qr/history', '/api/business/qr/metrics']) assert.equal((await api(path, user)).status, 403, 'expired plan ' + path);
  });
});

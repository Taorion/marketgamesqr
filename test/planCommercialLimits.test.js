const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { listPlans } = require('../backend/src/services/subscriptionService');
const { assertAffiliateCapacity } = require('../backend/src/services/affiliateQuotaService');
const root = path.resolve(__dirname, '..');

function loadService(relativePath, mocks) {
  const filename = path.join(root, relativePath);
  const realRequire = createRequire(filename);
  const module = { exports: {} };
  new Function('require', 'module', 'exports', '__dirname', '__filename', fs.readFileSync(filename, 'utf8'))(
    name => Object.hasOwn(mocks, name) ? mocks[name] : realRequire(name), module, module.exports, path.dirname(filename), filename
  );
  return module.exports;
}

for (const [code, affiliateLimit, giftLimit] of [['STARTER', 10, 10], ['GROWTH', 50, 25], ['PRO', 100, 250]]) {
  test(`${code}: allows the last affiliate and rejects the next without crossing tenants`, async () => {
    let used = affiliateLimit - 1;
    const calls = [];
    const client = { async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
      if (sql.includes('from businesses')) return { rows: [{ id: 'tenant-1', plan_code: code, subscription_status: 'ACTIVE' }] };
      if (sql.includes('from affiliates')) {
        assert.deepEqual(params, ['tenant-1']);
        assert.match(sql, /status <> 'DELETED'/);
        assert.doesNotMatch(sql, /card_metadata|rms_activation_2/);
        return { rows: [{ total: used }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    } };
    await assertAffiliateCapacity(client, 'tenant-1');
    assert.match(calls[0].sql, /pg_advisory_xact_lock/);
    assert.deepEqual(calls[0].params, ['qori:affiliate-quota:tenant-1']);
    used = affiliateLimit;
    await assert.rejects(assertAffiliateCapacity(client, 'tenant-1'), error =>
      error.status === 403 && error.details.plan_gate.limit === affiliateLimit && error.details.plan_gate.current === used);
  });

  test(`${code}: monthly gift-card cap blocks before charging tickets`, async () => {
    const plan = listPlans().find(p => p.code === code);
    let used = giftLimit;
    let creditChecks = 0;
    let locked = false;
    const client = { async query(sql, params) {
      if (sql.includes('from businesses')) {
        assert.match(sql, /for update/);
        locked = true;
        return { rows: [{ id: 'tenant-1', name: 'Test', settings: {} }], rowCount: 1 };
      }
      if (sql.includes('count(*)')) {
        assert.ok(locked, 'business is locked before the monthly count');
        assert.deepEqual(params, ['tenant-1']);
        assert.match(sql, /company_id = \$1/);
        assert.match(sql, /created_at >= date_trunc\('month', now\(\)\)/);
        assert.match(sql, /created_at < date_trunc\('month', now\(\)\) \+ interval '1 month'/);
        return { rows: [{ total: used }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    } };
    const service = loadService('backend/src/services/rewardPassService.js', {
      '../config/db': { withTransaction: fn => fn(client), query: () => { throw new Error('Unexpected global query'); } },
      './subscriptionService': { getBusinessSubscription: async () => ({ plan }) },
      './qrCreditService': { ensureCreditAccount: async () => { creditChecks++; return { qr_balance: 0 }; } },
    });
    const user = { id: 'owner-1', business_id: 'tenant-1', role: 'BUSINESS_OWNER' };
    const payload = { initial_value_cop: 50000, buyer_name: 'Test' };
    await assert.rejects(service.createRewardPass(user, payload), error => error.status === 403 && error.message.includes(`${giftLimit} tarjetas`));
    assert.equal(creditChecks, 0);
    used = giftLimit - 1;
    await assert.rejects(service.createRewardPass(user, payload), error => error.status === 400 && /tickets suficientes/.test(error.message));
    assert.equal(creditChecks, 1, 'last available monthly slot reaches the ticket balance check');
  });
}

test('all affiliate creation paths enforce the same transactional quota', () => {
  for (const file of ['affiliateService.js', 'leadCrmService.js', 'rmsMachineService.js']) {
    const source = fs.readFileSync(path.join(root, 'backend/src/services', file), 'utf8');
    assert.match(source, /await assertAffiliateCapacity\(client, businessId[^;]*;[\s\S]*?insert into affiliates/);
  }
});

test('Activar Qori advertises the enforced monthly and total limits', () => {
  const html = fs.readFileSync(path.join(root, 'paquetes/index.html'), 'utf8');
  assert.match(html, /Tarjetas regalo<\/th><td>No<\/td><td>10\/mes<\/td><td>25\/mes<\/td><td>250\/mes<\/td>/);
  assert.match(html, /Afiliados<\/th><td>No<\/td><td>10<\/td><td>50<\/td><td>100<\/td>/);
});

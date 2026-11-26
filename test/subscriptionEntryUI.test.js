const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { listPlans } = require('../backend/src/services/subscriptionService');

test('expired trial enters the real portal at billing without requesting locked modules', async () => {
  const subscription = { business_name: 'Negocio de prueba', plan: {
    ...listPlans().find(plan => plan.code === 'DESCUBRE'),
    access_status: 'LOCKED', portal_access_allowed: false,
  } };
  const user = { id: 'owner-test', business_id: 'business-test', role: 'BUSINESS_OWNER', full_name: 'Titular', subscription };
  const requests = [];
  const checkouts = [];
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync('empresa/index.html', 'utf8'), {
    url: 'https://portal.example/empresa/?view=rms-machine',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console,
  });
  const w = dom.window;
  const observers = [];
  const MutationObserver = w.MutationObserver;
  w.MutationObserver = class extends MutationObserver {
    constructor(callback) { super(callback); observers.push(this); }
  };
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {} });
  w.ResizeObserver = class { observe() {} disconnect() {} };
  w.IntersectionObserver = class { observe() {} disconnect() {} };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.scrollTo = () => {};
  w.localStorage.setItem('qr_business_portal_session_v1', JSON.stringify({ token: 'local-test', user }));
  w.localStorage.setItem('qr_business_portal_app_version', 'empresa-20260910-qori-public-links-v472');
  w.fetch = async (input, options = {}) => {
    const path = new URL(input, w.location.href).pathname;
    requests.push(path);
    if (path === '/api/payments/subscriptions/checkout') {
      checkouts.push({ body: JSON.parse(options.body), headers: options.headers });
      return new Response(JSON.stringify({ order: { checkout_url: '#qa-checkout' } }), { status: 200 });
    }
    const payloads = {
      '/api/auth/me': { user },
      '/api/business/profile': { business: { id: user.business_id, name: 'Negocio de prueba' }, subscription },
      '/api/public/subscription-plans': { plans: listPlans(), prepaid_reference: [] },
      '/api/payments/qr-credits/offers': { packages: [] },
      '/api/qr/credits/me': { credit_account: { available: 25 } },
    };
    const allowed = Object.hasOwn(payloads, path);
    return new Response(JSON.stringify(allowed ? payloads[path] : {
      error: 'Plan bloqueado', details: { plan_gate: { code: 'PLAN_PORTAL_LOCKED', feature: 'rms_core' } },
    }), { status: allowed ? 200 : 403, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    w.eval(fs.readFileSync('empresa/js/app.js', 'utf8'));
    for (let i = 0; i < 100 && !requests.includes('/api/qr/credits/me'); i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(w.document.querySelector('#accountViewTitle').textContent, 'Recargas');
    assert.equal(w.document.querySelector('#featureUpgradeModal').classList.contains('hidden'), true);
    assert.equal(w.document.querySelector('#accountSectionData').classList.contains('account-screen-hidden'), false);
    const select = w.document.querySelector('#subscriptionRenewalPlanSelect');
    assert.ok([...select.options].some(option => option.value === 'STARTER'));
    select.value = 'STARTER';
    select.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(w.document.querySelector('#subscriptionRenewalButton').disabled, false);
    assert.ok(requests.includes('/api/auth/me'));
    assert.deepEqual([...new Set(requests)].filter(path => ![
      '/api/auth/me', '/api/business/profile', '/api/public/subscription-plans',
      '/api/payments/qr-credits/offers', '/api/qr/credits/me',
    ].includes(path)), []);
    w.showPlanGateFromApiError({ planGate: { feature: 'rms_core', reason: 'subscription_expired' } });
    assert.equal(w.document.querySelector('#featureUpgradeModal').classList.contains('hidden'), true, 'late module errors cannot cover billing');
    w.document.querySelector('#featureUpgradePrimaryLink').click();
    assert.equal(w.document.querySelector('#accountSectionData').classList.contains('account-screen-hidden'), false);
    select.value = 'STARTER';
    w.document.querySelector('#subscriptionRenewalButton').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(checkouts.length, 1);
    assert.equal(checkouts[0].body.plan_code, 'STARTER');
    assert.equal(checkouts[0].body.payment_mode, 'recurring_card');
    assert.equal(checkouts[0].body.auto_renewal_consent, true);
    assert.match(w.document.querySelector('#subscriptionRenewalNotice').textContent, /cada mes/);
    assert.match(w.document.querySelector('#subscriptionRenewalNotice').textContent, /Mi cuenta/);
    assert.equal(checkouts[0].headers.Authorization, 'Bearer local-test');
    assert.equal(w.location.hash, '#qa-checkout');
    assert.equal(JSON.parse(w.localStorage.getItem('qr_business_portal_session_v1')).user.subscription.plan.code, 'DESCUBRE', 'opening checkout does not activate a plan');
    subscription.plan = { ...listPlans().find(plan => plan.code === 'STARTER'), portal_access_allowed: true };
    let resumed = 0;
    w.loadWorkspace = async () => { resumed++; assert.equal(w.needsSubscriptionPayment(), false); };
    await w.loadLockedSubscriptionWorkspace();
    assert.equal(resumed, 1, 'a fresh approved subscription resumes the normal workspace');
    assert.equal(JSON.parse(w.localStorage.getItem('qr_business_portal_session_v1')).user.subscription.plan.code, 'STARTER');
    w.showPlanGateFromApiError({ planGate: { feature: 'communications' }, message: 'Tu plan no incluye communications.' });
    assert.equal(w.document.querySelector('#featureUpgradeModal').classList.contains('hidden'), true, 'late module errors cannot cover card enrollment for an active paid plan');
    assert.deepEqual(errors, []);
  } finally { observers.forEach(observer => observer.disconnect()); w.close(); }
});

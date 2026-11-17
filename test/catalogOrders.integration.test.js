const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
process.env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.PUBLIC_APP_URL = 'http://127.0.0.1:3138'; process.env.DB_SSL = 'false'; process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'strategy-studio-local-qa';
process.env.QORI_CATALOG_ORDERS_ENABLED = 'true'; process.env.AGENDA_PUSH_WORKER_ENABLED = 'false';
const { query, pool } = require('../backend/src/config/db');
const { app } = require('../backend/src/app');
const { receiving } = require('../backend/src/services/catalogOrderRules');
test('delivery rollout defaults on, respects explicit pause and business allowlist',()=>{
  const {enabled}=require('../backend/src/services/catalogOrderService');
  const oldEnabled=process.env.QORI_CATALOG_ORDERS_ENABLED,oldAllow=process.env.QORI_CATALOG_ORDERS_BUSINESSES;
  try{
    delete process.env.QORI_CATALOG_ORDERS_ENABLED;delete process.env.QORI_CATALOG_ORDERS_BUSINESSES;
    assert.equal(enabled('business-a'),true);
    process.env.QORI_CATALOG_ORDERS_ENABLED='false';assert.equal(enabled('business-a'),false);
    process.env.QORI_CATALOG_ORDERS_ENABLED='true';process.env.QORI_CATALOG_ORDERS_BUSINESSES='business-a';
    assert.equal(enabled('business-a'),true);assert.equal(enabled('business-b'),false);
  }finally{
    if(oldEnabled===undefined)delete process.env.QORI_CATALOG_ORDERS_ENABLED;else process.env.QORI_CATALOG_ORDERS_ENABLED=oldEnabled;
    if(oldAllow===undefined)delete process.env.QORI_CATALOG_ORDERS_BUSINESSES;else process.env.QORI_CATALOG_ORDERS_BUSINESSES=oldAllow;
  }
});
const { clearBusinessResponseCache } = require('../backend/src/middleware/businessResponseCache');
const uuid = () => crypto.randomUUID();
let base, server;
const biz = '/api/business/catalog-orders', pub = '/api/public/catalog-orders';
const settings = () => ({ enabled: true, paused: false, timezone: 'America/Bogota', hours: Array.from({ length: 7 }, (_, day) => ({ day, open: '00:00', close: '23:59' })), zones: [{ id: 'centro', name: 'Centro', fee: 3000 }], payment_instructions: 'Pago directo al negocio contra entrega.', terms: 'El establecimiento confirma disponibilidad y realiza la entrega.' });
async function api(path, user, body, method = body ? 'POST' : 'GET', token) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + jwt.sign({ sub: user.id }, process.env.JWT_SECRET) } : {}), ...(token ? { 'X-Order-Token': token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
async function ok(path, user, body, method, token) { const r = await api(path, user, body, method, token); assert.equal(r.status, 200, JSON.stringify(r)); return r.data; }
async function fixture() {
  const b = (await query("insert into businesses(name,slug,plan_code,subscription_status) values('Estudio QA',$1,'PRO','ACTIVE') returning *", ['studio-' + uuid()])).rows[0];
  const u = (await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Dueño QA','BUSINESS_OWNER') returning *", [b.id, uuid() + '@example.test'])).rows[0];
  const c = (await query("insert into smart_catalogs(business_id,title,slug,whatsapp_number,status) values($1,'Tienda QA',$2,'573001234567','ACTIVE') returning *", [b.id, 'studio-' + uuid()])).rows[0];
  const p = (await query("insert into smart_catalog_products(business_id,catalog_id,name,slug,price) values($1,$2,'Almuerzo','almuerzo',12000) returning *", [b.id, c.id])).rows[0];
  const config = await ok(biz + '/catalogs/' + c.id + '/settings', u, { revision: 0, config: settings() }, 'PUT');
  return { b, u, c, p, config };
}
async function request(f, changes = {}) {
  const session_id = uuid(), request_id = uuid();
  const q = await ok(pub + '/catalogs/' + f.c.slug + '/quote', null, { session_id, zone_id: 'centro', items: [{ product_id: f.p.id, quantity: 2 }], ...changes });
  const body = { session_id, request_id, quote_token: q.quote_token, name: 'Cliente QA', phone: '3001234567', address: 'Calle 12 # 3 - 20', terms_accepted: true, marketing_consent: false };
  return { q, body };
}
async function submit(f, r) { return ok(pub + '/catalogs/' + f.c.slug + '/orders', null, r.body); }
async function state(f, o, status, extra = {}) { return ok(biz + '/orders/' + o.order.id + '/actions', f.u, { action: 'STATE', status, ...extra }); }
before(async () => {
  assert.equal((await query('select current_database() db')).rows[0].db, 'qori_customer_qa');
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); await pool.end(); });

test('complete storefront → order → delivery unpaid → manual payment → canonical sale → refund', async () => {
  const f = await fixture(), r = await request(f), o = await submit(f, r);
  assert.equal(o.order.total, '27000.00');
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1', [f.b.id])).rows[0].n, 0);
  await state(f, o, 'ACCEPTED', { identity_confirmed: true });
  await state(f, o, 'PREPARING'); await state(f, o, 'READY'); await state(f, o, 'DELIVERED');
  assert.equal((await ok(pub + '/status', null, null, 'GET', o.token)).order.payment_status, 'UNPAID');
  const payment = { action: 'PAY', amount: 27000, received: true, method: 'Efectivo', reference: 'Recibo QA 1' };
  const results = await Promise.all([ok(biz + '/orders/' + o.order.id + '/actions', f.u, payment), ok(biz + '/orders/' + o.order.id + '/actions', f.u, payment)]);
  assert.equal(results.filter(r => r.duplicate).length, 1);
  const sale = (await query('select * from business_sales where business_id=$1', [f.b.id])).rows; assert.equal(sale.length, 1); assert.equal(sale[0].metadata.order_id, o.order.id);
  const detail = await ok(biz + '/orders/' + o.order.id, f.u); assert.ok(detail.order.lead_id);
  assert.ok((await query("select 1 from lead_events where source_type='MANUAL' and source_id=$1", [detail.order.lead_id])).rowCount >= 5);
  let metrics = await ok(biz + '/metrics', f.u); assert.equal(metrics.stats.paid, 1); assert.equal(Number(metrics.stats.confirmed_revenue), 27000);
  await ok(biz + '/orders/' + o.order.id + '/actions', f.u, { action: 'REFUND', received: true, reason: 'Devolución completa al cliente' });
  metrics = await ok(biz + '/metrics', f.u); assert.equal(metrics.stats.paid, 0); assert.equal(Number(metrics.stats.confirmed_revenue), 0); assert.equal(metrics.stats.refunded, 1);
});
test('tenant boundaries, roles, existing plan gate and RLS', async () => {
  const a = await fixture(), b = await fixture(), r = await request(a), o = await submit(a, r);
  assert.equal((await api(biz, null)).status, 401);
  assert.equal((await api(biz + '/orders/' + o.order.id, b.u)).status, 404);
  assert.equal((await api(biz + '/orders/' + o.order.id + '/actions', b.u, { action: 'STATE', status: 'REJECTED', reason: 'Prueba' })).status, 404);
  assert.equal((await api(biz + '/catalogs/' + a.c.id + '/settings', b.u, { revision: 1, config: settings() }, 'PUT')).status, 404);
  await query("update app_users set role='BUSINESS_SELLER' where id=$1", [a.u.id]);
  assert.equal((await api(biz, a.u)).status, 403);
  await query("update businesses set plan_code='DESPEGA' where id=$1", [b.b.id]); clearBusinessResponseCache(b.b.id);
  assert.equal((await api(biz + '/catalogs/' + b.c.id + '/settings', b.u, { revision: 1, config: settings() }, 'PUT')).status, 403);
  assert.equal((await ok(pub + '/catalogs/' + b.c.slug + '/config')).enabled, false);
  const tables = (await query("select relname,relrowsecurity from pg_class where relname in ('catalog_orders','catalog_order_events','catalog_order_settings')")).rows;
  assert.equal(tables.length, 3); assert.ok(tables.every(t => t.relrowsecurity));
});
test('server prices, foreign products, variants and snapshot survive catalog changes', async () => {
  const f = await fixture(), foreign = await fixture();
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/quote', null, { session_id: uuid(), zone_id: 'centro', items: [{ product_id: foreign.p.id, quantity: 1 }] })).status, 400);
  const r = await request(f);
  await query('update smart_catalog_products set price=13000 where id=$1', [f.p.id]);
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/orders', null, r.body)).status, 400);
  await ok(biz + '/catalogs/' + f.c.id + '/products/' + f.p.id + '/variants', f.u, { variants: [{ id: 'grande', name: 'Grande', price: 15000, available: true }] }, 'PUT');
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/quote', null, { session_id: uuid(), zone_id: 'centro', items: [{ product_id: f.p.id, quantity: 1 }] })).status, 400);
  const r2 = await request(f, { items: [{ product_id: f.p.id, variant_id: 'grande', quantity: 1 }] }), o = await submit(f, r2);
  await query('update smart_catalog_products set price=99999,name=$2 where id=$1', [f.p.id, 'Nombre nuevo']);
  const receipt = (await ok(pub + '/status', null, null, 'GET', o.token)).order;
  assert.equal(receipt.items[0].name, 'Almuerzo'); assert.equal(receipt.items[0].unit_price, 15000); assert.equal(Number(receipt.total), 18000);
});
test('concurrent submission is idempotent; token is required and receipt omits PII', async () => {
  const f = await fixture(), r = await request(f);
  const replies = await Promise.all([submit(f, r), submit(f, r)]);
  assert.equal(replies[0].order.id, replies[1].order.id); assert.equal(replies[0].token, replies[1].token);
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/orders', null, { ...r.body, name: 'Otro cliente' })).status, 400);
  assert.equal((await api(pub + '/status')).status, 404); assert.equal((await api(pub + '/status', null, null, 'GET', replies[0].order.number)).status, 404);
  const rec = await ok(pub + '/status', null, null, 'GET', replies[0].token);
  assert.equal(rec.order.address, undefined); assert.equal(rec.order.customer_phone, undefined);
});
test('pending delivery fee needs customer acceptance, rejects stale proposals; separate consent withdrawal', async () => {
  const f = await fixture(), config = settings(); config.zones[0].fee = null;
  await ok(biz + '/catalogs/' + f.c.id + '/settings', f.u, { revision: 1, config }, 'PUT');
  const r = await request(f); r.body.marketing_consent = true;
  const o = await submit(f, r); assert.equal(o.order.total, null);
  assert.equal((await api(biz + '/orders/' + o.order.id + '/actions', f.u, { action: 'STATE', status: 'ACCEPTED', identity_confirmed: true })).status, 400);
  await ok(biz + '/orders/' + o.order.id + '/actions', f.u, { action: 'PROPOSE_FEE', fee: 4000 });
  await ok(biz + '/orders/' + o.order.id + '/actions', f.u, { action: 'PROPOSE_FEE', fee: 5000 });
  assert.equal((await api(pub + '/status', null, { action: 'ACCEPT_FEE', proposal_version: 1 }, 'POST', o.token)).status, 400);
  await ok(pub + '/status', null, { action: 'ACCEPT_FEE', proposal_version: 2 }, 'POST', o.token);
  await ok(pub + '/status', null, { action: 'WITHDRAW_CONSENT' }, 'POST', o.token);
  await state(f, o, 'ACCEPTED', { identity_confirmed: true });
  const d = await ok(biz + '/orders/' + o.order.id, f.u); assert.equal(Number(d.order.total), 29000); assert.equal(d.order.marketing_consent, false);
});
test('configuration conflicts do not overwrite accepted conditions', async () => {
  const f = await fixture(), r = await request(f), o = await submit(f, r);
  const config = settings(); config.zones[0].fee = 5000;
  await ok(biz + '/catalogs/' + f.c.id + '/settings', f.u, { revision: 1, config }, 'PUT');
  assert.equal((await api(biz + '/catalogs/' + f.c.id + '/settings', f.u, { revision: 1, config: settings() }, 'PUT')).status, 400);
  assert.equal(Number((await ok(pub + '/status', null, null, 'GET', o.token)).order.delivery_fee), 3000);
  assert.equal((await request(f)).q.quote.delivery_fee, 5000);
});

test('hours, timezone, coverage, global switch and pause preserve current orders', async () => {
  const c = settings(); c.hours = [{ day: 1, open: '08:00', close: '17:00' }];
  assert.equal(receiving(c, new Date('2026-11-16T13:00:00Z')), true); assert.equal(receiving(c, new Date('2026-11-16T22:00:00Z')), false);
  const f = await fixture(), r = await request(f), o = await submit(f, r);
  const cfg = settings(); cfg.paused = true;
  await ok(biz + '/catalogs/' + f.c.id + '/settings', f.u, { revision: 1, config: cfg }, 'PUT');
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/quote', null, { session_id: uuid(), zone_id: 'centro', items: [{ product_id: f.p.id, quantity: 1 }] })).status, 400);
  process.env.QORI_CATALOG_ORDERS_ENABLED = 'false';
  try { assert.equal((await ok(pub + '/status', null, null, 'GET', o.token)).order.status, 'NEW'); await state(f, o, 'REJECTED', { reason: 'Sin existencias' }); } finally { process.env.QORI_CATALOG_ORDERS_ENABLED = 'true'; }
});

test('inventory is deducted once under concurrent payments; last unit cannot be oversold', async () => {
  const f = await fixture();
  const inventory = (await query("insert into business_inventory_products(business_id,internal_id,name,unit_price,stock_quantity) values($1,$2,'Última unidad QA',12000,1) returning id", [f.b.id, 'QA-' + uuid()])).rows[0];
  await query('update smart_catalog_products set inventory_product_id=$2 where id=$1', [f.p.id, inventory.id]);
  const a = await request(f, { items: [{ product_id: f.p.id, quantity: 1 }] }), b = await request(f, { items: [{ product_id: f.p.id, quantity: 1 }] });
  b.body.phone = '3007654321';
  const oa = await submit(f, a), ob = await submit(f, b);
  await state(f, oa, 'ACCEPTED', { identity_confirmed: true }); await state(f, ob, 'ACCEPTED', { identity_confirmed: true });
  const payment = { action: 'PAY', amount: 15000, received: true, method: 'Efectivo', reference: 'QA-STOCK' };
  const results = await Promise.all([api(biz + '/orders/' + oa.order.id + '/actions', f.u, payment), api(biz + '/orders/' + ob.order.id + '/actions', f.u, { ...payment, reference: 'QA-STOCK-2' })]);
  assert.deepEqual(results.map(x => x.status).sort(), [200, 400]);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1', [inventory.id])).rows[0].stock_quantity), 0);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1', [f.b.id])).rows[0].n, 1);
  const winner = results[0].status === 200 ? oa : ob;
  await state(f, winner, 'PREPARING'); await state(f, winner, 'READY'); await state(f, winner, 'DELIVERED');
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1', [inventory.id])).rows[0].stock_quantity), 0);
  assert.equal((await query("select count(*)::int n from business_lifecycle_events where entity_id=$1 and action='STOCK_SOLD'", [inventory.id])).rows[0].n, 1);
});

test('canonical contacts require explicit linking and revocation blocks future promotional operations', async () => {
  const f = await fixture(), consent = require('../backend/src/services/catalogOrderConsentService');
  const a = await request(f); a.body.marketing_consent = true; const oa = await submit(f, a);
  await state(f, oa, 'ACCEPTED', { identity_confirmed: true });
  const leadId = (await ok(biz + '/orders/' + oa.order.id, f.u)).order.lead_id;
  const refs = [{ source_type: 'MANUAL', source_id: leadId }];
  await consent.assertOrderContactConsent({ query }, f.b.id, refs);
  const communications = require('../backend/src/services/businessCommunicationService');
  const message = (await query("insert into business_communications(business_id,title,communication_type,whatsapp_body) values($1,'Prueba de consentimiento','WHATSAPP','Oferta para contactos autorizados') returning id", [f.b.id])).rows[0];
  const prepared = await communications.prepareBusinessCommunicationWhatsApp(f.b.id, f.u.id, message.id, refs, true, uuid());
  assert.equal(prepared.results.queued, 1);
  await ok(pub + '/status', null, { action: 'WITHDRAW_CONSENT' }, 'POST', oa.token);
  await assert.rejects(consent.assertOrderContactConsent({ query }, f.b.id, refs), /autorización/);
  await assert.rejects(communications.prepareBusinessCommunicationWhatsApp(f.b.id, f.u.id, message.id, refs, true, uuid()), /autorización/);
  await assert.rejects(communications.markBusinessCommunicationWhatsAppOpened(f.b.id, f.u.id, message.id, refs[0]), /autorización/);
  const b = await request(f), ob = await submit(f, b);
  assert.equal((await api(biz + '/orders/' + ob.order.id + '/actions', f.u, { action: 'STATE', status: 'ACCEPTED', identity_confirmed: true })).status, 400);
  await state(f, ob, 'ACCEPTED', { identity_confirmed: true, lead_id: leadId });
  assert.equal((await query('select count(*)::int n from business_manual_leads where business_id=$1', [f.b.id])).rows[0].n, 1);
  await assert.rejects(consent.assertOrderContactConsent({ query }, f.b.id, refs), /autorización/);
  // Exact source reference is shared with CRM; no Customer account is inferred.
  assert.equal((await query("select count(*)::int n from lead_events where business_id=$1 and source_type='MANUAL' and source_id=$2", [f.b.id, leadId])).rows[0].n >= 4, true);
});

test('expired quote, unaccepted terms, unknown delivery zone and terminal transitions are rejected', async () => {
  const f = await fixture(), r = await request(f);
  const claim = jwt.decode(r.body.quote_token); delete claim.iat; delete claim.exp;
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/orders', null, { ...r.body, quote_token: jwt.sign(claim, process.env.JWT_SECRET, { expiresIn: -1 }) })).status, 400);
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/orders', null, { ...r.body, terms_accepted: false })).status, 400);
  assert.equal((await api(pub + '/catalogs/' + f.c.slug + '/quote', null, { session_id: uuid(), zone_id: 'fuera', items: [{ product_id: f.p.id, quantity: 1 }] })).status, 400);
  const o = await submit(f, r); await state(f, o, 'REJECTED', { reason: 'No disponible' });
  assert.equal((await api(biz + '/orders/' + o.order.id + '/actions', f.u, { action: 'STATE', status: 'ACCEPTED', identity_confirmed: true })).status, 400);
  assert.equal((await api(biz + '/orders/' + o.order.id + '/actions', f.u, { action: 'PAY', amount: 27000, received: true, method: 'Efectivo', reference: 'QA' })).status, 400);
});

test('flyer PNG and A5 PDF contain the canonical storefront QR and enforce tenant/readiness', async () => {
  const sharp = require('sharp'), jsQR = require('jsqr'), { PDFDocument } = require('pdf-lib');
  const f = await fixture(), other = await fixture();
  const share = await ok(biz + '/share-qr?id=' + f.c.id, f.u);
  assert.equal(new URL(share.url).pathname, '/c/' + f.c.slug);
  const png = await ok(biz + '/catalogs/' + f.c.id + '/flyer?format=png', f.u);
  const bytes = Buffer.from(png.data_url.split(',')[1], 'base64');
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1080); assert.equal(info.height, 1528);
  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.ok(code, 'QR must decode from the complete flyer'); assert.equal(code.data, share.url);
  const pdf = await ok(biz + '/catalogs/' + f.c.id + '/flyer?format=pdf', f.u);
  const document = await PDFDocument.load(Buffer.from(pdf.data_url.split(',')[1], 'base64'));
  assert.equal(document.getPageCount(), 1); assert.ok(Math.abs(document.getPage(0).getWidth() - 419.528) < .01);
  assert.equal((await api(biz + '/catalogs/' + f.c.id + '/flyer', other.u)).status, 404);
  await query("update smart_catalogs set status='DRAFT' where id=$1", [f.c.id]);
  assert.equal((await api(biz + '/share-qr?id=' + f.c.id, f.u)).status, 400);
  assert.equal((await api(biz + '/catalogs/' + f.c.id + '/flyer', f.u)).status, 400);
});

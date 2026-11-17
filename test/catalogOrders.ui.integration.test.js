const { test, before, after } = require('node:test');
const assert = require('node:assert/strict'), fs = require('node:fs'), crypto = require('node:crypto'), jwt = require('jsonwebtoken');
const { JSDOM } = require('jsdom');
process.env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:55441/qori_customer_qa'; process.env.PUBLIC_APP_URL = 'http://127.0.0.1:3138'; process.env.DB_SSL = 'false'; process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'studio-dom-qa'; process.env.QORI_CATALOG_ORDERS_ENABLED = 'true'; process.env.AGENDA_PUSH_WORKER_ENABLED = 'false';
const { query, pool } = require('../backend/src/config/db'), { app } = require('../backend/src/app');
let base, server, user, catalog, product;
const uuid = () => crypto.randomUUID();
async function api(path, body, method, auth = false, token = null) {
  const r = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + jwt.sign({ sub: user.id }, process.env.JWT_SECRET) } : {}), ...(token ? { 'X-Order-Token': token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await r.json(); if (!r.ok) throw Error(JSON.stringify(data)); return data;
}
async function until(check, timeout = 3000) { const end = Date.now() + timeout; while (Date.now() < end) { if (check()) return; await new Promise(r => setTimeout(r, 20)); } throw Error('DOM condition timed out'); }
function dom(html, path) {
  return new JSDOM(html, { url: base + path, runScripts: 'outside-only', pretendToBeVisual: true, beforeParse(w) {
    w.fetch = (path, opts) => fetch(new URL(path, base), opts); w.structuredClone = structuredClone;
    w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
    w.HTMLElement.prototype.setPointerCapture = () => {};
  } });
}
before(async () => {
  assert.equal((await query('select current_database() db')).rows[0].db, 'qori_customer_qa');
  const b = (await query("insert into businesses(name,slug,plan_code,subscription_status) values('DOM QA',$1,'PRO','ACTIVE') returning id", ['studio-dom-' + uuid()])).rows[0];
  user = (await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','DOM owner','BUSINESS_OWNER') returning *", [b.id, uuid() + '@example.test'])).rows[0];
  catalog = (await query("insert into smart_catalogs(business_id,title,slug,whatsapp_number,status) values($1,'DOM vitrina',$2,'573001234567','ACTIVE') returning *", [b.id, 'dom-' + uuid()])).rows[0];
  product = (await query("insert into smart_catalog_products(business_id,catalog_id,name,slug,price) values($1,$2,'Almuerzo QA','almuerzo',10000) returning *", [b.id, catalog.id])).rows[0];
  await require('../backend/src/services/catalogOrderService').saveSettings(user, catalog.id, { revision: 0, config: { enabled: true, paused: false, timezone: 'America/Bogota', hours: Array.from({ length: 7 }, (_, day) => ({ day, open: '00:00', close: '23:59' })), zones: [{ id: 'centro', name: 'Centro', fee: 2000 }], terms: 'El establecimiento confirma disponibilidad y entrega.', payment_instructions: 'Pago al negocio en efectivo.' } });
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); await pool.end(); });

test('owner configures delivery zones, saves real settings and shares the existing storefront', async () => {
  const d = dom('<section class="view-section active"><div id="root"></div></section>', '/empresa/'), w = d.window, $ = s => w.document.querySelector(s);
  try {
    w.eval(fs.readFileSync('empresa/js/catalog-orders.js', 'utf8'));
    const call = async (path, options = {}) => api('/api/business' + path, options.body ? JSON.parse(options.body) : null, options.method || 'GET', true);
    await w.QoriCatalogOrders.mount($('#root'), call, user.id);
    $('[data-config]').click(); await until(() => $('#qs-settings'));
    $('[data-zone-name]').value = 'Centro y alrededores';
    $('#qs-settings').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await until(() => $('#qs-notice').textContent.includes('Configuración guardada'));
    const saved = (await query('select config,revision from catalog_order_settings where catalog_id=$1', [catalog.id])).rows[0];
    assert.equal(saved.revision, 2); assert.equal(saved.config.zones[0].name, 'Centro y alrededores');
    $('[data-config]').click(); await until(() => $('#qs-modal').open && $('#qs-share-catalog'));
    $('#qs-share-catalog').click(); await until(() => $('#qs-share-url'));
    assert.equal(new URL($('#qs-share-url').value).pathname, '/c/' + catalog.slug);
    assert.ok($('.qs-qr').src.startsWith('data:image/png;base64,'));
    await until(() => $('#qs-download-png') && !$('#qs-download-png').hidden, 20000);
    assert.ok($('#qs-download-png').href.startsWith('data:image/png;base64,'));
    $('.qs-close').click(); $('[data-storefronts]').click(); await until(() => $('#qs-open-share'));
    assert.equal($('#qs-open-share').disabled, false);
    let editor;
    w.document.addEventListener('qori:catalog-editor', e => { editor = e.detail; }, { once: true });
    $('#qs-edit-products').click(); assert.equal(editor.id, catalog.id);
  } finally { w.close(); }
});

test('real storefront UI creates request, private status loads, owner accepts and pays separately', async () => {
  const d = dom(fs.readFileSync('smart-catalog/index.html', 'utf8'), '/c/' + catalog.slug), w = d.window, $ = s => w.document.querySelector(s);
  try {
    w.eval(fs.readFileSync('smart-catalog/orders.js', 'utf8')); w.eval(fs.readFileSync('smart-catalog/app.js', 'utf8'));
    await until(() => $('#qo-open')); assert.equal($('[data-order-product]').textContent, 'Añadir al carrito');
    $('[data-order-product]').click(); $('#qo-add').click(); $('#qo-open').click(); $('#qo-review').click();
    await until(() => $('#qo-checkout'));
    const form = $('#qo-checkout'); form.elements.name.value = 'Cliente de prueba'; form.elements.phone.value = '3009876543'; form.elements.address.value = 'Calle de prueba 12'; form.elements.terms.checked = true;
    form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await until(() => $('#qo-body a[href*="pedido.html"]'));
    assert.ok($('#qo-body').textContent.includes('El establecimiento debe confirmar disponibilidad y entrega'));
    const token = new URL($('#qo-body a').href).hash.slice(1), receipt = await api('/api/public/catalog-orders/status', null, 'GET', false, token);
    assert.equal(receipt.order.status, 'NEW'); assert.equal(receipt.order.payment_status, 'UNPAID');
    const ownerDom = dom('<section class="view-section active"><div id="root"></div></section>', '/empresa/'); const ow = ownerDom.window, q = s => ow.document.querySelector(s);
    try {
      ow.eval(fs.readFileSync('empresa/js/catalog-orders.js', 'utf8'));
      const call = async (path, options = {}) => api('/api/business' + path, options.body ? JSON.parse(options.body) : null, options.method || 'GET', true);
      await ow.QoriCatalogOrders.mount(q('#root'), call, user.id, 'orders'); q('[data-order-detail]').click(); await until(() => q('#qs-confirm-identity'));
      q('#qs-confirm-identity').checked = true; q('[data-state=ACCEPTED]').click(); await until(() => q('[data-state=PREPARING]'));
      assert.equal((await api('/api/public/catalog-orders/status', null, 'GET', false, token)).order.payment_status, 'UNPAID');
      q('#qs-method').value = 'Efectivo'; q('#qs-reference').value = 'DOM-REC-1'; q('#qs-received').checked = true; q('#qs-pay').click(); await until(() => q('#qs-refund'));
      const paid = (await api('/api/public/catalog-orders/status', null, 'GET', false, token)).order;
      assert.equal(paid.status, 'ACCEPTED'); assert.equal(paid.payment_status, 'PAID');
    } finally { ow.close(); }
    const sd = dom(fs.readFileSync('smart-catalog/pedido.html', 'utf8'), '/smart-catalog/pedido.html#' + token);
    try { sd.window.eval(fs.readFileSync('smart-catalog/orders.js', 'utf8')); await until(() => sd.window.document.querySelector('#qo-refresh')); assert.ok(sd.window.document.body.textContent.includes('Cobro registrado por el negocio')); assert.ok(!sd.window.document.body.textContent.includes('Calle de prueba 12')); } finally { sd.window.close(); }
  } finally { w.close(); }
});

test('delivery details, search, coverage and contact remain in the delivery experience', async () => {
  const d = dom(fs.readFileSync('smart-catalog/index.html', 'utf8'), '/c/' + catalog.slug), w = d.window, $ = s => w.document.querySelector(s);
  try {
    w.eval(fs.readFileSync('smart-catalog/orders.js', 'utf8')); w.eval(fs.readFileSync('smart-catalog/app.js', 'utf8'));
    await until(() => $('#qo-open'));
    $('#catalogSearch').value = 'inexistente'; $('#catalogSearch').dispatchEvent(new w.Event('input')); assert.equal($('#productGrid').children.length, 0);
    $('#catalogSearch').value = 'Almuerzo'; $('#catalogSearch').dispatchEvent(new w.Event('input')); assert.equal($('#productGrid').children.length, 1);
    $('[data-info-product]').focus(); $('[data-info-product]').click(); assert.ok($('#qo-add')); assert.ok($('#intentModal').classList.contains('hidden'));
    $('.qo-close').click(); assert.equal(w.document.activeElement, $('[data-info-product]'));
    $('#qo-delivery-info').click(); assert.ok($('#qo-body').textContent.includes('Centro y alrededores')); $('.qo-close').click();
    $('#catalogContactButton').click(); assert.ok($('#qo-body a[href^="https://wa.me/"]')); assert.ok($('#intentModal').classList.contains('hidden'));
  } finally { w.close(); }
});

test('lost response and page reload recover the same request without duplicate orders', async () => {
  const beforeCount = Number((await query('select count(*) n from catalog_orders where business_id=$1', [user.business_id])).rows[0].n);
  const html = fs.readFileSync('smart-catalog/index.html', 'utf8'), d = dom(html, '/c/' + catalog.slug), w = d.window, $ = s => w.document.querySelector(s);
  let saved;
  try {
    const realFetch = w.fetch; let failOnce = true;
    w.fetch = async (url, options) => { const result = await realFetch(url, options); if (failOnce && String(url).endsWith('/orders') && options?.method === 'POST') { failOnce = false; await result.text(); throw Error('Conexión interrumpida'); } return result; };
    w.eval(fs.readFileSync('smart-catalog/orders.js', 'utf8')); w.eval(fs.readFileSync('smart-catalog/app.js', 'utf8'));
    await until(() => $('#qo-open')); $('[data-order-product]').click(); $('#qo-add').click(); $('#qo-open').click(); $('#qo-review').click(); await until(() => $('#qo-checkout'));
    const f = $('#qo-checkout'); f.elements.name.value = 'Reintento QA'; f.elements.phone.value = '3002468123'; f.elements.address.value = 'Calle de prueba 30'; f.elements.terms.checked = true;
    f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await until(() => $('#qo-submit-error').textContent.includes('Conexión interrumpida'));
    saved = Object.fromEntries(Object.keys(w.sessionStorage).map(k => [k, w.sessionStorage.getItem(k)]));
  } finally { w.close(); }
  const retry = dom(html, '/c/' + catalog.slug), rw = retry.window, q = s => rw.document.querySelector(s);
  try {
    for (const [k, v] of Object.entries(saved)) rw.sessionStorage.setItem(k, v);
    rw.eval(fs.readFileSync('smart-catalog/orders.js', 'utf8')); rw.eval(fs.readFileSync('smart-catalog/app.js', 'utf8'));
    await until(() => q('.qo-recover-banner')); q('.qo-recover-banner').click(); q('#qo-recover').click(); await until(() => q('#qo-body a[href*="pedido.html"]'));
    assert.equal(Number((await query('select count(*) n from catalog_orders where business_id=$1', [user.business_id])).rows[0].n), beforeCount + 1);
    assert.equal(rw.sessionStorage.getItem('qori-order-pending:' + catalog.slug), null);
  } finally { rw.close(); }
});

test('unavailable products retain readable details but cannot enter the cart', async () => {
  const p = (await query("insert into smart_catalog_products(business_id,catalog_id,name,slug,price,stock_status,description) values($1,$2,'Postre agotado QA','postre-agotado',5000,'OUT_OF_STOCK','Postre de la casa, disponible próximamente.') returning id", [user.business_id, catalog.id])).rows[0];
  const d = dom(fs.readFileSync('smart-catalog/index.html', 'utf8'), '/c/' + catalog.slug), w = d.window, $ = s => w.document.querySelector(s);
  try {
    w.eval(fs.readFileSync('smart-catalog/orders.js', 'utf8')); w.eval(fs.readFileSync('smart-catalog/app.js', 'utf8'));
    await until(() => $('#qo-open'));
    assert.equal($('[data-order-product="' + p.id + '"]').disabled, true);
    $('[data-info-product="' + p.id + '"]').click(); assert.ok($('#qo-body').textContent.includes('disponible próximamente')); assert.equal($('#qo-add').disabled, true);
  } finally { w.close(); }
});

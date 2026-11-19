const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { badRequest, forbidden, notFound } = require('../utils/http');
const { planFromBusiness, assertLimitForBusiness } = require('./subscriptionService');
const { recordEvent: catalogEvent, publicProductWithPromotion } = require('./smartCatalogService');
const { syncSaleProductsWithCatalog } = require('./productCatalogService');
const { recordLifecycleEvent } = require('./lifecycleAuditService');
const R = require('./catalogOrderRules');
const CONSENT = 'Quiero recibir comunicaciones comerciales de este establecimiento. Puedo retirar esta autorización desde el enlace de mi pedido.';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const tokenFor = (id, request) => crypto.createHmac('sha256', env.jwtSecret).update('catalog-order:' + id + ':' + request).digest('hex');
function enabled(businessId) {
  const allow = (process.env.QORI_CATALOG_ORDERS_BUSINESSES || '').split(',').map(s => s.trim()).filter(Boolean);
  return (process.env.QORI_CATALOG_ORDERS_ENABLED ?? 'true') === 'true' && (!allow.length || allow.includes(businessId));
}
async function overview(user) {
  const catalogs = (await query(`select c.id,c.title,c.slug,c.status,c.brand_name,s.config,s.revision,
    (select count(*)::int from smart_catalog_products p where p.catalog_id=c.id and p.business_id=c.business_id and p.stock_status<>'HIDDEN') product_count,
    (select count(*)::int from smart_catalog_products p where p.catalog_id=c.id and p.business_id=c.business_id and p.stock_status in ('AVAILABLE','LIMITED') and p.price is not null and p.currency='COP') orderable_count
    from smart_catalogs c left join catalog_order_settings s on s.catalog_id=c.id where c.business_id=$1 and c.status<>'ARCHIVED' order by c.title`, [user.business_id])).rows;
  const hasOrders = (await query('select 1 from catalog_orders where business_id=$1 limit 1', [user.business_id])).rowCount > 0;
  return { enabled: enabled(user.business_id), has_orders: hasOrders, catalogs };
}
async function catalog(db, id, bySlug = false, lock = false) {
  const row = (await db.query(`select c.*, to_jsonb(b) business from smart_catalogs c join businesses b on b.id=c.business_id where c.${bySlug ? 'slug' : 'id'}=$1 ${lock ? 'for update of c' : ''}`, [id])).rows[0];
  if (!row) throw notFound('Vitrina no encontrada.');
  return row;
}
function canReceive(c) {
  const plan = planFromBusiness(c.business);
  return !require('./catalogShowcaseService').isStamps(c) && !require('./activationShowcaseService').isActivations(c) && !require('./affiliateCatalogService').isPoints(c) && enabled(c.business_id) && c.business.is_active && !c.business.archived_at && c.status === 'ACTIVE' && plan.portal_access_allowed && plan.raw_status === 'ACTIVE' && !!plan.features.showcase;
}
async function settings(db, id, lock = false) {
  return (await db.query(`select * from catalog_order_settings where catalog_id=$1 ${lock ? 'for update' : ''}`, [id])).rows[0];
}
async function saveSettings(user, id, body) {
  const config = R.parse(R.settingsSchema, body.config);
  if (!enabled(user.business_id)) throw forbidden('Esta experiencia no está habilitada para tu negocio.');
  return withTransaction(async db => {
    const c = await catalog(db, id, false, true);
    if (c.business_id !== user.business_id) throw notFound('Vitrina no encontrada.');
    const old = await settings(db, id, true);
    if (Number(body.revision || 0) !== Number(old?.revision || 0)) throw badRequest('La configuración cambió. Actualiza antes de guardar.');
    return (await db.query(`insert into catalog_order_settings(catalog_id,business_id,config,updated_by) values($1,$2,$3,$4)
      on conflict(catalog_id) do update set config=excluded.config,revision=catalog_order_settings.revision+1,updated_by=excluded.updated_by,updated_at=now() returning *`, [id, user.business_id, config, user.id])).rows[0];
  });
}
async function publicConfig(slug) {
  const c = await catalog({ query }, slug, true);
  if (!canReceive(c)) return { enabled: false };
  const s = await settings({ query }, c.id);
  return { enabled: !!s?.config.enabled, receiving: !!s && R.receiving(s.config), config: s?.config || null, revision: s?.revision || 0, consent_text: CONSENT };
}
async function products(db, c) {
  return (await db.query(`select * from smart_catalog_products where catalog_id=$1 and business_id=$2 and stock_status in ('AVAILABLE','LIMITED') order by id`, [c.id, c.business_id])).rows.map(p => ({ ...publicProductWithPromotion(p), order_variants: R.variants(p) }));
}
async function buildQuote(db, slug, input) {
  const c = await catalog(db, slug, true, true);
  if (!canReceive(c)) throw badRequest('Esta vitrina no está recibiendo pedidos.');
  const s = await settings(db, c.id, true);
  if (!s || !R.receiving(s.config)) throw badRequest('La recepción está pausada o fuera de horario. Los pedidos enviados conservan su seguimiento.');
  const zone = s.config.zones.find(z => z.id === input.zone_id);
  if (!zone) throw badRequest('Selecciona una zona de cobertura disponible.');
  const available = await products(db, c);
  const seen = new Set();
  const lines = input.items.map(item => {
    const key = item.product_id + ':' + (item.variant_id || '');
    if (seen.has(key)) throw badRequest('Combina las cantidades del mismo producto y variante.');
    seen.add(key);
    const p = available.find(p => p.id === item.product_id);
    if (!p || p.currency !== 'COP' || p.price === null) throw badRequest('Un producto no está disponible con precio en COP. Revisa tu carrito.');
    const variant = p.order_variants.find(v => v.id === item.variant_id);
    if (p.order_variants.length && (!variant || !variant.available)) throw badRequest('Selecciona una variante disponible.');
    if (!p.order_variants.length && item.variant_id) throw badRequest('La variante ya no existe.');
    const price = variant ? variant.price : Number(p.price);
    return { product_id: p.id, inventory_product_id: p.inventory_product_id, name: p.name, variant_id: variant?.id || null, variant_name: variant?.name || null, quantity: item.quantity, unit_price: price, line_total: R.minor(price) * item.quantity / 100, currency: 'COP' };
  });
  await checkInventory(db, c.business_id, lines);
  const subtotal = lines.reduce((sum, l) => sum + R.minor(l.line_total), 0) / 100;
  return { catalog_id: c.id, business_id: c.business_id, catalog_title: c.title, business_name: c.business.name, revision: s.revision,
    items: lines, subtotal, delivery_fee: zone.fee, total: zone.fee === null ? null : (R.minor(subtotal) + R.minor(zone.fee)) / 100,
    zone, terms: s.config.terms, payment_instructions: s.config.payment_instructions, timezone: s.config.timezone,
    consent_text: CONSENT };
}
async function quote(slug, body) {
  const input = R.parse(R.cartSchema, body);
  const snapshot = await withTransaction(db => buildQuote(db, slug, input));
  const quote_token = jwt.sign({ purpose: 'catalog-order-quote', slug, input, digest: hash(JSON.stringify(snapshot)) }, env.jwtSecret, { expiresIn: '15m' });
  return { quote: snapshot, quote_token };
}
async function checkInventory(db, businessId, lines) {
  const totals = new Map();
  for (const line of lines) if (line.inventory_product_id) totals.set(line.inventory_product_id, (totals.get(line.inventory_product_id) || 0) + line.quantity);
  for (const [id, qty] of [...totals].sort(([a], [b]) => a.localeCompare(b))) {
    const p = (await db.query('select status,stock_quantity from business_inventory_products where id=$1 and business_id=$2 for update', [id, businessId])).rows[0];
    if (!p || p.status !== 'ACTIVE' || Number(p.stock_quantity) < qty) throw badRequest('No hay existencias suficientes de un producto del inventario. Contacta al negocio.');
  }
}
async function event(db, o, type, actor = null, details = {}) {
  await db.query('insert into catalog_order_events(order_id,business_id,event_type,actor_id,details) values($1,$2,$3,$4,$5)', [o.id, o.business_id, type, actor, details]);
  if (o.lead_id) await db.query(`insert into lead_events(business_id,source_type,source_id,event_type,event_title,event_description,created_by,metadata) values($1,'MANUAL',$2,$3,$4,$5,$6,$7)`,
    [o.business_id, o.lead_id, 'catalog_order_' + type.toLowerCase(), 'Pedido ' + o.number, type, actor, { order_id: o.id, ...details }]);
}
function publicReceipt(o) {
  return { id: o.id, number: o.number, status: o.status, payment_status: o.sale_status === 'VOIDED' && o.payment_status === 'PAID' ? 'VOIDED' : o.payment_status,
    created_at: o.created_at, updated_at: o.updated_at, items: o.snapshot.items.map(({ inventory_product_id, product_id, ...rest }) => rest),
    subtotal: o.snapshot.subtotal, delivery_fee: o.delivery_fee, total: o.total, proposed_fee: o.proposed_fee, proposal_version: o.proposal_version,
    terms: o.snapshot.terms, payment_instructions: o.snapshot.payment_instructions, business_name: o.snapshot.business_name,
    marketing_consent: o.marketing_consent, reason: o.reason, agreed_at: o.agreed_at };
}
async function submit(slug, body) {
  const input = R.parse(R.orderSchema, body);
  let claim;
  try { claim = jwt.verify(input.quote_token, env.jwtSecret, { ignoreExpiration: true }); } catch { throw badRequest('Vuelve a revisar el total antes de enviar.'); }
  if (claim.purpose !== 'catalog-order-quote' || claim.slug !== slug || claim.input.session_id !== input.session_id) throw badRequest('La revisión del carrito no corresponde a esta solicitud.');
  const fingerprint = hash(JSON.stringify({ ...input, quote_token: claim.digest }));
  return withTransaction(async db => {
    await db.query('select pg_advisory_xact_lock(hashtext($1))', ['catalog-order-request:' + input.request_id]);
    const prior = (await db.query('select o.*,s.sale_status from catalog_orders o left join business_sales s on s.id=o.sale_id where o.request_id=$1', [input.request_id])).rows[0];
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw badRequest('Esta solicitud ya fue utilizada con otros datos.');
      return { order: publicReceipt(prior), token: tokenFor(prior.id, prior.request_id), duplicate: true };
    }
    if (claim.exp * 1000 <= Date.now()) throw badRequest('La revisión venció. Revisa el total otra vez.');
    const snapshot = await buildQuote(db, slug, claim.input);
    if (hash(JSON.stringify(snapshot)) !== claim.digest) throw badRequest('Cambió el precio, la disponibilidad o las condiciones. Revisa y acepta el nuevo resumen antes de enviar.');
    const id = crypto.randomUUID(), token = tokenFor(id, input.request_id);
    const o = (await db.query(`insert into catalog_orders(id,business_id,catalog_id,request_id,fingerprint,access_hash,session_id,customer_name,customer_phone,address,delivery_references,notes,snapshot,delivery_fee,total,marketing_consent)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *`,
    [id, snapshot.business_id, snapshot.catalog_id, input.request_id, fingerprint, hash(token), input.session_id, input.name, input.phone.replace(/\D/g, ''), input.address, input.references, input.notes, snapshot, snapshot.delivery_fee, snapshot.total, input.marketing_consent])).rows[0];
    await event(db, o, 'REQUESTED', null, { terms_accepted: true, marketing_consent: input.marketing_consent, consent_text: CONSENT, pricing_revision: snapshot.revision });
    await catalogEvent(db, { business_id: o.business_id, catalog_id: o.catalog_id, event_type: 'catalog_order_intent', source: 'catalog_orders', channel: 'public_catalog', metadata: { order_id: o.id, session_id: o.session_id } });
    return { order: publicReceipt(o), token, duplicate: false };
  });
}
async function getPublic(db, token, lock = false) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw notFound('Pedido no encontrado.');
  const o = (await db.query(`select o.*,s.sale_status from catalog_orders o left join business_sales s on s.id=o.sale_id where o.access_hash=$1 ${lock ? 'for update of o' : ''}`, [hash(token)])).rows[0];
  if (!o) throw notFound('Pedido no encontrado.');
  return o;
}
async function status(token) { return { order: publicReceipt(await getPublic({ query }, token)) }; }
async function customerAction(token, body) {
  return withTransaction(async db => {
    const o = await getPublic(db, token, true);
    if (body.action === 'WITHDRAW_CONSENT') {
      if (o.marketing_consent) {
        await db.query('update catalog_orders set marketing_consent=false,updated_at=now() where id=$1', [o.id]);
        if (o.lead_id) await db.query("update business_manual_leads set metadata=metadata || $3::jsonb,updated_at=now() where id=$1 and business_id=$2", [o.lead_id, o.business_id, JSON.stringify({ catalog_order_marketing_allowed: false, catalog_order_consent_at: new Date().toISOString(), catalog_order_consent_source: o.id })]);
        await event(db, o, 'CONSENT_WITHDRAWN');
      }
    } else if (body.action === 'ACCEPT_FEE') {
      if (!['NEW', 'PENDING'].includes(o.status) || o.proposed_fee === null || Number(body.proposal_version) !== o.proposal_version) throw badRequest('La propuesta cambió o ya no está pendiente. Actualiza el pedido.');
      await db.query('update catalog_orders set delivery_fee=proposed_fee,total=$2,proposed_fee=null,updated_at=now() where id=$1', [o.id, (R.minor(o.snapshot.subtotal) + R.minor(o.proposed_fee)) / 100]);
      await event(db, o, 'FEE_ACCEPTED', null, { delivery_fee: o.proposed_fee, proposal_version: o.proposal_version });
    } else throw badRequest('Acción no disponible.');
    return { order: publicReceipt(await getPublic(db, token)) };
  });
}
async function getOrder(db, user, id, lock = false) {
  const o = (await db.query(`select o.*,s.sale_status from catalog_orders o left join business_sales s on s.id=o.sale_id where o.id=$1 and o.business_id=$2 ${lock ? 'for update of o' : ''}`, [id, user.business_id])).rows[0];
  if (!o) throw notFound('Pedido no encontrado.');
  return o;
}
async function detail(user, id) {
  const o = await getOrder({ query }, user, id);
  const history = (await query('select e.*,u.full_name actor_name from catalog_order_events e left join app_users u on u.id=e.actor_id where e.order_id=$1 and e.business_id=$2 order by e.created_at,e.id', [id, user.business_id])).rows;
  const contacts = (await query("select id,name,phone,document_id from business_manual_leads where business_id=$1 and regexp_replace(phone,'[^0-9]','','g')=$2 order by created_at limit 20", [user.business_id, o.customer_phone])).rows;
  const { access_hash, fingerprint, ...order } = o;
  return { order, history, contacts };
}
async function linkContact(db, user, o, body) {
  if (o.lead_id) return;
  if (body.identity_confirmed !== true) throw badRequest('Confirma con el cliente sus datos antes de vincular el contacto.');
  await db.query('select pg_advisory_xact_lock(hashtext($1))', ['order-contact-quota:' + user.business_id]);
  await db.query('select pg_advisory_xact_lock(hashtext($1))', ['order-contact:' + user.business_id + ':' + o.customer_phone]);
  const matches = (await db.query("select id from business_manual_leads where business_id=$1 and regexp_replace(phone,'[^0-9]','','g')=$2", [user.business_id, o.customer_phone])).rows;
  let id = body.lead_id;
  if (id) {
    if (!matches.some(x => x.id === id)) throw badRequest('El contacto seleccionado debe pertenecer a este negocio y tener el teléfono confirmado.');
  } else {
    if (matches.length) throw badRequest('Ya hay contactos con ese teléfono. Elige el contacto correcto antes de continuar.');
    // Existing plan quota is checked before creating a canonical contact.
    const count = (await db.query('select count(*)::int n from business_manual_leads where business_id=$1', [user.business_id])).rows[0].n;
    await assertLimitForBusiness(user.business_id, 'contacts', count, 'contactos');
    id = (await db.query(`insert into business_manual_leads(business_id,created_by_user_id,name,phone,source,status,metadata) values($1,$2,$3,$4,'Pedidos de vitrina','NEW',$5) returning id`,
      [user.business_id, user.id, o.customer_name, o.customer_phone, { source_module: 'catalog_orders', identity_confirmation: 'MANUAL_BUSINESS', order_id: o.id, catalog_order_marketing_allowed: o.marketing_consent }])).rows[0].id;
  }
  if (o.marketing_consent) await db.query("update business_manual_leads set metadata=metadata || $3::jsonb,updated_at=now() where id=$1 and business_id=$2", [id, o.business_id, JSON.stringify({ catalog_order_marketing_allowed: true, catalog_order_consent_at: new Date().toISOString(), catalog_order_consent_source: o.id, catalog_order_consent_text: o.snapshot.consent_text })]);
  else if ((await db.query("select 1 from catalog_order_events where order_id=$1 and business_id=$2 and event_type='CONSENT_WITHDRAWN' limit 1", [o.id, o.business_id])).rowCount) {
    await db.query("update business_manual_leads set metadata=metadata || $3::jsonb,updated_at=now() where id=$1 and business_id=$2", [id, o.business_id, JSON.stringify({ catalog_order_marketing_allowed: false, catalog_order_consent_at: new Date().toISOString(), catalog_order_consent_source: o.id })]);
  }
  o.lead_id = id;
  await db.query('update catalog_orders set lead_id=$2 where id=$1', [o.id, id]);
  await event(db, o, 'CONTACT_LINKED', user.id, { identity_confirmation: 'MANUAL_BUSINESS', marketing_consent: o.marketing_consent, consent_text: o.snapshot.consent_text });
}
async function applyInventory(db, user, o) {
  if (o.inventory_applied) return;
  const grouped = new Map();
  for (const item of o.snapshot.items.filter(i => i.inventory_product_id)) {
    const previous = grouped.get(item.inventory_product_id);
    if (previous) { previous.quantity += item.quantity; previous.line_total = (R.minor(previous.line_total) + R.minor(item.line_total)) / 100; previous.unit_price = previous.line_total / previous.quantity; }
    else grouped.set(item.inventory_product_id, { ...item });
  }
  const linked = [...grouped.values()];
  await checkInventory(db, o.business_id, linked);
  // Never let name matching associate a loose showcase item with another inventory item.
  if (linked.length) await syncSaleProductsWithCatalog(db, o.business_id, user.id, linked.map(i => ({ ...i, product_id: undefined })), { allowZero: true, createMissingProducts: false, sourceModule: 'catalog_orders', inventoryMovementKey: 'catalog-order:' + o.id, saleReference: 'catalog-order:' + o.id });
  await db.query('update catalog_orders set inventory_applied=true where id=$1', [o.id]);
  o.inventory_applied = true;
}
async function act(user, id, body) {
  return withTransaction(async db => {
    const o = await getOrder(db, user, id, true);
    if (body.action === 'STATE') {
      if (body.status === o.status) return { ok: true, duplicate: true };
      if (!R.transitions[o.status]?.includes(body.status)) throw badRequest('Ese cambio de estado no está permitido. Actualiza el pedido.');
      if (['REJECTED', 'CANCELLED'].includes(body.status) && !String(body.reason || '').trim()) throw badRequest('Indica el motivo.');
      if (body.status === 'ACCEPTED') {
        if (o.total === null || o.proposed_fee !== null) throw badRequest('El cliente debe aceptar el domicilio pendiente antes de confirmar.');
        await checkInventory(db, o.business_id, o.snapshot.items);
        await linkContact(db, user, o, body);
      }
      if (body.status === 'DELIVERED') await applyInventory(db, user, o);
      await db.query('update catalog_orders set status=$2,reason=$3,updated_at=now() where id=$1', [id, body.status, body.reason || null]);
      await event(db, o, body.status, user.id, { previous_status: o.status, reason: body.reason || null });
    } else if (body.action === 'PROPOSE_FEE') {
      if (!['NEW', 'PENDING'].includes(o.status) || o.payment_status !== 'UNPAID') throw badRequest('Solo puedes proponer el domicilio antes de aceptar el pedido.');
      const fee = R.parse(R.money, body.fee);
      await db.query("update catalog_orders set proposed_fee=$2,proposal_version=proposal_version+1,status='PENDING',updated_at=now() where id=$1", [id, fee]);
      await event(db, o, 'FEE_PROPOSED', user.id, { fee });
    } else if (body.action === 'PAY') {
      if (o.payment_status === 'PAID') return { ok: true, duplicate: true, sale_id: o.sale_id };
      if (o.payment_status !== 'UNPAID' || ['NEW', 'PENDING', 'REJECTED', 'CANCELLED'].includes(o.status) || body.received !== true) throw badRequest('Acepta el pedido y confirma que recibiste el dinero.');
      if (R.minor(body.amount) !== R.minor(o.total) || !Number.isFinite(Number(body.amount))) throw badRequest('Registra el importe completo acordado. Esta versión no maneja abonos.');
      const reference = R.parse(R.text(3, 160), body.reference), method = R.parse(R.text(2, 80), body.method);
      await applyInventory(db, user, o);
      const sale = (await db.query(`insert into business_sales(business_id,customer_name,customer_phone,product_name,sale_amount,currency,seller_user_id,created_by_user_id,acquisition_source,acquisition_channel,paid_at,payment_method,sale_status,idempotency_key,metadata)
        values($1,$2,$3,$4,$5,'COP',$6,$6,'Vitrina Qori','catalog_orders',now(),$7,'PAID',$8,$9) returning id`,
        [o.business_id, o.customer_name, o.customer_phone, o.snapshot.items.map(i => i.name + (i.variant_name ? ' · ' + i.variant_name : '')).join(', '), o.total, user.id, method, 'catalog-order:' + id,
          { source_module: 'catalog_orders', order_id: id, lead_id: o.lead_id, attribution: 'DIRECT_CATALOG', payment_confirmation: 'MANUAL_BUSINESS', payment_reference: reference, products: o.snapshot.items, delivery_fee: o.delivery_fee }])).rows[0];
      await db.query("update catalog_orders set payment_status='PAID',sale_id=$2,updated_at=now() where id=$1", [id, sale.id]);
      await db.query("update business_sales set rms_source_type='MANUAL',rms_source_id=$2,customer_document_id=(select document_id from business_manual_leads where id=$2 and business_id=$3) where id=$1", [sale.id, o.lead_id, o.business_id]);
      await db.query("update business_manual_leads set status='CONVERTED',updated_at=now() where id=$1 and business_id=$2", [o.lead_id, o.business_id]);
      await event(db, o, 'PAYMENT_CONFIRMED', user.id, { sale_id: sale.id, amount: o.total, reference, method, confirmation: 'MANUAL_BUSINESS' });
    } else if (body.action === 'REFUND') {
      if (o.payment_status === 'REFUNDED') return { ok: true, duplicate: true };
      if (o.payment_status !== 'PAID' || body.received !== true) throw badRequest('Confirma que devolviste el dinero al cliente.');
      const reason = R.parse(R.text(5, 500), body.reason);
      await db.query('select id from business_sales where id=$1 and business_id=$2 for update', [o.sale_id, o.business_id]);
      await db.query("update business_sales set sale_status='VOIDED',metadata=metadata || $2::jsonb where id=$1", [o.sale_id, JSON.stringify({ void_reason: reason, voided_by_user_id: user.id, voided_at: new Date().toISOString(), refund_confirmation: 'MANUAL_BUSINESS', original_sale_amount: o.total })]);
      await recordLifecycleEvent({ business_id: o.business_id, entity_type: 'ATTRIBUTED_SALE', entity_id: o.sale_id, action: 'VOIDED', previous_status: 'PAID', next_status: 'VOIDED', reason, actor_user_id: user.id, idempotency_key: 'catalog-order-refund:' + id }, db);
      await db.query("update catalog_orders set payment_status='REFUNDED',updated_at=now() where id=$1", [id]);
      await event(db, o, 'REFUNDED', user.id, { reason, amount: o.total, inventory_return: 'MANUAL_REVIEW_REQUIRED' });
    } else if (body.action === 'OPERATIONS') {
      const driver = R.parse(R.text(0, 160), body.driver || '');
      const agreed = body.agreed_at ? R.parse(R.z.string().datetime(), body.agreed_at) : null;
      const priority = R.parse(R.z.number().int().min(0).max(3), body.priority || 0);
      await db.query('update catalog_orders set driver=$2,agreed_at=$3,priority=$4,updated_at=now() where id=$1', [id, driver, agreed, priority]);
      await event(db, o, 'OPERATIONS_UPDATED', user.id, { driver, agreed_at: agreed, priority });
    } else throw badRequest('Acción no disponible.');
    return { ok: true };
  });
}
async function list(user, filters = {}) {
  const days = Math.min(365, Math.max(1, Number(filters.days) || 365));
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
  const offset = Math.max(0, Math.min(100000, Number(filters.offset) || 0));
  const order = filters.sort === 'agreed' ? 'o.agreed_at asc nulls last,o.created_at asc' : filters.sort === 'priority' ? 'o.priority desc,o.created_at asc' : 'o.created_at asc';
  const rows = (await query(`select o.id,o.number,o.customer_name,o.customer_phone,o.status,o.payment_status,s.sale_status,o.total,o.created_at,o.updated_at,o.priority,o.agreed_at,o.driver,o.lead_id,count(*) over() total_count
    from catalog_orders o left join business_sales s on s.id=o.sale_id where o.business_id=$1 and ($2='' or o.status=$2) and ($3='' or o.customer_name ilike '%'||$3||'%' or o.number::text=$3 or o.customer_phone like '%'||$3||'%') and (not $7::boolean or o.created_at>=now()-($6::int*interval '1 day')) order by ${order} limit $4 offset $5`,
  [user.business_id, filters.status || '', String(filters.search || '').slice(0, 160), limit, offset, days, !!filters.days])).rows;
  return { orders: rows, offset, limit, total: Number(rows[0]?.total_count || 0) };
}
async function metrics(user, filters = {}) {
  const days = Math.min(365, Math.max(1, Number(filters.days) || 30));
  const stats = (await query(`select count(*)::int requests,count(distinct o.session_id)::int request_sessions,count(distinct o.lead_id)::int identified_contacts,
    count(*) filter(where o.status in ('ACCEPTED','PREPARING','READY','ON_THE_WAY','DELIVERED'))::int accepted,
    count(*) filter(where o.status='DELIVERED')::int delivered,count(*) filter(where o.status in ('CANCELLED','REJECTED'))::int cancelled,
    count(*) filter(where s.sale_status='PAID')::int paid,count(*) filter(where o.payment_status='REFUNDED')::int refunded,
    coalesce(sum((o.snapshot->>'subtotal')::numeric),0) requested_products,
    coalesce(sum(o.total) filter(where o.status in ('ACCEPTED','PREPARING','READY','ON_THE_WAY','DELIVERED')),0) accepted_value,
    coalesce(sum(s.sale_amount) filter(where s.sale_status='PAID'),0) confirmed_revenue,
    coalesce(sum(s.sale_amount) filter(where o.payment_status='PAID'),0) received_gross,
    coalesce(sum(s.sale_amount) filter(where o.payment_status='REFUNDED'),0) refunded_value
    from catalog_orders o left join business_sales s on s.id=o.sale_id and s.business_id=o.business_id where o.business_id=$1 and o.created_at>=now()-($2::int*interval '1 day')`, [user.business_id, days])).rows[0];
  const events = (await query(`select event_type,metadata->>'step' step,count(*)::int events,count(distinct metadata->>'session_id')::int sessions from smart_catalog_events where business_id=$1 and created_at>=now()-($2::int*interval '1 day') and source='catalog_orders' group by event_type,metadata->>'step'`, [user.business_id, days])).rows;
  return { days, stats, events, attribution: 'Cada solicitud conserva su vitrina de origen y las condiciones aceptadas. Una venta tiene un solo pedido. Resultados por fecha de solicitud; ingresos netos de ventas anuladas, cobros declarados manualmente. Sesiones del navegador, no personas únicas.' };
}
async function track(slug, body) {
  const data = R.parse(R.z.object({ session_id: R.z.string().uuid(), event_type: R.z.enum(['catalog_view', 'product_view', 'info_click']), product_id: R.z.string().uuid().nullable().optional(), step: R.z.enum(['CATALOG', 'CART']) }), body);
  const c = await catalog({ query }, slug, true);
  if (!canReceive(c)) throw badRequest('La vitrina no está disponible.');
  if (data.product_id && !(await query('select 1 from smart_catalog_products where id=$1 and catalog_id=$2 and business_id=$3', [data.product_id, c.id, c.business_id])).rowCount) throw badRequest('Producto no disponible.');
  await catalogEvent({ query }, { business_id: c.business_id, catalog_id: c.id, product_id: data.product_id, event_type: data.event_type, source: 'catalog_orders', channel: 'public_catalog', metadata: { session_id: data.session_id, step: data.step } });
  return { ok: true };
}
module.exports = { overview, enabled, catalog, canReceive, settings, saveSettings, products, publicConfig, quote, submit, status, customerAction, detail, act, list, metrics, track, event, CONSENT };

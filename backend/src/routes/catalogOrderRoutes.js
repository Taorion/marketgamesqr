const express = require('express');
const { authRequired, requireRoles } = require('../middleware/auth');
const { requirePortalAccess, requireBusinessFeature } = require('../middleware/subscription');
const { invalidateBusinessResponseCache } = require('../middleware/businessResponseCache');
const { rateLimit } = require('../middleware/rateLimit');
const { forbidden } = require('../utils/http');
const orders = require('../services/catalogOrderService');
const { z, parse, variants } = require('../services/catalogOrderRules');
const { query } = require('../config/db');
const flyers = require('../services/catalogOrderFlyerService');
const router = express.Router(), publicRouter = express.Router();
const handle = fn => async (req, res, next) => { try { res.set('Cache-Control', 'private, no-store'); res.json(await fn(req)); } catch (e) { next(e); } };
router.use(authRequired, requirePortalAccess, requireRoles('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'ADMIN', 'ADMIN_MARKET_GAMES'), invalidateBusinessResponseCache());
router.use((req, _res, next) => req.user.business_id ? next() : next(forbidden('Selecciona un negocio.')));
const showcase = requireBusinessFeature('showcase');
const uuid = req => { for (const key of ['id', 'catalogId', 'productId']) if (req.params[key]) parse(z.string().uuid(), req.params[key]); };
router.param('id', (req, res, next) => { try { uuid(req); next(); } catch (e) { next(e); } });
router.param('catalogId', (req, res, next) => { try { uuid(req); next(); } catch (e) { next(e); } });
router.get('/', handle(req => orders.overview(req.user)));
router.put('/catalogs/:catalogId/settings', showcase, handle(req => orders.saveSettings(req.user, req.params.catalogId, req.body)));
router.get('/catalogs/:catalogId/products', showcase, handle(async req => {
  const c = await orders.catalog({ query }, req.params.catalogId);
  if (c.business_id !== req.user.business_id) throw forbidden('Vitrina no disponible.');
  return { products: await orders.products({ query }, c) };
}));
router.put('/catalogs/:catalogId/products/:productId/variants', showcase, handle(async req => {
  uuid(req);
  const value = variants({ metadata: { order_variants: req.body.variants } });
  if (new Set(value.map(v => v.id)).size !== value.length) throw forbidden('Cada variante necesita un identificador distinto.');
  const result = await query("update smart_catalog_products set metadata=jsonb_set(metadata,'{order_variants}',$4::jsonb),updated_at=now() where id=$1 and catalog_id=$2 and business_id=$3 returning id", [req.params.productId, req.params.catalogId, req.user.business_id, JSON.stringify(value)]);
  if (!result.rowCount) throw forbidden('Producto no disponible.');
  return { ok: true };
}));
router.get('/orders', handle(req => orders.list(req.user, req.query)));
router.get('/orders/:id', handle(req => orders.detail(req.user, req.params.id)));
router.post('/orders/:id/actions', handle(req => orders.act(req.user, req.params.id, req.body)));
router.get('/metrics', handle(req => orders.metrics(req.user, req.query)));
router.get('/share-qr', handle(async req => {
  const id = parse(z.string().uuid(), req.query.id);
  return flyers.shareInfo(req.user, id);
}));
router.get('/catalogs/:catalogId/flyer', showcase, handle(req => flyers.flyer(req.user, req.params.catalogId, req.query.format || 'png')));
publicRouter.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); next(); });
publicRouter.use(rateLimit({ keyPrefix: 'catalog-orders-public', max: 120, windowMs: 60000 }));
publicRouter.get('/catalogs/:slug/config', handle(req => orders.publicConfig(req.params.slug)));
publicRouter.get('/catalogs/:slug/products', handle(async req => {
  const c = await orders.catalog({ query }, req.params.slug, true);
  if (!orders.canReceive(c)) return { products: [] };
  const list = await orders.products({ query }, c);
  return { products: list.map(p => ({ id: p.id, name: p.name, description: p.description, short_description: p.short_description, image_url: p.image_url, price: p.price, currency: p.currency, variants: p.order_variants })) };
}));
publicRouter.post('/catalogs/:slug/events', handle(req => orders.track(req.params.slug, req.body)));
publicRouter.post('/catalogs/:slug/quote', handle(req => orders.quote(req.params.slug, req.body)));
publicRouter.post('/catalogs/:slug/orders', rateLimit({ keyPrefix: 'catalog-order-submit', max: 20, windowMs: 60000 }), handle(req => orders.submit(req.params.slug, req.body)));
// Capability comes in a header, never in logs, query strings or predictable order numbers.
publicRouter.get('/status', handle(req => orders.status(req.headers['x-order-token'])));
publicRouter.post('/status', handle(req => orders.customerAction(req.headers['x-order-token'], req.body)));
module.exports = { router, publicRouter };

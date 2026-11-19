const express = require("express");
const { cacheBusinessResponse } = require("../middleware/businessResponseCache");
const { rateLimit } = require("../middleware/rateLimit");
const {
  publicEvent,
  publicGet,
  publicGetProduct,
  publicWhatsappIntent,
} = require("../controllers/smartCatalogController");

const router = express.Router();

const publicCatalogReadLimit = rateLimit({ keyPrefix: "public-catalog-read", max: 240, windowMs: 15 * 60_000 });
const publicCatalogActionLimit = rateLimit({ keyPrefix: "public-catalog-action", max: 80, windowMs: 15 * 60_000 });
const publicCatalogCache = cacheBusinessResponse({
  keyPrefix: "public-catalog",
  ttlMs: 120_000,
  maxBytes: 512 * 1024,
  businessIdFromReq: () => "public",
});

for(const [route,method] of [['stamp-programs','stampPrograms'],['access-qr','publicAccessQr']])router.get('/catalogs/:catalogSlug/'+route,publicCatalogReadLimit,async(req,res,next)=>{try{res.set('Cache-Control','no-store');res.json(await require('../services/catalogShowcaseService')[method](req.params.catalogSlug));}catch(e){next(e);}});
router.get("/catalogs/:catalogSlug", publicCatalogReadLimit, publicCatalogCache, publicGet);
router.get('/catalogs/:catalogSlug/activations',publicCatalogReadLimit,async(req,res,next)=>{try{res.set('Cache-Control','no-store');res.json(await require('../services/activationShowcaseService').activations(req.params.catalogSlug));}catch(error){next(error);}});
router.get("/catalogs/:catalogSlug/products/:productSlug", publicCatalogReadLimit, publicCatalogCache, publicGetProduct);
router.post("/catalogs/:catalogSlug/events", publicCatalogActionLimit, publicEvent);
router.post("/catalogs/:catalogSlug/products/:productId/whatsapp-intent", publicCatalogActionLimit, publicWhatsappIntent);

module.exports = router;

const express = require("express");
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

router.get("/catalogs/:catalogSlug", publicCatalogReadLimit, publicGet);
router.get("/catalogs/:catalogSlug/products/:productSlug", publicCatalogReadLimit, publicGetProduct);
router.post("/catalogs/:catalogSlug/events", publicCatalogActionLimit, publicEvent);
router.post("/catalogs/:catalogSlug/products/:productId/whatsapp-intent", publicCatalogActionLimit, publicWhatsappIntent);

module.exports = router;

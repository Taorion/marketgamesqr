const express = require("express");
const {
  publicEvent,
  publicGet,
  publicGetProduct,
  publicWhatsappIntent,
} = require("../controllers/smartCatalogController");

const router = express.Router();

router.get("/catalogs/:catalogSlug", publicGet);
router.get("/catalogs/:catalogSlug/products/:productSlug", publicGetProduct);
router.post("/catalogs/:catalogSlug/events", publicEvent);
router.post("/catalogs/:catalogSlug/products/:productId/whatsapp-intent", publicWhatsappIntent);

module.exports = router;

const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  businessArchive,
  businessCreate,
  businessDashboard,
  businessDetail,
  businessIntentAgenda,
  businessIntentPatch,
  businessIntentPostSale,
  businessIntentWon,
  businessList,
  businessPatch,
  intentsList,
  productsCreate,
  productsDelete,
  productsList,
  productsPatch,
  seedDoctorAngie,
} = require("../controllers/smartCatalogController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));

router.get("/dashboard", businessDashboard);
router.post("/templates/doctor-angie", seedDoctorAngie);
router.get("/", businessList);
router.post("/", businessCreate);
router.get("/:catalogId", businessDetail);
router.patch("/:catalogId", businessPatch);
router.delete("/:catalogId", businessArchive);
router.get("/:catalogId/products", productsList);
router.post("/:catalogId/products", productsCreate);
router.patch("/:catalogId/products/:productId", productsPatch);
router.delete("/:catalogId/products/:productId", productsDelete);
router.get("/:catalogId/intents", intentsList);
router.patch("/intents/:intentId", businessIntentPatch);
router.post("/intents/:intentId/create-agenda-task", businessIntentAgenda);
router.post("/intents/:intentId/mark-won", businessIntentWon);
router.post("/intents/:intentId/send-post-sale-ticket", businessIntentPostSale);

module.exports = router;

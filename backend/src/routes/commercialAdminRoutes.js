const router = require("express").Router();
const service = require("../services/commercialAdminService");
const { requireCommercialUser } = require("../services/commercialAuthorization");
router.use((req,res,next)=>{ try { requireCommercialUser(req.user); res.set("Cache-Control","no-store"); next(); } catch(error) { next(error); } });
const handle = fn => async(req,res,next)=>{ try { res.json(await fn(req)); } catch(error) {
  if(error.message==="Invalid request payload.") error.publicMessage=error.details?.formErrors?.join(" ") || "Revisa los campos obligatorios y los límites indicados.";
  if(error.code==="23505") {error.status=409;error.publicMessage="Ya existe un registro con esos datos. Actualiza la lista antes de continuar.";}
  next(error);
} };
router.get("/bootstrap",handle(req=>service.bootstrap(req.user)));
router.post("/enrollments/descubre",handle(req=>require("../services/descubreEnrollmentService").enrollDescubre(req.user,req.body)));
for(const kind of ["prospects","deals","customers","audit"]) router.get(`/${kind}`,handle(req=>service.list(req.user,kind,req.query)));
router.post("/sellers",handle(req=>service.createSeller(req.user,req.body)));
router.get("/seller-candidates",handle(req=>service.findExistingSeller(req.user,req.query)));
router.post("/sellers/existing",handle(req=>service.grantExistingSeller(req.user,req.body)));
router.patch("/sellers/:id/access",handle(req=>service.updateAdminAccess(req.user,req.params.id,req.body)));
router.patch("/sellers/:id",handle(req=>service.updateSeller(req.user,req.params.id,req.body)));
router.delete("/sellers/:id",handle(req=>service.updateSeller(req.user,req.params.id,{},true)));
router.post("/policies",handle(req=>service.savePolicy(req.user,req.body)));
router.patch("/policies/:id",handle(req=>service.savePolicy(req.user,req.body,req.params.id)));
router.post("/prospects",handle(req=>service.saveProspect(req.user,req.body)));
router.patch("/prospects/:id",handle(req=>service.saveProspect(req.user,req.body,req.params.id)));
router.post("/deals",handle(req=>service.createDeal(req.user,req.body)));
router.post("/deals/:id/decision",handle(req=>service.decideDeal(req.user,req.params.id,req.body)));
router.post("/deals/:id/cancel",handle(req=>service.cancelDeal(req.user,req.params.id,req.body)));
router.post("/deals/:id/apply",handle(req=>service.applyDeal(req.user,req.params.id)));
router.patch("/customers/:id",handle(req=>service.updateCustomer(req.user,req.params.id,req.body)));
module.exports=router;

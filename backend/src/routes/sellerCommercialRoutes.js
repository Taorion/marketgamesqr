const router=require('express').Router();
const service=require('../services/commercialAdminService');
const {requireApproved}=require('../services/qoriSellerService');
// Seller CRM exposes only the ambassador's own prospects and referral links.
router.use(async(req,res,next)=>{try{await requireApproved(req.user);res.set('Cache-Control','private, no-store');next();}catch(error){next(error);}});
const handle=fn=>async(req,res,next)=>{try{res.json(await fn(req));}catch(error){next(error);}};
router.get('/prospects',handle(req=>service.list(req.user,'prospects',req.query)));
router.post('/prospects',handle(req=>service.saveProspect(req.user,req.body)));
router.patch('/prospects/:id',handle(req=>service.saveProspect(req.user,req.body,req.params.id)));
router.get('/prospects/:id/referral',handle(req=>require('../services/prospectReferralService').referral(req.user,req.params.id)));
module.exports=router;

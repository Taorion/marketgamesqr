const router=require('express').Router();
const {authRequired,requireRoles}=require('../middleware/auth');
const {rateLimit}=require('../middleware/rateLimit');
const s=require('../services/penseEnTiService');
const handle=fn=>async(req,res,next)=>{try{res.set('Cache-Control','no-store').json(await fn(req));}catch(e){next(e);}};
router.post('/signup',rateLimit({keyPrefix:'free-signup',max:6,windowMs:3600000}),handle(req=>s.signup(req.body)));
router.get('/advisor/:id',handle(req=>require('../services/commercialAdvisorService').advisorById(req.params.id)));
router.get('/receipts/:token',rateLimit({keyPrefix:'gift-receipt',max:60,windowMs:60000}),handle(req=>require('../services/giftDeliveryService').receipt(req.params.token)));
router.use(authRequired,requireRoles('BUSINESS_OWNER','BUSINESS_MANAGER'));
router.get('/balances',handle(req=>s.balances(req.user)));
router.get('/giftcards/packages',handle(async req=>{
 const {plan}=await require('../services/subscriptionService').getBusinessSubscription(req.user.business_id);
 if(!plan.portal_access_allowed||plan.raw_status!=='ACTIVE'||!plan.features.gift_cards)throw require('../utils/http').forbidden('Las Gift Cards no están incluidas en tu programa actual.');
 if(Number.isFinite(plan.limits?.gift_cards_total))throw require('../utils/http').forbidden('Tu muestra tiene un cupo total. Elige una suscripción antes de comprar emisiones adicionales.');
 return {packages:require('../services/packageCatalog').GIFTCARD_PACKAGE_OFFERS};
}));
router.post('/giftcards/checkout',requireRoles('BUSINESS_OWNER'),handle(req=>{const d=require('../utils/validators').validate(require('zod').z.object({package_code:require('zod').z.enum(['GF10','GF25','GF50','GF100']),idempotency_key:require('zod').z.string().uuid()}).strict(),req.body);return require('../services/mercadoPagoService').createCreditCheckout(req.user,d);}));
module.exports=router;

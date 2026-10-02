const express=require('express');
const {z}=require('zod');
const {authRequired,requireRoles}=require('../middleware/auth');
const {requirePortalAccess}=require('../middleware/subscription');
const {rateLimit}=require('../middleware/rateLimit');
const {badRequest}=require('../utils/http');
const service=require('../services/stampCardService');
const router=express.Router(),publicRouter=express.Router();
const uuid=z.string().uuid();
const money=z.coerce.number().finite().min(0).max(999999999);
const inventoryProduct=z.object({inventory_product_id:uuid});
const program=z.object({
  name:z.string().trim().min(3).max(120),stamps_required:z.coerce.number().int().min(2).max(50),
  benefit_type:z.enum(['FREE_GIFT','PERCENT_DISCOUNT','FIXED_AMOUNT_DISCOUNT','CUSTOM']),
  benefit_value:z.object({label:z.string().trim().min(3).max(240),percent:money.optional(),amount:money.optional(),product_scope:inventoryProduct.optional()}),
  purchase_product:inventoryProduct.nullable().default(null),
  minimum_purchase:money,one_per_day:z.boolean(),allow_manual:z.boolean(),
  card_valid_days:z.coerce.number().int().min(1).max(3650),ticket_valid_days:z.coerce.number().int().min(1).max(3650),
  reward_cost:money,ticket_cost:money,terms:z.string().trim().max(4000),
  status:z.enum(['ACTIVE','PAUSED','ARCHIVED']).default('ACTIVE')
}).superRefine((data,ctx)=>{
  if (data.benefit_value.product_scope && data.benefit_type!=='FREE_GIFT')
    ctx.addIssue({code:'custom',message:'Solo un producto o servicio gratis puede tener un producto de premio.'});
  if (data.benefit_type==='PERCENT_DISCOUNT' && !(data.benefit_value.percent>0 && data.benefit_value.percent<=100))
    ctx.addIssue({code:'custom',message:'El descuento debe estar entre 1 y 100 %.'});
  if (data.benefit_type==='FIXED_AMOUNT_DISCOUNT' && !(data.benefit_value.amount>0))
    ctx.addIssue({code:'custom',message:'Ingresa el valor del descuento.'});
});
const enrollment=z.object({program_id:uuid,name:z.string().trim().min(2).max(160),document_id:z.string().trim().min(3).max(80),
  phone:z.string().trim().max(40).optional(),email:z.union([z.string().email().max(180),z.literal('')]).optional(),consent:z.literal(true)});
function parse(schema,input) {const r=schema.safeParse(input);if(!r.success)throw badRequest(r.error.issues.map(i=>i.message).join(' '));return r.data;}
function filters(req) {
  const today=new Date().toISOString().slice(0,10),start=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  const data=parse(z.object({from:z.string().date().default(start),to:z.string().date().default(today),
    program_id:uuid.optional(),search:z.string().max(120).default(''),offset:z.coerce.number().int().min(0).max(1000000).default(0)}),req.query);
  if (data.from>data.to || new Date(data.to)-new Date(data.from)>366*86400000) throw badRequest('Selecciona un periodo de hasta un año.');
  return data;
}
const handle=fn=>async(req,res,next)=>{try {res.set('Cache-Control','private, no-store');res.json(await fn(req));}catch(error){next(error);}};
router.use(authRequired,requirePortalAccess);
const validatorRoles=requireRoles('BUSINESS_OWNER','BUSINESS_MANAGER','VALIDATOR','ADMIN','ADMIN_MARKET_GAMES');
router.get('/validator/:id',validatorRoles,handle(req=>service.validatorCard(req.user.business_id,parse(uuid,req.params.id))));
router.post('/validator/:id/stamp',validatorRoles,handle(req=>service.stampFromQr(req.user.business_id,req.user.id,parse(uuid,req.params.id),
  parse(z.object({cycle_id:uuid,expected_stamps:z.number().int().min(0).max(50),expected_voids:z.number().int().nonnegative().default(0)}),req.body))));
router.use(requireRoles('BUSINESS_OWNER','BUSINESS_MANAGER','ADMIN','ADMIN_MARKET_GAMES'));
router.get('/context',handle(req=>service.context(req.user.business_id)));
router.get('/dashboard',handle(req=>service.dashboard(req.user.business_id,filters(req))));
router.get('/history',handle(req=>service.history(req.user.business_id,filters(req))));
router.get('/members',handle(req=>service.members(req.user.business_id,filters(req))));
router.post('/programs',handle(req=>service.saveProgram(req.user.business_id,req.user.id,parse(program,req.body))));
router.put('/programs/:id',handle(req=>service.saveProgram(req.user.business_id,req.user.id,parse(program,req.body),parse(uuid,req.params.id))));
router.delete('/programs/:id',handle(req=>service.deleteProgram(req.user.business_id,req.user.id,parse(uuid,req.params.id))));
router.post('/members',handle(req=>service.enroll(req.user.business_id,req.user.id,parse(enrollment,req.body))));
router.post('/members/:id/stamps',handle(req=>service.manualStamp(req.user.business_id,req.user.id,parse(uuid,req.params.id),
  parse(z.object({reference:z.string().trim().min(3).max(100),note:z.string().trim().min(3).max(500)}),req.body))));
router.post('/events/:id/void',handle(req=>service.voidStamp(req.user.business_id,req.user.id,parse(uuid,req.params.id),
  parse(z.string().trim().min(5).max(500),req.body.reason))));
publicRouter.use(rateLimit({keyPrefix:'stamp-card-read',max:180,windowMs:15*60000}));
publicRouter.get('/:token',handle(req=>service.publicCard(req.params.token)));
publicRouter.post('/:token/claim',rateLimit({keyPrefix:'stamp-card-claim',max:30,windowMs:15*60000}),
  handle(req=>service.claim(req.params.token,parse(uuid,req.body.cycle_id))));
publicRouter.post('/:token/renew',rateLimit({keyPrefix:'stamp-card-renew',max:20,windowMs:15*60000}),handle(req=>service.renew(req.params.token)));
module.exports={router,publicRouter,program,enrollment};

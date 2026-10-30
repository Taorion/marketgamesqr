const express=require('express');
const {z}=require('zod');
const {authRequired,requireRoles}=require('../middleware/auth');
const {requirePortalAccess,requireBusinessFeature}=require('../middleware/subscription');
const {assertFeatureForRequest}=require('../services/subscriptionService');
const {rateLimit}=require('../middleware/rateLimit');
const {badRequest}=require('../utils/http');
const svc=require('../services/quoteService');
const {renderQuotePdf}=require('../services/quotePdfService');
const router=express.Router(),publicRouter=express.Router();
const uuid=z.string().uuid();
const text=max=>z.string().trim().max(max);
const quoteSchema=z.object({
  request_id:uuid,title:text(140).min(2),valid_until:z.string().datetime({offset:true}),
  contact_id:uuid.nullable().default(null),contact_source:z.enum(['PLAYER','MANUAL','AFFILIATE']).nullable().default(null),
  customer:z.object({name:text(180),phone:text(40).default(''),email:text(180).default('').refine(v=>!v||z.string().email().safeParse(v).success,'Correo inválido.'),
    document_id:text(80).default(''),organization:text(180).default('')}).optional(),
  items:z.array(z.object({product_id:uuid,quantity:z.number().int().min(1).max(100000),unit_price:z.number().finite().min(0.01).max(999999999).optional(),
    discount_percent:z.number().min(0).max(99).default(0),tax_percent:z.number().min(0).max(100).default(0)})).min(1).max(30),
  activation_id:uuid.nullable().default(null),benefit_description:text(600).default(''),benefit_timing:z.enum(['ON_ISSUE','AFTER_PAYMENT']).default('ON_ISSUE'),
  terms:text(4000).default(''),payment_terms:text(1000).default(''),delivery_terms:text(1000).default('')
}).refine(d=>Boolean(d.contact_id)===Boolean(d.contact_source),'Selecciona un contacto válido.');
function parse(schema,value){const r=schema.safeParse(value);if(!r.success)throw badRequest(r.error.issues.map(i=>i.message).join(' '));return r.data;}
const handle=fn=>async(req,res,next)=>{try{res.set('Cache-Control','private, no-store');res.json(await fn(req));}catch(e){next(e);}};
const id=req=>parse(uuid,req.params.id);
router.use(authRequired,requireRoles('BUSINESS_OWNER','BUSINESS_MANAGER','ADMIN','ADMIN_MARKET_GAMES'),requirePortalAccess,requireBusinessFeature('products'));
router.get('/context',handle(req=>svc.context(req.user.business_id)));
router.get('/products',handle(req=>svc.products(req.user.business_id,parse(text(120).default(''),req.query.search))));
router.get('/contacts',requireBusinessFeature('contact_directory'),handle(req=>svc.contacts(req.user.business_id,parse(text(120).default(''),req.query.search))));
router.get('/',handle(req=>svc.list(req.user.business_id,parse(z.coerce.number().int().min(0).max(100000).default(0),req.query.offset),parse(text(120).default(''),req.query.search))));
async function save(req,quoteId){const data=parse(quoteSchema,req.body);
  if(data.contact_id)await assertFeatureForRequest(req,req.user.business_id,'contact_directory');
  if(data.activation_id)await assertFeatureForRequest(req,req.user.business_id,'qr_batch_generator');
  return svc.save(req.user.business_id,req.user.id,data,quoteId);
}
router.post('/',handle(req=>save(req)));
router.put('/:id',handle(req=>save(req,id(req))));
router.get('/:id',handle(req=>svc.detail(req.user.business_id,id(req))));
router.post('/:id/action',handle(req=>svc.action(req.user.business_id,id(req),parse(z.enum(['issue','accept','cancel']),req.body.action))));
router.post('/:id/convert',requireBusinessFeature('sales_tracker'),handle(req=>{
  const data=parse(z.object({payment_confirmed:z.literal(true),payment_method:z.enum(['CASH','TRANSFER','CARD','OTHER'])}),req.body);
  return svc.convert(req.user.business_id,req.user,id(req),data.payment_method);
}));
async function pdf(res,q){const bytes=await renderQuotePdf(q);res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="cotizacion-${q.number}.pdf"`,'Cache-Control':'private, no-store'});res.send(Buffer.from(bytes));}
router.get('/:id/pdf',async(req,res,next)=>{try{const q=await svc.detail(req.user.business_id,id(req));await pdf(res,q);}catch(e){next(e);}});
publicRouter.use(rateLimit({keyPrefix:'quotes-public',max:100,windowMs:15*60000}),(_req,res,next)=>{res.set({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'});next();});
publicRouter.get('/:token',handle(req=>svc.publicDetail(req.params.token)));
publicRouter.post('/:token/respond',rateLimit({keyPrefix:'quotes-response',max:15,windowMs:15*60000}),handle(req=>svc.respond(req.params.token,parse(z.enum(['ACCEPTED','DECLINED']),req.body.decision))));
publicRouter.get('/:token/pdf',async(req,res,next)=>{try{const q=svc.expose(await svc.publicRow(req.params.token));await pdf(res,q);}catch(e){next(e);}});
publicRouter.get('/:token/benefit',async(req,res,next)=>{try{res.redirect(302,await svc.benefit(req.params.token));}catch(e){res.status(e.status||500).type('html').send(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu beneficio</title><body style="font:18px system-ui;max-width:560px;margin:12vh auto;padding:24px"><h1>Tu beneficio</h1><p>${String(e.message).replace(/[&<>"']/g,'')}</p><p>Puedes volver a la cotización y contactar al negocio.</p></body></html>`);}});
module.exports={router,publicRouter,quoteSchema};

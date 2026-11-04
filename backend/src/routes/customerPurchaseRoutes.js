const express=require('express'),{z}=require('zod'),{badRequest}=require('../utils/http');
const service=require('../services/customerPurchaseService'),finance=require('../services/customerFinance'),router=express.Router();
const uuid=z.string().uuid(),currency=z.enum(['COP','USD','EUR']),revision=z.number().int().positive();
const money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(v=>finance.minor(v)>0);
const fields={title:z.string().trim().min(2).max(160),category:z.enum(finance.CATEGORIES),currency,estimated_amount:money,target_date:z.string().date().nullable().default(null),note:z.string().trim().max(2000).default('')};
const parse=(schema,value)=>{const r=schema.safeParse(value);if(!r.success)throw badRequest('Revisa los datos de la compra.');return r.data;};
const handle=fn=>async(req,res,next)=>{try{res.set('Cache-Control','private, no-store').json(await fn(req));}catch(e){next(e);}};
router.get('/',handle(req=>service.list(req.customer)));
router.get('/overview',handle(req=>service.overview(req.customer,parse(currency.optional(),req.query.currency))));
router.post('/from-publication',handle(req=>service.fromPublication(req.customer,parse(z.object({request_id:uuid,publication_id:uuid,quantity:z.number().int().min(1).max(10000),expected_unit_price:money,target_date:z.string().date().nullable().default(null),category:z.enum(finance.CATEGORIES).default('otros')}),req.body))));
router.put('/:id/source',handle(req=>service.refreshSource(req.customer,parse(uuid,req.params.id),parse(z.object({revision,quantity:z.number().int().min(1).max(10000),expected_unit_price:money}),req.body))));
router.post('/',handle(req=>service.save(req.customer,parse(z.object({...fields,request_id:uuid}),req.body))));
router.put('/:id',handle(req=>service.save(req.customer,parse(z.object({...fields,revision}),req.body),parse(uuid,req.params.id))));
router.post('/:id/state',handle(req=>service.change(req.customer,parse(uuid,req.params.id),parse(z.object({revision,action:z.enum(['CANCEL','REOPEN'])}),req.body))));
router.get('/:id/candidates',handle(req=>service.candidates(req.customer,parse(uuid,req.params.id))));
router.post('/:id/complete',handle(req=>service.complete(req.customer,parse(uuid,req.params.id),parse(z.union([
 z.object({revision,confirmed:z.literal(true),entry_id:uuid}),
 z.object({revision,confirmed:z.literal(true),sale_id:uuid}),
 z.object({revision,confirmed:z.literal(true),amount:money,paid_on:z.string().date(),merchant:z.string().trim().min(1).max(160)})
]),req.body))));
module.exports=router;

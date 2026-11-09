const express=require('express'),{z}=require('zod'),{validate}=require('../utils/validators'),s=require('../services/customerCourtesyService');
const uuid=z.string().uuid(),money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
const create=z.discriminatedUnion('source',[
 z.object({source:z.literal('PURCHASE'),request_id:uuid,publication_id:uuid,quantity:z.number().int().min(1).max(500),expected_unit_price:money,terms_accepted:z.literal(true)}).strict(),
 z.object({source:z.literal('OWN'),request_id:uuid,product_id:uuid,quantity:z.number().int().min(1).max(500),terms:z.string().trim().min(10).max(4000),valid_days:z.number().int().min(1).max(365),confirmed:z.literal(true),branch_id:uuid.optional()}).strict()
]);
function routes(business=false){
 const router=express.Router(),actor=r=>business?r.user:r.customer;
 const handle=f=>async(req,res,next)=>{try{res.set('Cache-Control','private, no-store').json(await f(req));}catch(e){next(e);}};
 router.get('/',handle(r=>s.list(actor(r))));
 router.get('/catalog',handle(r=>s.catalog(actor(r),validate(z.string().trim().max(100),r.query.search||''))));
 if(business){router.get('/incoming',handle(r=>s.incoming(r.user)));router.post('/:id/confirm',handle(r=>s.confirm(r.user,validate(uuid,r.params.id),validate(z.object({amount:money,payment_received:z.literal(true),payment_reference:z.string().trim().min(3).max(120),payment_method:z.string().trim().min(2).max(80),branch_id:uuid.optional()}).strict(),r.body))));}
 router.post('/',handle(r=>s.create(actor(r),validate(create,r.body))));
 router.get('/:id',handle(r=>s.detail(actor(r),validate(uuid,r.params.id))));
 router.post('/:id/send',handle(r=>s.send(actor(r),validate(uuid,r.params.id),validate(z.object({request_id:uuid,recipient_email:z.string().trim().email().max(180),recipient_name:z.string().trim().min(2).max(160),message:z.string().trim().max(500).default(''),confirmed:z.literal(true)}).strict(),r.body))));
 router.post('/:id/cancel',handle(r=>s.cancel(actor(r),validate(uuid,r.params.id))));
 return router;
}
module.exports=routes;

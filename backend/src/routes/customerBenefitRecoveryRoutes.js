const express=require('express'),{z}=require('zod'),service=require('../services/customerBenefitRecoveryService'),{badRequest}=require('../utils/http'),router=express.Router();
const uuid=z.string().uuid(),document=z.string().trim().min(3).max(80),consent=z.literal(true);
const parse=(s,v)=>{const r=s.safeParse(v);if(!r.success)throw badRequest('Revisa la cédula, el correo y la autorización para conectar tus beneficios.');return r.data;};
const handle=fn=>async(req,res,next)=>{try{res.set('Cache-Control','private, no-store').json(await fn(req));}catch(e){next(e);}};
router.get('/',handle(req=>service.status(req.customer)));
router.post('/',handle(req=>service.recover(req.customer,parse(z.object({request_id:uuid,document_id:document,consent}),req.body))));
router.post('/code',handle(req=>service.requestCode(req.customer,parse(z.object({document_id:document,email:z.string().trim().email().max(180),consent}),req.body))));
router.post('/verify',handle(req=>service.verifyCode(req.customer,parse(z.object({challenge_id:uuid,code:z.string().regex(/^\d{6}$/),consent}),req.body))));
module.exports=router;

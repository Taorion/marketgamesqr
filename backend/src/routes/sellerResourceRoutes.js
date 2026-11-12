const express=require('express'),s=require('../services/sellerResourceService');
const {rateLimit}=require('../middleware/rateLimit');
const router=express.Router(),publicRouter=express.Router();
const run=fn=>async(req,res,next)=>{try{res.set({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});await fn(req,res);}catch(e){if(e.code==='23505'){e.status=409;e.message='Ese código de recurso ya existe.';}next(e);}};
function attachment(res,filename,mime,bytes){res.set({'Content-Type':mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}).send(bytes);}
router.get('/',run(async(req,res)=>res.json(await s.list(req.user))));
router.get('/production-prompt',run(async(req,res)=>attachment(res,'PROMPT_COLECCION_DIGITAL_QORI.txt','text/plain; charset=utf-8',s.prompt(req.user))));
router.get('/production-brief',run(async(req,res)=>attachment(res,'FUENTE_VIGENTE_QORI.json','application/json; charset=utf-8',JSON.stringify(s.brief(req.user),null,2))));
router.get('/:id/download',run(async(req,res)=>{const f=await s.download(req.user,req.params.id);attachment(res,f.filename,f.mime,f.content);}));
const uploadLimit=rateLimit({keyPrefix:'seller-resource-write',max:60,windowMs:3600000});
router.post('/',uploadLimit,run(async(req,res)=>res.status(201).json(await s.save(req.user,null,req.body))));
router.patch('/:id',uploadLimit,run(async(req,res)=>res.json(await s.save(req.user,req.params.id,req.body))));
publicRouter.use(rateLimit({keyPrefix:'seller-kit-read',max:180,windowMs:60000}));
publicRouter.get('/',run(async(req,res)=>res.json(await s.publicContext(req.query))));
publicRouter.get('/resources/:id/download',run(async(req,res)=>{const f=await s.download(null,req.params.id,req.query);attachment(res,f.filename,f.mime,f.content);}));
module.exports={router,publicRouter};

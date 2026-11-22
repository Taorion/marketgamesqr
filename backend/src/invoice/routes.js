const express=require('express'),{z}=require('zod'),path=require('node:path'),crypto=require('node:crypto');
const auth=require('../services/customerAuthService'),{rateLimit}=require('../middleware/rateLimit');
const svc=require('./service'),config=require('./config');
const uuid=z.string().uuid(),name=z.string().trim().min(2).max(120);
const parse=(schema,value)=>{const r=schema.safeParse(value);if(!r.success)throw config.fault(400,'INVALID_REQUEST');return r.data;};
const handle=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
const reply=fn=>handle(async(req,res)=>res.json(await fn(req)));
function error(error,req,res,_next) {
 const known=Number.isInteger(error.status)&&error.status>=400&&error.status<500;
 const status=error.type==='entity.too.large'?413:known?error.status:503;
 const code=error.type==='entity.too.large'?'BODY_TOO_LARGE':known&&/^[A-Z_]+$/.test(error.code||'')?error.code:known?'REQUEST_REJECTED':'SERVICE_UNAVAILABLE';
 // Never forward SQL messages, XML parser input, account details or credentials.
 res.status(status).json({error:{code,request_id:req.invoiceRequestId}});
}
function install(app) {
 const gate=(req,res,next)=>{
  res.set('Cache-Control','private, no-store');res.set('Referrer-Policy','no-referrer');
  req.invoiceRequestId=crypto.randomUUID();res.set('X-Request-ID',req.invoiceRequestId);
  if(!config.enabled())return res.status(404).json({error:{code:'NOT_FOUND'}});
  next();
 };
 const gateway=express.Router();
 gateway.use(rateLimit({keyPrefix:'invoice-ip',max:120,keyFromRequest:req=>req.ip||req.socket.remoteAddress}));
 // Authentication precedes the bounded body parser and never uses an identity lookup.
 gateway.use(async(req,_res,next)=>{try{req.invoicePrincipal=await svc.machine(/^Bearer (.+)$/.exec(req.get('Authorization')||'')?.[1],req.method==='POST'?'invoices:write':'receipts:read');next();}catch(e){next(e);}});
 gateway.use(rateLimit({keyPrefix:'invoice-app',max:60,keyFromRequest:req=>req.invoicePrincipal.app_id}));
 gateway.use(express.json({limit:'600kb',strict:true}));
 gateway.post('/invoices',handle(async(req,res)=>{
  const key=parse(z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),req.get('Idempotency-Key'));
  const data=parse(z.object({issuer_nit:z.literal('900000000'),xml:z.string().min(1).max(524288)}).strict(),req.body);
  if(Buffer.byteLength(data.xml)>524288)throw config.fault(413,'BODY_TOO_LARGE');
  const result=await svc.receive(req.invoicePrincipal,key,data);
  res.status(202).location('/api/invoice/v1/receipts/'+result.id).json(result);
 }));
 gateway.get('/receipts/:id',reply(req=>svc.receipt(req.invoicePrincipal,parse(uuid,req.params.id))));
 gateway.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND'}}));
 gateway.use(error);app.use('/api/invoice/v1',gate,gateway);

 const developers=express.Router();
 developers.use(auth.customerRequired);
 developers.use(rateLimit({keyPrefix:'invoice-developers',max:90,keyFromRequest:req=>req.customer.id}));
 developers.use(express.json({limit:'8kb',strict:true}));
 developers.get('/overview',reply(req=>svc.overview(req.customer)));
 developers.post('/partners',reply(req=>svc.register(req.customer,parse(z.object({name}).strict(),req.body).name)));
 developers.post('/apps',reply(req=>{const d=parse(z.object({partner_id:uuid,name}).strict(),req.body);return svc.createApp(req.customer,d.partner_id,d.name);}));
 developers.post('/apps/:app/keys',reply(req=>svc.createKey(req.customer,parse(uuid,req.params.app))));
 developers.put('/apps/:app/catalog',reply(req=>svc.listing(req.customer,parse(uuid,req.params.app),parse(z.object({listed:z.boolean()}).strict(),req.body).listed)));
 developers.delete('/apps/:app/keys/:id',reply(req=>svc.revokeKey(req.customer,parse(uuid,req.params.app),parse(uuid,req.params.id))));
 developers.post('/apps/:app/fixture-merchant',reply(req=>{parse(z.object({synthetic_only:z.literal(true)}).strict(),req.body);return svc.authorizeFixture(req.customer,parse(uuid,req.params.app));}));
 developers.delete('/apps/:app/fixture-merchant',reply(req=>svc.authorizeFixture(req.customer,parse(uuid,req.params.app),true)));
 developers.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND'}}));
 developers.use(error);app.use('/api/developers/v1',gate,developers);

 const customer=express.Router();
 customer.use(auth.customerRequired);
 customer.use(rateLimit({keyPrefix:'invoice-customer',max:90,keyFromRequest:req=>req.customer.id}));
 customer.use(express.json({limit:'8kb',strict:true}));
 customer.get('/consent',reply(req=>svc.consentState(req.customer)));
 customer.get('/integrations',reply(()=>svc.catalog()));
 customer.post('/consents',reply(req=>svc.grant(req.customer,parse(z.object({app_id:uuid,book_id:uuid,accepted:z.literal(true),text_version:z.literal(svc.CONSENT.version)}).strict(),req.body))));
 customer.delete('/consents/:id',reply(req=>svc.revoke(req.customer,parse(uuid,req.params.id))));
 customer.get('/',reply(req=>svc.documents(req.customer,parse(z.coerce.number().int().min(0).max(10000).default(0),req.query.offset))));
 customer.get('/:id/xml',handle(async(req,res)=>{
  const d=await svc.document(req.customer,parse(uuid,req.params.id));
  res.set('X-Content-Type-Options','nosniff').set('Content-Security-Policy',"default-src 'none'; sandbox");
  res.attachment('qori-invoice-'+d.id+'.xml').type('application/xml').send(config.unseal(d.content_box,d.id).xml);
 }));
 customer.get('/:id',reply(async req=>({document:svc.readable(await svc.document(req.customer,parse(uuid,req.params.id)))})));
 customer.post('/:id/reconcile',reply(req=>svc.reconcile(req.customer,parse(uuid,req.params.id),parse(z.object({entry_id:uuid,confirmed:z.literal(true)}).strict(),req.body).entry_id)));
 customer.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND'}}));
 customer.use(error);app.use('/api/customer/invoices',gate,customer);

 const root=path.join(__dirname,'../../..');
 app.use('/developers',gate,express.static(path.join(root,'developers'),{index:'index.html',dotfiles:'deny'}));
 app.get(['/customer/invoices','/customer/invoices/'],gate,(_req,res)=>res.sendFile(path.join(root,'developers/customer.html')));
 app.get('/api/invoice-capabilities',(_req,res)=>res.set('Cache-Control','no-store').json({sandbox:config.enabled(),production:false}));
}
module.exports={install};


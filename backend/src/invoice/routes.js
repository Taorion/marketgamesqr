const express=require('express'),{z}=require('zod'),path=require('node:path'),crypto=require('node:crypto');
const auth=require('../services/customerAuthService'),{rateLimit}=require('../middleware/rateLimit');
const svc=require('./service'),config=require('./config');
const personal=require('./customer'),ops=require('./operations'),oauth=require('./oauth');
const {authRequired,requireRoles}=require('../middleware/auth');
const uuid=z.string().uuid(),name=z.string().trim().min(2).max(120);
const parse=(schema,value)=>{const r=schema.safeParse(value);if(!r.success)throw config.fault(400,'INVALID_REQUEST');return r.data;};
const handle=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
const reply=fn=>handle(async(req,res)=>res.json(await fn(req)));
function error(error,req,res,_next) {
 const known=Number.isInteger(error.status)&&error.status>=400&&error.status<500;
 const status=error.type==='entity.too.large'?413:known?error.status:503;
 const code=error.type==='entity.too.large'?'BODY_TOO_LARGE':known&&/^[A-Z_]+$/.test(error.code||'')?error.code:known?'REQUEST_REJECTED':'SERVICE_UNAVAILABLE';
 if(status===401)res.set('WWW-Authenticate','Bearer realm="qori-invoice"');
 if(status===429)res.set('Retry-After','60');
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
 gateway.post('/oauth/token',express.urlencoded({extended:false,limit:'4kb'}),handle(async(req,res)=>{
  const d=parse(z.object({grant_type:z.literal('client_credentials'),scope:z.string().max(100).optional()}).strict(),req.body);
  const encoded=/^Basic ([A-Za-z0-9+/=]{1,300})$/.exec(req.get('Authorization')||'')?.[1];
  if(!encoded)throw config.fault(401,'INVALID_CLIENT');
  const credentials=Buffer.from(encoded,'base64').toString('utf8'),at=credentials.indexOf(':');
  const result=await oauth.issue(credentials.slice(0,at),credentials.slice(at+1),d.scope);
  res.set('Pragma','no-cache').json(result);
 }),(e,req,res,_next)=>{
  const code=e.code==='INVALID_CLIENT'?'invalid_client':e.code==='INVALID_SCOPE'?'invalid_scope':req.body?.grant_type&&req.body.grant_type!=='client_credentials'?'unsupported_grant_type':e.status>=400&&e.status<500?'invalid_request':'temporarily_unavailable';
  const status=code==='invalid_client'?401:code==='temporarily_unavailable'?503:e.type==='entity.too.large'?413:400;
  if(status===401)res.set('WWW-Authenticate','Basic realm="qori-invoice"');
  res.set('Pragma','no-cache').status(status).json({error:code});
 });
 // Authentication precedes the bounded body parser and never uses an identity lookup.
 gateway.use(async(req,_res,next)=>{try{req.invoicePrincipal=await svc.machine(/^Bearer (.+)$/.exec(req.get('Authorization')||'')?.[1],req.method==='POST'?'invoices:write':'submissions:read');next();}catch(e){next(e);}});
 gateway.use(rateLimit({keyPrefix:'invoice-app',max:60,keyFromRequest:req=>req.invoicePrincipal.app_id}));
 gateway.use(express.json({limit:'600kb',strict:true}));
 gateway.post('/invoices',handle(async(req,res)=>{
  const key=parse(z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),req.get('Idempotency-Key'));
  const data=parse(z.object({issuer_nit:z.string().regex(/^\d{9,10}$/),xml:z.string().min(1)}).strict(),req.body);
  if(Buffer.byteLength(data.xml)>524288)throw config.fault(413,'BODY_TOO_LARGE');
  const result=await svc.receive(req.invoicePrincipal,key,data);
  res.status(202).location('/api/invoice/v1/receipts/'+result.submission_id).json(result);
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
 developers.post('/apps/:app/keys',reply(req=>svc.createKey(req.customer,parse(uuid,req.params.app),parse(z.object({scopes:z.array(z.enum(oauth.SCOPES)).min(1).max(4).optional()}).strict(),req.body||{}).scopes)));
 developers.get('/terms',reply(()=>ops.TERMS));
 developers.put('/partners/:partner/profile',reply(req=>ops.profile(req.customer,parse(uuid,req.params.partner),parse(z.object({
  entity_kind:z.enum(['PERSON','COMPANY']),country:z.string().regex(/^[A-Z]{2}$/),identification:z.string().regex(/^(SBX|SANDBOX)[A-Z0-9]{3,24}$/),
  contact_email:z.string().email().max(180),website:z.string().url().max(300),accepted:z.literal(true),terms_version:z.literal(ops.TERMS.version)
 }).strict(),req.body))));
 developers.put('/apps/:app/state',reply(req=>ops.lifecycle(req.customer,parse(uuid,req.params.app),parse(z.object({active:z.boolean()}).strict(),req.body).active)));
 developers.post('/partners/:partner/invites',reply(req=>ops.invite(req.customer,parse(uuid,req.params.partner),parse(z.object({role:z.enum(['OWNER','SUPPORT'])}).strict(),req.body).role)));
 developers.post('/invites/accept',reply(req=>ops.acceptInvite(req.customer,parse(z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict(),req.body).token)));
 developers.get('/partners/:partner/members',reply(req=>ops.members(req.customer,parse(uuid,req.params.partner))));
 developers.delete('/partners/:partner/members/:id',reply(req=>ops.removeMember(req.customer,parse(uuid,req.params.partner),parse(uuid,req.params.id))));
 developers.delete('/partners/:partner/invites/:id',reply(req=>ops.cancelInvite(req.customer,parse(uuid,req.params.partner),parse(uuid,req.params.id))));
 developers.post('/apps/:app/homologation',reply(req=>ops.homologate(req.customer,parse(uuid,req.params.app),parse(z.object({
  sandbox_e2e:z.literal(true),issuer_authorization_process:z.literal(true),consent_flow:z.literal(true),privacy_review_requested:z.literal(true),security_review_requested:z.literal(true)
 }).strict(),req.body))));
 developers.get('/apps/:app/metrics',reply(req=>ops.metrics(req.customer,parse(uuid,req.params.app),parse(z.object({from:z.iso.date(),to:z.iso.date()}).strict().refine(d=>d.from<=d.to),req.query))));
 developers.post('/apps/:app/sandbox-run',reply(req=>{const d=parse(z.object({scenario:z.enum(['invoice','credit','no-consent','malformed']),idempotency_key:z.string().regex(/^[A-Za-z0-9._:-]{8,100}$/)}).strict(),req.body);return ops.sandboxRun(req.customer,parse(uuid,req.params.app),d.scenario,d.idempotency_key);}));
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
 customer.post('/consents',reply(req=>svc.grant(req.customer,parse(z.object({app_id:uuid,book_id:uuid,identity_id:uuid.optional(),merchant_id:uuid.optional(),accepted:z.literal(true),text_version:z.literal(svc.CONSENT.version)}).strict(),req.body))));
 customer.delete('/consents/:id',reply(req=>svc.revoke(req.customer,parse(uuid,req.params.id))));
 const filters=z.object({offset:z.coerce.number().int().min(0).max(10000).default(0),search:z.string().max(100).optional(),from:z.iso.date().optional(),to:z.iso.date().optional(),book_id:uuid.optional(),type:z.enum(['Invoice','CreditNote','DebitNote']).optional(),period:z.enum(['day','month','year']).default('month')}).strict().refine(d=>!d.from||!d.to||d.from<=d.to);
 customer.get('/',reply(req=>personal.list(req.customer,parse(filters,req.query))));
 customer.get('/summary',reply(req=>personal.summary(req.customer,parse(filters,req.query))));
 customer.get('/identity',reply(req=>personal.identityState(req.customer)));
 customer.post('/identity/requests',reply(req=>personal.requestReview(req.customer,parse(z.object({kind:z.enum(['IDENTITY_REVIEW','IDENTITY_CHANGE']),country:z.string().regex(/^[A-Z]{2}$/),document_type:z.enum(['13','22','31','41']),number:z.string().regex(/^(SBX|SANDBOX)[A-Z0-9]{3,24}$/)}).strict(),req.body))));
 customer.get('/notices',reply(req=>personal.notices(req.customer)));
 customer.post('/notices/:id/read',reply(req=>personal.markNotice(req.customer,parse(uuid,req.params.id))));
 customer.put('/notification-preference',reply(req=>personal.preference(req.customer,parse(z.object({enabled:z.boolean()}).strict(),req.body).enabled)));
 customer.post('/requests',reply(req=>personal.requestReview(req.customer,parse(z.object({kind:z.enum(['CORRECTION','DELETION']),document_id:uuid,reason:z.string().min(5).max(500)}).strict(),req.body))));
 customer.get('/requests',reply(async req=>({requests:(await require('../config/db').query('select id,kind,state,resolution_code,created_at,resolved_at from invoice_requests where customer_id=$1 order by created_at desc limit 100',[req.customer.id])).rows})));
 customer.get('/:id/xml',handle(async(req,res)=>{
  const d=await personal.privateDocument(req.customer,parse(uuid,req.params.id));
  await require('../config/db').query("insert into invoice_events(event_type,actor_customer_id,object_id) values('ORIGINAL_DOWNLOADED',$1,$2)",[req.customer.id,d.id]);
  res.set('X-Content-Type-Options','nosniff').set('Content-Security-Policy',"default-src 'none'; sandbox");
  res.attachment('qori-invoice-'+d.id+'.xml').type('application/xml').send(config.unseal(d.content_box,d.id).xml);
 }));
 customer.get('/:id',reply(req=>personal.detail(req.customer,parse(uuid,req.params.id))));
 customer.put('/:id/lines/:line/category',reply(req=>personal.override(req.customer,parse(uuid,req.params.id),parse(z.string().min(1).max(100),req.params.line),parse(z.object({category:z.enum(require('../services/customerFinance').CATEGORIES),revision:z.number().int().min(0)}).strict(),req.body))));
 customer.post('/:id/reconcile',reply(req=>svc.reconcile(req.customer,parse(uuid,req.params.id),parse(z.object({entry_id:uuid,confirmed:z.literal(true)}).strict(),req.body).entry_id)));
 customer.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND'}}));
 customer.use(error);app.use('/api/customer/invoices',gate,customer);

 const root=path.join(__dirname,'../../..');
 const admin=express.Router();admin.use(authRequired,requireRoles('QORI_SUPERADMIN'));
 admin.use(express.json({limit:'8kb'}));
 admin.get('/overview',reply(()=>ops.adminOverview()));
 admin.post('/reviews/:id/decision',reply(req=>ops.decision(req.user,parse(uuid,req.params.id),parse(z.object({state:z.enum(['REVIEW_APPROVED','REJECTED']),code:z.enum(['SANDBOX_REVIEWED','MISSING_EVIDENCE','SECURITY_REVIEW_REQUIRED','LEGAL_REVIEW_REQUIRED'])}).strict(),req.body))));
 admin.put('/apps/:id/block',reply(req=>ops.block(req.user,parse(uuid,req.params.id),parse(z.object({blocked:z.boolean()}).strict(),req.body).blocked)));
 admin.post('/requests/:id/decision',reply(req=>{const d=parse(z.object({state:z.enum(['REVIEW','RESOLVED','REJECTED']),code:z.enum(['UNDER_REVIEW','REFERRED_TO_ISSUER','RETENTION_REQUIRED','IDENTITY_PROVIDER_REQUIRED','REQUEST_COMPLETED'])}).strict(),req.body);return ops.requestDecision(req.user,parse(uuid,req.params.id),d.state,d.code);}));
 admin.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND'}}));
 admin.use(error);app.use('/api/admin/invoices',gate,admin);
 app.get(['/admin/invoices','/admin/invoices/'],gate,(_req,res)=>res.sendFile(path.join(root,'developers/admin.html')));
 // Public documentation has no credentials or customer data; sandbox console remains gated.
 app.get('/developers/openapi.yaml',(_req,res)=>res.type('application/yaml').sendFile(path.join(root,'docs/qori-invoice/openapi.yaml')));
 app.get('/developers/guide.html',(_req,res)=>res.sendFile(path.join(root,'developers/guide.html')));
 for(const asset of ['style.css','reference.js','example.xml'])app.get('/developers/'+asset,(_req,res)=>res.sendFile(path.join(root,'developers',asset)));
 for(const example of ['send.mjs','send.py','send.php','postman.json'])app.get('/developers/examples/'+example,(_req,res)=>res.attachment(example).sendFile(path.join(root,'docs/qori-invoice/examples',example)));
 app.use('/developers',gate,express.static(path.join(root,'developers'),{index:'index.html',dotfiles:'deny'}));
 app.get(['/customer/invoices','/customer/invoices/'],gate,(_req,res)=>res.sendFile(path.join(root,'developers/customer.html')));
 app.get('/api/invoice-capabilities',(_req,res)=>res.set('Cache-Control','no-store').json({sandbox:config.enabled(),production:false}));
}
module.exports={install};

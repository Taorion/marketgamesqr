const express = require('express');
const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { authRequired, requireRoles } = require('../middleware/auth');
const { requirePortalAccess } = require('../middleware/subscription');
const { badRequest, notFound, tooManyRequests } = require('../utils/http');
const auth = require('../services/customerAuthService');
const passwordAuth = require('../services/customerPasswordService');
const oauth = require('../services/customerOAuthService');
const svc = require('../services/customerService');
const finance = require('../services/customerFinance');
const stamps = require('../services/stampCardService');
const wallet = require('../services/customerWalletService');
const web = require('../services/customerWebService');
const network = require('../services/customerNetworkService');
const explore = require('../services/customerExploreService');
const financeDelivery = require('../services/customerFinanceDeliveryService');
const paymentAgenda = require('../services/customerPaymentAgendaService');
const productGifts = require('../services/customerProductGiftService');
const {publicInteractiveParticipantSchema,publicInteractiveCompleteSchema}=require('../utils/validators');
const router = express.Router(), businessRouter = express.Router();
const uuid=z.string().uuid(), currency=z.enum(['COP','USD','EUR']), category=z.enum(finance.CATEGORIES);
const money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(v=>finance.minor(v)>0,'El importe debe ser mayor que cero.');
const text=(max=160)=>z.string().trim().max(max);
function parse(schema,value){const r=schema.safeParse(value);if(!r.success)throw badRequest(r.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' '));return r.data;}
const handle=fn=>async(req,res,next)=>{try{res.set('Cache-Control','private, no-store');res.json(await fn(req));}catch(e){next(e);}};
router.get('/status',handle(async()=>({...await auth.status(),finance:await require('../services/customerFinanceReadiness').status(),payment_agenda_available:true,payment_notifications_available:await require('../services/customerPaymentPushService').ready()})));
// Use the server-observed address. Never trust an arbitrary X-Forwarded-For header.
const buckets=new Map();
router.use((req,_res,next)=>{
  if(!req.path.startsWith('/auth/'))return next();
  const key=req.ip||req.socket.remoteAddress,now=Date.now();
  for(const [k,b] of buckets)if(b.until<now)buckets.delete(k);
  const b=buckets.get(key)||{count:0,until:now+60000};b.count++;buckets.set(key,b);
  next(b.count>30?tooManyRequests('Demasiados intentos. Espera un minuto.'):undefined);
});
router.post('/auth/code',handle(req=>auth.requestCode(parse(z.object({email:z.string().email().max(180)}),req.body).email)));
router.post('/auth/verify',handle(req=>{const d=parse(z.object({challenge_id:uuid,code:z.string().regex(/^\d{6}$/),device_name:text(80).default('Qori Customer')}),req.body);return auth.verifyCode(d.challenge_id,d.code,d.device_name);}));
router.post('/auth/web/code',handle(req=>{
  auth.assertWebRequest(req);
  return auth.requestCode(parse(z.object({email:z.string().trim().email().max(180)}),req.body).email);
}));
router.post('/auth/web/verify',async(req,res,next)=>{
  try{
    auth.assertWebRequest(req);
    const d=parse(z.object({challenge_id:uuid,code:z.string().regex(/^\d{6}$/),consent:z.literal(true)}),req.body);
    const result=await auth.verifyCode(d.challenge_id,d.code,'Qori Customer · Web',{webConsent:true});
    auth.setWebSession(res,result);res.set('Cache-Control','private, no-store');
    res.json({account:result.account,session:{expires_at:result.session.expires_at}});
  }catch(e){next(e);}
});
router.get('/auth/options',handle(()=>oauth.options()));
router.post('/auth/web/password/code',handle(req=>{
  auth.assertWebRequest(req);
  const d=parse(z.object({email:z.string().trim().email().max(180),password:z.string().max(128),confirmation:z.string().max(128),consent:z.literal(true)}),req.body);
  return passwordAuth.request(d.email,d.password,d.confirmation);
}));
router.post('/auth/web/password/login',async(req,res,next)=>{
  try{auth.assertWebRequest(req);const d=parse(z.object({email:z.string().trim().email().max(180),password:z.string().max(128)}),req.body);
    const result=await passwordAuth.login(d.email,d.password);auth.setWebSession(res,result);res.set('Cache-Control','private, no-store').json({account:result.account,session:{expires_at:result.session.expires_at}});
  }catch(e){next(e);}
});
router.post('/auth/web/oauth/:provider/start',async(req,res,next)=>{try{res.set('Cache-Control','no-store').json(await oauth.start(req,res,req.params.provider));}catch(e){next(e);}});
router.get('/auth/web/oauth/pending',handle(req=>oauth.pending(req)));
router.get('/auth/web/oauth/:provider/callback',async(req,res)=>{
  res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');
  try{res.redirect(303,await oauth.callback(req,res,req.params.provider));}
  catch{oauth.clear(res);res.redirect(303,'/customer/?auth_error=oauth#login');}
});
// Every Customer feature, including discovery, requires a verified session.
router.use(auth.customerRequired);
router.get('/auth/security',handle(req=>oauth.security(req.customer)));
router.post('/auth/oauth/link',async(req,res,next)=>{try{res.set('Cache-Control','no-store').json(await oauth.link(req,res));}catch(e){next(e);}});
router.post('/auth/oauth/:provider/start',async(req,res,next)=>{try{res.set('Cache-Control','no-store').json(await oauth.start(req,res,req.params.provider,req.customer.id));}catch(e){next(e);}});
router.use('/explore', (req,_res,next)=>{
  const key='explore:'+req.ip,now=Date.now(),b=buckets.get(key)||{count:0,until:now+60000};
  if(b.until<now){b.count=0;b.until=now+60000;}b.count++;buckets.set(key,b);
  next(b.count>150?tooManyRequests('Espera un minuto antes de continuar.'):undefined);
});
router.get('/explore',handle(req=>explore.feed(parse(z.object({search:text(100).default(''),city:text(100).default(''),kind:z.enum(['','ACTIVITY','STAMP','AFFILIATION','GIFT','PRODUCT']).default(''),category:text(80).default(''),offset:z.coerce.number().int().min(0).max(100000).default(0)}),req.query))));
router.get('/explore/directory',handle(req=>explore.directory(parse(z.object({search:text(100).default(''),city:text(100).default(''),offset:z.coerce.number().int().min(0).max(100000).default(0)}),req.query))));
router.get('/explore/publications/:id',handle(req=>explore.get(parse(uuid,req.params.id))));
router.get('/explore/publications/:id/qr',handle(req=>explore.shareQr(parse(uuid,req.params.id))));
router.get('/explore/businesses/:slug',handle(req=>explore.businessPage(parse(text(160).min(1),req.params.slug))));
router.post('/explore/resolve',handle(req=>explore.resolveQr(parse(z.object({url:text(2000).min(1)}),req.body).url)));
router.use(require('../services/customerFinanceBooks').middleware);
router.use(require('./customerFinanceBookRoutes'));
router.get('/notifications',handle(req=>require('../services/customerBenefitNotificationService').list(req.customer)));
router.post('/notifications/:id/read',handle(req=>require('../services/customerBenefitNotificationService').mark(req.customer,parse(uuid,req.params.id))));
router.use('/benefit-recovery',require('./customerBenefitRecoveryRoutes'));
router.use('/dreams',require('./customerDreamRoutes'));
router.use('/groceries',require('./customerGroceryRoutes'));
router.use('/debts',require('./customerDebtRoutes'));
router.use('/purchases',require('./customerPurchaseRoutes'));
router.use('/payment-agenda',require('./customerPaymentAgendaRoutes'));
router.get('/product-gifts',handle(req=>productGifts.list(req.customer)));
router.get('/product-gifts/:id',handle(req=>productGifts.order(req.customer,parse(uuid,req.params.id))));
router.post('/product-gifts',handle(req=>{
  const key='gift-order:'+req.customer.id,now=Date.now(),b=buckets.get(key)||{count:0,until:now+60000};
  if(b.until<now){b.count=0;b.until=now+60000;}b.count++;buckets.set(key,b);if(b.count>20)throw tooManyRequests('Espera un minuto antes de continuar.');
  const d=parse(z.object({publication_id:uuid,request_id:uuid,recipient:text(180).min(3),recipient_name:text(120).optional(),message:text(500).default(''),terms_accepted:z.literal(true)}),req.body);
  return productGifts.create(req.customer,d.publication_id,d);
}));
router.post('/product-gifts/:id/cancel',handle(req=>productGifts.cancel(req.customer,parse(uuid,req.params.id))));
router.get('/discovery/me',handle(req=>explore.personal(req.customer)));
router.get('/discovery/saved',handle(req=>explore.feed({savedBy:req.customer.id,offset:parse(z.coerce.number().int().min(0).max(100000).default(0),req.query.offset)})));
router.get('/discovery/earned',handle(req=>explore.earned(req.customer)));
router.get('/discovery/following',handle(req=>explore.following(req.customer)));
router.put('/explore/publications/:id/save',handle(req=>explore.save(req.customer,parse(uuid,req.params.id),parse(z.object({saved:z.boolean()}),req.body).saved)));
router.post('/explore/publications/:id/events',handle(req=>explore.event(req.customer,parse(uuid,req.params.id),parse(z.object({type:z.enum(['OPEN','SHARE'])}),req.body).type)));
router.post('/explore/publications/:id/request',handle(req=>explore.requestProgram(req.customer,parse(uuid,req.params.id),parse(z.object({document_id:text(80).min(3),message:text(1000).default(''),consent:z.literal(true)}),req.body))));
router.post('/explore/publications/:id/launch',handle(req=>explore.launch(req.customer,parse(uuid,req.params.id))));
router.post('/explore/publications/:id/participants',handle(req=>explore.participate(req.customer,parse(uuid,req.params.id),parse(publicInteractiveParticipantSchema,req.body),false)));
router.post('/explore/publications/:id/complete',handle(req=>explore.participate(req.customer,parse(uuid,req.params.id),parse(publicInteractiveCompleteSchema,req.body),true)));
router.post('/explore/publications/:id/gift-order',handle(req=>explore.giftOrder(req.customer,parse(uuid,req.params.id),parse(z.object({request_id:uuid,buyer_name:text(160).min(2),recipient_name:text(160).min(2),recipient_email:z.string().trim().email().max(180),amount:money,message:text(500).default(''),terms_accepted:z.literal(true)}),req.body))));
router.get('/invitations',handle(req=>network.inbox(req.customer)));
router.post('/invitations/:id/participants',handle(req=>explore.participateInvitation(req.customer,parse(uuid,req.params.id),parse(publicInteractiveParticipantSchema,req.body),false)));
router.post('/invitations/:id/complete',handle(req=>explore.participateInvitation(req.customer,parse(uuid,req.params.id),parse(publicInteractiveCompleteSchema,req.body),true)));
router.post('/invitations/:id/decision',handle(req=>network.decide(req.customer,parse(uuid,req.params.id),parse(z.object({action:z.enum(['ACCEPT','REJECT']),include_history:z.boolean().default(false),auto_receive:z.boolean().default(false),document_id:text(80).optional(),document_confirmation:text(80).optional(),terms_accepted:z.literal(true).optional()}).refine(d=>d.action==='REJECT'||d.terms_accepted===true,'Confirma las condiciones de la invitación.'),req.body))));
router.put('/business-blocks/:id',handle(req=>network.block(req.customer,parse(uuid,req.params.id),parse(z.object({blocked:z.boolean()}),req.body).blocked)));
router.get('/wallet/tickets/:id',handle(req=>network.ticket(req.customer,parse(uuid,req.params.id))));
router.get('/wallet/overview',handle(req=>web.overview(req.customer)));
router.get('/wallet/cards/:id',handle(async req=>stamps.publicCard(await svc.ownCard(req.customer.id,parse(uuid,req.params.id)))));
router.get('/me',handle(req=>({account:req.customer,categories:finance.CATEGORIES})));
router.patch('/me',handle(async req=>{
  const d=parse(z.object({full_name:text(100).min(2),currency,timezone:text(60).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Zona horaria inválida.'),
    document_id:text(80).min(3).optional(),document_confirmation:text(80).min(3).optional(),
    preferences:z.object({notifications:z.object({purchases:z.boolean(),benefits:z.boolean(),budget:z.boolean(),summary:z.boolean()})})}),req.body);
  return withTransaction(async db=>{
    const identity=require('../services/customerIdentityService');
    const current=(await db.query('select declared_document_key from customer_accounts where id=$1 for update',[req.customer.id])).rows[0];
    if(!current?.declared_document_key&&!d.document_id)throw badRequest('La cédula es obligatoria para completar tu registro. Escríbela y confírmala.');
    if(!current?.declared_document_key||(d.document_id&&identity.normalize(d.document_id)!==current.declared_document_key))await identity.lockDocument(req.customer.id,d,db);
    return {account:(await db.query("update customer_accounts set full_name=$2,currency=$3,timezone=$4,preferences=preferences||$5::jsonb where id=$1 returning *",[req.customer.id,d.full_name,d.currency,d.timezone,JSON.stringify(d.preferences)])).rows[0]};
  });
}));
router.get('/sessions',handle(async req=>({sessions:(await query('select id,device_name,created_at,expires_at from customer_sessions where customer_id=$1 order by created_at desc',[req.customer.id])).rows,current:req.customer.session_id})));
router.delete('/sessions/:id',handle(async req=>{await query('delete from customer_sessions where id=$1 and customer_id=$2',[parse(uuid,req.params.id),req.customer.id]);return {ok:true};}));
router.post('/logout',async(req,res,next)=>{try{await query('delete from customer_sessions where id=$1 and customer_id=$2',[req.customer.session_id,req.customer.id]);auth.clearWebSession(res);res.set('Cache-Control','private, no-store').json({ok:true});}catch(e){next(e);}});
router.get('/export',handle(req=>svc.exportData(req.customer)));
router.delete('/me',handle(async req=>{
  parse(z.object({confirmation:z.literal('ELIMINAR MI CUENTA')}),req.body);
  await withTransaction(async db=>{await db.query('delete from customer_sessions where customer_id=$1',[req.customer.id]);await db.query('delete from customer_challenges where email=$1',[req.customer.email]);await db.query('delete from customer_accounts where id=$1',[req.customer.id]);});
  return {ok:true,message:'Cuenta personal eliminada. Los registros comerciales originales permanecen bajo responsabilidad de cada establecimiento.'};
}));
router.get('/identification',handle(req=>svc.identification(req.customer)));
const period=z.object({period:z.enum(['day','week','month','year','custom']).default('month'),anchor:z.string().date().optional(),from:z.string().date().optional(),to:z.string().date().optional(),currency:currency.optional()});
router.get('/movements',handle(req=>require('../services/customerMovementHistoryService').list(req.customer,parse(z.object({
 from:z.string().date().optional(),to:z.string().date().optional(),currency:currency.default('COP'),search:text(160).default(''),
 category:category.optional(),source:z.enum(['QORI','MANUAL']).optional(),kind:z.enum(['INCOME','EXPENSE']).optional(),status:z.enum(['PAID','PENDING','VOIDED']).optional(),
 priority:z.enum(['UNSET','ESSENTIAL','FLEXIBLE']).optional(),expense_pattern:z.enum(['UNSET','RECURRING','EVENTUAL']).optional(),payment_method:text(80).optional(),
 min_amount:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).optional(),max_amount:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).optional(),
 sort:z.enum(['date_desc','date_asc','name_asc','name_desc','amount_asc','amount_desc']).default('date_desc'),offset:z.coerce.number().int().min(0).max(1000000).default(0),limit:z.coerce.number().int().min(1).max(200).default(50)
 }),req.query))));
router.get('/dashboard',handle(req=>svc.dashboard(req.customer,parse(period,req.query))));
router.get('/finance-connections',handle(req=>financeDelivery.connections(req.customer)));
router.put('/finance-connections/:id/capture',handle(req=>{
 const d=parse(z.object({enabled:z.boolean(),book_id:uuid.optional(),confirmed:z.literal(true)}),req.body);
 return withTransaction(db=>require('../services/customerAutomaticPurchaseService').configure(db,req.customer,parse(uuid,req.params.id),d));
}));
router.get('/purchase-receipts/:id',handle(req=>require('../services/customerAutomaticPurchaseService').receipt(req.customer,parse(uuid,req.params.id))));
router.put('/finance-connections/:id',handle(req=>financeDelivery.connection(req.customer,parse(uuid,req.params.id),parse(z.object({auto_receive:z.boolean()}),req.body).auto_receive)));
router.post('/recurring/:id/record',handle(req=>paymentAgenda.legacyRecord(req.customer,parse(uuid,req.params.id),parse(z.object({expected_date:z.string().date(),paid_on:z.string().date(),amount:money.optional(),confirmed:z.literal(true)}),req.body))));
router.get('/relationships',handle(req=>svc.relationships(req.customer.id)));
router.post('/relationships/:id/decision',handle(req=>svc.decideRelationship(req.customer.id,parse(uuid,req.params.id),parse(z.object({action:z.enum(['ACCEPT','REJECT','REVOKE']),include_history:z.boolean().default(false),capture_purchases:z.boolean().optional(),book_id:uuid.optional(),document_id:text(80).optional(),document_confirmation:text(80).optional()}),req.body))));
const entry=z.object({request_id:uuid,kind:z.enum(['EXPENSE','INCOME']).default('EXPENSE'),amount:money,currency,occurred_at:z.union([z.string().datetime({offset:true}),z.string().date()]),merchant:text(160).min(1),
  expense_pattern:z.enum(['UNSET','RECURRING','EVENTUAL']).optional(),category:category.default('otros'),priority:z.enum(['UNSET','ESSENTIAL','FLEXIBLE']).default('UNSET'),note:text(2000).default(''),payment_method:text(60).default(''),
  products:z.array(z.object({name:text(160).min(1),quantity:z.number().positive().max(100000),amount:money})).max(100).default([]),
  splits:z.array(z.object({category,amount:money})).max(20).default([]),tags:z.array(text(30).min(1)).max(10).default([])});
router.post('/entries',handle(req=>svc.saveEntry(req.customer.id,{...parse(entry,req.body),book_id:req.customer.finance_book.id})));
router.put('/entries/:id',handle(req=>svc.saveEntry(req.customer.id,{...parse(entry,req.body),book_id:req.customer.finance_book.id},parse(uuid,req.params.id))));
router.delete('/entries/:id',handle(async req=>{
  await svc.assertNotPaymentEntry(req.customer.id,parse(uuid,req.params.id));
  const r=await query('update customer_entries set deleted_at=now(),updated_at=now() where id=$1 and customer_id=$2 and linked_sale_id is null returning id',[parse(uuid,req.params.id),req.customer.id]);
  if(!r.rowCount)throw notFound('Gasto no encontrado o vinculado a una venta.');await query('delete from customer_receipts where entry_id=$1 and customer_id=$2',[req.params.id,req.customer.id]);return {ok:true};
}));
router.get('/entries/:id',handle(async req=>{
  const row=(await query('select * from customer_entries where id=$1 and customer_id=$2 and deleted_at is null',[parse(uuid,req.params.id),req.customer.id])).rows[0];
  if(!row)throw notFound();
  const receipts=(await query('select id,filename,mime_type from customer_receipts where entry_id=$1 and customer_id=$2',[row.id,req.customer.id])).rows;
  const obligation=(await query('select id from customer_payment_items where entry_id=$1 and customer_id=$2',[row.id,req.customer.id])).rows[0];
  const debtPayment=(await query('select debt_id from customer_debt_payments where entry_id=$1 and customer_id=$2 and voided_at is null',[row.id,req.customer.id])).rows[0];
  return {entry:{...row,payment_item_id:obligation?.id,debt_id:debtPayment?.debt_id},receipts};
}));
router.get('/sales/:id',handle(async req=>{
  const sale=await svc.ownSale(req.customer.id,parse(uuid,req.params.id));
  const adjustments=(await query('select id,amount,reason,created_at from customer_sale_adjustments where sale_id=$1',[sale.id])).rows;
  const receipts=(await query(`select r.id,r.filename,r.mime_type from customer_receipts r join customer_entries e on e.id=r.entry_id
    where r.customer_id=$1 and e.customer_id=$1 and e.linked_sale_id=$2 and e.deleted_at is null`,[req.customer.id,sale.id])).rows;
  return {movement:finance.salesMovement(sale,req.customer.timezone),adjustments,receipts};
}));
router.patch('/sales/:id/note',handle(async req=>{
  const id=parse(uuid,req.params.id);await svc.ownSale(req.customer.id,id);
  const d=parse(z.object({category,priority:z.enum(['UNSET','ESSENTIAL','FLEXIBLE']),expense_pattern:z.enum(['UNSET','RECURRING','EVENTUAL']).optional(),note:text(2000)}).strict(),req.body);
  await query(`insert into customer_sale_notes(customer_id,sale_id,category,priority,note,expense_pattern) values($1,$2,$3,$4,$5,coalesce($6,'UNSET'))
    on conflict(customer_id,sale_id) do update set category=excluded.category,priority=excluded.priority,note=excluded.note,expense_pattern=coalesce($6,customer_sale_notes.expense_pattern),updated_at=now()`,[req.customer.id,id,d.category,d.priority,d.note,d.expense_pattern??null]);return {ok:true};
}));
router.post('/sales/:id/report',handle(async req=>{
  const id=parse(uuid,req.params.id),d=parse(z.object({reason:text(1000).min(5)}),req.body);await svc.ownSale(req.customer.id,id);
  await query(`insert into customer_sale_notes(customer_id,sale_id,reported_at,report_reason) values($1,$2,now(),$3)
    on conflict(customer_id,sale_id) do update set reported_at=now(),report_reason=excluded.report_reason`,[req.customer.id,id,d.reason]);return {ok:true};
}));
router.get('/entries/:id/matches',handle(async req=>{
  const row=(await query('select * from customer_entries where id=$1 and customer_id=$2 and deleted_at is null and linked_sale_id is null',[parse(uuid,req.params.id),req.customer.id])).rows[0];
  if(!row)throw notFound();
  const date=new Date(row.occurred_at),from=new Date(date.getTime()-3*86400000).toISOString().slice(0,10),to=new Date(date.getTime()+3*86400000).toISOString().slice(0,10);
  const candidates=(await svc.movements(req.customer,from,to)).filter(r=>r.source==='QORI'&&r.sale_id&&r.currency===row.currency&&r.amount_minor===finance.minor(row.amount));
  return {candidates:candidates.slice(0,20),requires_confirmation:true};
}));
router.post('/entries/:id/link',handle(req=>svc.mergeEntry(req.customer.id,parse(uuid,req.params.id),parse(z.object({sale_id:uuid,confirmed:z.literal(true)}),req.body).sale_id)));
router.post('/entries/:id/receipts',handle(async req=>{
  const id=parse(uuid,req.params.id),d=parse(z.object({filename:text(120).min(1),mime_type:z.enum(['image/jpeg','image/png','application/pdf']),base64:z.string().max(7000000).regex(/^[A-Za-z0-9+/]*={0,2}$/)}),req.body);
  const owner=await query('select 1 from customer_entries where id=$1 and customer_id=$2 and deleted_at is null',[id,req.customer.id]);if(!owner.rowCount)throw notFound();
  const bytes=Buffer.from(d.base64,'base64');
  const valid=d.mime_type==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':d.mime_type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!valid||bytes.length>5242880)throw badRequest('Adjunta un JPG, PNG o PDF válido de hasta 5 MB.');
  const result=await withTransaction(async db=>{
    const locked=await db.query('select id from customer_entries where id=$1 and customer_id=$2 and deleted_at is null for update',[id,req.customer.id]);
    if(!locked.rowCount)throw notFound();
    // A lost upload response must not create a second copy on retry.
    const existing=await db.query('select id,filename,mime_type from customer_receipts where entry_id=$1 and customer_id=$2 and mime_type=$3 and bytes=$4 limit 1',[id,req.customer.id,d.mime_type,bytes]);
    if(existing.rowCount)return existing.rows[0];
    const count=(await db.query('select count(*)::int n from customer_receipts where entry_id=$1',[id])).rows[0].n;
    if(count>=5)throw badRequest('Máximo cinco recibos por gasto.');
    return (await db.query('insert into customer_receipts(customer_id,entry_id,filename,mime_type,bytes) values($1,$2,$3,$4,$5) returning id,filename,mime_type',[req.customer.id,id,d.filename.replace(/[\r\n\\/]/g,'_'),d.mime_type,bytes])).rows[0];
  });return {receipt:result};
}));
router.get('/receipts/:id',handle(async req=>{
  const row=(await query("select id,filename,mime_type,encode(bytes,'base64') base64 from customer_receipts where id=$1 and customer_id=$2",[parse(uuid,req.params.id),req.customer.id])).rows[0];
  if(!row)throw notFound();return {receipt:row};
}));
router.delete('/receipts/:id',handle(async req=>{await query('delete from customer_receipts where id=$1 and customer_id=$2',[parse(uuid,req.params.id),req.customer.id]);return {ok:true};}));
router.get('/planning',handle(req=>svc.planning(req.customer)));
router.post('/budgets',handle(async req=>{
  const d=parse(z.object({category:z.enum(['ALL',...finance.CATEGORIES]),period:z.enum(['week','month']),currency,amount:money,threshold:z.number().int().min(1).max(100).default(80)}),req.body);
  return {budget:(await query(`insert into customer_budgets(customer_id,category,period,currency,amount,threshold,book_id) values($1,$2,$3,$4,$5,$6,$7)
    on conflict(customer_id,book_id,category,period,currency) do update set amount=excluded.amount,threshold=excluded.threshold returning *`,[req.customer.id,d.category,d.period,d.currency,d.amount,d.threshold,req.customer.finance_book.id])).rows[0]};
}));
router.post('/goals',handle(async req=>{
  const d=parse(z.object({name:text(120).min(2),currency,target:money}),req.body);
  return {goal:(await query('insert into customer_goals(customer_id,name,currency,target,book_id) values($1,$2,$3,$4,$5) returning *',[req.customer.id,d.name,d.currency,d.target,req.customer.finance_book.id])).rows[0]};
}));
router.put('/goals/:id/progress',handle(async req=>{
  const d=parse(z.object({recorded_amount:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/)}),req.body);
  const r=await query('update customer_goals set recorded_amount=$3,revision=revision+1,updated_at=now() where id=$1 and customer_id=$2 returning *',[parse(uuid,req.params.id),req.customer.id,d.recorded_amount]);if(!r.rowCount)throw notFound();return {goal:r.rows[0]};
}));
router.post('/recurring',handle(async req=>{
  const d=parse(z.object({request_id:uuid.optional(),name:text(120).min(2),currency,amount:money,kind:z.enum(['EXPENSE','INCOME']),category,next_date:z.string().date(),frequency:z.enum(['once','week','month','year']),priority:z.enum(['ESSENTIAL','FLEXIBLE']).optional(),reminder_day:z.number().int().min(1).max(31).nullable().optional(),remind_days:z.number().int().min(0).max(30).default(3),reminders_enabled:z.boolean().default(true)}),req.body);
  return paymentAgenda.create(req.customer,d);
}));
for(const [route,table] of [['budgets','customer_budgets'],['goals','customer_goals']])router.delete(`/${route}/:id`,handle(async req=>{await query(`delete from ${table} where id=$1 and customer_id=$2`,[parse(uuid,req.params.id),req.customer.id]);return {ok:true};}));
router.put('/recurring/:id',handle(req=>paymentAgenda.updateRule(req.customer,parse(uuid,req.params.id),parse(z.object({name:text(120).min(2),amount:money,priority:z.enum(['ESSENTIAL','FLEXIBLE']).optional(),reminder_day:z.number().int().min(1).max(31).nullable().optional(),remind_days:z.number().int().min(0).max(30),reminders_enabled:z.boolean(),active:z.boolean()}),req.body))));
router.delete('/recurring/:id',handle(req=>paymentAgenda.archive(req.customer,parse(uuid,req.params.id))));
router.post('/insights/dismiss',handle(async req=>{const d=parse(z.object({id:text(240).min(1)}),req.body);await query('insert into customer_insight_dismissals(customer_id,insight_key) values($1,$2) on conflict do nothing',[req.customer.id,d.id]);return {ok:true};}));
router.get('/wallet',handle(async req=>({...await svc.wallet(req.customer.id),giftcards:await wallet.giftWallet(req.customer)})));
router.get('/wallet/affiliations/:id',handle(req=>wallet.affiliateCard(req.customer,parse(uuid,req.params.id))));
router.post('/wallet/affiliations/:id/claim',handle(req=>wallet.claimAffiliate(req.customer,parse(uuid,req.params.id),parse(z.object({reward_rule_id:uuid}),req.body).reward_rule_id)));
router.get('/wallet/gifts/:id',handle(req=>wallet.giftDetail(req.customer,parse(uuid,req.params.id))));
router.post('/wallet/gifts/:id/accept',handle(req=>wallet.acceptGift(req.customer,parse(uuid,req.params.id),parse(z.object({full_name:text(160).min(2),document_id:text(80).min(3),document_confirmation:text(80).optional(),terms_accepted:z.literal(true)}),req.body))));
router.post('/gift-orders',handle(req=>wallet.createGiftOrder(req.customer,parse(z.object({request_id:uuid,business_id:uuid,buyer_name:text(160).min(2),recipient_name:text(160).min(2),recipient_email:z.string().trim().email().max(180),amount:money,message:text(500).default(''),terms_accepted:z.literal(true)}),req.body))));
router.get('/gift-orders/:id',handle(req=>wallet.giftOrder(req.customer,parse(uuid,req.params.id))));
router.post('/gift-orders/:id/cancel',handle(req=>wallet.cancelGiftOrder(req.customer,parse(uuid,req.params.id))));
router.post('/wallet/cards/:id/claim',handle(async req=>stamps.claim(await svc.ownCard(req.customer.id,parse(uuid,req.params.id)),parse(z.object({cycle_id:uuid}),req.body).cycle_id)));
router.post('/wallet/cards/:id/renew',handle(async req=>stamps.renew(await svc.ownCard(req.customer.id,parse(uuid,req.params.id)))));
router.get('/places',handle(async req=>{
  const d=parse(z.object({search:text(100).default(''),city:text(100).default('')}),req.query);
  const rows=(await query(`select b.id,b.name,d.category,d.city,d.address,d.description,d.latitude,d.longitude,
    exists(select 1 from customer_favorites f where f.business_id=b.id and f.customer_id=$1) favorite,
    coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'stamps_required',p.stamps_required,'terms',p.terms,'benefit',p.benefit_value->>'label'))
      from stamp_programs p where p.business_id=b.id and p.status='ACTIVE' and p.deleted_at is null),'[]') programs
    from customer_directory d join businesses b on b.id=d.business_id where d.published and b.is_active
    and b.name ilike '%'||$2||'%' and d.city ilike '%'||$3||'%' order by b.name limit 100`,[req.customer.id,d.search,d.city])).rows;
  const available=await Promise.all(rows.map(async place=>{const state=await wallet.readiness(place.id);return state.ready?{...place,programs_config:state.programs,point_rules:state.point_rules,qori_standard:true}:null;}));
  return {places:available.filter(Boolean)};
}));
router.get('/favorites',handle(async req=>({places:(await query('select b.id,b.name from customer_favorites f join businesses b on b.id=f.business_id where f.customer_id=$1',[req.customer.id])).rows})));
router.post('/favorites/:id',handle(async req=>{
  return explore.followBusiness(req.customer,parse(uuid,req.params.id));
}));
router.delete('/favorites/:id',handle(async req=>{await query('delete from customer_favorites where customer_id=$1 and business_id=$2',[req.customer.id,parse(uuid,req.params.id)]);return {ok:true};}));
router.post('/place-requests',handle(async req=>{
  const d=parse(z.object({name:text(160).min(2),city:text(100).min(2),address:text(200).default('')}),req.body);
  await query('insert into customer_place_requests(customer_id,name,city,address) values($1,$2,$3,$4) on conflict do nothing',[req.customer.id,d.name,d.city,d.address]);return {ok:true};
}));
router.get('/place-requests',handle(async req=>({requests:(await query('select id,name,city,address,business_id,created_at from customer_place_requests where customer_id=$1 order by created_at desc',[req.customer.id])).rows})));

businessRouter.use(authRequired,requirePortalAccess,requireRoles('BUSINESS_OWNER','BUSINESS_MANAGER','VALIDATOR'));
businessRouter.post('/lookup',handle(req=>{
  const key='customer-lookup:'+req.user.business_id,now=Date.now(),b=buckets.get(key)||{count:0,until:now+60000};
  if(b.until<now){b.count=0;b.until=now+60000;}b.count++;buckets.set(key,b);
  if(b.count>30)throw tooManyRequests('Espera un minuto antes de buscar más cuentas.');
  return network.lookup(req.user,parse(z.object({query:text(180).min(3)}),req.body).query);
}));
businessRouter.post('/relationships',handle(req=>svc.proposeRelationship(req.user,parse(z.object({public_id:uuid,document_id:text(80).min(3),identity_checked:z.literal(true)}),req.body))));
businessRouter.get('/relationships',handle(async req=>({relationships:(await query('select id,state,created_at,accepted_at,right(document_key,4) document_suffix from customer_relationships where business_id=$1 order by created_at desc limit 100',[req.user.business_id])).rows})));
businessRouter.get('/reports',handle(async req=>({reports:(await query(`select n.sale_id,n.reported_at,n.report_reason from customer_sale_notes n join business_sales s on s.id=n.sale_id
  where s.business_id=$1 and n.reported_at is not null order by n.reported_at desc limit 100`,[req.user.business_id])).rows})));
businessRouter.use(requireRoles('BUSINESS_OWNER','BUSINESS_MANAGER'));
businessRouter.get('/benefit-deliveries/:publicId',handle(req=>require('../services/customerBenefitDeliveryService').businessCatalog(req.user,parse(uuid,req.params.publicId))));
businessRouter.post('/benefit-deliveries',handle(req=>require('../services/customerBenefitDeliveryService').businessSend(req.user,parse(z.object({public_id:uuid,kind:z.enum(['STAMP','AFFILIATION','GIFT','TICKET']),resource_id:uuid,document_id:text(80).min(3),identity_checked:z.literal(true)}),req.body))));
businessRouter.get('/sale-deliveries',handle(req=>financeDelivery.businessSales(req.user,parse(z.object({search:text(160).default(''),offset:z.coerce.number().int().min(0).max(100000).default(0)}),req.query))));
businessRouter.post('/sale-deliveries',handle(req=>financeDelivery.send(req.user,parse(z.object({sale_id:uuid,public_id:uuid,request_id:uuid,identity_checked:z.literal(true)}),req.body))));
businessRouter.get('/product-gifts',handle(req=>productGifts.businessOrders(req.user)));
businessRouter.get('/product-gifts/catalog',handle(req=>productGifts.businessCatalog(req.user)));
businessRouter.post('/product-gifts',handle(req=>productGifts.createFromBusiness(req.user,parse(z.object({
 request_id:uuid,product_id:uuid,recipient_public_id:uuid.optional(),recipient_email:z.string().trim().email().max(180).optional(),recipient_name:text(160).min(2).optional(),buyer_email:z.string().trim().email().max(180).optional(),buyer_public_id:uuid.optional(),buyer_name:text(160).min(2).optional(),buyer_authorized:z.literal(true).optional(),
 amount:money,valid_days:z.coerce.number().int().min(1).max(365).default(30),terms:text(4000).min(10),message:text(500).default('')
}).strict().refine(d=>!!d.buyer_public_id||!!d.buyer_name,'Indica quién compra el regalo.').refine(d=>!!d.recipient_public_id||!!(d.recipient_email&&d.recipient_name),'Indica una cuenta o el nombre y correo del destinatario.'),req.body))));
businessRouter.post('/product-gifts/:id/confirm-payment',handle(req=>productGifts.confirm(req.user,parse(uuid,req.params.id),parse(z.object({amount:money,payment_reference:text(120).min(3),payment_method:text(80).min(2),payment_received:z.literal(true),branch_id:uuid.optional()}),req.body))));
businessRouter.get('/publications',handle(req=>explore.catalog(req.user)));
businessRouter.post('/publications',handle(req=>explore.publish(req.user,parse(z.object({
  kind:z.enum(['ACTIVITY','STAMP','AFFILIATION','GIFT','PRODUCT']),resource_id:uuid.nullable().optional(),title:text(160).min(3),description:text(2000).default(''),
  cover_url:text(1200).refine(v=>!v||/^https:\/\//.test(v)||/^\/(?!\/)/.test(v),'Usa una imagen HTTPS.').default(''),
  product_price:money.optional(),product_terms:text(4000).min(10).optional(),payment_instructions:text(2000).min(10).optional(),product_valid_days:z.coerce.number().int().min(1).max(365).default(30),
  category:text(80).default(''),status:z.enum(['DRAFT','PUBLISHED']).default('PUBLISHED')
} ).refine(d=>d.kind!=='PRODUCT'||!!(d.product_price&&d.product_terms&&d.payment_instructions),'Indica precio, condiciones e instrucciones de pago.').refine(d=>['ACTIVITY','STAMP','PRODUCT'].includes(d.kind)?!!d.resource_id:!d.resource_id,'Selecciona el programa correspondiente.'),req.body))));
businessRouter.patch('/publications/:id',handle(req=>explore.publicationState(req.user,parse(uuid,req.params.id),parse(z.object({status:z.enum(['DRAFT','PAUSED'])}),req.body).status)));
businessRouter.get('/program-requests',handle(req=>explore.businessRequests(req.user)));
businessRouter.post('/program-requests/:id/decision',handle(req=>explore.decideRequest(req.user,parse(uuid,req.params.id),parse(z.object({action:z.enum(['INVITE','REJECT']),identity_checked:z.boolean().default(false),message:text(1000).default('')}),req.body))));
businessRouter.get('/catalog/:id',handle(req=>network.catalog(req.user,parse(uuid,req.params.id))));
businessRouter.post('/invitations',handle(req=>network.send(req.user,parse(z.object({request_id:uuid,public_id:uuid,kind:z.enum(['STAMP','AFFILIATION','GIFT','ACTIVITY','TICKET']),resource_id:uuid.optional(),document_id:text(80).min(3).optional(),identity_checked:z.literal(true).optional(),amount:money.optional(),message:text(1000).default(''),terms:text(4000).default('')}).superRefine((d,c)=>{
  if(['STAMP','ACTIVITY','TICKET'].includes(d.kind)&&!d.resource_id)c.addIssue({code:'custom',message:'Selecciona el programa, actividad o ticket.'});
  if(d.kind==='GIFT'&&(!d.amount||d.terms.length<10))c.addIssue({code:'custom',message:'Indica el valor y las condiciones de la giftcard de regalo.'});
}),req.body))));
businessRouter.get('/invitations/:id',handle(async req=>({invitations:(await query(`select i.id,i.kind,i.title,i.state,i.created_at,i.expires_at from customer_invitations i join customer_accounts a on a.id=i.customer_id where i.business_id=$1 and a.public_id=$2 order by i.created_at desc limit 100`,[req.user.business_id,parse(uuid,req.params.id)])).rows})));
businessRouter.post('/invitations/:id/cancel',handle(async req=>{const r=await query("update customer_invitations set state='CANCELLED',decided_at=now() where id=$1 and business_id=$2 and state='PENDING' returning id",[parse(uuid,req.params.id),req.user.business_id]);if(!r.rowCount)throw badRequest('La invitación ya no está pendiente.');return {ok:true};}));
businessRouter.get('/standard',handle(req=>wallet.readiness(req.user.business_id)));
businessRouter.put('/standard',handle(req=>wallet.savePrograms(req.user,parse(z.object({points_terms:text(4000).min(10),accumulation_terms:text(2000).min(10),gift_enabled:z.boolean(),gift_min:money,gift_max:money,gift_terms:text(8000).min(10),gift_payment_instructions:text(2000).min(10)}),req.body))));
businessRouter.get('/gift-orders',handle(req=>wallet.businessOrders(req.user)));
businessRouter.post('/gift-orders/:id/confirm-payment',handle(req=>wallet.confirmGiftPayment(req.user,parse(uuid,req.params.id),parse(z.object({amount:money,payment_reference:text(120).min(3),payment_method:text(120).min(2),payment_received:z.literal(true)}),req.body))));
businessRouter.put('/directory',handle(async req=>{
  const d=parse(z.object({published:z.boolean(),category:text(80),city:text(100),address:text(200),description:text(1000),latitude:z.number().min(-90).max(90).nullable().default(null),longitude:z.number().min(-180).max(180).nullable().default(null)}),req.body);
  if(d.published){
    const {getBusinessSubscription}=require('../services/subscriptionService');
    const subscription=await getBusinessSubscription(req.user.business_id);
    if(subscription.plan.raw_status!=='ACTIVE'||!subscription.plan.portal_access_allowed)throw badRequest('Activa tu suscripción para publicar tu negocio.');
  }
  await query(`insert into customer_directory(business_id,published,category,city,address,description,latitude,longitude) values($1,$2,$3,$4,$5,$6,$7,$8)
    on conflict(business_id) do update set published=excluded.published,category=excluded.category,city=excluded.city,address=excluded.address,description=excluded.description,
    latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now()`,[req.user.business_id,d.published,d.category,d.city,d.address,d.description,d.latitude,d.longitude]);return {ok:true};
}));
businessRouter.get('/directory',handle(async req=>({directory:(await query('select * from customer_directory where business_id=$1',[req.user.business_id])).rows[0]||null})));
// Customer routes own their error boundary: never leak SQL, receipt data or internal errors.
router.use((error,req,res,_next)=>{
 if(['/dashboard','/planning','/finance-connections'].includes(req.path)&&(!error.status||error.status>=500))require('../services/customerFinanceReadiness').observe(error);
 return res.status(error.status||500).json({error:{message:error.status&&error.status<500?error.message:'No pudimos completar la operación. Inténtalo nuevamente.'}});
});
businessRouter.use((error,_req,res,_next)=>res.status(error.status||500).json({error:{message:error.status&&error.status<500?error.message:'No pudimos completar la operación. Inténtalo nuevamente.'}}));
module.exports={router,businessRouter,entry};

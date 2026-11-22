const crypto=require('node:crypto');
const {query,withTransaction}=require('../config/db');
const {enabled,configured,hash,identity,seal,unseal,fault}=require('./config');
const {normalize}=require('./normalize');
const finance=require('../services/customerFinance');
const books=require('../services/customerFinanceBooks');
const CONSENT={version:'invoice-sandbox-2026-11-v2',purposes:['RECEIVE','STORE','ANALYZE'],channel:'INVOICE_API_SANDBOX',
 text:'Activo la recepción automática de facturas sintéticas de la aplicación elegida y, si lo selecciono, solo del comercio indicado. Autorizo recibir, conservar y analizar sus conceptos en mi bolsillo. En sandbox la retención documental de referencia es 30 días, sujeta a solicitudes y bloqueos de conservación. Puedo consultar, descargar, corregir mi organización financiera, solicitar eliminación y revocar futuros envíos desde Mis facturas. Qori y su infraestructura técnica tratan los datos; el integrador no recibe mi historial ni conoce si tengo cuenta. Esta autorización no incluye publicidad, perfilado comercial ni compartir compras con otros negocios. No prueba pagos ni sustituye la entrega del facturador. Texto de pruebas pendiente de revisión jurídica para producción.'};
const rows=async(db,sql,args=[])=> (await db.query(sql,args)).rows;
const publicReceipt=r=>{const pending=r.state==='QUEUED'||r.state==='RETRY'||new Date(r.public_ready_at)>new Date();
 return {submission_id:r.id,status:pending?'ACCEPTED':r.state==='DEAD'?'REJECTED':'PROCESSED',
 ...(!pending&&r.state==='DEAD'?{code:r.technical_code==='INVALID_DOCUMENT'?'INVALID_DOCUMENT':'PROCESSING_FAILED'}:{})};};
async function event(db,app,submission,type,actor=null,object=null) { await db.query('insert into invoice_events(app_id,submission_id,event_type,actor_customer_id,object_id) values($1,$2,$3,$4,$5)',[app,submission,type,actor,object]); }
async function ownApp(db,customer,id,{owner=true,lock=false}={}) {
 const r=(await rows(db,`select a.* from invoice_apps a join invoice_members m on m.partner_id=a.partner_id
 where a.id=$1 and m.customer_id=$2 and ($3=false or m.role='OWNER')${lock?' for update of a':''}`,[id,customer.id,owner]))[0];
 if(!r)throw fault(404,'NOT_FOUND');return r;
}
async function register(account,name) {
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  const prior=await rows(db,'select p.* from invoice_partners p join invoice_members m on m.partner_id=p.id where m.customer_id=$1',[account.id]);
  if(prior.length)return {partner:prior[0]};
  const partner=(await rows(db,'insert into invoice_partners(name) values($1) returning *',[name]))[0];
  await db.query("insert into invoice_members(partner_id,customer_id,role) values($1,$2,'OWNER')",[partner.id,account.id]);
  return {partner};
 });
}
async function createApp(account,partnerId,name) {
 return withTransaction(async db=>{
  const p=(await rows(db,"select p.id from invoice_partners p join invoice_members m on m.partner_id=p.id where p.id=$1 and m.customer_id=$2 and m.role='OWNER' for update of p",[partnerId,account.id]))[0];
  if(!p)throw fault(404,'NOT_FOUND');
  if((await rows(db,'select id from invoice_apps where partner_id=$1',[partnerId])).length>=10)throw fault(409,'APP_LIMIT');
  const app=(await rows(db,'insert into invoice_apps(partner_id,name) values($1,$2) returning *',[partnerId,name]))[0];
  await event(db,app.id,null,'APP_CREATED');return {app};
 });
}
async function listing(account,appId,listed) {
 return withTransaction(async db=>{await ownApp(db,account,appId,{lock:true});
  await db.query('update invoice_apps set listed=$2 where id=$1',[appId,listed]);
  await event(db,appId,null,listed?'CATALOG_LISTED':'CATALOG_UNLISTED');return {ok:true};});
}
async function createKey(account,appId,scopes=['invoices:write','submissions:read']) {
 return withTransaction(async db=>{
  await ownApp(db,account,appId,{lock:true});
  if((await rows(db,'select id from invoice_keys where app_id=$1 and revoked_at is null and expires_at>now()',[appId])).length>=5)throw fault(409,'KEY_LIMIT');
  const token='qi_sbx_'+crypto.randomBytes(32).toString('base64url');
  if(!scopes.length||scopes.some(s=>!require('./oauth').SCOPES.includes(s)))throw fault(400,'INVALID_SCOPE');
  const key=(await rows(db,"insert into invoice_keys(app_id,secret_hash,prefix,expires_at,scopes) values($1,$2,$3,now()+interval '30 days',$4) returning id,prefix,expires_at,scopes",[appId,hash(token),token.slice(0,14),[...new Set(scopes)]]))[0];
  await event(db,appId,null,'KEY_CREATED',account.id,key.id);return {key,client_id:key.id,client_secret:token};
 });
}
async function revokeKey(account,appId,id) {
 return withTransaction(async db=>{
  await ownApp(db,account,appId,{lock:true});
  const r=await db.query('update invoice_keys set revoked_at=coalesce(revoked_at,now()) where id=$1 and app_id=$2',[id,appId]);
  if(!r.rowCount)throw fault(404,'NOT_FOUND');await event(db,appId,null,'KEY_REVOKED',account.id,id);return {ok:true};
 });
}
async function authorizeFixture(account,appId,revoke=false) {
 return withTransaction(async db=>{
  await ownApp(db,account,appId,{lock:true});
  const merchant=(await rows(db,`insert into invoice_merchants(tax_id,name,verification_state) values('900000000','Comercio de prueba Qori','SANDBOX_FIXTURE')
  on conflict(tax_id) do update set tax_id=excluded.tax_id returning id,tax_id,name`))[0];
  if(revoke)await db.query('update invoice_authorizations set revoked_at=coalesce(revoked_at,now()) where app_id=$1 and merchant_id=$2',[appId,merchant.id]);
  else await db.query(`insert into invoice_authorizations(app_id,merchant_id,evidence_reference,expires_at) values($1,$2,'SANDBOX_SYNTHETIC_ONLY',now()+interval '30 days')
   on conflict(app_id,merchant_id) do update set revoked_at=null,granted_at=now(),expires_at=excluded.expires_at`,[appId,merchant.id]);
  await event(db,appId,null,revoke?'MERCHANT_REVOKED':'FIXTURE_AUTHORIZED');return {merchant,active:!revoke};
 });
}
async function machine(token,scope) {
 return require('./oauth').authenticate(token,scope);
}
async function receive(principal,key,data) {
 configured();
 return withTransaction(async db=>{
  // Serialize revocation and acceptance, including concurrent requests on the same application.
  const a=(await rows(db,`select a.id,a.partner_id,a.hourly_quota from invoice_apps a join invoice_keys k on k.app_id=a.id join invoice_partners p on p.id=a.partner_id
   where a.id=$1 and k.id=$2 and a.active and k.revoked_at is null and k.expires_at>now() and p.verification_state<>'REVOKED'
   for share of a,k,p`,[principal.app_id,principal.key_id]))[0];
  if(!a)throw fault(401,'INVALID_CREDENTIAL');
  const authorization=(await rows(db,`select x.merchant_id from invoice_authorizations x join invoice_merchants m on m.id=x.merchant_id
   where x.app_id=$1 and m.tax_id=$2 and x.revoked_at is null and x.expires_at>now() for share of x`,[principal.app_id,data.issuer_nit]))[0];
  if(!authorization)throw fault(403,'ISSUER_NOT_AUTHORIZED');
  const digest=hash(data.issuer_nit+'\n'+data.xml);
  await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[a.partner_id+':quota']);
  await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[principal.app_id+':receive']);
  const prior=(await rows(db,'select * from invoice_submissions where app_id=$1 and idempotency_key=$2',[principal.app_id,key]))[0];
  if(prior){if(prior.payload_hash!==digest)throw fault(409,'IDEMPOTENCY_CONFLICT');return {submission_id:prior.id,status:'ACCEPTED'};}
  if((await rows(db,"select count(*)::int n from invoice_submissions s join invoice_apps a on a.id=s.app_id where a.partner_id=$1 and s.created_at>now()-interval '1 hour'",[a.partner_id]))[0].n>=1000)throw fault(429,'PARTNER_QUOTA');
  if((await rows(db,"select count(*)::int n from invoice_submissions where app_id=$1 and created_at>now()-interval '1 hour'",[principal.app_id]))[0].n>=a.hourly_quota)throw fault(429,'HOURLY_QUOTA');
  const id=crypto.randomUUID();
  await db.query('insert into invoice_submissions(id,app_id,merchant_id,idempotency_key,payload_hash,payload_box) values($1,$2,$3,$4,$5,$6)',
   [id,principal.app_id,authorization.merchant_id,key,digest,seal(data,id)]);
  await db.query('update invoice_submissions set payload_bytes=$2 where id=$1',[id,Buffer.byteLength(data.xml)]);
  await event(db,principal.app_id,id,'ACCEPTED');return {submission_id:id,status:'ACCEPTED'};
 });
}
async function receipt(principal,id) {
 const r=(await rows({query},'select id,state,technical_code,public_ready_at from invoice_submissions where id=$1 and app_id=$2',[id,principal.app_id]))[0];
 if(!r)throw fault(404,'NOT_FOUND');return publicReceipt(r);
}
async function assign(db,job) {
 const allowed=(await rows(db,`select m.tax_id from invoice_authorizations x join invoice_merchants m on m.id=x.merchant_id
  join invoice_apps a on a.id=x.app_id join invoice_partners p on p.id=a.partner_id
  where x.app_id=$1 and x.merchant_id=$2 and x.revoked_at is null and x.expires_at>now() and a.active and p.verification_state<>'REVOKED'
  for share of x,a,p`,[job.app_id,job.merchant_id]))[0];
 if(!allowed)return 'DISCARDED';
 const data=unseal(job.payload_box,job.id),normalized=data.normalized||normalize(data.xml);
 if(normalized.seller.id!==allowed.tax_id||data.issuer_nit!==allowed.tax_id)throw fault(422,'INVALID_DOCUMENT');
 const candidates=normalized.buyer_hmacs||[normalized.buyer_hmac];
 const matches=await rows(db,`select distinct i.customer_id from invoice_identity_attestations i join customer_accounts a on a.id=i.customer_id
  where i.identity_hmac=any($1::text[]) and i.revoked_at is null and i.expires_at>now() and a.is_active and not a.document_review_required`,[candidates]);
 if(matches.length!==1)return matches.length?'IDENTITY_COLLISION_REVIEW':'DISCARDED';const idn=matches[0];
 await db.query('select id from customer_accounts where id=$1 for update',[idn.customer_id]);
 const consent=(await rows(db,`select c.*,b.currency from invoice_consents c join invoice_identity_attestations i on i.id=c.identity_id
  join customer_finance_books b on b.id=c.book_id and b.customer_id=c.customer_id
  join customer_accounts a on a.id=c.customer_id
  where c.customer_id=$1 and c.app_id=$2 and i.identity_hmac=any($3::text[]) and c.revoked_at is null
  and i.revoked_at is null and i.expires_at>now() and a.is_active and not a.document_review_required
  and c.granted_at<=$4 and c.text_version=$5 and c.channel=$6 and (c.merchant_id is null or c.merchant_id=$7) for share of c,i,b`,
  [idn.customer_id,job.app_id,candidates,job.created_at,CONSENT.version,CONSENT.channel,job.merchant_id]))[0];
 if(!consent||consent.currency!==normalized.currency)return 'DISCARDED';
 await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[job.merchant_id+':'+normalized.type+':'+normalized.uuid]);
 const prior=(await rows(db,'select fiscal_hash,customer_id from invoice_documents where merchant_id=$1 and document_type=$2 and document_key=$3',[job.merchant_id,normalized.type,normalized.uuid]))[0];
 if(prior)return prior.fiscal_hash===normalized.fiscal_sha256?'DUPLICATE':'CONFLICT_REVIEW';
 const documentId=crypto.randomUUID();
 // The authenticated ownership proof is internal; never return this to the integrator.
 await db.query(`insert into invoice_documents(id,submission_id,merchant_id,document_key,customer_id,consent_id,book_id,document_type,currency,
 issued_on,payable_minor,original_hash,content_box,parser_version,related_key)
 values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
 [documentId,job.id,job.merchant_id,normalized.uuid,idn.customer_id,consent.id,consent.book_id,normalized.type,normalized.currency,
 normalized.issued_on,normalized.totals.payable_minor,normalized.original_sha256,seal({xml:data.xml,normalized},documentId),normalized.parser_version,normalized.related?.uuid.toLowerCase()||null]);
 await db.query('update invoice_documents set fiscal_hash=$2 where id=$1',[documentId,normalized.fiscal_sha256]);
 await db.query('insert into invoice_notices(customer_id,document_id) values($1,$2)',[idn.customer_id,documentId]);
 // Handle a note arriving before or after its invoice, scoped to the same merchant, buyer and currency.
 await db.query(`update invoice_documents n set related_document_id=i.id from invoice_documents i where
 n.related_key=i.document_key and n.merchant_id=i.merchant_id and n.customer_id=i.customer_id and n.currency=i.currency and n.book_id=i.book_id
 and i.document_type='Invoice' and n.document_type in ('CreditNote','DebitNote')
 and n.merchant_id=$1 and n.customer_id=$2 and n.related_document_id is null`,[job.merchant_id,idn.customer_id]);
 return 'ASSIGNED';
}
async function processOne() {
 if(!enabled())return false;configured();
 const processed=await withTransaction(async db=>{
  const job=(await rows(db,"select * from invoice_submissions where state in ('QUEUED','RETRY') and available_at<=now() order by created_at,id for update skip locked limit 1"))[0];
  if(!job)return false;
  await db.query('savepoint invoice_processing');
  try {
   const start=Date.now(),data=unseal(job.payload_box,job.id),normalized=normalize(data.xml);
   if(normalized.seller.id!==data.issuer_nit)throw fault(422,'INVALID_DOCUMENT');
   await db.query("update invoice_submissions set state='DONE',attempts=attempts+1,payload_box=$2,internal_result='PENDING',processed_ms=$3,technical_code='PROCESSED',finished_at=now() where id=$1",[job.id,seal({...data,normalized},job.id),Date.now()-start]);
   await event(db,job.app_id,job.id,'PROCESSED');
  }catch(error){
   await db.query('rollback to savepoint invoice_processing');
   const permanent=error.status===422,dead=permanent||job.attempts>=4,code=permanent?'INVALID_DOCUMENT':'PROCESSING_FAILED';
   await db.query(`update invoice_submissions set state=$2,attempts=attempts+1,technical_code=$3,
    available_at=now()+($4::int*interval '1 second'),payload_box=case when $5 then null else payload_box end,
    finished_at=case when $5 then now() else null end where id=$1`,[job.id,dead?'DEAD':'RETRY',code,Math.min(900,5*2**job.attempts),dead]);
   await event(db,job.app_id,job.id,error.code==='ARITHMETIC_REVIEW'?'ARITHMETIC_REVIEW':dead?'REJECTED':'RETRY');
  }
  return true;
 });
 const delivered=await processDelivery();return processed||delivered;
}
async function processDelivery() {
 return withTransaction(async db=>{
  const job=(await rows(db,"select * from invoice_submissions where state='DONE' and internal_result in ('PENDING','RETRY') and delivery_at<=now() order by created_at,id for update skip locked limit 1"))[0];
  if(!job)return false;await db.query('savepoint private_assignment');
  try{const result=await assign(db,job);
   await db.query('update invoice_submissions set internal_result=$2,payload_box=null,delivery_attempts=delivery_attempts+1 where id=$1',[job.id,result]);
   await event(db,job.app_id,job.id,result);
  }catch{
   await db.query('rollback to savepoint private_assignment');const dead=job.delivery_attempts>=4;
   await db.query("update invoice_submissions set internal_result=$2,delivery_attempts=delivery_attempts+1,delivery_at=now()+interval '30 seconds',payload_box=case when $3 then null else payload_box end where id=$1",[job.id,dead?'DELIVERY_FAILED':'RETRY',dead]);
   await event(db,job.app_id,job.id,dead?'DELIVERY_FAILED':'DELIVERY_RETRY');
  }return true;
 });
}
async function overview(account) {
 const partners=await rows({query},'select p.id,p.name,p.verification_state,p.terms_version,p.terms_accepted_at,m.role from invoice_partners p join invoice_members m on m.partner_id=p.id where m.customer_id=$1',[account.id]);
 const apps=await rows({query},`select a.id,a.partner_id,a.name,a.environment,a.active,a.listed from invoice_apps a join invoice_members m on m.partner_id=a.partner_id where m.customer_id=$1 order by a.created_at`,[account.id]);
 for(const app of apps) {
  app.keys=await rows({query},'select id,prefix,scopes,expires_at,revoked_at from invoice_keys where app_id=$1 order by created_at desc limit 30',[app.id]);
  app.homologations=await rows({query},'select id,state,decision_code,created_at from invoice_homologations where app_id=$1 order by created_at desc limit 5',[app.id]);
  app.merchants=await rows({query},'select m.tax_id,m.name,x.revoked_at,x.expires_at from invoice_authorizations x join invoice_merchants m on m.id=x.merchant_id where x.app_id=$1',[app.id]);
  app.metrics=await rows({query},'select state,count(*)::int count from invoice_submissions where app_id=$1 group by state',[app.id]);
  app.receipts=(await rows({query},'select id,state,technical_code,public_ready_at from invoice_submissions where app_id=$1 order by created_at desc limit 20',[app.id])).map(publicReceipt);
 }
 return {partners,apps,production_available:false,environment:'sandbox'};
}
async function catalog() { return {integrations:await rows({query},`select a.id,a.name,p.name partner from invoice_apps a join invoice_partners p on p.id=a.partner_id
 where a.active and a.listed and p.verification_state<>'REVOKED' order by a.created_at desc limit 100`)}; }
async function consentState(account) {
 return {policy:CONSENT,categories:finance.CATEGORIES,identity_verified:(await rows({query},'select i.id from invoice_identity_attestations i join customer_accounts a on a.id=i.customer_id where i.customer_id=$1 and i.revoked_at is null and i.expires_at>now() and a.is_active and not a.document_review_required',[account.id])).length>0,
 consents:await rows({query},`select c.id,c.app_id,a.name app_name,c.book_id,c.merchant_id,c.text_version,c.granted_at,c.revoked_at from invoice_consents c join invoice_apps a on a.id=c.app_id
 where c.customer_id=$1 order by c.granted_at desc limit 100`,[account.id])};
}
async function grant(account,data) {
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  const verified=(await rows(db,`select i.id from invoice_identity_attestations i join customer_accounts a on a.id=i.customer_id
   where i.customer_id=$1 and ($2::uuid is null or i.id=$2) and i.revoked_at is null and i.expires_at>now() and a.is_active and not a.document_review_required for share of i`,[account.id,data.identity_id||null]))[0];
  if(!verified)throw fault(409,'VERIFIED_IDENTITY_REQUIRED');
  const app=(await rows(db,"select a.id from invoice_apps a join invoice_partners p on p.id=a.partner_id where a.id=$1 and a.active and p.verification_state<>'REVOKED' for share of a,p",[data.app_id]))[0];
  if(!app)throw fault(404,'NOT_FOUND');await books.own(account,data.book_id,db);
  if(data.merchant_id&&!(await db.query('select 1 from invoice_authorizations where app_id=$1 and merchant_id=$2 and revoked_at is null and expires_at>now()',[data.app_id,data.merchant_id])).rowCount)throw fault(404,'NOT_FOUND');
  const prior=(await rows(db,'select * from invoice_consents where customer_id=$1 and app_id=$2 and revoked_at is null',[account.id,data.app_id]))[0];
  if(prior&&prior.text_version===CONSENT.version&&prior.book_id===data.book_id&&(prior.merchant_id||null)===(data.merchant_id||null)&&prior.identity_id===verified.id)return {consent:{id:prior.id,book_id:prior.book_id,granted_at:prior.granted_at}};
  if(prior)await db.query('update invoice_consents set revoked_at=now() where id=$1',[prior.id]);
  const c=(await rows(db,`insert into invoice_consents(customer_id,app_id,identity_id,book_id,text_version,text_hash,purposes,channel)
   values($1,$2,$3,$4,$5,$6,$7,$8) returning id,book_id,granted_at`,[account.id,data.app_id,verified.id,data.book_id,CONSENT.version,hash(CONSENT.text),CONSENT.purposes,CONSENT.channel]))[0];
  if(data.merchant_id)await db.query('update invoice_consents set merchant_id=$2 where id=$1',[c.id,data.merchant_id]);
  await event(db,data.app_id,null,'CONSENT_GRANTED',account.id,c.id);return {consent:c};
 });
}
async function revoke(account,id) {
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  const c=(await rows(db,'update invoice_consents set revoked_at=coalesce(revoked_at,now()) where id=$1 and customer_id=$2 returning app_id',[id,account.id]))[0];
  if(!c)throw fault(404,'NOT_FOUND');await event(db,c.app_id,null,'CONSENT_REVOKED',account.id,id);return {ok:true};
 });
}
function readable(row) {
 const {normalized}=unseal(row.content_box,row.id);
 const {buyer,buyer_hmac,buyer_hmacs,id:number,...safe}=normalized;
 return {...safe,id:row.id,number,book_id:row.book_id,received_at:row.created_at,related_document_id:row.related_document_id,entry_id:row.entry_id||null};
}
async function documents(account,offset=0) {
 const list=await rows({query},`select d.*,r.entry_id from invoice_documents d left join invoice_reconciliations r on r.document_id=d.id
 where d.customer_id=$1 and d.content_box is not null order by d.created_at desc,d.id limit 30 offset $2`,[account.id,offset]);
 return {documents:list.map(readable),next_offset:list.length===30?offset+30:null};
}
async function document(account,id,db={query}) {
 const r=(await rows(db,'select d.*,r.entry_id from invoice_documents d left join invoice_reconciliations r on r.document_id=d.id where d.id=$1 and d.customer_id=$2',[id,account.id]))[0];
 if(!r)throw fault(404,'NOT_FOUND');if(!r.content_box)throw fault(410,'DOCUMENT_REMOVED');return r;
}
async function reconcile(account,id,entryId) {
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  const d=await require('./customer').privateDocument(account,id,db);
  const e=(await rows(db,"select * from customer_entries where id=$1 and customer_id=$2 and deleted_at is null and kind='EXPENSE' for update",[entryId,account.id]))[0];
  if(!e||e.book_id!==d.book_id||e.currency!==d.currency||d.document_type!=='Invoice'||finance.minor(e.amount)!==Number(d.payable_minor))throw fault(409,'RECONCILIATION_MISMATCH');
  const prior=(await rows(db,'select document_id,entry_id from invoice_reconciliations where document_id=$1 or entry_id=$2',[id,entryId]))[0];
  if(prior){if(prior.document_id===id&&prior.entry_id===entryId)return {ok:true};throw fault(409,'ALREADY_RECONCILED');}
  await db.query('insert into invoice_reconciliations(document_id,customer_id,entry_id) values($1,$2,$3)',[id,account.id,entryId]);
  return {ok:true};
 });
}
async function exportData(account) {
 const docs=await rows({query},'select d.* from invoice_documents d join invoice_consents c on c.id=d.consent_id join invoice_identity_attestations i on i.id=c.identity_id join customer_accounts a on a.id=d.customer_id where d.customer_id=$1 and d.content_box is not null and i.revoked_at is null and i.expires_at>now() and a.is_active and not a.document_review_required order by d.created_at,d.id',[account.id]);
 return {policy:CONSENT,consents:(await consentState(account)).consents,documents:docs.map(d=>({
  ...readable(d),original_xml:unseal(d.content_box,d.id).xml
 })),categorization_overrides:await rows({query},'select document_id,line_id,original_value,normalized_value,user_override,extraction_method,confidence,revision from invoice_overrides where customer_id=$1 and document_id=any($2::uuid[])',[account.id,docs.map(d=>d.id)]),
 privacy_requests:await rows({query},'select id,kind,state,resolution_code,created_at,resolved_at from invoice_requests where customer_id=$1',[account.id])};
}
module.exports={CONSENT,register,createApp,listing,exportData,createKey,revokeKey,authorizeFixture,machine,receive,receipt,processOne,processDelivery,ownApp,event,
 overview,catalog,consentState,grant,revoke,documents,document,readable,reconcile};


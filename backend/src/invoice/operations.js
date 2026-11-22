const crypto=require('node:crypto'),{query,withTransaction}=require('../config/db');
const svc=require('./service'),{seal,unseal,hash,fault}=require('./config');
const TERMS={version:'developer-sandbox-draft-1',text:'Prueba técnica con datos sintéticos. No autoriza producción ni sustituye contratos, aprobación de emisores o revisión jurídica. Se conservan acuses mínimos y se excluyen publicidad y explotación del historial financiero.'};
const rows=async(db,sql,args=[])=> (await db.query(sql,args)).rows;
async function owner(db,account,partnerId) {
 const p=(await rows(db,"select p.* from invoice_partners p join invoice_members m on m.partner_id=p.id where p.id=$1 and m.customer_id=$2 and m.role='OWNER' for update of p",[partnerId,account.id]))[0];
 if(!p)throw fault(404,'NOT_FOUND');return p;
}
async function audit(db,type,actor,{app=null,object=null,details={}}={}) {
 await db.query('insert into invoice_events(event_type,app_id,object_id,actor_customer_id,actor_admin_id,details) values($1,$2,$3,$4,$5,$6::jsonb)',
 [type,app,object,actor.customer_id||null,actor.admin_id||null,JSON.stringify(details)]);
}
async function profile(account,partnerId,data) {
 return withTransaction(async db=>{await owner(db,account,partnerId);
  await db.query('update invoice_partners set profile_box=$2,terms_version=$3,terms_hash=$4,terms_accepted_at=now() where id=$1',[partnerId,seal(data,partnerId),TERMS.version,hash(TERMS.text)]);
  await audit(db,'PROFILE_UPDATED',{customer_id:account.id},{object:partnerId});return {ok:true,production_available:false};
 });
}
async function lifecycle(account,appId,active) {
 return withTransaction(async db=>{const app=await svc.ownApp(db,account,appId,{lock:true});
  if(active&&app.blocked_at)throw fault(403,'ADMIN_BLOCK');
  await db.query('update invoice_apps set active=$2 where id=$1',[appId,active]);
  if(!active)await db.query('update invoice_keys set revoked_at=coalesce(revoked_at,now()) where app_id=$1',[appId]);
  await audit(db,active?'APP_ACTIVATED':'APP_REVOKED',{customer_id:account.id},{app:appId});return {ok:true};
 });
}
async function invite(account,partnerId,role) {
 return withTransaction(async db=>{await owner(db,account,partnerId);
  const n=(await rows(db,"select count(*)::int n from invoice_member_invites where partner_id=$1 and expires_at>now() and consumed_at is null and revoked_at is null",[partnerId]))[0].n;
  if(n>=10)throw fault(429,'INVITE_LIMIT');
  const token=crypto.randomBytes(32).toString('base64url');
  const r=(await rows(db,"insert into invoice_member_invites(partner_id,token_hash,role,expires_at) values($1,$2,$3,now()+interval '1 day') returning id,expires_at",[partnerId,hash(token),role]))[0];
  await audit(db,'MEMBER_INVITED',{customer_id:account.id},{object:r.id,details:{role}});
  return {invite:r,invitation_token:token};
 });
}
async function acceptInvite(account,token) {
 return withTransaction(async db=>{
  const candidate=(await rows(db,'select partner_id from invoice_member_invites where token_hash=$1',[hash(token)]))[0];
  if(!candidate)throw fault(404,'NOT_FOUND');
  await db.query('select id from invoice_partners where id=$1 for update',[candidate.partner_id]);
  const i=(await rows(db,'select * from invoice_member_invites where token_hash=$1 and expires_at>now() and consumed_at is null and revoked_at is null for update',[hash(token)]))[0];
  if(!i)throw fault(404,'NOT_FOUND');
  // An invitation cannot silently promote an existing member.
  await db.query('insert into invoice_members(partner_id,customer_id,role) values($1,$2,$3) on conflict do nothing',[i.partner_id,account.id,i.role]);
  await db.query('update invoice_member_invites set consumed_at=now() where id=$1',[i.id]);
  await audit(db,'MEMBER_JOINED',{customer_id:account.id},{object:i.partner_id});return {ok:true};
 });
}
async function members(account,partnerId) {
 return withTransaction(async db=>{await owner(db,account,partnerId);return {members:await rows(db,'select customer_id,role from invoice_members where partner_id=$1',[partnerId]),
 invites:await rows(db,'select id,role,expires_at,consumed_at,revoked_at from invoice_member_invites where partner_id=$1 order by created_at desc limit 30',[partnerId])};});
}
async function removeMember(account,partnerId,id) {
 return withTransaction(async db=>{await owner(db,account,partnerId);
  const m=(await rows(db,'select role from invoice_members where partner_id=$1 and customer_id=$2',[partnerId,id]))[0];if(!m)throw fault(404,'NOT_FOUND');
  if(m.role==='OWNER'&&(await rows(db,"select count(*)::int n from invoice_members where partner_id=$1 and role='OWNER'",[partnerId]))[0].n<=1)throw fault(409,'LAST_OWNER');
  await db.query('delete from invoice_members where partner_id=$1 and customer_id=$2',[partnerId,id]);
  await audit(db,'MEMBER_REMOVED',{customer_id:account.id},{object:partnerId});return {ok:true};
 });
}
async function cancelInvite(account,partnerId,id) {
 return withTransaction(async db=>{await owner(db,account,partnerId);
 const r=await db.query('update invoice_member_invites set revoked_at=coalesce(revoked_at,now()) where id=$1 and partner_id=$2',[id,partnerId]);
 if(!r.rowCount)throw fault(404,'NOT_FOUND');await audit(db,'INVITE_REVOKED',{customer_id:account.id},{object:id});return {ok:true};});
}
async function homologate(account,appId,checklist) {
 return withTransaction(async db=>{const app=await svc.ownApp(db,account,appId,{lock:true});
  const partner=(await rows(db,'select terms_accepted_at from invoice_partners where id=$1',[app.partner_id]))[0];
  if(!partner.terms_accepted_at)throw fault(409,'PROFILE_REQUIRED');
  const submission=(await rows(db,"insert into invoice_homologations(app_id,requested_by,checklist) values($1,$2,$3::jsonb) on conflict(app_id) where state='PENDING' do update set app_id=excluded.app_id returning id,state",[appId,account.id,JSON.stringify(checklist)]))[0];
  await audit(db,'HOMOLOGATION_REQUESTED',{customer_id:account.id},{app:appId,object:submission.id});return {...submission,production_enabled:false};
 });
}
async function metrics(account,appId,{from,to}) {
 await svc.ownApp({query},account,appId,{owner:false});
 return {usage:await rows({query},`select (created_at at time zone 'UTC')::date::text as "day",state,count(*)::int count,
 coalesce(sum(payload_bytes),0)::text bytes,coalesce(round(avg(processed_ms)),0)::int processing_ms
 from invoice_submissions where app_id=$1 and created_at>=$2::date and created_at<($3::date+1) group by 1,2 order by 1`,[appId,from,to]),
 logs:await rows({query},`select event_type,submission_id,created_at from invoice_events where app_id=$1 and created_at>=$2::date and created_at<($3::date+1)
 and event_type in ('ACCEPTED','PROCESSED','REJECTED','RETRY','KEY_CREATED','KEY_REVOKED','APP_REVOKED','APP_ACTIVATED','HOMOLOGATION_REQUESTED')
 order by created_at desc limit 100`,[appId,from,to])};
}
async function sandboxRun(account,appId,scenario,key) {
 await svc.ownApp({query},account,appId);
 const {fixture}=require('./sandboxFixture');
 const options={id:'SANDBOX-'+key,buyer:scenario==='no-consent'?'SANDBOXUNKNOWN001':'SANDBOXBUYER001'};
 if(scenario==='credit'){options.type='CreditNote';options.related='SANDBOX-001';}
 const xml=scenario==='malformed'?'<Invoice>':fixture(options);
 const credential=await svc.createKey(account,appId);
 try {
  const token=await require('./oauth').issue(credential.client_id,credential.client_secret);
  return await svc.receive(await svc.machine(token.access_token,'invoices:write'),key,{issuer_nit:'900000000',xml});
 }finally{await svc.revokeKey(account,appId,credential.key.id);}
}
async function adminOverview() {
 return {production_enabled:false,
 apps:await rows({query},'select a.id,a.name,a.active,a.blocked_at,p.name partner,p.verification_state,a.hourly_quota from invoice_apps a join invoice_partners p on p.id=a.partner_id order by a.created_at desc limit 100'),
 reviews:await rows({query},'select id,app_id,state,checklist,decision_code,created_at,reviewed_at from invoice_homologations order by created_at desc limit 100'),
 requests:await rows({query},'select id,kind,state,created_at from invoice_requests order by created_at desc limit 100'),
 incidents:await rows({query},"select id,app_id,state,internal_result,attempts,delivery_attempts from invoice_submissions where state='DEAD' or internal_result in ('CONFLICT_REVIEW','DELIVERY_FAILED') order by created_at desc limit 100")};
}
async function decision(admin,id,data) {
 return withTransaction(async db=>{
  const r=(await rows(db,"update invoice_homologations set state=$2,decision_code=$3,reviewed_by=$4,reviewed_at=now() where id=$1 and state='PENDING' returning app_id",[id,data.state,data.code,admin.id]))[0];
  if(!r)throw fault(409,'REVIEW_STATE_CHANGED');
  await audit(db,'HOMOLOGATION_REVIEWED',{admin_id:admin.id},{app:r.app_id,object:id,details:{state:data.state,code:data.code}});
  return {ok:true,production_enabled:false,remaining_gates:['IDENTITY_PROVIDER','DIAN_EVIDENCE','LEGAL_REVIEW','SECURITY_REVIEW','EXPLICIT_DEPLOYMENT_APPROVAL']};
 });
}
async function block(admin,appId,blocked) {
 return withTransaction(async db=>{
  const r=await db.query('update invoice_apps set active=false,blocked_at=case when $2 then now() else null end where id=$1',[appId,blocked]);
  if(!r.rowCount)throw fault(404,'NOT_FOUND');await db.query('update invoice_keys set revoked_at=coalesce(revoked_at,now()) where app_id=$1',[appId]);
  await audit(db,blocked?'ADMIN_BLOCKED':'ADMIN_UNBLOCKED',{admin_id:admin.id},{app:appId});return {ok:true,active:false};
 });
}
async function requestDecision(admin,id,state,code) {
 return withTransaction(async db=>{
  const request=(await rows(db,'select * from invoice_requests where id=$1 for update',[id]))[0];
  if(!request)throw fault(404,'NOT_FOUND');
  if(state==='RESOLVED'&&request.kind==='DELETION'){
   const doc=(await rows(db,'select id,legal_hold,retain_until from invoice_documents where id=$1 and customer_id=$2 for update',[request.document_id,request.customer_id]))[0];
   if(!doc||doc.legal_hold||new Date(doc.retain_until)>new Date())throw fault(409,'RETENTION_REQUIRED');
   await db.query('update invoice_documents set content_box=null,redacted_at=now() where id=$1',[doc.id]);
   for(const table of ['invoice_overrides','invoice_notices','invoice_reconciliations'])await db.query('delete from '+table+' where document_id=$1',[doc.id]);
   // Keep only a non-content fiscal fingerprint to prevent an automatic reimport after deletion.
   await audit(db,'DOCUMENT_REDACTED',{admin_id:admin.id},{object:doc.id});
  }
  if(state==='RESOLVED'&&request.kind.startsWith('IDENTITY'))throw fault(409,'IDENTITY_PROVIDER_REQUIRED');
  const r=await db.query("update invoice_requests set state=$2,resolution_code=$3,resolved_at=case when $2 in ('RESOLVED','REJECTED') then now() else null end where id=$1 and state in ('PENDING','REVIEW')",[id,state,code]);
  if(!r.rowCount)throw fault(409,'REVIEW_STATE_CHANGED');
  await audit(db,'PRIVACY_REVIEWED',{admin_id:admin.id},{object:id,details:{state,code}});
  return {ok:true,identity_verified:false};
 });
}
async function retention() {
 // Configurable sandbox retention, not a claim about legal retention periods.
 const days=Number(process.env.QORI_INVOICE_QUEUE_TTL_MINUTES||15);
 if(!Number.isInteger(days)||days<5||days>60)throw fault(503,'CONFIGURATION_REQUIRED');
 return withTransaction(async db=>{
  await db.query("delete from invoice_access_tokens where expires_at<now()-interval '1 day'");
  const expired=await db.query(`update invoice_submissions set payload_box=null,internal_result='EXPIRED',
   state=case when state in ('QUEUED','RETRY') then 'DEAD' else state end,technical_code=case when state in ('QUEUED','RETRY') then 'PROCESSING_FAILED' else technical_code end
   where payload_box is not null and created_at<now()-($1::int*interval '1 minute')`,[days]);
  // Stored originals require a reviewed privacy request and no hold; no automatic destructive purge.
  return {expired_payloads:expired.rowCount};
 });
}
module.exports={TERMS,profile,lifecycle,invite,acceptInvite,members,removeMember,cancelInvite,homologate,metrics,sandboxRun,adminOverview,decision,block,requestDecision,retention};

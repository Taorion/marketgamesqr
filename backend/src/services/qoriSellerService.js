const crypto=require('crypto');
const bcrypt=require('bcryptjs');
const {z}=require('zod');
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {badRequest,forbidden,notFound}=require('../utils/http');
const {validate}=require('../utils/validators');
const {VERSION,CIIU,classificationReady}=require('./qoriSellerPolicy');
function requireClassification(){if(!classificationReady())throw badRequest('Qori debe definir el requisito CIIU antes de habilitar nuevas postulaciones y aprobaciones.');}
const kinds=['IDENTITY','RUT','BANK','CONTRACT'];
function documentation(a,docs){const missing=kinds.filter(k=>!docs.some(d=>d.kind===k));return {missing,attention:missing.length>0||a?.approval_mode==='ADMIN_OVERRIDE',override:a?.approval_mode==='ADMIN_OVERRIDE'};}
const uuid=z.string().uuid();
const text=n=>z.string().trim().max(n);
function superadmin(u){if((u.platform_role||u.role)!=='QORI_SUPERADMIN')throw forbidden('Solo Qori Superadmin puede revisar documentos y registrar pagos.');}
async function audit(db,user,action,id,detail={}){await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,'seller',$3,$4::jsonb)",[user.id,action,id,JSON.stringify(detail)]);}
async function requireApproved(user,db={query}){
 if(!['QORI_SELLER','QORI_SUPERADMIN'].includes(user.platform_role||user.role))throw forbidden('Necesitas acceso Qori Seller.');
 if((user.platform_role||user.role)==='QORI_SUPERADMIN')return;
 const a=(await db.query('select a.status,u.password_setup_required from qori_seller_applications a join app_users u on u.id=a.user_id where a.user_id=$1',[user.id])).rows[0];
 if(a?.status!=='APPROVED'||a.password_setup_required){
  const error=forbidden('Tu acceso a Qori Seller está bloqueado hasta que Qori apruebe tu solicitud de Embajador.');
  error.details={code:'SELLER_APPROVAL_REQUIRED',application_status:a?.status||'NOT_STARTED'};throw error;
 }
}
function encryptionKey(){return crypto.createHash('sha256').update('qori-seller-document-v1\0'+(process.env.SELLER_DOCUMENT_ENCRYPTION_KEY||env.jwtSecret)).digest();}
function encrypt(bytes){const nonce=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),nonce);return Buffer.concat([nonce,cipher.update(bytes),cipher.final(),cipher.getAuthTag()]);}
function decrypt(bytes){const d=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),bytes.subarray(0,12));d.setAuthTag(bytes.subarray(-16));return Buffer.concat([d.update(bytes.subarray(12,-16)),d.final()]);}
function validDocument(bytes){
 if(bytes.subarray(0,5).toString()==='%PDF-' && bytes.subarray(-2048).includes(Buffer.from('%%EOF')))return 'application/pdf';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 throw badRequest('Carga un PDF, JPG o PNG válido.');
}
async function register(payload,ip){
 requireClassification();
 const d=validate(z.object({full_name:text(160).min(5),email:z.string().trim().email().max(180),password:z.string().min(12).max(120),password_confirm:z.string().min(12).max(120),document_key:z.string().trim().regex(/^\d{5,15}$/),phone:text(40).min(7),city:text(120).min(2),ciiu:z.literal(CIIU.code).default(CIIU.code),terms_accepted:z.literal(true),privacy_accepted:z.literal(true),adult_confirmed:z.literal(true)}).strict().refine(d=>d.password===d.password_confirm,'Las contraseñas no coinciden.'),payload);
 const passwordHash=await bcrypt.hash(d.password,12);
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['signup-email:'+d.email.toLowerCase()]);
  if((await db.query('select 1 from app_users where lower(email)=lower($1)',[d.email])).rowCount)throw badRequest('Este correo ya tiene cuenta. Inicia sesión o solicita a Qori habilitar el perfil Seller.');
  if((await db.query('select 1 from qori_seller_applications where document_key=$1',[d.document_key])).rowCount)throw badRequest('Ya existe una solicitud con ese documento. Recupera tu cuenta.');
  const u=(await db.query("insert into app_users(email,password_hash,full_name,role,is_active) values(lower($1),$2,$3,'QORI_SELLER',true) returning id",[d.email,passwordHash,d.full_name])).rows[0];
  await db.query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,accepted_ip) values($1,$2,$3,$4,$5,$6,$7)",[u.id,d.document_key,d.phone,d.city,d.ciiu,VERSION,ip]);
  await db.query('insert into qori_sales_profiles(user_id,phone,created_by) values($1,$2,$1)',[u.id,d.phone]);
  await audit(db,u,'SELLER_APPLICATION_CREATED',u.id,{terms_version:VERSION,privacy_accepted:true,adult_confirmed:true});
  return {ok:true,message:'Cuenta de postulación creada. Inicia sesión para descargar el contrato y completar tus documentos.'};
 });
}
async function application(user){
 const a=(await query('select user_id,document_key,phone,city,ciiu,status,approval_mode,terms_version,accepted_at,review_note,submitted_at,reviewed_at from qori_seller_applications where user_id=$1',[user.id])).rows[0]||null;
 const docs=(await query('select id,kind,filename,mime_type,byte_size,sha256,created_at from qori_seller_documents where user_id=$1 order by kind',[user.id])).rows;
 return {ciiu_requirement:CIIU,terms_version:VERSION,application:a,documents:docs,documentation:documentation(a,docs),user:{id:user.id,full_name:user.full_name,email:user.email,role:user.platform_role||user.role},legacy:!a,access:{approved:(user.platform_role||user.role)==='QORI_SUPERADMIN'||a?.status==='APPROVED',application_status:a?.status||'NOT_STARTED'}};
}
async function openApplication(user,payload,ip){
 if((user.platform_role||user.role)!=='QORI_SELLER')throw forbidden('Este expediente corresponde a una cuenta Seller.');
 requireClassification();
 const d=validate(z.object({document_key:z.string().trim().regex(/^\d{5,15}$/),phone:text(40).min(7),city:text(120).min(2),ciiu:z.literal(CIIU.code).default(CIIU.code),terms_accepted:z.literal(true),privacy_accepted:z.literal(true),adult_confirmed:z.literal(true)}).strict(),payload);
 return withTransaction(async db=>{
  await db.query('select id from app_users where id=$1 for update',[user.id]);
  if((await db.query('select 1 from qori_seller_applications where user_id=$1',[user.id])).rowCount)throw badRequest('Ya tienes un expediente abierto.');
  await db.query('insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,accepted_ip) values($1,$2,$3,$4,$5,$6,$7)',[user.id,d.document_key,d.phone,d.city,d.ciiu,VERSION,ip]);
  await audit(db,user,'SELLER_APPLICATION_CREATED',user.id,{terms_version:VERSION,privacy_accepted:true,adult_confirmed:true});
  return {ok:true};
 });
}
async function upload(user,kind,payload){
 return uploadDocument(user,user.id,kind,payload,false);
}
async function adminUpload(user,id,kind,payload){
 superadmin(user);validate(uuid,id);
 if(id===user.id)throw forbidden('No puedes gestionar tu propio expediente.');
 return uploadDocument(user,id,kind,payload,true);
}
async function uploadDocument(user,id,kind,payload,administrative){
 if(!kinds.includes(kind))throw badRequest('Tipo de documento inválido.');
 const fields={filename:text(160).min(3),content_base64:z.string().min(16).max(11184816)};
 if(administrative)fields.expected_sha256=z.string().regex(/^[a-f0-9]{64}$/).nullable();
 const d=validate(z.object(fields).strict(),payload);
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(d.content_base64))throw badRequest('Archivo inválido.');
 const bytes=Buffer.from(d.content_base64,'base64');if(bytes.length>8*1024*1024)throw badRequest('El límite es 8 MB por documento.');
 const mime=validDocument(bytes),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 return withTransaction(async db=>{
  if(administrative){const target=(await db.query('select role,platform_role from app_users where id=$1 for update',[id])).rows[0];if(!target||(target.platform_role||target.role)!=='QORI_SELLER')throw forbidden('Selecciona una cuenta con perfil Qori Seller vigente.');}
  const a=(await db.query('select status,approval_mode from qori_seller_applications where user_id=$1 for update',[id])).rows[0];
  if(!a||!(['DRAFT','CHANGES_REQUESTED'].includes(a.status)||(administrative&&a.status==='SUBMITTED')||(a.status==='APPROVED'&&a.approval_mode==='ADMIN_OVERRIDE')))throw forbidden('La carga requiere un expediente por completar, con correcciones o con alta documental pendiente. Para cambiar documentos ya aprobados, solicita correcciones primero.');
  const previous=(await db.query('select id,sha256 from qori_seller_documents where user_id=$1 and kind=$2',[id,kind])).rows[0];
  if(administrative&&d.expected_sha256!==(previous?.sha256||null)){const error=badRequest('Otro integrante actualizó este documento. Abre de nuevo el expediente antes de reemplazarlo.');error.status=409;throw error;}
  await db.query(`insert into qori_seller_documents(user_id,kind,filename,mime_type,byte_size,sha256,encrypted_content)
   values($1,$2,$3,$4,$5,$6,$7) on conflict(user_id,kind) do update set filename=excluded.filename,mime_type=excluded.mime_type,byte_size=excluded.byte_size,sha256=excluded.sha256,encrypted_content=excluded.encrypted_content,created_at=now()`,
   [id,kind,d.filename.replace(/[^\p{L}\p{N} ._()-]/gu,'_'),mime,bytes.length,hash,encrypt(bytes)]);
  await db.query("update qori_seller_applications set status=case when status='SUBMITTED' then 'DRAFT' else status end,submitted_at=null,updated_at=now() where user_id=$1",[id]);
  await audit(db,user,administrative?'SELLER_DOCUMENT_ADMIN_UPLOADED':'SELLER_DOCUMENT_UPLOADED',id,{kind,sha256:hash,previous_sha256:previous?.sha256||null,byte_size:bytes.length,source:administrative?'ADMIN':'SELLER'});
  return {ok:true};
 });
}
async function adminSubmit(user,id,payload){
 superadmin(user);validate(uuid,id);requireClassification();
 if(id===user.id)throw forbidden('No puedes gestionar tu propio expediente.');
 const d=validate(z.object({documents_received:z.literal(true),signed_and_notarized:z.literal(true),note:text(2000).min(15),document_hashes:z.object(Object.fromEntries(kinds.map(k=>[k,z.string().regex(/^[a-f0-9]{64}$/)]))).strict()}).strict(),payload);
 return withTransaction(async db=>{
  const target=(await db.query('select role,platform_role from app_users where id=$1 for update',[id])).rows[0];
  if(!target||(target.platform_role||target.role)!=='QORI_SELLER')throw forbidden('Selecciona una cuenta con perfil Qori Seller vigente.');
  const a=(await db.query('select * from qori_seller_applications where user_id=$1 for update',[id])).rows[0];
  if(!a||!(['DRAFT','CHANGES_REQUESTED'].includes(a.status)||(a.status==='APPROVED'&&a.approval_mode==='ADMIN_OVERRIDE')))throw badRequest('Este expediente no admite un nuevo envío.');
  const pendingActivation=await pendingManualActivation(db,id,a);
  if(a.ciiu!==CIIU.code||(a.terms_version!==VERSION&&!pendingActivation))throw badRequest('El vendedor debe aceptar las condiciones vigentes desde su cuenta antes de enviar este expediente.');
  const docs=(await db.query('select kind,sha256 from qori_seller_documents where user_id=$1',[id])).rows;
  if(kinds.some(k=>!docs.some(doc=>doc.kind===k)))throw badRequest('Adjunta cédula, RUT, certificado bancario y contrato firmado y autenticado.');
  if(docs.some(doc=>d.document_hashes[doc.kind]!==doc.sha256)){const error=badRequest('Los documentos cambiaron. Abre de nuevo el expediente antes de enviarlo.');error.status=409;throw error;}
  await db.query("update qori_seller_applications set status=case when status='APPROVED' then 'APPROVED' else 'SUBMITTED' end,submitted_at=now(),updated_at=now() where user_id=$1",[id]);
  await audit(db,user,'SELLER_APPLICATION_ADMIN_SUBMITTED',id,{note:d.note,documents:docs,documents_received:true,signed_and_notarized:true,terms_version:a.terms_version,pending_electronic_acceptance:pendingActivation,source:'ADMIN'});
  return {ok:true};
 });
}
async function document(user,id){
 validate(uuid,id);
 return withTransaction(async db=>{
  const row=(await db.query('select * from qori_seller_documents where id=$1',[id])).rows[0];
  if(!row)throw notFound('Documento no encontrado.');
  if(row.user_id!==user.id)superadmin(user);
  await audit(db,user,'SELLER_DOCUMENT_DOWNLOADED',row.user_id,{document_id:row.id,kind:row.kind});
  return {filename:row.filename,mime:row.mime_type,bytes:decrypt(row.encrypted_content)};
 });
}
async function submit(user,payload,ip){
 requireClassification();
 validate(z.object({signed_and_notarized:z.literal(true),documents_truthful:z.literal(true),ciiu_terms_accepted:z.literal(true)}).strict(),payload);
 return withTransaction(async db=>{
  const a=(await db.query('select * from qori_seller_applications where user_id=$1 for update',[user.id])).rows[0];
  if(!a||!(['DRAFT','CHANGES_REQUESTED'].includes(a.status)||(a.status==='APPROVED'&&a.approval_mode==='ADMIN_OVERRIDE')))throw badRequest('Esta solicitud no admite un nuevo envío.');
  const docs=(await db.query('select kind,sha256 from qori_seller_documents where user_id=$1',[user.id])).rows;
  if(kinds.some(k=>!docs.some(d=>d.kind===k)))throw badRequest('Debes cargar cédula, RUT, certificado bancario y contrato firmado y autenticado.');
  await db.query("update qori_seller_applications set status=case when status='APPROVED' and approval_mode='ADMIN_OVERRIDE' then 'APPROVED' else 'SUBMITTED' end,ciiu=$2,terms_version=$3,accepted_at=now(),accepted_ip=$4,submitted_at=now(),updated_at=now() where user_id=$1",[user.id,CIIU.code,VERSION,ip||null]);
  await audit(db,user,'SELLER_APPLICATION_SUBMITTED',user.id,{documents:docs,terms_version:VERSION,ciiu:CIIU.code,previous_ciiu:a.ciiu,previous_terms_version:a.terms_version,ciiu_terms_accepted:true});
  return {ok:true};
 });
}
async function pendingManualActivation(db,id,a){
 if(a.terms_version!=='PENDING_ACTIVATION'||a.accepted_at)return false;
 return Boolean((await db.query('select 1 from app_users u join qori_seller_activations t on t.user_id=u.id where u.id=$1 and u.password_setup_required and t.completed_at is null',[id])).rowCount);
}
async function review(user,id,payload){
 superadmin(user);validate(uuid,id);
 const d=validate(z.object({status:z.enum(['APPROVED','CHANGES_REQUESTED','REJECTED','SUSPENDED']),note:text(2000).min(15),identity_checked:z.boolean().default(false),ciiu_checked:z.boolean().default(false),bank_ownership_checked:z.boolean().default(false),notarized_contract_checked:z.boolean().default(false),legal_terms_checked:z.boolean().default(false)}).strict(),payload);
 return withTransaction(async db=>{
  const a=(await db.query('select * from qori_seller_applications where user_id=$1 for update',[id])).rows[0];
  if(!a||id===user.id)throw badRequest('Solicitud no disponible para revisión.');
  if(d.status==='APPROVED'){
   requireClassification();
   if(a.status!=='SUBMITTED'&&!(a.status==='APPROVED'&&a.approval_mode==='ADMIN_OVERRIDE'&&a.submitted_at))throw badRequest('Solo se aprueban solicitudes enviadas a revisión.');
   if(a.ciiu!==CIIU.code||(a.terms_version!==VERSION&&!await pendingManualActivation(db,id,a)))throw badRequest('Solicita correcciones: el postulante debe aceptar el requisito CIIU definido por Qori y presentar el contrato actualizado.');
   if(![d.identity_checked,d.ciiu_checked,d.bank_ownership_checked,d.notarized_contract_checked,d.legal_terms_checked].every(Boolean))throw badRequest('Verifica identidad, CIIU 4610 en el RUT, titularidad bancaria, autenticación notarial y condiciones contractuales.');
   if((await db.query('select count(*)::int n from qori_seller_documents where user_id=$1',[id])).rows[0].n!==4)throw badRequest('La documentación está incompleta.');
  }else if(d.status==='SUSPENDED'&&a.status!=='APPROVED')throw badRequest('Solo puedes suspender un Embajador aprobado.');
  await db.query("update qori_seller_applications set status=$2,approval_mode=case when $2='APPROVED' then 'DOCUMENTS' else approval_mode end,review_note=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now() where user_id=$1",[id,d.status,d.note,user.id]);
  await audit(db,user,'SELLER_APPLICATION_'+d.status,id,{...d,pending_electronic_acceptance:await pendingManualActivation(db,id,a)});
  return {ok:true};
 });
}
async function authorizeAccess(user,id,payload){
 superadmin(user);validate(uuid,id);
 const d=validate(z.object({note:text(2000).min(15),acknowledge_pending_documents:z.literal(true)}).strict(),payload);
 return withTransaction(async db=>{
  const target=(await db.query('select id,role,platform_role,is_active from app_users where id=$1 for update',[id])).rows[0];
  if(!target||id===user.id||(target.platform_role||target.role)!=='QORI_SELLER')throw badRequest('Selecciona una cuenta con perfil Qori Seller vigente.');
  const a=(await db.query('select * from qori_seller_applications where user_id=$1 for update',[id])).rows[0];
  if(!a)throw badRequest('El vendedor debe iniciar su expediente antes del alta.');
  if(a.status==='APPROVED')throw badRequest('Este Embajador ya tiene el alta.');
  const docs=(await db.query('select kind,sha256 from qori_seller_documents where user_id=$1',[id])).rows;
  await db.query("update qori_seller_applications set status='APPROVED',approval_mode='ADMIN_OVERRIDE',review_note=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() where user_id=$1",[id,d.note,user.id]);
  await db.query('update app_users set is_active=true where id=$1',[id]);
  await audit(db,user,'SELLER_ACCESS_AUTHORIZED',id,{...d,previous_status:a.status,previous_is_active:target.is_active,documents:docs,missing_documents:documentation(a,docs).missing,approval_mode:'ADMIN_OVERRIDE'});
  return {ok:true};
 });
}
function nextThursday(now=new Date()){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const d=new Date(date+'T12:00:00Z'),day=d.getUTCDay();d.setUTCDate(d.getUTCDate()+((4-day+7)%7||7));return d.toISOString().slice(0,10);
}
async function dashboard(user){
 await requireApproved(user);
 const [totals,ledger,payouts,accounts]=await Promise.all([
  query(`select coalesce(sum(amount_cop) filter(where status='PENDING'),0) pending_cop,
   coalesce(sum(amount_cop) filter(where status='PAID'),0) paid_cop,
   coalesce(sum(amount_cop) filter(where status='SCHEDULED'),0) scheduled_cop,
   coalesce(sum(amount_cop) filter(where status='PENDING' and due_on<=(now() at time zone 'America/Bogota')::date),0) due_cop,
   count(distinct business_id)::int paying_businesses from qori_seller_commissions where seller_id=$1`,[user.id]),
  query(`select c.*,b.name business_name,o.package_title from qori_seller_commissions c join businesses b on b.id=c.business_id join qr_credit_purchase_orders o on o.id=c.order_id where seller_id=$1 order by c.created_at desc,c.id limit 200`,[user.id]),
  query('select * from qori_seller_payouts where seller_id=$1 order by created_at desc limit 100',[user.id]),
  accountRows(user)
 ]);
 const policy=require('./sellerCommissionPolicy').publicPolicy();
 const rollout=(await query("select effective_at,base_mode,scope from qori_seller_commission_policy where version='QORI_2026_VF1'")).rows[0];
 return {totals:totals.rows[0],commissions:ledger.rows,payouts:payouts.rows,accounts,next_payment_date:nextThursday(),referral_url:env.publicAppUrl+'/pense-en-ti/?seller='+user.id,plan_referral_url:env.publicAppUrl+'/paquetes/?advisor='+user.id,commission_policy:{...policy,...rollout},tickets_rate:0.10};
}
async function accountRows(user){
 const rows=(await query(`select b.*,a.created_at assigned_at,p.last_subscription_paid_at,cp.starts_on commission_starts_on,
  coalesce(cp.policy_version,case when b.created_at>=policy.effective_at then 'QORI_2026_VF1' else 'LEGACY_10' end) commission_policy,
  case when cp.policy_version='QORI_2026_VF1' then public.qori_seller_commission_month(cp.starts_on,(now() at time zone 'America/Bogota')::date) else null end commission_month,
  case when cp.policy_version='QORI_2026_VF1' then public.qori_seller_commission_boundary(cp.starts_on,6) else null end commission_ends_on
  from qori_sales_accounts a join businesses b on b.id=a.business_id
  left join qori_seller_commission_programs cp on cp.business_id=b.id
  cross join qori_seller_commission_policy policy
  left join lateral (select max(o.credited_at) last_subscription_paid_at from qr_credit_purchase_orders o
   where o.business_id=b.id and o.status='APPROVED' and o.credited_at is not null and o.price_cop>0
   and o.metadata->'signup'->>'type' in ('portal_monthly_subscription','portal_annual_subscription','portal_monthly_subscription_auto_renewal')) p on true
  where a.seller_id=$1 and policy.version='QORI_2026_VF1' order by a.created_at desc,b.id limit 200`,[user.id])).rows;
 const now=new Date(),{accountLifecycle}=require('./sellerAccountLifecycle');
 return rows.map(b=>({id:b.id,name:b.name,plan_code:b.plan_code,subscription_status:b.subscription_status,
  created_at:b.assigned_at,lifecycle:accountLifecycle(b,now),commission:{policy_version:b.commission_policy,starts_on:b.commission_starts_on,ends_on:b.commission_ends_on,month:b.commission_month}}));
}
async function accounts(user){await requireApproved(user);return {accounts:await accountRows(user)};}
async function adminQueue(user){
 superadmin(user);
 const [applications,balances,payouts]=await Promise.all([
  query(`select a.*,u.full_name,u.email,coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'kind',d.kind,'filename',d.filename,'sha256',d.sha256)) from qori_seller_documents d where d.user_id=a.user_id),'[]'::jsonb) documents from qori_seller_applications a join app_users u on u.id=a.user_id order by (a.status='SUBMITTED') desc,a.created_at desc limit 200`),
  query(`select c.seller_id,u.full_name,u.email,sum(c.amount_cop) pending_cop,coalesce(sum(c.amount_cop) filter(where c.due_on<=(now() at time zone 'America/Bogota')::date),0) due_cop from qori_seller_commissions c join app_users u on u.id=c.seller_id where c.status='PENDING' group by c.seller_id,u.full_name,u.email order by min(c.due_on)`),
  query('select p.*,u.full_name from qori_seller_payouts p join app_users u on u.id=p.seller_id order by p.created_at desc limit 100')
 ]);
 return {ciiu_requirement:CIIU,applications:applications.rows.map(a=>({...a,documentation:documentation(a,a.documents)})),balances:balances.rows,payouts:payouts.rows};
}
async function pay(user,payload){
 superadmin(user);
 const d=validate(z.object({seller_id:uuid,request_id:uuid,transfer_reference:text(160).min(6),paid_on:z.string().date(),expected_gross_cop:z.coerce.number().positive(),withholding_cop:z.coerce.number().min(0).default(0),transfer_verified:z.literal(true),bank_ownership_checked:z.literal(true)}).strict(),payload);
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['seller-payout:'+d.seller_id]);
  const prior=(await db.query('select * from qori_seller_payouts where request_id=$1',[d.request_id])).rows[0];
  if(prior){if(prior.seller_id!==d.seller_id||prior.transfer_reference!==d.transfer_reference)throw badRequest('La solicitud ya corresponde a otro pago.');return {payout:prior};}
  const day=(await db.query("select (now() at time zone 'America/Bogota')::date::text today")).rows[0].today;
  if(d.paid_on>day||new Date(d.paid_on+'T12:00:00Z').getUTCDay()!==4)throw badRequest('Registra la fecha real de transferencia: un jueves, sin fechas futuras.');
  const approved=(await db.query("select a.status,a.approval_mode,a.accepted_at,u.is_active,u.password_setup_required from qori_seller_applications a join app_users u on u.id=a.user_id where a.user_id=$1 for update of a",[d.seller_id])).rows[0];
  if(!approved||approved.status!=='APPROVED'||approved.approval_mode==='ADMIN_OVERRIDE'||!approved.is_active||approved.password_setup_required||!approved.accepted_at)throw badRequest('El pago exige un expediente de Embajador aprobado documentalmente y una cuenta activada con las condiciones aceptadas.');
  const rows=(await db.query("select id,amount_cop from qori_seller_commissions where seller_id=$1 and status='PENDING' and due_on<=$2 order by id for update",[d.seller_id,d.paid_on])).rows;
  const cents=rows.reduce((s,r)=>s+Math.round(Number(r.amount_cop)*100),0);
  if(cents<=0||cents!==Math.round(d.expected_gross_cop*100))throw badRequest('El saldo cambió o no hay comisiones exigibles. Actualiza antes de registrar el pago.');
  if(d.withholding_cop>=cents/100)throw badRequest('La retención debe ser menor que el valor bruto.');
  const p=(await db.query('insert into qori_seller_payouts(seller_id,request_id,gross_cop,withholding_cop,transfer_reference,paid_on,recorded_by) values($1,$2,$3,$4,$5,$6,$7) returning *',[d.seller_id,d.request_id,cents/100,d.withholding_cop,d.transfer_reference,d.paid_on,user.id])).rows[0];
  await db.query("update qori_seller_commissions set status='PAID',payout_id=$2 where id=any($1::uuid[])",[rows.map(r=>r.id),p.id]);
  await audit(db,user,'SELLER_PAYOUT_RECORDED',d.seller_id,{payout_id:p.id,gross_cop:p.gross_cop,withholding_cop:p.withholding_cop,transfer_reference:p.transfer_reference});
  return {payout:p};
 });
}
module.exports={VERSION,register,openApplication,application,upload,adminUpload,adminSubmit,document,submit,review,authorizeAccess,documentation,requireApproved,dashboard,accounts,adminQueue,pay,nextThursday};

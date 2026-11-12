const crypto=require('node:crypto');
const {z}=require('zod');
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {validate}=require('../utils/validators');
const {badRequest,notFound}=require('../utils/http');
const {requireSuperadmin}=require('./commercialAuthorization');
const mail=require('./sellerWelcomeMailService');
const key=()=>crypto.createHash('sha256').update('qori-seller-welcome-v1\0'+(process.env.SELLER_DOCUMENT_ENCRYPTION_KEY||env.jwtSecret)).digest();
function encrypt(payload){const nonce=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),nonce);return Buffer.concat([nonce,c.update(JSON.stringify(payload)),c.final(),c.getAuthTag()]);}
function decrypt(bytes){const d=crypto.createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));d.setAuthTag(bytes.subarray(-16));return JSON.parse(Buffer.concat([d.update(bytes.subarray(12,-16)),d.final()]).toString());}
async function audit(db,user,action,id,detail){await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,'seller',$3,$4::jsonb)",[user.id,action,id,JSON.stringify(detail)]);}
async function account(db,id,lock=false){
 const u=(await db.query('select id,email,full_name,role,platform_role,is_active,password_setup_required from app_users where id=$1'+(lock?' for update':''),[id])).rows[0];
 if(!u||(u.platform_role||u.role)!=='QORI_SELLER')throw notFound('Embajador no encontrado.');
 const a=(await db.query('select status,approval_mode from qori_seller_applications where user_id=$1'+(lock?' for update':''),[id])).rows[0];
 const docs=(await db.query('select kind from qori_seller_documents where user_id=$1',[id])).rows;
 const activation=(await db.query('select token_hash,completed_at,expires_at from qori_seller_activations where user_id=$1',[id])).rows[0];
 const reason=!u.is_active?'La cuenta está suspendida.':a?.status!=='APPROVED'||a.approval_mode!=='DOCUMENTS'?'Primero verifica los documentos y aprueba el expediente. El alta con documentación pendiente no permite enviar esta bienvenida.':docs.length!==4?'El expediente debe conservar los cuatro documentos verificados.':u.password_setup_required&&(!activation||activation.completed_at)?'No hay una activación pendiente válida para esta cuenta.':'';
 return {...u,activation,reason};
}
async function preview(user,id){
 requireSuperadmin(user);validate(z.string().uuid(),id);const u=await account({query},id);
 const recent=(await query('select request_id,status,created_at,sent_at,last_error from qori_seller_welcome_emails where seller_id=$1 order by created_at desc limit 5',[id])).rows;
 const sample=mail.message({name:u.full_name,email:u.email,needsActivation:u.password_setup_required,actionUrl:new URL(u.password_setup_required?'/seller/#activar=VISTA_PREVIA':'/seller/',env.publicAppUrl).toString(),expiresAt:u.password_setup_required?new Date(Date.now()+7*86400000):null});
 return {recipient:u.email,can_send:!u.reason,reason:u.reason,requires_activation:u.password_setup_required,subject:sample.subject,html:sample.html,history:recent};
}
async function send(user,id,payload){
 requireSuperadmin(user);validate(z.string().uuid(),id);
 const d=validate(z.object({request_id:z.string().uuid(),expected_email:z.string().email()}).strict(),payload);
 if(!env.resendApiKey){const e=badRequest('Configura el servicio de correo de Qori antes de enviar la bienvenida.');e.status=503;throw e;}
 await withTransaction(async db=>{
  const u=await account(db,id,true);if(u.reason)throw badRequest(u.reason);
  if(u.email.toLowerCase()!==d.expected_email.toLowerCase())throw badRequest('El correo cambió. Abre nuevamente la vista previa antes de enviar.');
  const prior=(await db.query('select seller_id from qori_seller_welcome_emails where request_id=$1',[d.request_id])).rows[0];
  if(prior){if(prior.seller_id!==id)throw badRequest('La solicitud corresponde a otro embajador.');return;}
  if((await db.query("select 1 from qori_seller_welcome_emails where seller_id=$1 and created_at>now()-interval '1 minute'",[id])).rowCount)throw badRequest('Espera un minuto antes de generar otro correo. Si falló, reintenta el envío anterior.');
  let activation=null;
  if(u.password_setup_required)activation=await require('./sellerActivationService').issue(db,id,user.id);
  const actionUrl=activation?.url||new URL('/seller/',env.publicAppUrl).toString();
  const message=mail.message({name:u.full_name,email:u.email,actionUrl,needsActivation:u.password_setup_required,expiresAt:activation?.expires_at});
  const content={from:env.marketingMailFrom,to:[u.email],reply_to:env.contactRecipientEmail,...message,tags:[{name:'module',value:'seller-welcome'}]};
  const activationHash=activation?crypto.createHash('sha256').update(new URL(activation.url).hash.slice(9)).digest('hex'):null;
  await db.query('insert into qori_seller_welcome_emails(request_id,seller_id,created_by,recipient,requires_activation,activation_hash,encrypted_payload) values($1,$2,$3,$4,$5,$6,$7)',[d.request_id,id,user.id,u.email,u.password_setup_required,activationHash,encrypt(content)]);
  await audit(db,user,'SELLER_WELCOME_REQUESTED',id,{request_id:d.request_id,requires_activation:u.password_setup_required});
 });
 const result=await withTransaction(async db=>{
  const u=await account(db,id,true);
  const row=(await db.query('select *,created_at>now()-interval \'23 hours\' retry_valid from qori_seller_welcome_emails where request_id=$1 and seller_id=$2 for update',[d.request_id,id])).rows[0];
  if(!row)throw notFound('Envío no encontrado.');
  if(row.status==='SENT')return {ok:true,status:'SENT',sent_at:row.sent_at,existing:true};
  const changed=u.reason||row.recipient!==u.email||row.requires_activation!==u.password_setup_required||(row.requires_activation&&(row.activation_hash!==u.activation?.token_hash||new Date(u.activation.expires_at)<=new Date()));
  if(changed||!row.retry_valid||row.status==='CANCELLED'){
   await db.query("update qori_seller_welcome_emails set status='CANCELLED',encrypted_payload=null,last_error='El expediente o enlace cambió. Abre una nueva bienvenida.' where request_id=$1",[row.request_id]);
   return {ok:false,status:'CANCELLED',message:'El expediente o enlace cambió. Abre nuevamente la bienvenida.'};
  }
  try{
   const providerId=await mail.deliver(decrypt(row.encrypted_payload),'seller-welcome/'+row.request_id);
   const sent=(await db.query("update qori_seller_welcome_emails set status='SENT',sent_at=now(),provider_id=$2,attempts=attempts+1,encrypted_payload=null,last_error=null where request_id=$1 returning sent_at",[row.request_id,providerId])).rows[0];
   await audit(db,user,'SELLER_WELCOME_SENT',id,{request_id:row.request_id,provider_id:providerId});
   return {ok:true,status:'SENT',sent_at:sent.sent_at};
  }catch(error){
   // Same encrypted request and provider idempotency key are kept for a safe retry.
   await db.query("update qori_seller_welcome_emails set status='FAILED',attempts=attempts+1,last_error='No se confirmó el envío. Reintenta desde la vista previa.' where request_id=$1",[row.request_id]);
   await audit(db,user,'SELLER_WELCOME_FAILED',id,{request_id:row.request_id});
   return {ok:false,status:'FAILED',message:'No se confirmó el envío. Reintenta desde esta ventana; no se generará otro correo si el proveedor ya lo recibió.'};
  }
 });
 return result;
}
module.exports={preview,send};

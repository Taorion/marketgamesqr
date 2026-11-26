const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {requireSuperadmin}=require('./commercialAuthorization');
const {badRequest,notFound}=require('../utils/http');
const {z}=require('zod');
const {validate}=require('../utils/validators');
async function request(user,businessId,payload){
 requireSuperadmin(user);validate(z.string().uuid(),businessId);
 const d=validate(z.object({order_id:z.string().uuid(),expected_period_end:z.string().datetime(),reason:z.string().trim().min(15).max(1000)}).strict(),payload);
 return withTransaction(async db=>{
  const o=(await db.query('select * from qr_credit_purchase_orders where id=$1 and business_id=$2 for update',[d.order_id,businessId])).rows[0];
  if(!o)throw notFound('Orden no encontrada para este negocio.');
  const b=(await db.query('select * from businesses where id=$1 for update',[businessId])).rows[0];
  if(!b||b.archived_at)throw notFound('Negocio no encontrado.');
  if(o.status==='APPROVED'&&o.credited_at)return {ok:true,already_confirmed:true};
  if(!['PENDING','IN_PROCESS'].includes(o.status)||!['portal_monthly_subscription','portal_annual_subscription'].includes(o.metadata?.signup?.type))throw badRequest('Esta orden no admite recuperación de pago.');
  if(!b.is_active||b.subscription_status!=='ACTIVE'||b.plan_code!==o.package_code||new Date(b.subscription_current_period_ends_at)<=new Date()||new Date(b.subscription_current_period_ends_at).getTime()!==new Date(d.expected_period_end).getTime())throw badRequest('Actualiza la ficha: el plan o la fecha de renovación cambió.');
  const recovery={requested:true,status:'QUEUED',preserve_period_end:d.expected_period_end,authorized_by:user.id,requested_at:new Date().toISOString(),reason:d.reason};
  await db.query("update qr_credit_purchase_orders set metadata=jsonb_set(coalesce(metadata,'{}'),'{reconciliation}',$2::jsonb),updated_at=now() where id=$1",[o.id,JSON.stringify(recovery)]);
  await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'SUBSCRIPTION_PAYMENT_RECOVERY_REQUESTED','business',$2,$3)",[user.id,businessId,{order_id:o.id,...recovery,payment_recorded:false}]);
  return {ok:true,queued:true};
 });
}
async function recover(orderId){
 const o=(await query('select * from qr_credit_purchase_orders where id=$1',[orderId])).rows[0];
 if(!o||o.credited_at||!o.metadata?.reconciliation?.requested)return;
 const payments=require('./mercadoPagoService');
 let status='WAITING_PROVIDER',message='Mercado Pago aún no devuelve un pago aprobado para esta orden.';
 try{
  const found=await payments.mpRequest('/v1/payments/search?'+new URLSearchParams({external_reference:o.external_reference,status:'approved',limit:'50'}));
  const matches=(found.results||[]).filter(p=>p.external_reference===o.external_reference&&p.status==='approved');
  if(Number(found.paging?.total||matches.length)>1||matches.length>1)throw badRequest('Hay varios pagos. Se requiere revisar la orden antes de acreditarla.');
  if(matches.length===1){
   await payments.processMercadoPagoResource('payment',String(matches[0].id));
   const current=(await query('select credited_at from qr_credit_purchase_orders where id=$1',[o.id])).rows[0];
   if(!current.credited_at)throw badRequest('El pago aún no quedó acreditado.');
   status='CONFIRMED';message='Pago confirmado con Mercado Pago. Renovación conservada y comisión procesada.';
  }
 }catch(e){status='ERROR';message=String(e.message||'No se pudo verificar el pago.').replace(/https?:\/\/\S+/g,'[proveedor]').slice(0,240);}
 await query("update qr_credit_purchase_orders set metadata=jsonb_set(metadata,'{reconciliation}',coalesce(metadata->'reconciliation','{}')||$2::jsonb),updated_at=now() where id=$1",[o.id,JSON.stringify({status,message,attempted_at:new Date().toISOString()})]);
 if(status==='CONFIRMED')require('../middleware/businessResponseCache').clearBusinessResponseCache(o.business_id);
 return {status,message};
}
async function runBatch(){
 const rows=(await query("select id from qr_credit_purchase_orders where credited_at is null and metadata->'reconciliation'->>'requested'='true' and (metadata->'reconciliation'->>'attempted_at' is null or (metadata->'reconciliation'->>'attempted_at')::timestamptz<now()-interval '5 minutes') order by created_at limit 10")).rows;
 for(const row of rows)await recover(row.id);
}
function start(){
 if(!env.databaseConfigured||!env.mercadoPagoAccessToken||!env.mercadoPagoWebhookSecret)return async()=>{};
 let pending;const run=()=>{if(!pending)pending=runBatch().catch(()=>console.error('Subscription payment recovery unavailable')).finally(()=>pending=null);};
 const timer=setInterval(run,60000);timer.unref();run();return async()=>{clearInterval(timer);if(pending)await pending;};
}
module.exports={request,recover,runBatch,start};

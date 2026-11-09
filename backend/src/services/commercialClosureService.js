const {z}=require('zod');
const {query,withTransaction}=require('../config/db');
const {validate}=require('../utils/validators');
const {badRequest,notFound}=require('../utils/http');
const {requireSuperadmin}=require('./commercialAuthorization');
const {planFromBusiness}=require('./subscriptionService');
const {activeTerms}=require('./commercialTerms');
const types=['portal_monthly_subscription','portal_annual_subscription','portal_monthly_subscription_auto_renewal'];
const uuid=z.string().uuid();
function subscriptionEvidence(b){
 const plan=planFromBusiness(b),end=new Date(plan.current_period_ends_at),now=new Date(),terms=activeTerms(b,plan.code);
 const paidPeriod=!(terms?.trial_ends_at&&end<=new Date(terms.trial_ends_at));
 const active=b.is_active&&plan.raw_status==='ACTIVE'&&plan.portal_access_allowed&&plan.category==='subscription'&&Number(plan.monthly_price_cop)>0&&plan.monthly_payment_required&&!plan.lifetime_access&&Number.isFinite(end.getTime())&&end>now&&paidPeriod;
 return {active:Boolean(active),plan_code:plan.code,plan_name:plan.name,status:plan.raw_status,current_period_ends_at:plan.current_period_ends_at};
}
function validPayment(o,b,plan){
 return o&&o.business_id===b.id&&o.status==='APPROVED'&&o.credited_at&&new Date(o.credited_at)<=new Date()&&Number(o.price_cop)>0&&types.includes(o.metadata?.signup?.type)&&o.package_code===plan.plan_code&&(o.metadata?.signup?.plan_code||o.package_code)===plan.plan_code;
}
async function preview(user,id){
 requireSuperadmin(user);validate(uuid,id);
 const p=(await query('select * from qori_sales_prospects where id=$1',[id])).rows[0];if(!p)throw notFound('Prospecto no encontrado.');
 const b=p.business_id?(await query('select * from businesses where id=$1',[p.business_id])).rows[0]:null;
 const subscription=b?subscriptionEvidence(b):null;
 const candidates=b?(await query("select id,business_id,status,price_cop,credited_at,package_code,mercado_pago_payment_id,metadata from qr_credit_purchase_orders where business_id=$1 and status='APPROVED' and credited_at is not null and price_cop>0 and metadata->'signup'->>'type'=any($2::text[]) order by credited_at desc,id limit 50",[b.id,types])).rows:[];
 const payments=candidates.filter(o=>validPayment(o,b,subscription)).map(o=>({id:o.id,amount_cop:o.price_cop,paid_at:o.credited_at,plan_code:o.package_code,reference:o.mercado_pago_payment_id||o.id}));
 return {prospect:{id:p.id,business_name:p.business_name,business_id:p.business_id,closed_at:p.closed_at},subscription,payments,can_close:!p.closed_at&&p.stage==='WON'&&Boolean(subscription?.active)&&payments.length>0};
}
async function close(user,id,payload){
 requireSuperadmin(user);validate(uuid,id);
 const d=validate(z.object({payment_order_id:uuid,payment_verified:z.literal(true),subscription_verified:z.literal(true),reason:z.string().trim().min(15).max(2000)}).strict(),payload);
 return withTransaction(async db=>{
  const p=(await db.query('select * from qori_sales_prospects where id=$1 for update',[id])).rows[0];if(!p)throw notFound('Prospecto no encontrado.');
  if(p.closed_at){if(p.closed_payment_order_id!==d.payment_order_id)throw badRequest('El negocio ya tiene un cierre validado con otro pago.');return {ok:true,already_closed:true,closed_at:p.closed_at};}
  if(!p.business_id||p.stage!=='WON')throw badRequest('Primero debe existir un negocio inscrito y vinculado al prospecto.');
  // Payment finalization locks the order before the business; use the same order here.
  const o=(await db.query('select * from qr_credit_purchase_orders where id=$1 for share',[d.payment_order_id])).rows[0];
  const b=(await db.query('select * from businesses where id=$1 for share',[p.business_id])).rows[0];
  const subscription=subscriptionEvidence(b);
  if(!subscription.active)throw badRequest('El cierre exige una suscripción de pago activa y vigente. Una prueba gratuita o un periodo de gracia no acreditan el cierre.');
  if(!validPayment(o,b,subscription))throw badRequest('Selecciona un pago confirmado y aplicado de la suscripción vigente de este negocio; los paquetes de tickets no acreditan el cierre.');
  const result=(await db.query('update qori_sales_prospects set closed_at=now(),closed_by=$2,closed_payment_order_id=$3,updated_at=now() where id=$1 returning closed_at',[id,user.id,o.id])).rows[0];
  await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'PROSPECT_CLOSURE_VALIDATED','prospect',$2,$3::jsonb)",[user.id,id,JSON.stringify({seller_id:p.seller_id,name:p.business_name,business_id:b.id,payment_order_id:o.id,payment_reference:o.mercado_pago_payment_id,paid_at:o.credited_at,amount_cop:o.price_cop,subscription,...d})]);
  return {ok:true,closed_at:result.closed_at};
 });
}
module.exports={preview,close};


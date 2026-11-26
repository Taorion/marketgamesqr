const {withTransaction}=require('../config/db');
const {requireSuperadmin}=require('./commercialAuthorization');
const {badRequest,notFound}=require('../utils/http');
const {VERSION,plans,rateBps,commissionCop}=require('./sellerCommissionPolicy');
const {validate}=require('../utils/validators'),{z}=require('zod');
async function correctFirstPaidPeriod(user,payload,{apply=false}={}){
 requireSuperadmin(user);
 const d=validate(z.object({business_id:z.string().uuid(),order_id:z.string().uuid(),reason:z.string().trim().min(15).max(1000)}).strict(),payload);
 return withTransaction(async db=>{
  const o=(await db.query('select * from qr_credit_purchase_orders where id=$1 and business_id=$2 for update',[d.order_id,d.business_id])).rows[0];
  if(!o)throw notFound('Orden no encontrada.');
  await db.query('select id from businesses where id=$1 for update',[d.business_id]);
  await db.query("select pg_advisory_xact_lock(hashtext('seller-program:'||$1::text))",[d.business_id]);
  if(o.status!=='APPROVED'||!o.credited_at||o.metadata?.signup?.type!=='portal_monthly_subscription'||!plans[o.package_code])throw badRequest('Se requiere una primera mensualidad aprobada y acreditada.');
  const paid=(await db.query("select id from qr_credit_purchase_orders where business_id=$1 and status='APPROVED' and credited_at is not null and price_cop>0 and metadata->'signup'->>'type' in ('portal_monthly_subscription','portal_annual_subscription','portal_monthly_subscription_auto_renewal')",[d.business_id])).rows;
  if(paid.length!==1||paid[0].id!==o.id)throw badRequest('Hay más periodos pagados. Esta corrección solo cubre el primer pago.');
  const program=(await db.query('select *,starts_on::text start_day from qori_seller_commission_programs where business_id=$1 for update',[d.business_id])).rows[0];
  const rows=(await db.query('select * from qori_seller_commissions where order_id=$1 for update',[o.id])).rows;
  if(!program||rows.length!==1)throw badRequest('Revisa el programa y las comisiones existentes.');
  const c=rows[0],plan=plans[o.package_code],amount=commissionCop(plan.monthly_price_cop,o.package_code,1),rate=rateBps(o.package_code,1)/10000;
  if(c.seller_id!==o.commission_seller_id||c.kind!=='SUBSCRIPTION'||c.status!=='PENDING'||c.payout_id||c.reversed_at)throw badRequest('No se puede modificar una comisión liquidada, anulada o con atribución distinta.');
  if(program.policy_version===VERSION&&c.policy_version===VERSION&&c.commission_month===1&&Number(c.amount_cop)===amount)return {changed:false,already_correct:true,commission_id:c.id,amount_cop:amount};
  if(program.policy_version!=='LEGACY_10'||c.policy_version!=='LEGACY_10'||Number(c.rate)!==0.1)throw badRequest('La comisión no corresponde al esquema anterior esperado.');
  const next={policy_version:VERSION,commission_month:1,plan_code:o.package_code,base_cop:plan.monthly_price_cop,rate,amount_cop:amount,starts_on:program.start_day,seller_id:c.seller_id,commission_id:c.id};
  if(!apply)return {changed:false,preview:true,before:{policy_version:c.policy_version,rate:Number(c.rate),amount_cop:Number(c.amount_cop)},after:next};
  await db.query('update qori_seller_commission_programs set policy_version=$2 where business_id=$1',[d.business_id,VERSION]);
  await db.query("update qori_seller_commissions set policy_version=$2,commission_month=1,plan_code=$3,base_cop=$4,rate=$5,amount_cop=$6,earned_on=$7::date,coverage_ends_on=qori_seller_commission_boundary($7::date,1) where id=$1",[c.id,VERSION,o.package_code,plan.monthly_price_cop,rate,amount,program.start_day]);
  await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'SELLER_FIRST_COMMISSION_POLICY_CORRECTED','business',$2,$3)",[user.id,d.business_id,{reason:d.reason,order_id:o.id,seller_id:c.seller_id,before:c,after:next,payout_recorded:false}]);
  return {changed:true,after:next};
 });
}
module.exports={correctFirstPaidPeriod};

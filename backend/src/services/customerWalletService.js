const {owned,recovered}=require('./customerBenefitOwnership');
const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const {getBusinessSubscription,assertStandaloneBusinessFeature}=require('./subscriptionService');
const points=require('./affiliatePointRulesService');
const affiliates=require('./affiliateService');
const gifts=require('./rewardPassService');
const finance=require('./customerFinance');
const DEFAULT_PROGRAMS={points_terms:'',accumulation_terms:'',gift_enabled:false,gift_min:'10000',gift_max:'1000000',gift_terms:'',gift_payment_instructions:''};

async function readiness(businessId) {
  const [data,subscription]=await Promise.all([
    query(`select b.id,b.name,b.is_active,b.settings,p.*,
      exists(select 1 from stamp_programs s where s.business_id=b.id and s.status='ACTIVE' and s.deleted_at is null) stamps,
      exists(select 1 from affiliate_reward_rules r where r.business_id=b.id and r.status='ACTIVE') point_rewards,
      exists(select 1 from branches br where br.business_id=b.id and br.is_active) branches,
      coalesce((select qr_balance from business_qr_credit_accounts c where c.business_id=b.id),0) credits,
      (select count(*)::int from reward_passes rp where rp.company_id=b.id) gifts_total,
      (select count(*)::int from reward_passes rp where rp.company_id=b.id and rp.created_at>=date_trunc('month',now())) gifts_month
      from businesses b left join customer_business_programs p on p.business_id=b.id where b.id=$1`,[businessId]),
    getBusinessSubscription(businessId)
  ]);
  const row=data.rows[0];if(!row)throw notFound('Establecimiento no encontrado.');
  const config={...DEFAULT_PROGRAMS,...Object.fromEntries(Object.keys(DEFAULT_PROGRAMS).filter(k=>row[k]!=null).map(k=>[k,row[k]]))};
  const plan=subscription.plan;
  const subscribed=!!row.is_active&&plan.raw_status==='ACTIVE'&&plan.portal_access_allowed;
  const configuredCost=Number(row.settings?.reward_pass_ticket_cost??row.settings?.rewardPassTicketCost??gifts.DEFAULT_TICKET_COST);
  const cost=Number.isInteger(configuredCost)&&configuredCost>0?configuredCost:gifts.DEFAULT_TICKET_COST;
  const capacity=Number(row.credits)>=cost && (plan.limits?.gift_cards_total==null||row.gifts_total<plan.limits.gift_cards_total)
    && (plan.limits?.gift_cards_month==null||row.gifts_month<plan.limits.gift_cards_month);
  const checks=[
    {key:'subscription',label:'Suscripción y establecimiento activos',ok:subscribed},
    {key:'stamps',label:'Programa de sellos activo',ok:!!row.stamps},
    {key:'points',label:'Afiliaciones con premio activo y condiciones publicadas',ok:!!plan.features?.affiliates&&!!row.point_rewards&&config.points_terms.trim().length>=10},
    {key:'giftcards',label:'Giftcards habilitadas, condiciones, instrucciones y sede activa',ok:!!plan.features?.gift_cards&&config.gift_enabled&&!!row.branches&&config.gift_terms.trim().length>=10&&config.gift_payment_instructions.trim().length>=10},
    {key:'capacity',label:'Capacidad disponible para emitir beneficios',ok:capacity},
    {key:'accumulation',label:'Condiciones de acumulación de sellos y puntos',ok:config.accumulation_terms.trim().length>=10}
  ];
  return {ready:checks.every(c=>c.ok),checks,programs:config,point_rules:points.rulesFromSettings(row.settings),business_name:row.name};
}
async function assertReady(businessId) {
  const status=await readiness(businessId);
  if(!status.ready)throw badRequest('Completa el estándar Qori: '+status.checks.filter(c=>!c.ok).map(c=>c.label).join('; '));
  return status;
}
async function savePrograms(user,data) {
  if(finance.minor(data.gift_max)<finance.minor(data.gift_min))throw badRequest('El máximo debe ser mayor o igual al mínimo.');
  await query(`insert into customer_business_programs(business_id,points_terms,accumulation_terms,gift_enabled,gift_min,gift_max,gift_terms,gift_payment_instructions)
    values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(business_id) do update set points_terms=excluded.points_terms,
    accumulation_terms=excluded.accumulation_terms,gift_enabled=excluded.gift_enabled,gift_min=excluded.gift_min,gift_max=excluded.gift_max,
    gift_terms=excluded.gift_terms,gift_payment_instructions=excluded.gift_payment_instructions,updated_at=now()`,
    [user.business_id,data.points_terms,data.accumulation_terms,data.gift_enabled,data.gift_min,data.gift_max,data.gift_terms,data.gift_payment_instructions]);
  return readiness(user.business_id);
}
const affiliateOwned=`select a.* from affiliates a where a.id=$1 and a.status<>'DELETED' and ${owned('AFFILIATION','a','$2')}`;
async function ownAffiliate(account,id){const row=(await query(affiliateOwned,[id,account.id])).rows[0];if(!row)throw notFound('Tarjeta no encontrada.');return row;}
function scopedActor(businessId){return {id:null,business_id:businessId,role:'BUSINESS_OWNER'};}
async function affiliateCard(account,id) {
  const a=await ownAffiliate(account,id),actor=scopedActor(a.business_id);
  const [card,rewards,ledger,rules,program]=await Promise.all([
    affiliates.getAffiliate(a.business_id,a.id,actor),affiliates.listAffiliateRewardUnlocks(a.business_id,a.id,actor),
    query('select id,points_awarded,amount,reason,created_at from affiliate_point_ledger where business_id=$1 and affiliate_id=$2 order by created_at desc limit 100',[a.business_id,a.id]),
    points.getAffiliatePointRules(a.business_id),query('select points_terms,accumulation_terms from customer_business_programs where business_id=$1',[a.business_id])
  ]);
  return {card:{id:a.id,business_id:a.business_id,business_name:card.business_name,full_name:a.full_name,status:a.status,points_total:a.points_total,qr_image:card.qr_data_url},
    rules,terms:program.rows[0]||{},ledger:ledger.rows,rewards:rewards.map(r=>({id:r.id,title:r.title,benefit_label:r.benefit_label,required_points:r.required_points,
      unlocked:Number(a.points_total)>=Number(r.required_points),ticket_status:r.qr_status||r.ticket_status,expires_at:r.expires_at}))};
}
async function claimAffiliate(account,id,ruleId) {
  const a=await ownAffiliate(account,id),actor=scopedActor(a.business_id);
  await assertStandaloneBusinessFeature(actor,a.business_id,'affiliates');
  const result=await affiliates.createAffiliateRewardTicket(a.business_id,id,actor,{reward_rule_id:ruleId});
  return {ticket:{qr_image:result.ticket.qr_image_data_url,status:result.ticket.qr_status,expires_at:result.ticket.expires_at},existing:result.existing};
}
async function createGiftOrder(account,data,{publishedOffer=false}={}) {
  // Returning a prior request is safe even if the merchant's offer changed meanwhile.
  const prior=(await query('select id from customer_gift_orders where buyer_id=$1 and request_id=$2',[account.id,data.request_id])).rows[0];
  if(prior)return giftOrder(account,prior.id);
  const status=await (publishedOffer?readiness:assertReady)(data.business_id);
  if(publishedOffer&&status.checks.some(c=>['subscription','giftcards','capacity'].includes(c.key)&&!c.ok))throw badRequest('El negocio no puede emitir giftcards en este momento.');
  const published=(await query('select published from customer_directory where business_id=$1',[data.business_id])).rows[0];
  if(!published?.published)throw badRequest('El negocio no está recibiendo solicitudes desde Customer.');
  const amount=finance.minor(data.amount);
  if(amount<finance.minor(status.programs.gift_min)||amount>finance.minor(status.programs.gift_max))throw badRequest('El importe está fuera del rango publicado por el negocio.');
  const result=await query(`insert into customer_gift_orders(business_id,buyer_id,request_id,buyer_name,recipient_email,recipient_name,message,amount,terms_snapshot)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) on conflict(buyer_id,request_id) do update set request_id=excluded.request_id returning id`,
    [data.business_id,account.id,data.request_id,data.buyer_name,data.recipient_email.trim().toLowerCase(),data.recipient_name,data.message,data.amount,JSON.stringify(status.programs)]);
  return giftOrder(account,result.rows[0].id);
}
const orderSql=`select o.*,b.name business_name,rp.status gift_status,rp.current_balance_cop,rp.expires_at,rp.claimed_at
  from customer_gift_orders o join businesses b on b.id=o.business_id left join reward_passes rp on rp.id=o.reward_pass_id`;
function publicOrder(row,account) {
  const buyer=row.buyer_id===account.id;
  return {id:row.id,business_id:row.business_id,business_name:row.business_name,role:buyer?'PURCHASED':'RECEIVED',
    buyer_name:row.buyer_name,recipient_name:row.recipient_name,recipient_email:buyer?row.recipient_email:undefined,message:row.message,
    amount:row.amount,currency:row.currency,state:row.state,reward_pass_id:row.reward_pass_id,created_at:row.created_at,paid_at:row.paid_at,
    terms:row.terms_snapshot.gift_terms,payment_instructions:buyer?row.terms_snapshot.gift_payment_instructions:undefined};
}
async function giftOrder(account,id) {
  const row=(await query(`${orderSql} where o.id=$1 and (o.buyer_id=$2 or (o.state='ISSUED' and (o.recipient_customer_id=$2 or (o.recipient_customer_id is null and o.recipient_email=$3))))`,[id,account.id,account.email])).rows[0];
  if(!row)throw notFound('Solicitud no encontrada.');return {order:publicOrder(row,account)};
}
async function cancelGiftOrder(account,id) {
  const row=(await query("update customer_gift_orders set state='CANCELLED',updated_at=now() where id=$1 and buyer_id=$2 and state='PENDING_PAYMENT' returning id",[id,account.id])).rows[0];
  if(!row)throw badRequest('Solo puedes cancelar una solicitud tuya pendiente de pago.');return {ok:true};
}
async function businessOrders(user) {
  const rows=(await query(`${orderSql} where o.business_id=$1 order by o.created_at desc limit 100`,[user.business_id])).rows;
  return {orders:rows.map(r=>({id:r.id,buyer_name:r.buyer_name,recipient_name:r.recipient_name,amount:r.amount,state:r.state,created_at:r.created_at,
    terms:r.terms_snapshot.gift_terms,payment_reference:r.payment_reference,reward_pass_id:r.reward_pass_id}))};
}
async function confirmGiftPayment(user,id,data) {
  await assertStandaloneBusinessFeature(user,user.business_id,'gift_cards');
  return withTransaction(async db=>{
    const row=(await db.query('select o.*,a.email buyer_email from customer_gift_orders o left join customer_accounts a on a.id=o.buyer_id where o.id=$1 and o.business_id=$2 for update of o',[id,user.business_id])).rows[0];
    if(!row)throw notFound('Solicitud no encontrada.');
    if(row.state==='ISSUED')return {ok:true,reward_pass_id:row.reward_pass_id,idempotent:true};
    if(row.state!=='PENDING_PAYMENT')throw badRequest('La solicitud está cancelada.');
    if(finance.minor(row.amount)!==finance.minor(data.amount))throw badRequest('El pago confirmado debe coincidir exactamente con la solicitud.');
    const pass=await gifts.createRewardPass(user,{buyer_name:row.buyer_name,buyer_email:row.buyer_email,
      initial_value_cop:Number(row.amount),beneficiary_email:row.recipient_email,transferable:false,partial_redemption_allowed:true,
      branch_authorization_scope:'ALL_BRANCHES',terms:row.terms_snapshot.gift_terms,payment_method_received:data.payment_method,
      internal_notes:`Customer order ${row.id}; referencia ${data.payment_reference}`,idempotency_key:`customer-gift:${row.id}`},{client:db});
    await db.query(`update customer_gift_orders set state='ISSUED',reward_pass_id=$2,confirmed_by=$3,payment_reference=$4,payment_method=$5,paid_at=now(),updated_at=now() where id=$1`,
      [id,pass.id,user.id,data.payment_reference,data.payment_method]);
    return {ok:true,reward_pass_id:pass.id,idempotent:false};
  });
}
const receivedSql=`select rp.*,b.name business_name,o.id order_id,o.message gift_message,o.buyer_name sender_name
  from reward_passes rp join businesses b on b.id=rp.company_id left join customer_gift_orders o on o.reward_pass_id=rp.id
  where ((o.id is null and ${recovered('GIFT','rp','$1','company_id')}) or (o.state='ISSUED' and (o.recipient_customer_id=$1 or (o.recipient_customer_id is null and o.recipient_email=$2)))
    or exists(select 1 from customer_invitations i where i.customer_id=$1 and i.kind='GIFT' and i.state='ACCEPTED' and i.result_id=rp.id and i.business_id=rp.company_id)
    or (o.id is null and exists(select 1 from customer_relationships r where r.business_id=rp.company_id and r.customer_id=$1 and r.state='ACCEPTED'
      and r.document_key=regexp_replace(lower(rp.beneficiary_document),'[^a-z0-9]','','g') and (r.include_history or rp.created_at>=r.accepted_at))))`;
function giftSummary(row) {
  const state=row.status==='cancelled'?'cancelled':Number(row.current_balance_cop)<=0?'fully_redeemed':new Date(row.expires_at)<new Date()?'expired':row.status;
  return {id:row.id,business_id:row.company_id,business_name:row.business_name,initial_value:row.initial_value_cop,balance:row.current_balance_cop,currency:'COP',
    status:state,expires_at:row.expires_at,valid_from:row.valid_from,terms:row.terms,partial_redemption_allowed:row.partial_redemption_allowed,
    branch:row.authorized_branch||'Todas las sedes autorizadas',message:row.gift_message||'',sender_name:row.sender_name||'',order_id:row.order_id,
    claim_required:state==='pending_claim'};
}
async function giftWallet(account) {
  const [received,bought]=await Promise.all([query(receivedSql+' order by rp.created_at desc',[account.id,account.email]),
    query(orderSql+' where o.buyer_id=$1 order by o.created_at desc',[account.id])]);
  return {received:received.rows.map(giftSummary),purchased:bought.rows.map(r=>publicOrder(r,account))};
}
async function ownGift(account,id,db={query},lock=false) {
  const row=(await db.query(receivedSql+' and rp.id=$3'+(lock?' for update of rp':''),[account.id,account.email,id])).rows[0];
  if(!row)throw notFound('Giftcard no encontrada.');return row;
}
async function giftDetail(account,id) {
  const row=await ownGift(account,id),card=giftSummary(row);
  if(!card.claim_required && !['cancelled','expired','fully_redeemed'].includes(card.status)) {
    const view=await gifts.getPublicRewardPass(row.public_code);card.qr_image=view.qr_image_data_url;
  }
  const redemptions=(await query('select id,redeemed_value_cop,balance_after_cop,redeemed_at,branch from reward_pass_redemptions where reward_pass_id=$1 order by redeemed_at desc',[id])).rows;
  return {card,redemptions};
}
async function acceptGift(account,id,data) {
  await withTransaction(async db=>{
    const row=await ownGift(account,id,db,true);
    if(!row.order_id)throw badRequest('Esta tarjeta ya está vinculada por tu relación con el negocio.');
    if(row.claimed_at)return; // A consumed retry cannot change recipient identity.
    await gifts.claimRewardPass(row.public_code,{beneficiary_name:data.full_name,beneficiary_document:data.document_id,
      beneficiary_email:account.email,security_pin:row.security_pin},{client:db});
    await db.query('update customer_gift_orders set recipient_customer_id=$2,updated_at=now() where id=$1',[row.order_id,account.id]);
  });
  return giftDetail(account,id);
}
module.exports={readiness,assertReady,savePrograms,affiliateCard,claimAffiliate,createGiftOrder,giftOrder,cancelGiftOrder,businessOrders,confirmGiftPayment,giftWallet,giftDetail,acceptGift};

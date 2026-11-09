const {query}=require('../config/db');
const {planFromBusiness}=require('./subscriptionService');
const {REWARD_PASS_EFFECTIVE_STATUS_SQL,getRewardPassTicketCostFromSettings}=require('./rewardPassService');

// Read-only snapshot. Never create accounts or replenish credits when Admin opens a page.
async function businessBalances(ids){
 if(!ids.length)return new Map();
 const {rows}=await query(`select b.*,row_to_json(q) ticket_account,row_to_json(g) giftcard_account,
  r.*
  from businesses b
  left join business_qr_credit_accounts q on q.business_id=b.id
  left join qori_giftcard_credit_accounts g on g.business_id=b.id
  left join lateral (
   select count(*)::int issued_count,
    count(*) filter(where rp.created_at>=date_trunc('month',now()) and rp.created_at<date_trunc('month',now())+interval '1 month')::int issued_month,
    coalesce(sum(rp.initial_value_cop),0) issued_cop,
    coalesce(sum(rp.initial_value_cop-rp.current_balance_cop),0) redeemed_cop,
    coalesce(sum(rp.current_balance_cop) filter(where (${REWARD_PASS_EFFECTIVE_STATUS_SQL}) not in ('cancelled','expired','fully_redeemed')),0) pending_cop,
    coalesce(sum(rp.current_balance_cop) filter(where (${REWARD_PASS_EFFECTIVE_STATUS_SQL})='expired'),0) expired_cop,
    coalesce(sum(rp.current_balance_cop) filter(where (${REWARD_PASS_EFFECTIVE_STATUS_SQL})='cancelled'),0) cancelled_cop
   from reward_passes rp where rp.company_id=b.id
  ) r on true where b.id=any($1::uuid[])`,[ids]);
 return new Map(rows.map(b=>{
  const q=b.ticket_account||{},g=b.giftcard_account||{},plan=planFromBusiness(b);
  const total=Number(q.qr_balance||0),included=Math.min(total,Number(q.included_balance||0));
  const prepaid=b.plan_code==='PENSE_EN_TI',monthly=plan.limits?.gift_cards_month,totalLimit=plan.limits?.gift_cards_total;
  const monthlyRemaining=Number.isFinite(monthly)?Math.max(0,monthly-b.issued_month):null;
  const totalRemaining=Number.isFinite(totalLimit)?Math.max(0,totalLimit-b.issued_count):null;
  const cost=prepaid?0:getRewardPassTicketCostFromSettings(b.settings||{});
  const limits=[monthlyRemaining,totalRemaining,prepaid?Number(g.balance||0):null,cost>0?Math.floor(total/cost):null].filter(v=>v!==null);
  return [b.id,{
   tickets:{available:total,included,additional:total-included,credited_total:Number(q.qr_purchased_total||0),used_total:Number(q.qr_used_total||0),included_period:q.included_period_key||null},
   giftcards:{mode:prepaid?'PREPAID':'PLAN',available:plan.features?.gift_cards? (limits.length?Math.min(...limits):null):0,
    feature_enabled:Boolean(plan.features?.gift_cards),credit_balance:Number(g.balance||0),credits_used:Number(g.used||0),credits_purchased:Number(g.purchased||0),welcome_granted:Number(g.welcome_granted||0),
    monthly_limit:monthly??null,monthly_remaining:monthlyRemaining,total_limit:totalLimit??null,total_remaining:totalRemaining,tickets_per_card:cost,
    issued_count:Number(b.issued_count),issued_month:Number(b.issued_month),issued_cop:Number(b.issued_cop),redeemed_cop:Number(b.redeemed_cop),pending_cop:Number(b.pending_cop),expired_cop:Number(b.expired_cop),cancelled_cop:Number(b.cancelled_cop)},
   access_allowed:Boolean(b.is_active&&plan.portal_access_allowed),as_of:new Date().toISOString()
  }];
 }));
}
module.exports={businessBalances};

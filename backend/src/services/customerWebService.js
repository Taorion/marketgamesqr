const {owned}=require('./customerBenefitOwnership');
const {query}=require('../config/db');
const {giftWallet}=require('./customerWalletService');

// A compact overview: QR generation and full history are loaded only on opening
// an owned card. IDs, not names, distinguish businesses and their programs.
async function overview(account){
  const [stamps,affiliates,gifts,tickets,pending]=await Promise.all([
    query(`select m.id,m.business_id,m.program_id,b.name business_name,b.settings->>'logo_url' business_logo,
      p.name title,p.status program_status,p.deleted_at,b.is_active business_active,
      c.id cycle_id,c.cycle_number,c.stamps,c.rules->>'stamps_required' goal,c.rules->'benefit_value'->>'label' reward,
      c.expires_at,c.claimed_at,c.review_required,q.status ticket_status,q.expires_at ticket_expires_at
      from stamp_members m join businesses b on b.id=m.business_id join stamp_programs p on p.id=m.program_id
      join lateral(select * from stamp_cycles where member_id=m.id order by cycle_number desc limit 1)c on true
      left join qr_codes q on q.id=c.qr_code_id
      where ${owned('STAMP','m')} order by b.name,p.name,m.id`,[account.id]),
    query(`select a.id,a.business_id,b.name business_name,b.settings->>'logo_url' business_logo,a.points_total,a.status,
      exists(select 1 from affiliate_reward_rules rr
        left join affiliate_reward_tickets rt on rt.business_id=rr.business_id and rt.reward_rule_id=rr.id and rt.affiliate_id=a.id
        left join qr_codes qr on qr.id=rt.qr_code_id
        where rr.business_id=a.business_id and rr.status='ACTIVE' and rr.required_points<=a.points_total
          and (rt.id is null or (rt.status='ISSUED' and qr.status='ACTIVE' and (qr.expires_at is null or qr.expires_at>now())))) reward_available
      from affiliates a join businesses b on b.id=a.business_id where a.status<>'DELETED' and ${owned('AFFILIATION','a')}`,[account.id]),
    giftWallet(account),require('./customerNetworkService').tickets(account),
    query("select count(*)::int n from customer_invitations where customer_id=$1 and state='PENDING' and expires_at>now()",[account.id])
  ]);
  const now=Date.now();
  const cards=stamps.rows.map(row=>{
    const expired=new Date(row.expires_at).getTime()<=now;
    let status='ACTIVE';
    if(row.review_required)status='REVIEW';
    else if(row.claimed_at)status=row.ticket_status==='ACTIVE'&&new Date(row.ticket_expires_at).getTime()>now?'READY':'ARCHIVED';
    else if(expired)status='EXPIRED';
    else if(Number(row.stamps)>=Number(row.goal))status='READY';
    else if(row.program_status!=='ACTIVE'||row.deleted_at||!row.business_active)status='PAUSED';
    return {...row,kind:'STAMP',status,stamps:Number(row.stamps),goal:Number(row.goal)};
  });
  cards.push(...affiliates.rows.map(row=>({...row,kind:'POINTS',title:'Mi tarjeta Qori',points:Number(row.points_total),
    status:row.status==='ACTIVE'?(row.reward_available?'READY':'ACTIVE'):'PAUSED'})));
  cards.push(...gifts.received.map(row=>({...row,kind:'GIFT',title:'Mi giftcard',
    status:['cancelled','expired','fully_redeemed'].includes(row.status)?'ARCHIVED':row.claim_required?'PENDING':'READY'})));
  cards.push(...tickets);
  return {cards,purchased_gifts:gifts.purchased,pending_invitations:pending.rows[0].n,updated_at:new Date().toISOString(),free_for_buyers:true};
}
module.exports={overview};

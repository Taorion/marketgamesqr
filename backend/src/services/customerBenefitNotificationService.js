const crypto=require('crypto');
const {query,withTransaction}=require('../config/db');
const {notFound}=require('../utils/http');
const delivery=require('./customerBenefitDeliveryService');
const push=require('./customerPaymentPushService');
async function insert(db,n){
 await db.query(`insert into customer_benefit_notifications(customer_id,business_id,event_key,kind,title,body,resource_id,invitation_id)
 select $1,$2,$3,$4,$5,$6,$7,$8 where not exists(select 1 from customer_business_blocks where customer_id=$1 and business_id=$2)
 on conflict(customer_id,event_key) do nothing`,[n.customer_id,n.business_id,n.event_key,n.kind,n.title,n.body,n.resource_id||null,n.invitation_id||null]);
}
async function list(a){
 await delivery.sync(a);
 const invitations=(await query("select * from customer_invitations where customer_id=$1 and state in ('PENDING','ACCEPTED') and (state='ACCEPTED' or expires_at>now()) order by created_at desc limit 200",[a.id])).rows;
 for(const i of invitations)await delivery.noticeInvitation(i);
 const rows=(await query(`select n.id,n.kind,n.title,n.body,n.resource_id,n.invitation_id,n.created_at,n.read_at,b.name business_name,i.state invitation_state
 from customer_benefit_notifications n join businesses b on b.id=n.business_id left join customer_invitations i on i.id=n.invitation_id
 where n.customer_id=$1 and not exists(select 1 from customer_business_blocks bl where bl.customer_id=$1 and bl.business_id=n.business_id)
 order by n.created_at desc,n.id desc limit 100`,[a.id])).rows;
 const count=(await query(`select count(*)::int n from customer_benefit_notifications n where customer_id=$1 and read_at is null
 and not exists(select 1 from customer_business_blocks bl where bl.customer_id=$1 and bl.business_id=n.business_id)`,[a.id])).rows[0].n;
 return {public_id:a.public_id,count,items:rows};
}
async function mark(a,id){const r=await query('update customer_benefit_notifications set read_at=coalesce(read_at,now()) where customer_id=$1 and id=$2 returning id',[a.id,id]);if(!r.rowCount)throw notFound();return {ok:true};}
async function processNext(){
 return withTransaction(async db=>{
  const e=(await db.query('select * from customer_benefit_events where processed_at is null order by id limit 1 for update skip locked')).rows[0];if(!e)return false;
  if(e.kind==='INVITATION'){
   const i=(await db.query('select * from customer_invitations where id=$1',[e.resource_id])).rows[0];if(i)await delivery.noticeInvitation(i,db);
  }else{
   let kind=e.kind,id=e.resource_id,eventTitle,eventBody;
   if(kind==='STAMP_EVENT'){
    const r=(await db.query('select member_id,voided_at from stamp_events where id=$1',[id])).rows[0];
    if(r){kind='STAMP';id=r.member_id;eventTitle=r.voided_at?'Un sello fue anulado':'Recibiste un nuevo sello';eventBody='Revisa el progreso de tu tarjeta.';}
   }else if(kind==='POINTS_EVENT'){
    const r=(await db.query('select affiliate_id,points_awarded from affiliate_point_ledger where id=$1',[id])).rows[0];
    if(r){kind='AFFILIATION';id=r.affiliate_id;eventTitle='Tus puntos se actualizaron';eventBody=String(r.points_awarded)+' puntos registrados en tu afiliación.';}
   }else if(kind==='GIFT_ORDER'){
    const r=(await db.query("select reward_pass_id from customer_gift_orders where id=$1 and state='ISSUED'",[id])).rows[0];if(r){kind='GIFT';id=r.reward_pass_id;}
   }
   let s=await delivery.source(kind,id,db);
   // Paid gifts/tickets have explicit recipients and must never be auto-claimed by document.
   if(!s&&kind==='GIFT')s=(await db.query("select id,company_id business_id,'GIFT' kind,'Giftcard' title from reward_passes where id=$1",[id])).rows[0];
   if(!s&&kind==='TICKET')s=(await db.query("select id,business_id,'TICKET' kind,coalesce(metadata->>'reward_label','Ticket de beneficio') title from qr_codes where id=$1",[id])).rows[0];
   if(s && !(await db.query('select 1 from businesses where id=$1 and is_seller_demo',[s.business_id])).rowCount){
    const accounts=(await db.query(`select distinct a.* from customer_accounts a where
      (a.declared_document_key=$1 and a.email=$2 and not a.document_review_required)
      or exists(select 1 from customer_recovered_benefits r where r.customer_id=a.id and r.kind=$3 and r.resource_id=$4)
      or exists(select 1 from customer_relationships r where r.customer_id=a.id and r.business_id=$5 and r.document_key=$1 and r.state='ACCEPTED')
      or exists(select 1 from customer_invitations i where i.customer_id=a.id and i.kind=$3 and (i.result_id=$4 or (i.payload ? 'existing_benefit' and i.resource_id=$4)) and i.state in ('ACCEPTED','PENDING'))
      or exists(select 1 from customer_gift_orders o where $3='GIFT' and o.reward_pass_id=$4 and o.state='ISSUED' and (o.recipient_customer_id=a.id or (o.recipient_customer_id is null and o.recipient_email=a.email)))
      or exists(select 1 from customer_activation_participations cp join interactive_activation_rewards ar on ar.participant_id=cp.participant_id where $3='TICKET' and cp.customer_id=a.id and ar.qr_code_id=$4)
      order by a.id`,[s.document_key||null,s.email||null,kind,id,s.business_id])).rows;
    for(const a of accounts){
     await db.query('select id from customer_accounts where id=$1 for update',[a.id]);
     if(s.document_key)await delivery.offer(a,s,db);
     if(await delivery.owns(a,s,db))await insert(db,{customer_id:a.id,business_id:s.business_id,event_key:eventTitle?e.event_key:'received:'+kind+':'+id,kind,
      title:eventTitle||'Tienes un nuevo beneficio',body:eventBody||s.title,resource_id:id});
    }
   }
  }
  await db.query('update customer_benefit_events set processed_at=now() where id=$1',[e.id]);return true;
 });
}
async function enqueuePush(){
 await query(`insert into customer_benefit_push_deliveries(notification_id,subscription_id)
 select n.id,s.id from customer_benefit_notifications n join customer_payment_push_subscriptions s on s.customer_id=n.customer_id and s.active
 join customer_sessions cs on cs.id=s.session_id and cs.customer_id=s.customer_id and cs.expires_at>now()
 join customer_accounts a on a.id=n.customer_id
 where n.read_at is null and n.created_at>now()-interval '1 day' and coalesce(a.preferences->'notifications'->>'benefits','true')<>'false'
 and not exists(select 1 from customer_business_blocks b where b.customer_id=n.customer_id and b.business_id=n.business_id)
 on conflict(notification_id,subscription_id) do nothing`);
}
async function processPush(send=push.deliver){
 const lease=crypto.randomUUID();
 const d=(await query(`update customer_benefit_push_deliveries set lease_token=$1,lease_until=now()+interval '2 minutes',attempts=attempts+1
 where id=(select id from customer_benefit_push_deliveries where sent_at is null and attempts<4 and retry_at<=now() and (lease_until is null or lease_until<now()) order by retry_at limit 1 for update skip locked) returning *`,[lease])).rows[0];if(!d)return false;
 const s=(await query(`select s.*,a.public_id,n.id notification_id from customer_payment_push_subscriptions s join customer_accounts a on a.id=s.customer_id
 join customer_sessions cs on cs.id=s.session_id and cs.customer_id=a.id and cs.expires_at>now()
 join customer_benefit_notifications n on n.id=$2 and n.customer_id=a.id and n.read_at is null
 where s.id=$1 and s.active and coalesce(a.preferences->'notifications'->>'benefits','true')<>'false'
 and not exists(select 1 from customer_business_blocks b where b.customer_id=a.id and b.business_id=n.business_id)`,[d.subscription_id,d.notification_id])).rows[0];
 try{
  if(s)await send({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},{type:'BENEFIT',public_id:s.public_id,notification_id:s.notification_id});
  await query('update customer_benefit_push_deliveries set sent_at=now(),lease_until=null where id=$1 and lease_token=$2',[d.id,lease]);
 }catch(e){
  if([404,410].includes(e.statusCode))await query('update customer_payment_push_subscriptions set active=false where id=$1',[d.subscription_id]);
  await query("update customer_benefit_push_deliveries set lease_until=null,retry_at=now()+interval '5 minutes' where id=$1 and lease_token=$2",[d.id,lease]);
 }
 return true;
}
async function tick(send=push.deliver){for(let n=0;n<50;n++)if(!await processNext())break;await enqueuePush();for(let n=0;n<25;n++)if(!await processPush(send))break;}
function start(){
 if(process.env.NODE_ENV==='test')return async()=>{};
 let running,stopped=false;const run=()=>{if(!running&&!stopped)running=tick().catch(e=>console.error('Customer benefit notifications:',e.code||e.name)).finally(()=>running=null);};
 const timer=setInterval(run,15000);timer.unref?.();run();return async()=>{stopped=true;clearInterval(timer);await running;};
}
module.exports={insert,list,mark,processNext,enqueuePush,processPush,tick,start};

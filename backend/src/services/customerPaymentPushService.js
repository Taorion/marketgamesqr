const crypto=require('crypto'),webPush=require('web-push');
const {query,withTransaction}=require('../config/db'),{env}=require('../config/env');
const {badRequest}=require('../utils/http');
const {validateSubscription,pushConfigured}=require('./agendaPushService');
const agenda=require('./customerPaymentAgendaService');
let keys=null;
function configured(){return process.env.CUSTOMER_PAYMENT_PUSH_ENABLED!=='false'&&process.env.NODE_ENV!=='test';}
async function getKeys(){
 if(keys)return keys;
 // Existing deployment keys take precedence; otherwise create a persistent private server identity.
 if(pushConfigured())return keys={publicKey:env.agendaPushPublicKey,privateKey:env.agendaPushPrivateKey};
 const generated=webPush.generateVAPIDKeys();
 await query('insert into customer_payment_push_config(singleton,public_key,private_key) values(true,$1,$2) on conflict do nothing',[generated.publicKey,generated.privateKey]);
 const row=(await query('select public_key,private_key from customer_payment_push_config where singleton')).rows[0];
 return keys={publicKey:row.public_key,privateKey:row.private_key};
}
async function settings(account){
 return {configured:configured(),public_key:configured()?(await getKeys()).publicKey:null,
  subscriptions:(await query('select id,endpoint from customer_payment_push_subscriptions where customer_id=$1 and session_id=$2 and active',[account.id,account.session_id])).rows};
}
async function ready(){return configured()?Boolean((await getKeys()).publicKey):false;}
async function subscribe(account,value){
 if(!configured())throw badRequest('Los avisos del dispositivo todavía no están disponibles. Puedes consultar tus recordatorios en la agenda.');
 const s=validateSubscription(value);
 return withTransaction(async db=>{
 await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
 if((await db.query('select count(*)::int n from customer_payment_push_subscriptions where customer_id=$1 and active and endpoint<>$2',[account.id,s.endpoint])).rows[0].n>=20)throw badRequest('Ya tienes 20 dispositivos activos para recordatorios.');
 const r=await db.query(`insert into customer_payment_push_subscriptions(customer_id,session_id,endpoint,p256dh,auth)
  values($1,$2,$3,$4,$5) on conflict(endpoint) do update set session_id=excluded.session_id,p256dh=excluded.p256dh,auth=excluded.auth,active=true
  where customer_payment_push_subscriptions.customer_id=excluded.customer_id returning id`,[account.id,account.session_id,s.endpoint,s.keys.p256dh,s.keys.auth]);
 if(!r.rowCount)throw badRequest('Desactiva las notificaciones de la cuenta anterior en este navegador antes de activarlas aquí.');
 return {ok:true};
 });
}
async function unsubscribe(account,endpoint){
 await query('update customer_payment_push_subscriptions set active=false where customer_id=$1 and endpoint=$2',[account.id,endpoint]);return {ok:true};
}
async function notices(account){
 const date=agenda.today(account),until=new Date(Date.parse(date+'T12:00:00Z')+30*86400000).toISOString().slice(0,10);
 await withTransaction(db=>agenda.materialize(db,account,until));
 const r=await query("select count(*)::int n from customer_payment_items i join customer_recurring r on r.id=i.recurring_id where i.customer_id=$1 and i.status='PENDING' and r.active and r.reminders_enabled and i.due_date<=$2::date+r.remind_days",[account.id,date]);
 return {public_id:account.public_id,count:r.rows[0].n};
}
async function deliver(subscription,payload){
 const config=await getKeys();
 return webPush.sendNotification(validateSubscription(subscription),JSON.stringify(payload),{
  vapidDetails:{subject:env.agendaPushSubject,publicKey:config.publicKey,privateKey:config.privateKey},
  TTL:3600,urgency:'normal',timeout:10000});
}
async function enqueue(){
 await query(`insert into customer_payment_push_deliveries(subscription_id,notice_date)
  select s.id,(now() at time zone a.timezone)::date from customer_payment_push_subscriptions s
  join customer_accounts a on a.id=s.customer_id join customer_sessions cs on cs.id=s.session_id and cs.customer_id=a.id and cs.expires_at>now()
  where s.active and extract(hour from now() at time zone a.timezone)>=9
   and exists(select 1 from customer_payment_items i join customer_recurring r on r.id=i.recurring_id
    where i.customer_id=a.id and i.status='PENDING' and r.active and r.reminders_enabled
     and i.due_date<=(now() at time zone a.timezone)::date+r.remind_days)
  on conflict(subscription_id,notice_date) do nothing`);
}
async function processNext(send=deliver){
 const lease=crypto.randomUUID();
 const row=(await query(`update customer_payment_push_deliveries set lease_token=$1,lease_until=now()+interval '2 minutes',attempts=attempts+1
  where id=(select id from customer_payment_push_deliveries where sent_at is null and attempts<4 and retry_at<=now()
   and (lease_until is null or lease_until<now()) order by retry_at limit 1 for update skip locked) returning *`,[lease])).rows[0];
 if(!row)return false;
 const sub=(await query(`select s.*,a.public_id,a.timezone from customer_payment_push_subscriptions s join customer_accounts a on a.id=s.customer_id
  join customer_sessions cs on cs.id=s.session_id and cs.customer_id=a.id and cs.expires_at>now()
  where s.id=$1 and s.active and $2::date=(now() at time zone a.timezone)::date
  and exists(select 1 from customer_payment_items i join customer_recurring r on r.id=i.recurring_id
   where i.customer_id=a.id and i.status='PENDING' and r.active and r.reminders_enabled
    and i.due_date<=(now() at time zone a.timezone)::date+r.remind_days)`,[row.subscription_id,row.notice_date])).rows[0];
 try{
  if(sub)await send({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
   {title:'Qori · Tu agenda de pagos',body:'Tienes obligaciones próximas o vencidas. Revisa tu agenda.',public_id:sub.public_id,url:'/customer/#payments',tag:'qori-payment-agenda'});
  await query('update customer_payment_push_deliveries set sent_at=now(),lease_until=null where id=$1 and lease_token=$2',[row.id,lease]);
 }catch(e){
  if([404,410].includes(e.statusCode))await query('update customer_payment_push_subscriptions set active=false where id=$1',[row.subscription_id]);
  await query("update customer_payment_push_deliveries set lease_until=null,retry_at=now()+interval '10 minutes' where id=$1 and lease_token=$2",[row.id,lease]);
 }
 return true;
}
let cursor='00000000-0000-0000-0000-000000000000';
async function tick(send=deliver){
 const accounts=(await query(`select a.* from customer_accounts a where a.id>$1
  and exists(select 1 from customer_payment_push_subscriptions s join customer_sessions cs on cs.id=s.session_id and cs.expires_at>now()
   where s.customer_id=a.id and s.active) order by a.id limit 100`,[cursor])).rows;
 for(const a of accounts)await withTransaction(db=>agenda.materialize(db,a,new Date(Date.parse(agenda.today(a)+'T12:00:00Z')+31*86400000).toISOString().slice(0,10)));
 cursor=accounts.length===100?accounts.at(-1).id:'00000000-0000-0000-0000-000000000000';
 await enqueue();for(let i=0;i<25;i++)if(!await processNext(send))break;
}
function start(){
 if(!configured()||process.env.NODE_ENV==='test')return async()=>{};
 let running,stopped=false;const run=()=>{if(!running&&!stopped)running=tick().catch(e=>console.error('Customer payment reminders:',e.code||e.name)).finally(()=>running=null);};
 const timer=setInterval(run,60000);timer.unref?.();getKeys().then(run).catch(e=>console.error('Customer payment push setup:',e.code||e.name));return async()=>{stopped=true;clearInterval(timer);await running;};
}
module.exports={configured,ready,settings,subscribe,unsubscribe,notices,enqueue,processNext,tick,start};

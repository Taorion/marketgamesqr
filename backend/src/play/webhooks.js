const crypto=require('node:crypto'),https=require('node:https'),dns=require('node:dns').promises,net=require('node:net');
const {query,withTransaction}=require('../config/db'),cfg=require('./config');
const EVENTS=['screen_online','game_finished','score_verified','reward_issued'];
function destination(value){
 let u;try{u=new URL(value);}catch{throw cfg.fault(400,'INVALID_WEBHOOK_URL');}
 const allowed=(process.env.QORI_PLAY_WEBHOOK_HOSTS||'').split(',').filter(Boolean);
 if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||u.search||net.isIP(u.hostname)||!allowed.includes(u.hostname))throw cfg.fault(400,'WEBHOOK_DESTINATION_DENIED');
 return u;
}
function publicIPv4(address){
 if(net.isIP(address)!==4)return false;const [a,b,c]=address.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===88&&c===99))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
}
function signature(secret,id,timestamp,body){return crypto.createHmac('sha256',secret).update(timestamp+'.'+id+'.'+body).digest('hex');}
async function deliver(url,body,headers){
 const u=destination(url);let timer;
 const addresses=await Promise.race([dns.lookup(u.hostname,{all:true,family:4}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS_TIMEOUT')),3000);})]).finally(()=>clearTimeout(timer));
 if(!addresses.length||addresses.some(a=>!publicIPv4(a.address)))throw Error('DESTINATION_DENIED');
 // Pin the checked DNS answer to the TLS connection; no redirects/proxy or second lookup.
 return new Promise((resolve,reject)=>{
 const req=https.request(u,{method:'POST',agent:false,servername:u.hostname,maxHeaderSize:8192,
 lookup:(_host,options,cb)=>options.all?cb(null,[addresses[0]]):cb(null,addresses[0].address,4),
 headers:{...headers,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{
  const status=res.statusCode;res.destroy();resolve(status);
 });
 const deadline=setTimeout(()=>req.destroy(Error('DELIVERY_TIMEOUT')),5000);req.once('close',()=>clearTimeout(deadline));req.on('error',reject);req.end(body);
 });
}
async function create(appId,url,events){
 destination(url);if(!Array.isArray(events)||!events.length||events.some(e=>!EVENTS.includes(e)))throw cfg.fault(400,'INVALID_EVENTS');
 return withTransaction(async db=>{
 await require('./service').activeApp(db,appId);await db.query('select id from invoice_apps where id=$1 for update',[appId]);
 if(Number((await db.query('select count(*) n from play_webhooks where app_id=$1 and active',[appId])).rows[0].n)>=3)throw cfg.fault(429,'WEBHOOK_LIMIT');
 const id=crypto.randomUUID(),secret=cfg.token();
 await db.query('insert into play_webhooks(id,app_id,url,events,secret_box) values($1,$2,$3,$4,$5)',[id,appId,url,[...new Set(events)],cfg.seal(secret,'play-webhook:'+id)]);
 await require('./service').event(db,'webhook_created',{app_id:appId},id);return {id,secret,events};
 });
}
async function list(appId){await require('./service').activeApp({query},appId);return {webhooks:(await query('select id,url,events,active,created_at from play_webhooks where app_id=$1 order by created_at',[appId])).rows,
 deliveries:(await query('select id,webhook_id,status,attempts,last_code,created_at,next_attempt_at from play_webhook_deliveries where app_id=$1 order by created_at desc limit 100',[appId])).rows};}
async function change(appId,id,rotate=false){return withTransaction(async db=>{
 await require('./service').activeApp(db,appId);const row=(await db.query('select id from play_webhooks where app_id=$1 and id=$2 and active for update',[appId,id])).rows[0];if(!row)throw cfg.fault(404,'NOT_FOUND');
 const secret=rotate?cfg.token():null;
 await db.query('update play_webhooks set active=$2,secret_box=$3 where id=$1',[id,rotate,rotate?cfg.seal(secret,'play-webhook:'+id):null]);
 if(!rotate)await db.query("update play_webhook_deliveries set status='CANCELLED',lease_id=null where webhook_id=$1 and status in ('PENDING','SENDING')",[id]);
 await require('./service').event(db,rotate?'webhook_rotated':'webhook_revoked',{app_id:appId},crypto.randomUUID());return secret?{secret}:{ok:true};
});}
async function enqueue(db,e){
 if(!EVENTS.includes(e.event_type))return;
 const payload={version:'1',type:e.event_type,occurred_at:e.created_at,screen_id:e.screen_id,campaign_id:e.campaign_id,session_id:e.session_id};
 await db.query(`insert into play_webhook_deliveries(app_id,webhook_id,event_key,payload)
 select app_id,id,$2,$3 from play_webhooks where app_id=$1 and active and $4=any(events) on conflict(webhook_id,event_key) do nothing`,[e.app_id,String(e.id),payload,e.event_type]);
}
async function next(send=deliver){
 if(!cfg.enabled()||process.env.QORI_PLAY_WEBHOOK_DELIVERY_ENABLED!=='true')return false;
 const job=await withTransaction(async db=>{
 const r=(await db.query(`select d.* from play_webhook_deliveries d where (status='PENDING' and next_attempt_at<=now()) or (status='SENDING' and next_attempt_at<=now()) order by next_attempt_at limit 1 for update skip locked`)).rows[0];
 if(!r)return null;const lease=crypto.randomUUID();await db.query("update play_webhook_deliveries set status='SENDING',attempts=attempts+1,lease_id=$2,next_attempt_at=now()+interval '30 seconds' where id=$1",[r.id,lease]);return {...r,lease,attempts:r.attempts+1};
 });if(!job)return false;
 let status='PENDING',code='DELIVERY_FAILED';
 if(job.attempts>6){await query("update play_webhook_deliveries set status='DEAD',lease_id=null,last_code='ATTEMPTS_EXHAUSTED' where id=$1 and lease_id=$2",[job.id,job.lease]);return true;}
 try{
 await require('./service').activeApp({query},job.app_id);
 const hook=(await query('select * from play_webhooks where id=$1 and app_id=$2 and active',[job.webhook_id,job.app_id])).rows[0];
 if(!hook){status='CANCELLED';code='REVOKED';}else{
 const body=JSON.stringify({id:job.id,...job.payload}),timestamp=String(Math.floor(Date.now()/1000));
 const result=await send(hook.url,body,{'X-Qori-Delivery':job.id,'X-Qori-Timestamp':timestamp,'X-Qori-Signature':signature(cfg.unseal(hook.secret_box,'play-webhook:'+hook.id),job.id,timestamp,body)});
 code=Number.isInteger(result)?'HTTP_'+result:'DELIVERY_FAILED';if(result>=200&&result<300)status='DELIVERED';
 }
 }catch(e){if(e.code==='APPLICATION_DISABLED'){status='CANCELLED';code='APPLICATION_DISABLED';}}
 if(status==='PENDING'&&job.attempts>=6)status='DEAD';
 const delay=Math.min(3600,30*2**Math.min(job.attempts-1,7))+crypto.randomInt(0,10);
 await query('update play_webhook_deliveries set status=$2,last_code=$3,lease_id=null,next_attempt_at=now()+($4::int*interval \'1 second\') where id=$1 and lease_id=$5',[job.id,status,code,delay,job.lease]);return true;
}
module.exports={EVENTS,destination,publicIPv4,signature,deliver,create,list,change,enqueue,next};

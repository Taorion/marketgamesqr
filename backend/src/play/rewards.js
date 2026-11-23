const {query,withTransaction}=require('../config/db'),cfg=require('./config'),svc=require('./service');
const {generateQr}=require('../services/qrService');
async function claim(account,token){
 if(!cfg.enabled())throw cfg.fault(403,'SANDBOX_ONLY');
 return withTransaction(async db=>{
 const session=await svc.controller(db,token,true);
 const grant=(await db.query('select * from play_reward_grants where session_id=$1 for update',[session.id])).rows[0];
 if(!grant)throw cfg.fault(409,'NO_REWARD_RESERVED');
 if(grant.customer_id&&grant.customer_id!==account.id)throw cfg.fault(409,'ALREADY_CLAIMED');
 if(grant.status==='ISSUED')return {issued:true,qr_code_id:grant.qr_code_id,synthetic:true};
 const c=await svc.campaign(db,session.campaign_id);
 if(grant.status!=='RESERVED'||new Date(grant.expires_at)<=new Date()||session.status!=='COMPLETED'||!session.verified_result?.won)throw cfg.fault(409,'REWARD_UNAVAILABLE');
 await db.query('select id from play_campaigns where id=$1 for no key update',[c.id]);
 if((await db.query('select 1 from play_reward_grants where campaign_id=$1 and customer_id=$2',[c.id,account.id])).rowCount)throw cfg.fault(409,'ALREADY_CLAIMED');
 // Reuse the actual QR engine and credit ledger in the SAME transaction; never a monetary reward pass.
 const qr=await generateQr({business_id:c.business_id,campaign_id:c.source_id,game_id:c.source_game_id,reward_id:c.reward_id,
 player:{external_id:'qori-play:'+session.id,metadata:{source:'QORI_PLAY_SANDBOX'}},
 metadata:{source:'QORI_PLAY_SANDBOX',play_session_id:session.id},expires_at:new Date(Math.min(Date.now()+86400000,c.ends_at?new Date(c.ends_at).getTime():Infinity)).toISOString()},
 {type:'game',game:{id:c.source_game_id,business_id:c.business_id}},db);
 await db.query("update play_reward_grants set status='ISSUED',customer_id=$2,qr_code_id=$3,consent_version='play-claim-sandbox-1',claimed_at=now() where session_id=$1",[session.id,account.id,qr.qr_code.id]);
 await svc.event(db,'reward_issued',{...session,session_id:session.id});
 return {issued:true,qr_code_id:qr.qr_code.id,synthetic:true};
 });
}
async function list(account){
 return {rewards:(await query(`select g.qr_code_id,g.claimed_at,q.status,q.expires_at,r.name,b.name sponsor
 from play_reward_grants g join qr_codes q on q.id=g.qr_code_id join rewards r on r.id=q.reward_id join businesses b on b.id=q.business_id where g.customer_id=$1 order by g.claimed_at desc limit 100`,[account.id])).rows};
}
async function detail(account,id){
 const r=(await query('select q.token,q.status,q.expires_at from play_reward_grants g join qr_codes q on q.id=g.qr_code_id where g.customer_id=$1 and g.qr_code_id=$2',[account.id,id])).rows[0];
 if(!r)throw cfg.fault(404,'NOT_FOUND');
 const url=new URL('/empresa/',cfg.origin());url.searchParams.set('view','validator');url.searchParams.set('token',r.token);
 return {status:r.status,expires_at:r.expires_at,qr_data_url:await require('qrcode').toDataURL(url.toString()),synthetic:true};
}
module.exports={claim,list,detail};

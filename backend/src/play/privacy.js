const {query,withTransaction}=require('../config/db'),cfg=require('./config'),svc=require('./service');
async function exportSession(token){
 const s=await svc.controller({query},token);
 return {session_id:s.id,status:s.status,consent_version:s.consent_version,consented_at:s.consented_at,created_at:s.created_at,finished_at:s.finished_at,result:s.verified_result,
 events:(await query('select event_type,created_at from play_events where session_id=$1 order by id',[s.id])).rows};
}
async function leave(token){return withTransaction(async db=>{
 const initial=await svc.controller(db,token);
 // Match game input/tick lock order; never lock session before screen.
 await db.query('select id from play_screens where id=$1 for update',[initial.screen_id]);
 const s=await svc.controller(db,token,true);
 await db.query("update play_sessions set status=case when status in ('COMPLETED','FAILED','EXPIRED') then status else 'EXPIRED' end,finished_at=coalesce(finished_at,now()),controller_expires_at=now(),game_state='{}' where id=$1",[s.id]);
 await db.query("update play_reward_grants set status='EXPIRED' where session_id=$1 and status='RESERVED'",[s.id]);
 await svc.event(db,'session_left',{...s,session_id:s.id});
 return {ok:true,unclaimed_reward_released:true};
});}
async function exportCustomer(account){
 return {sessions:(await query(`select s.id,s.status,s.consented_at,s.consent_version,s.created_at,s.finished_at,s.verified_result,
 g.qr_code_id,g.claimed_at,g.consent_version claim_consent_version from play_reward_grants g join play_sessions s on s.id=g.session_id where g.customer_id=$1 order by s.created_at`,[account.id])).rows};
}
async function eraseCustomer(db,id){
 // Called inside Customer's existing deletion transaction, even with Play disabled.
 if(!(await db.query("select to_regclass('public.play_reward_grants') ready")).rows[0].ready)return;
 await db.query("update play_sessions s set controller_expires_at=now(),game_state='{}' from play_reward_grants g where g.session_id=s.id and g.customer_id=$1",[id]);
}
module.exports={exportSession,leave,exportCustomer,eraseCustomer};

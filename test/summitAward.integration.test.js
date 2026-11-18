const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55447/qori_summit_release_qa';
process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://localhost:3000';
const {pool,query}=require('../backend/src/config/db');
const activationService=require('../backend/src/services/interactiveActivationService');
const {act}=require('../backend/src/services/summitRaceService');
const {play}=require('./helpers/summitBot');
test('full canonical services issue one race QR and debit one ticket, then preserve individual awards',async()=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_summit_release_qa');
 const tag=crypto.randomUUID();
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Cumbre isolated QA',$1,'GLOBAL','ACTIVE') returning *",[tag])).rows[0];
 const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'unusable-qa-hash','QA','BUSINESS_OWNER') returning *",[b.id,tag+'@example.invalid'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance) values($1,5)',[b.id]);
 const a=(await activationService.createInteractiveActivation(b.id,u,{title:'Cumbre local QA',activation_type:'QORI_SUMMIT',game_config:{floors:8,duration_seconds:45},capture_config:{collect_participant_data:false},reward_config:{reward_type:'FREE_GIFT',reward_label:'Premio QA sin valor'},max_rewards:2})).activation;
 const start=async alias=>{const p=await activationService.startInteractiveParticipant(a.public_slug,{}, {allowIdentityRecovery:false});return {participant_id:p.participant.id,game_session_token:p.game_session_token,alias};};
 const p=await start('Ana'),q=await start('Luis'),call=(player,action,extra={})=>act(a.public_slug,{...player,action,...extra});
 const room=(await call(p,'create')).room;await call(q,'join',{code:room.code});await call(p,'start');
 await query("update qori_summit_rooms set starts_at=now()-interval '35 seconds' where activation_id=$1",[a.id]);
 const inputs=play(room.config,room.seed).trace.flatMap(([mask,frames])=>Array(frames).fill(mask));
 let result;
 for(let from=0;from<inputs.length;from+=600){const runs=[];for(const mask of inputs.slice(from,from+600)){const tail=runs.at(-1);if(tail?.[0]===mask)tail[1]++;else runs.push([mask,1]);}
  result=await Promise.all([call(p,'input',{from,runs}),call(q,'input',{from,runs})]);
 }
 const winners=result.filter(r=>r.room.own.result);assert.equal(winners.length,1);assert.equal(winners[0].room.own.result.rewarded,true);assert.ok(winners[0].room.own.result.qr_code.id);
 assert.equal((await query('select count(*)::int n from interactive_activation_rewards where activation_id=$1',[a.id])).rows[0].n,1);
 assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,4);
 await call(p,'resume');await call(q,'resume');assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,4);
 const solo=await start('Solo');await query("update interactive_activation_participants set game_session_started_at=now()-interval '35 seconds' where id=$1",[solo.participant_id]);
 const awarded=await activationService.completeInteractiveParticipant(a.public_slug,{...solo,summit_trace:play(a.game_config,solo.game_session_token).trace},{allowIdentityRecovery:false});
 assert.equal(awarded.rewarded,true);assert.notEqual(awarded.qr_code.id,winners[0].room.own.result.qr_code.id);
 assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,3);
 await assert.rejects(activationService.completeInteractiveParticipant(a.public_slug,{...solo,summit_trace:[[0,1]]}),/cerrada/);
});
test('a player can win after a verified rival hit with one canonical QR and one debit',async()=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_summit_release_qa');
 const tag=crypto.randomUUID(),core=require('../activacion/cumbre-core');
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Combat isolated QA',$1,'GLOBAL','ACTIVE') returning *",[tag])).rows[0];
 const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'unusable-qa-hash','QA','BUSINESS_OWNER') returning *",[b.id,tag+'@example.invalid'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance) values($1,2)',[b.id]);
 const a=(await activationService.createInteractiveActivation(b.id,u,{title:'Combat QA',activation_type:'QORI_SUMMIT',game_config:{floors:8,duration_seconds:45},capture_config:{collect_participant_data:false},reward_config:{reward_type:'FREE_GIFT',reward_label:'QA sin valor'},max_rewards:1})).activation;
 const start=async alias=>{const p=await activationService.startInteractiveParticipant(a.public_slug,{}, {allowIdentityRecovery:false});return {participant_id:p.participant.id,game_session_token:p.game_session_token,alias};};
 const p=await start('Ana'),q=await start('Luis'),call=(player,action,extra={})=>act(a.public_slug,{...player,action,...extra});
 const room=(await call(p,'create')).room;await call(q,'join',{code:room.code});await call(p,'start');
 await query("update qori_summit_rooms set starts_at=now()-interval '200 milliseconds' where activation_id=$1",[a.id]);
 await call(p,'input',{from:0,runs:[[8,1]]});const hit=await call(q,'input',{from:0,runs:[[0,1]]});assert.equal(hit.impacts.length,1);
 const state=structuredClone(hit.room.own.state),inputs=[];
 while(!state.done){
  const player=state.player,target=state.platforms[Math.min(state.cfg.floors,state.highest+1)];
  const x=state.highest===state.cfg.floors?180:core.platformX(target,state.tick)+target.w/2;
  let mask=8|(player.x<x-3?2:player.x>x+3?1:0);if(player.ground>=0&&player.ground<state.cfg.floors)mask|=4;
  core.step(state,mask);inputs.push(mask);
 }
 assert.equal(state.won,true);
 await query("update qori_summit_rooms set starts_at=now()-interval '35 seconds' where activation_id=$1",[a.id]);
 let result;
 for(let offset=0;offset<inputs.length;offset+=600){
  const runs=[];for(const mask of inputs.slice(offset,offset+600)){const tail=runs.at(-1);if(tail?.[0]===mask)tail[1]++;else runs.push([mask,1]);}
  result=await call(q,'input',{from:1+offset,runs});
 }
 assert.equal(result.room.own.result.rewarded,true);assert.ok(result.room.own.result.qr_code.id);
 const replayed=(await query('select state,trace from qori_summit_members where participant_id=$1',[q.participant_id])).rows[0];
 assert.equal(replayed.state.impacts.length,1);assert.equal(core.replay(room.config,room.seed,replayed.trace,replayed.state.impacts).won,true);
 await call(q,'resume');assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,1);
 assert.equal((await query('select count(*)::int n from interactive_activation_rewards where activation_id=$1',[a.id])).rows[0].n,1);
});

after(()=>pool.end());

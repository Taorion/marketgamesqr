const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55447/qori_chase_full_qa';process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://localhost:3000';
const {pool,query}=require('../backend/src/config/db'),activationService=require('../backend/src/services/interactiveActivationService'),service=require('../backend/src/services/chaseService'),C=require('../activacion/policias-core');
test('real canonical completion awards the whole winning team once, including prisoners; rematch does not debit again',async()=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_chase_full_qa');
 await query(fs.readFileSync(path.join(__dirname,'../database/migrations/20261128144900_qori_chase_rooms.sql'),'utf8').replaceAll('create table ','create table if not exists ').replaceAll('create index ','create index if not exists '));
 const tag=crypto.randomUUID(),b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Chase isolated QA',$1,'GLOBAL','ACTIVE') returning *",[tag])).rows[0];
 const user=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'unusable-qa','QA','BUSINESS_OWNER') returning *",[b.id,tag+'@example.invalid'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance) values($1,5)',[b.id]);
 const a=(await activationService.createInteractiveActivation(b.id,user,{title:'Persecución QA aislada',activation_type:'QORI_CHASE',game_config:{duration_seconds:180},capture_config:{collect_participant_data:false},reward_config:{reward_type:'FREE_GIFT',reward_label:'QA sin valor'},max_rewards:3})).activation;
 assert.equal(a.game_config.duration_seconds,180);
 const players=[];for(const alias of ['Ana','Luis','Eva']){const started=await activationService.startInteractiveParticipant(a.public_slug,{}, {allowIdentityRecovery:false});players.push({participant_id:started.participant.id,game_session_token:started.game_session_token,alias});}
 const call=(p,action,extra={})=>service.act(a.public_slug,{...p,action,...extra});const room=(await call(players[0],'create')).room;
 for(const p of players.slice(1))await call(p,'join',{code:room.code});await call(players[0],'start');
 const row=(await query('select state from qori_chase_rooms where id=$1',[room.id])).rows[0];C.capture(row.state,row.state.players[0],row.state.players[1],Date.now());C.finish(row.state,'thief','time',Date.now());await query('update qori_chase_rooms set state=$2 where id=$1',[room.id,row.state]);await service.tick(room.id);
 await assert.rejects(activationService.completeInteractiveParticipant(a.public_slug,{...players[1],score:999}),/dentro de la sala/);
 const result=await Promise.all(players.map(p=>service.claim(a.public_slug,p)));
 assert.equal(result[0].rewarded,true);assert.equal(result[1].rewarded,false);assert.equal(result[2].rewarded,true);assert.notEqual(result[0].qr_code.id,result[2].qr_code.id);
 assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,3);
 assert.equal((await query('select count(*)::int n from interactive_activation_rewards where activation_id=$1',[a.id])).rows[0].n,2);
 await call(players[0],'restart',{round_id:row.state.round_id});await call(players[0],'start',{round_id:row.state.round_id});await service.claim(a.public_slug,players[0]);await service.claim(a.public_slug,players[2]);
 assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,3);
 const permissions=(await query("select relname,relrowsecurity,has_table_privilege('anon',oid,'select') anon_read from pg_class where relname in ('qori_chase_rooms','qori_chase_members','qori_chase_rounds')")).rows;assert.ok(permissions.every(r=>r.relrowsecurity&&!r.anon_read));
});
after(()=>pool.end());

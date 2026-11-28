const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55447/qori_chase_full_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='chase-entry-isolated-qa';process.env.PUBLIC_APP_URL='http://localhost:3000';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
const auth=require('../backend/src/services/customerAuthService'),activations=require('../backend/src/services/interactiveActivationService'),chase=require('../backend/src/services/chaseService'),C=require('../activacion/policias-core');
let server,base;
async function customer(){const a=(await query('insert into customer_accounts(email,full_name,declared_document_key) values($1,$2,$3) returning *',[crypto.randomUUID()+'@example.invalid','Jugador QA',crypto.randomUUID()])).rows[0];await query("update customer_accounts set finance_setup_state='LEGACY' where id=$1",[a.id]);return withTransaction(db=>auth.createSession(db,a,'chase-entry-qa'));}
async function post(path,session,body={}){const res=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Qori-Web':'1',Origin:process.env.PUBLIC_APP_URL,...(session?{Cookie:'qori_customer_session='+session.token}:{})},body:JSON.stringify(body)});return {status:res.status,data:await res.json()};}
test('authenticated reentry restores chase from public, publication and invitation links without issuing another reward',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_chase_full_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const tag=crypto.randomUUID(),b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Chase entry QA',$1,'GLOBAL','ACTIVE') returning *",[tag])).rows[0];
 const user=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'unusable-qa','QA','BUSINESS_OWNER') returning *",[b.id,tag+'@example.invalid'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance) values($1,5)',[b.id]);
 const a=(await activations.createInteractiveActivation(b.id,user,{title:'Reentrada QA',activation_type:'QORI_CHASE',capture_config:{collect_participant_data:false},reward_config:{reward_type:'FREE_GIFT',reward_label:'QA sin valor'},max_rewards:3})).activation;
 const customers=await Promise.all([customer(),customer()]),players=[];
 const publicPath='/api/public/activations/'+a.public_slug;
 for(const s of customers){const r=await post(publicPath+'/participants',s);assert.equal(r.status,201,JSON.stringify(r.data));players.push({alias:players.length?'Luis':'Ana',participant_id:r.data.participant.id,game_session_token:r.data.game_session_token});}
 const room=(await chase.act(a.public_slug,{...players[0],action:'create'})).room;
 await chase.act(a.public_slug,{...players[1],action:'join',code:room.code});await chase.act(a.public_slug,{...players[0],action:'start'});
 const state=(await query('select state from qori_chase_rooms where id=$1',[room.id])).rows[0].state;C.finish(state,'thief','time',Date.now());await query('update qori_chase_rooms set state=$2 where id=$1',[room.id,state]);await chase.tick(room.id);
 const results=await Promise.all(players.map(p=>chase.claim(a.public_slug,p)));assert.equal(results.filter(r=>r.rewarded).length,1);
 for(const p of players)await chase.act(a.public_slug,{...p,action:'leave'});
 await query('insert into customer_directory(business_id,published) values($1,true)',[b.id]);
 const pub=(await query("insert into customer_publications(business_id,kind,resource_id,title,status,created_by) values($1,'ACTIVITY',$2,'Chase QA','PUBLISHED',$3) returning id",[b.id,a.id,user.id])).rows[0];
 const invitation=(await query("insert into customer_invitations(business_id,customer_id,created_by,request_id,kind,resource_id,title,state) values($1,$2,$3,$4,'ACTIVITY',$5,'Chase QA','ACCEPTED') returning id",[b.id,customers[0].account.id,user.id,crypto.randomUUID(),a.id])).rows[0];
 const paths=[publicPath+'/participants','/api/customer/explore/publications/'+pub.id+'/participants','/api/customer/invitations/'+invitation.id+'/participants'];
 for(const path of paths)await t.test('reopen '+path.split('/').slice(0,4).join('/'),async()=>{
  const r=await post(path,customers[0]);assert.ok([200,201].includes(r.status),JSON.stringify(r.data));assert.equal(r.data.participant.id,players[0].participant_id);assert.equal(r.data.game_session_token,players[0].game_session_token);assert.equal(r.data.rewarded,undefined);assert.equal(r.data.qr_code,undefined);
 });
 await t.test('expired reward does not block game entry, and the same player can create a new room',async()=>{
  const winner=results.findIndex(r=>r.rewarded);await query("update qr_codes set status='EXPIRED' where id=$1",[results[winner].qr_code.id]);
  for(const path of paths.slice(0,2)){const r=await post(path,customers[winner]);assert.ok([200,201].includes(r.status),JSON.stringify(r.data));assert.equal(r.data.participant.id,players[winner].participant_id);}
  const resumed=await post(publicPath+'/chase',customers[0],{...players[0],action:'resume'});assert.equal(resumed.status,200);assert.equal(resumed.data.has_result,true);assert.equal(resumed.data.room,null);
  const created=await post(publicPath+'/chase',customers[0],{...players[0],action:'create'});assert.equal(created.status,200,JSON.stringify(created.data));assert.notEqual(created.data.room.id,room.id);await chase.act(a.public_slug,{...players[0],action:'leave'});
  assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,4);
  assert.equal((await query('select count(*)::int n from interactive_activation_participants where activation_id=$1',[a.id])).rows[0].n,2);
  assert.equal((await query('select count(*)::int n from interactive_activation_rewards where activation_id=$1',[a.id])).rows[0].n,1);
 });
 await t.test('account and guest boundaries cannot recover another player token',async()=>{
  const publication=await post(paths[1],customers[1],players[0]);assert.equal(publication.status,200);assert.equal(publication.data.participant.id,players[1].participant_id);
  assert.equal(await withTransaction(db=>chase.customerSession(db,a.id,crypto.randomUUID())),null);
  assert.equal((await post(paths[2],customers[1])).status,404);
  const own=await post(paths[0],customers[1],players[0]);assert.equal(own.data.participant.id,players[1].participant_id);
  const guest=await post(paths[0],null,players[0]);assert.notEqual(guest.data.game_session_token,players[0].game_session_token);
 });
 await t.test('other activation types retain their existing result entry behavior',async()=>{
  await query("update interactive_activations set activation_type='QORI_SUMMIT' where id=$1",[a.id]);
  const r=await post(paths[0],customers[0]);assert.equal(r.status,201);assert.deepEqual(r.data,JSON.parse(JSON.stringify(results[0])));
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), crypto = require('node:crypto');
// An isolated local database only. Never use .env or a hosted database for these tests.
process.env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:55447/qori_summit_qa';
process.env.DB_SSL = 'false';
const { pool, query } = require('../backend/src/config/db');
const { act } = require('../backend/src/services/summitRaceService');
const policy = require('../backend/src/services/summitGamePolicy');
const core = require('../activacion/cumbre-core');
const { play } = require('./helpers/summitBot');
let activation;
test.before(async () => {
  assert.equal((await query('select current_database() db')).rows[0].db, 'qori_summit_qa');
  await query(`create table if not exists interactive_activations(id uuid primary key,company_id uuid,public_slug text unique,activation_type text,status text,starts_at timestamptz,ends_at timestamptz,game_config jsonb,reward_config jsonb);
    create table if not exists interactive_activation_participants(id uuid primary key,activation_id uuid references interactive_activations(id),game_session_token text,status text default 'started',completed_at timestamptz,game_session_started_at timestamptz default now(),game_session_completed_at timestamptz,metadata jsonb);
    create table if not exists customer_activation_participations(customer_id uuid,participant_id uuid,activation_id uuid,result jsonb);
    create table if not exists test_awards(id uuid primary key,participant_id uuid unique,room_id uuid unique);`);
  const exists = (await query("select to_regclass('public.qori_summit_rooms') t")).rows[0].t;
  await query('alter table interactive_activation_participants add column if not exists score integer');
  if (!exists) await query(fs.readFileSync('database/migrations/20261118134405_qori_summit_rooms.sql','utf8'));
});
test.beforeEach(async () => {
  await query('truncate qori_summit_members,qori_summit_rooms,interactive_activation_participants,interactive_activations,customer_activation_participations,test_awards cascade');
  activation = { id: crypto.randomUUID(), company_id: crypto.randomUUID(), public_slug: 'familia', activation_type: policy.TYPE, status: 'active', game_config: { floors: 8,duration_seconds:45 }, reward_config: { reward_label: 'Helado familiar' } };
  await query('insert into interactive_activations(id,company_id,public_slug,activation_type,status,game_config,reward_config) values($1,$2,$3,$4,$5,$6,$7)', Object.values(activation));
});
test.after(() => pool.end());
async function player(alias='Dani') {
  const p = { participant_id: crypto.randomUUID(), game_session_token: crypto.randomUUID(), alias };
  await query('insert into interactive_activation_participants(id,activation_id,game_session_token,metadata) values($1,$2,$3,$4)', [p.participant_id,activation.id,p.game_session_token,{summit_signature:policy.signature(activation)}]);
  return p;
}
// The actual room transaction and PostgreSQL locks are used. The external canonical
// reward boundary is replaced with a checked local ledger, not production issuance.
async function complete(slug,body,{client,summitRace}) {
  const p = (await client.query('select * from interactive_activation_participants where id=$1',[body.participant_id])).rows[0];
  assert.equal(policy.verify(activation,p,body,Date.now(),summitRace).won,true);
  await client.query('insert into test_awards values($1,$2,$3)',[crypto.randomUUID(),p.id,summitRace.roomId]);
  await client.query("update interactive_activation_participants set status='rewarded',completed_at=now() where id=$1",[p.id]);
  return { rewarded:true,benefit_url:'https://example.invalid/private-winner-qr',participant:{id:p.id},credit_account:{private:true} };
}
const call = (p,action,extra={},options={}) => act('familia',{...p,action,...extra},{complete,...options});
async function pair() {
  const p=await player('Ana'),q=await player('Luis');
  const {room}=await call(p,'create'); await call(q,'join',{code:room.code});
  return {p,q,room:(await call(p,'start')).room};
}
function chunks(trace,max=600) {
  const flat=trace.flatMap(([mask,count])=>Array(count).fill(mask)), result=[];
  for(let from=0;from<flat.length;from+=max){const runs=[];for(const mask of flat.slice(from,from+max)){const t=runs.at(-1);if(t?.[0]===mask)t[1]++;else runs.push([mask,1]);}result.push({from,runs});}
  return result;
}
test('same code shares seed, requires two connected players, and allows 2–8 players',async()=>{
  const host=await player(),{room}=await call(host,'create');
  await assert.rejects(call(host,'start'),/2 jugadores conectados/);
  for(let i=0;i<7;i++){const p=await player('Familiar '+i);const joined=(await call(p,'join',{code:room.code})).room;assert.equal(joined.seed,room.seed);}
  await assert.rejects(call(await player(),'join',{code:room.code}),/8 jugadores/);
  const another=await player(); await assert.rejects(call(another,'state',{code:room.code}),/perteneces/);
});

test('two players start without readiness or filling all eight places',async()=>{
  const {room}=await pair();
  assert.equal(room.status,'racing');assert.equal(room.members.length,2);
  assert.ok(room.members.every(m=>m.ready===false));
  const countdown=new Date(room.starts_at)-new Date(room.server_now);
  assert.ok(countdown>=2900&&countdown<=3000);
});

test('only one connected player cannot start; disconnected extras do not block two online players',async()=>{
  const p=await player('Ana'),q=await player('Luis'),r=await player('Dani');
  const {room}=await call(p,'create');await call(q,'join',{code:room.code});await call(r,'join',{code:room.code});
  await query("update qori_summit_members set updated_at=now()-interval '10 seconds'");
  await assert.rejects(call(p,'start'),/2 jugadores conectados/);
  await call(q,'state');
  // The host's start request proves they are connected, even after a stale heartbeat.
  const started=(await call(p,'start')).room;
  assert.equal(started.status,'racing');assert.equal(started.members.length,3);
  assert.equal(started.members.find(m=>m.id===r.participant_id).connected,false);
});
test('countdown, session ownership, activation scope and late joins are enforced',async()=>{
  const {p,q,room}=await pair();
  await assert.rejects(call(q,'start'),/organiza/);
  await assert.rejects(call(p,'input',{from:0,runs:[[0,1]]}),/cuenta regresiva/);
  await assert.rejects(call({...p,game_session_token:crypto.randomUUID()},'state'),/Sesión/);
  await assert.rejects(call(p,'state',{}, {customerId:crypto.randomUUID()}),/cuenta/);
  await assert.rejects(call(await player(),'join',{code:room.code}),/comenzó/);
  await assert.rejects(act('otra',{...p,action:'state'}),/encontrada/);
});
test('concurrent arrivals commit one winner, retries return only their own reward, Customer receives it',async()=>{
  const {p,q,room}=await pair();
  await query('insert into customer_activation_participations values($1,$2,$3,null)',[crypto.randomUUID(),p.participant_id,activation.id]);
  const solution=play(room.config,room.seed);assert.equal(solution.state.won,true);
  const packets=chunks(solution.trace);
  await query("update qori_summit_rooms set starts_at=now()-interval '35 seconds'");
  for(const packet of packets.slice(0,-1)){await call(p,'input',packet);await call(q,'input',packet);}
  const results=await Promise.all([call(p,'input',packets.at(-1)),call(q,'input',packets.at(-1))]);
  const winners=results.filter(r=>r.room.own.result);assert.equal(winners.length,1);
  assert.equal((await query('select count(*)::int n from test_awards')).rows[0].n,1);
  assert.equal(results[0].room.winner_id,results[1].room.winner_id);
  const win=results[0].room.winner_id===p.participant_id?p:q,lose=win===p?q:p;
  const retry=await call(win,'input',packets.at(-1));assert.equal(retry.room.own.result.rewarded,true);assert.equal(retry.room.own.result.credit_account,undefined);
  const losing=await call(lose,'resume');assert.equal(losing.room.own.result,null);assert.equal(JSON.stringify(losing).includes('private-winner-qr'),false);
  if(win===p)assert.equal((await query('select result from customer_activation_participations')).rows[0].result.rewarded,true);
});
test('packets are idempotent; impossible speed, fake controls and changed prize cannot win',async()=>{
  const {p}=await pair();await query("update qori_summit_rooms set starts_at=now()-interval '1 second'");
  await assert.rejects(call(p,'input',{from:0,runs:[[0,600]]}),/tiempo/);
  await assert.rejects(call(p,'input',{from:0,runs:[[16,1]]}),/Controles/);
  const first=await call(p,'input',{from:0,runs:[[2,10]]});
  const retry=await call(p,'input',{from:0,runs:[[2,10]]});assert.equal(retry.room.own.state.tick,first.room.own.state.tick);
  await query("update interactive_activations set reward_config='{}'::jsonb");
  assert.equal((await call(p,'state')).room.status,'expired');
  assert.equal((await query('select count(*)::int n from test_awards')).rows[0].n,0);
});

test('a failed reward transaction rolls back the finish and cannot leave a false winner',async()=>{
  const {p,room}=await pair(),packets=chunks(play(room.config,room.seed).trace);
  await query("update qori_summit_rooms set starts_at=now()-interval '35 seconds'");
  for(const packet of packets.slice(0,-1))await call(p,'input',packet);
  await assert.rejects(call(p,'input',packets.at(-1),{complete:async()=>{throw new Error('No quedan premios');}}),/No quedan premios/);
  const recovered=(await call(p,'resume')).room;
  assert.equal(recovered.status,'racing');assert.equal(recovered.winner_id,null);assert.equal(recovered.own.state.done,false);
  assert.equal((await query('select count(*)::int n from test_awards')).rows[0].n,0);
});
test('leaving transfers host; running disconnects preserve state and expire without a prize',async()=>{
  const p=await player(),q=await player(),created=(await call(p,'create')).room;
  await call(q,'join',{code:created.code});await call(p,'leave');
  assert.equal((await call(q,'state')).room.host_id,q.participant_id);
  await call(p,'join',{code:created.code});await call(p,'ready',{ready:true});await call(q,'ready',{ready:true});await call(q,'start');
  await query("update qori_summit_rooms set starts_at=now()-interval '2 seconds'");
  await call(p,'input',{from:0,runs:[[2,60]]});
  const recovered=(await call(p,'resume')).room;assert.equal(recovered.own.state.tick,60);
  await assert.rejects(call(p,'leave'),/comenzó/);
  await query("update qori_summit_rooms set starts_at=now()-interval '48 seconds'");
  assert.equal((await call(q,'state')).room.status,'expired');
  assert.equal((await query('select count(*)::int n from test_awards')).rows[0].n,0);
});
test('tables deny direct anonymous reads and have RLS enabled',async()=>{
  const rows=(await query("select relname,relrowsecurity from pg_class where relname in ('qori_summit_rooms','qori_summit_members')")).rows;
  assert.equal(rows.length,2);assert.ok(rows.every(r=>r.relrowsecurity));
  const grants=(await query("select has_table_privilege('anon','qori_summit_rooms','SELECT') allowed")).rows[0];assert.equal(grants.allowed,false);
});

test('verified hammer impacts persist with the room, replay once and survive reconnects',async()=>{
 const {p,q,room}=await pair();
 await query("update qori_summit_rooms set starts_at=now()-interval '200 milliseconds' where activation_id=$1 and status='racing'",[activation.id]);
 await call(p,'input',{from:0,runs:[[8,1]],impacts:[{tick:1,direction:-1}]});
 const hit=await call(q,'input',{from:0,runs:[[0,1]]});
 assert.equal(hit.impacts.length,1);assert.equal(hit.impacts[0].attacker_id,p.participant_id);assert.equal(hit.impacts[0].target_id,q.participant_id);
 const resumed=(await call(q,'resume')).room;assert.equal(resumed.own.state.impacts.length,1);
 const pushed=(await call(q,'input',{from:1,runs:[[0,3]]})).room;
 assert.ok(pushed.own.state.player.x>86);assert.equal(pushed.own.state.lives,3);
 const retry=await call(q,'input',{from:1,runs:[[0,3]]});assert.equal(retry.impacts.length,0);assert.deepEqual(retry.room.own.state,pushed.own.state);
 assert.equal((await query('select count(*)::int n from test_awards')).rows[0].n,0);
});

test('simultaneous attacks remain single impacts per target and cannot affect another room',async()=>{
 const {p,q,room}=await pair(),outsider=await player('Otra sala');await call(outsider,'create');
 await query("update qori_summit_rooms set starts_at=now()-interval '200 milliseconds' where activation_id=$1 and status='racing'",[activation.id]);
 const results=await Promise.all([call(p,'input',{from:0,runs:[[8,1]]}),call(q,'input',{from:0,runs:[[8,1]]})]);
 assert.equal(results.flatMap(r=>r.impacts).length,2);
 const states=await Promise.all([call(p,'resume'),call(q,'resume'),call(outsider,'resume')]);
 assert.equal(states[0].room.own.state.impacts.length,1);assert.equal(states[1].room.own.state.impacts.length,1);assert.equal(states[2].room.own.state.impacts.length,0);
});

test('a failed state write rolls back both the attack and its peer impact',async()=>{
 const {p,q}=await pair();await query("update qori_summit_rooms set starts_at=now()-interval '200 milliseconds' where activation_id=$1 and status='racing'",[activation.id]);
 await call(p,'input',{from:0,runs:[[8,1]]});
 const transaction=handler=>require('../backend/src/config/db').withTransaction(client=>handler({query(sql,params){
  if(sql.includes('jsonb_to_recordset'))throw new Error('Simulated write failure');return client.query(sql,params);
 }}));
 await assert.rejects(call(q,'input',{from:0,runs:[[0,1]]},{transaction}),/Simulated write failure/);
 const unchanged=(await call(q,'resume')).room.own.state;assert.equal(unchanged.tick,0);assert.equal(unchanged.impacts.length,0);
 const retry=await call(q,'input',{from:0,runs:[[0,1]]});assert.equal(retry.impacts.length,1);
});

test('two HTTP clients create, join and directly start then resume their shared room',async()=>{
  const express=require('express'),app=express();app.use(express.json());
  app.post('/api/public/activations/:slug/summit',require('../backend/src/controllers/summitRaceController').action);
  app.use((err,req,res,next)=>res.status(err.status||500).json({message:err.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const stopLive=require('../backend/src/services/summitLiveService').attach(server);
  try {
    const url=`http://127.0.0.1:${server.address().port}/api/public/activations/familia/summit`;
    const post=async body=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
    const p=await player('Ana'),q=await player('Luis');
    const created=await post({...p,action:'create'});assert.equal(created.status,200);
    assert.equal(created.data.room.members.length,1);
    const joined=await post({...q,action:'join',code:created.data.room.code});assert.equal(joined.status,200);assert.equal(joined.data.room.members.length,2);
    assert.ok(joined.data.room.members.every(m=>m.ready===false));
    const started=await post({...p,action:'start'});assert.equal(started.data.room.status,'racing');
    const resumed=await post({...q,action:'resume'});assert.equal(resumed.data.room.starts_at,started.data.room.starts_at);
    const {WebSocket}=require('ws'),{once}=require('node:events'),origin=new URL(url).origin;
    const connect=async access=>{
      const ws=new WebSocket(origin.replace('http','ws')+access.path,{origin});ws.on('error',()=>{});
      await once(ws,'open');const ready=once(ws,'message');ws.send(JSON.stringify({type:'auth',token:access.token}));
      assert.equal(JSON.parse((await ready)[0]).type,'ready');return ws;
    };
    const liveP=await connect(started.data.live),liveQ=await connect(resumed.data.live);
    try{
      const delivered=once(liveQ,'message'),s=started.data.room.own.state;
      liveP.send(JSON.stringify({type:'pose',pose:{tick:0,x:s.player.x,y:s.player.y,face:1,lives:s.lives}}));
      const movement=JSON.parse((await delivered)[0]);assert.equal(movement.id,p.participant_id);assert.equal(movement.type,'pose');
      await query("update qori_summit_rooms set starts_at=now()-interval '200 milliseconds' where activation_id=$1",[activation.id]);
      await post({...p,action:'input',from:0,runs:[[8,1]]});
      const confirmed=once(liveQ,'message');
      const struck=await post({...q,action:'input',from:0,runs:[[0,1]]});assert.equal(struck.status,200);
      const impact=JSON.parse((await confirmed)[0]);assert.equal(impact.type,'impact');assert.equal(impact.impact.target_id,q.participant_id);
      assert.equal((await query('select state from qori_summit_members where participant_id=$1',[q.participant_id])).rows[0].state.impacts[0].id,impact.impact.id);
    }finally{liveP.terminate();liveQ.terminate();}
    const denied=await post({...p,action:'state',game_session_token:crypto.randomUUID()});assert.equal(denied.status,403);
    const malformed=await post({...p,action:'input',runs:[[99,1]],from:0});assert.equal(malformed.status,400);
  }finally{stopLive();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

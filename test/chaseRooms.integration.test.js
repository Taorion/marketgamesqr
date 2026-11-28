const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55447/qori_chase_qa';process.env.DB_SSL='false';process.env.JWT_SECRET='chase-local-tests-only';
const {pool,query}=require('../backend/src/config/db'),service=require('../backend/src/services/chaseService'),C=require('../activacion/policias-core'),f=require('./helpers/chaseFixture');
let a;
test.before(async()=>f.schema(query));test.beforeEach(async()=>{f.guard();await query('truncate interactive_activations cascade');a=await f.activation(query);});test.after(()=>pool.end());
const player=(alias)=>f.player(query,a,alias),call=(p,action,extra={})=>service.act('barrio',{...p,action,...extra});
async function pair(n=2){const players=[await player('Luna')];let room=(await call(players[0],'create')).room;for(let i=1;i<n;i++){players.push(await player('Sol '+i));room=(await call(players[i],'join',{code:room.code})).room;}return {players,room};}
async function mutate(id,fn){const row=(await query('select state from qori_chase_rooms where id=$1',[id])).rows[0];fn(row.state);await query('update qori_chase_rooms set state=$2 where id=$1',[id,row.state]);}
test('concurrent joins enforce eight slots, unique colors, no duplicate rooms and backend start minimum',async()=>{
 const host=await player(),created=await Promise.allSettled([call(host,'create'),call(host,'create')]);assert.ok(created.some(r=>r.status==='fulfilled'));
 const room=(await call(host,'resume')).room;assert.equal((await query('select count(*)::int n from qori_chase_rooms')).rows[0].n,1);await assert.rejects(call(host,'start'),/2 y 8/);
 const people=await Promise.all(Array.from({length:8},()=>player()));const joins=await Promise.allSettled(people.map(p=>call(p,'join',{code:room.code})));assert.equal(joins.filter(r=>r.status==='fulfilled').length,7);assert.match(joins.find(r=>r.status==='rejected').reason.message,/8 jugadores/);
 const state=(await call(host,'state')).room;assert.equal(new Set(state.players.map(p=>p.color)).size,8);assert.equal(state.players.filter(p=>p.team==='thief').length,4);
});
test('session token, activation/tenant isolation and membership are enforced',async()=>{const {players:[p,q],room}=await pair();await assert.rejects(call({...q,game_session_token:'wrong-session'},'state'),/Sesión/);const other=await f.activation(query,'other');const outsider=await f.player(query,other);await assert.rejects(service.act('other',{...outsider,action:'join',code:room.code}),/encontramos/);await assert.rejects(call(await player(),'state',{code:room.code}),/perteneces/);await assert.rejects(service.act('barrio',{...p,action:'state'},{customerId:crypto.randomUUID()}),/cuenta/);});
test('host/readiness, late join and five minute finished-room expiry',async()=>{const {players:[p,q],room}=await pair();await assert.rejects(call(q,'start'),/anfitrión/);await call(q,'ready',{ready:true});const start=(await call(p,'start')).room;assert.equal(start.status,'countdown');await assert.rejects(call(await player(),'join',{code:room.code}),/comenzó/);await mutate(room.id,s=>C.finish(s,'thief','time',Date.now()-301000));await service.tick(room.id);assert.equal((await call(p,'state')).room.status,'closed');});
test('capture and rescue shared state survives reconnect and room is independent',async()=>{
 const {players,room}=await pair(4),other=await pair();await call(players[0],'start');
 await mutate(room.id,s=>{s.status='running';s.starts=Date.now()-1000;s.updated=Date.now()-25;s.ends=Date.now()+60000;s.players[0].x=8;s.players[0].y=15;s.players[1].x=8.4;s.players[1].y=15;});
 await service.tick(room.id);let s=(await call(players[0],'resume')).room;assert.equal(s.players[0].captured,true);const color=s.players[0].color;
 await mutate(room.id,s=>{s.players[2].x=s.players[0].x+.4;s.players[2].y=s.players[0].y;s.updated=Date.now()-25;});await service.tick(room.id);s=(await call(players[0],'resume')).room;assert.equal(s.players[0].captured,false);assert.equal(s.players[0].color,color);assert.equal((await call(other.players[0],'state')).room.status,'waiting');
});
test('all captured finishes once; rematch keeps identity and rejects old-round movement',async()=>{
 const {players:[p,q],room}=await pair();let s=(await call(p,'start')).room;const old=s.round_id;
 await mutate(room.id,s=>{s.status='running';s.starts=Date.now()-1000;s.updated=Date.now()-50;s.players.forEach(p=>{p.x=8;p.y=15;});});await Promise.all([service.tick(room.id),service.tick(room.id)]);
 s=(await call(p,'state')).room;assert.equal(s.winner,'police');assert.equal((await query('select count(*)::int n from qori_chase_rounds')).rows[0].n,1);
 s=(await call(p,'restart',{round_id:old})).room;assert.equal(s.status,'waiting');assert.equal(s.players[0].color,C.COLORS[0]);await assert.rejects(call(p,'start'),/ronda cambió/);s=(await call(p,'start',{round_id:old})).room;assert.notEqual(s.round_id,old);const newer=s.round_id;
 await call(p,'input',{round_id:old,seq:1,x:1,y:0});assert.equal((await call(q,'resume')).room.round_id,newer);
});
test('leave transfers host in lobby, abandonment closes round, inactive lobby closes on sweep',async()=>{
 const {players:[p,q],room}=await pair();await call(p,'leave');assert.equal((await call(q,'resume')).room.host_id,q.participant_id);
 await mutate(room.id,s=>{s.expires=Date.now()-100;});await service.sweep();assert.equal((await call(q,'state')).room.status,'closed');
 const second=await pair();const started=(await call(second.players[0],'start')).room;await call(second.players[1],'leave',{round_id:started.round_id});const final=(await call(second.players[0],'resume')).room;assert.equal(final.status,'countdown');assert.equal(final.players[1].abandoned,true);
});
test('two independent HTTP + WebSocket clients share authoritative movement and replace duplicate connection',async()=>{
 const express=require('express'),{WebSocket}=require('ws'),app=express();app.use(express.json());app.post('/api/public/activations/:slug/chase',require('../backend/src/controllers/chaseController').action);app.use((err,req,res,next)=>res.status(err.status||400).json({message:err.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const stop=require('../backend/src/services/chaseLiveService').attach(server),origin='http://127.0.0.1:'+server.address().port,sockets=[];
 try{
  const p=await player('Uno'),q=await player('Dos');
  const post=async(p,action,extra={})=>{const r=await fetch(origin+'/api/public/activations/barrio/chase',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...p,action,...extra})});assert.equal(r.status,200);return r.json();};
  const created=await post(p,'create'),joined=await post(q,'join',{code:created.room.code});
  function socket(live){return new Promise((resolve,reject)=>{const ws=new WebSocket(origin.replace('http','ws')+live.path,{origin});sockets.push(ws);ws.on('open',()=>ws.send(JSON.stringify({type:'auth',token:live.token})));ws.on('error',reject);ws.once('message',()=>resolve(ws));});}
  const w1=await socket(created.live),w2=await socket(joined.live);const latest=new Map();for(const [i,ws]of [w1,w2].entries())ws.on('message',raw=>{latest.set(i,JSON.parse(raw).room);});
  const start=await post(p,'start');await mutate(start.room.id,s=>{s.starts=Date.now()-20;s.updated=Date.now()-20;s.status='running';});
  const initial=(await post(p,'state')).room.players.find(x=>x.id===p.participant_id);w1.send(JSON.stringify({type:'input',round_id:start.room.round_id,seq:0,x:0,y:-1}));
  await new Promise(r=>setTimeout(r,350));assert.ok(latest.get(1).players.find(x=>x.id===p.participant_id).y<initial.y);assert.equal(latest.get(0).round_id,latest.get(1).round_id);
  const closed=new Promise(r=>w1.once('close',code=>r(code)));await socket(created.live);assert.equal(await closed,4001);
 }finally{for(const ws of sockets)ws.terminate();stop();await new Promise(r=>server.close(r));}
});
test('canonical completion boundary is idempotent and private to participant, even across rematch',async()=>{
 const {players:[p,q],room}=await pair();await call(p,'start');await mutate(room.id,s=>C.finish(s,'thief','time',Date.now()));await service.tick(room.id);let calls=0;
 const complete=async(slug,body,{client,chaseResult})=>{calls++;assert.equal(chaseResult.won,body.participant_id===p.participant_id);return {rewarded:chaseResult.won,benefit_url:'https://example.invalid/private',credit_account:{secret:true}};};
 const results=await Promise.all([service.claim('barrio',p,{complete}),service.claim('barrio',p,{complete})]);assert.equal(calls,1);assert.equal(results[0].credit_account,undefined);assert.equal(JSON.stringify(await call(q,'state')).includes('/private'),false);
 await call(p,'restart',{round_id:(await call(p,'state')).room.round_id});await service.claim('barrio',p,{complete});assert.equal(calls,1);
});

const test=require('node:test'),assert=require('node:assert/strict'),C=require('../activacion/policias-core');
test('every size reserves an opposite role and supports selection changes without rebalancing',()=>{
 for(let n=2;n<=8;n++)for(const team of ['police','thief']){
  const s={...C.lobby(0),team_selection:true,player_limit:n,players:Array.from({length:n},(_,i)=>({id:String(i),team:null}))};
  for(const p of s.players.slice(0,-1)){assert.ok(C.canChoose(s,p,team));p.team=team;C.forceTeams(s);}
  const last=s.players.at(-1);assert.equal(last.team,team==='police'?'thief':'police');assert.equal(last.team_forced,true);
  assert.equal(C.canChoose(s,last,team),false);assert.equal(C.teamsReady(s),true);
  if(n>2){s.players[0].team=last.team;assert.equal(C.canChoose(s,last,team),true);}
 }
});
test('all worlds support seven guards or seven thieves with clear distinct spawns and prison cells',()=>{
 for(const w of C.WORLDS)for(const majority of ['police','thief']){
  const s={...C.lobby(0),scenario_id:w.id,team_selection:true,player_limit:8,players:Array.from({length:8},(_,i)=>({id:String(i),team:i<7?majority:majority==='police'?'thief':'police',seen:3000}))};
  C.start(s,0,'round',{});const m=C.mapFor(w.id);
  for(const p of s.players){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.equal(C.blocked(p.x,p.y,C.CONFIG.radius,m),false);for(const q of s.players)if(q!==p)assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>C.CONFIG.radius*2);}
  if(majority==='thief'){
   s.status='running';const cop=s.players[7];for(const p of s.players.slice(0,7))C.capture(s,p,cop,3001);
   assert.equal(new Set(s.players.slice(0,7).map(p=>p.cell)).size,7);
   for(const p of s.players.slice(0,7)){assert.equal(C.blocked(p.x,p.y,C.CONFIG.radius,m),false);for(const q of s.players.slice(0,7))if(p!==q)assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>C.CONFIG.radius*2);}
   C.contacts(s,3001);assert.equal(s.winner,'police');
  }
 }
});

const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../activacion/cumbre-core'),rules=require('../backend/src/services/summitRaceRules');
const policy=require('../backend/src/services/summitGamePolicy');
function arena(){
 const config={floors:8,duration_seconds:45,lives:3},seed='combat';
 const room={status:'racing',starts_at:new Date(0).toISOString(),config,seed};
 const a={participant_id:'a',state:core.create(config,seed),trace:[]},b={participant_id:'b',state:core.create(config,seed),trace:[]};
 b.state.player.x=110;
 return {room,a,b,members:[a,b],events:[]};
}
function advance(f,m,runs,now=100){return rules.advance(f.room,m,{from:m.state.tick,runs},now,f.members,f.events);}
test('hammer hits a rival in front once per swing; knockback does not directly remove a life',()=>{
 const f=arena();advance(f,f.a,[[8,1]]);advance(f,f.b,[[0,1]]);
 assert.equal(f.events.length,1);assert.equal(f.events[0].target_id,'b');assert.equal(f.events[0].direction,1);
 advance(f,f.b,[[0,1]]);assert.equal(f.b.state.lives,3);assert.ok(f.b.state.player.x>110);assert.ok(f.b.state.stunUntil>f.b.state.tick);
 advance(f,f.a,[[8,4]]);advance(f,f.b,[[0,3]]);
 assert.equal(f.events.length,1,'one swing and retries must not stack hits');
 const before=structuredClone(f.b.state);
 rules.advance(f.room,f.b,{from:0,runs:[[0,1]]},100,f.members,f.events);
 assert.deepEqual(f.b.state,before);assert.equal(f.events.length,1);
});
test('range, facing, height and respawn protection prevent invalid hits',()=>{
 for(const change of [f=>{f.b.state.player.x=160;},f=>{f.b.state.player.x=60;},f=>{f.b.state.player.y-=60;},f=>{f.b.state.hitUntil=120;}]){
  const f=arena();change(f);advance(f,f.a,[[8,1]]);advance(f,f.b,[[0,1]]);assert.equal(f.events.length,0);
 }
});
test('matched historical ticks handle reversed packet arrival; stale or mismatched positions cannot hit',()=>{
 const f=arena();advance(f,f.b,[[0,5]]);advance(f,f.a,[[8,5]]);
 assert.equal(f.events.length,1);assert.equal(f.events[0].tick,6);
 const stale=arena();advance(stale,stale.a,[[8,1]],3000);advance(stale,stale.b,[[0,1]],3000);assert.equal(stale.events.length,0);
 const mismatch=arena();mismatch.b.state.tick=50;advance(mismatch,mismatch.a,[[8,1]]);advance(mismatch,mismatch.b,[[0,1]],1000);assert.equal(mismatch.events.length,0);
});
test('knockback can cause an off-screen fall and respawn at the last stable platform',()=>{
 const s=core.create({floors:8,lives:3},'edge'),floor=s.platforms[2];
 Object.assign(s.player,{x:floor.x+floor.w-5,y:floor.y,ground:1});
 s.checkpoint=2;s.highest=2;s.camera=floor.y-300;
 s.impacts=[{id:'hit',tick:1,direction:1}];
 for(let i=0;i<200&&s.lives===3;i++)core.step(s,0);
 assert.equal(s.lives,2);assert.equal(s.player.ground,2);assert.equal(s.player.pushX,0);assert.ok(s.player.y-s.camera<480);
});
test('prize verification uses only persisted server impacts and ignores forged body impacts',()=>{
 const config={floors:8,lives:1,duration_seconds:45},seed='replay',s=core.create(config,seed),trace=[];
 const impacts=[{id:'server-hit',tick:8,direction:1}];s.impacts=impacts;
 while(!s.done){core.step(s,1);const tail=trace.at(-1);if(tail)tail[1]++;else trace.push([1,1]);}
 const verified=core.replay(config,seed,trace,impacts);assert.equal(verified.won,false);assert.equal(verified.frames,s.tick);
 assert.throws(()=>core.replay(config,seed,trace),/terminad/);
 const a={game_config:config,reward_config:{reward_label:'Prize'}},p={game_session_token:seed,game_session_started_at:new Date(0),metadata:{summit_signature:policy.signature(a)}};
 const body={game_session_token:seed,summit_trace:[[0,2700]],impacts:[{tick:1,direction:1}]};
 assert.equal(policy.verify(a,p,body,45000).reason,'timeout');
 assert.equal(policy.verify(a,p,{...body,summit_trace:trace},45000,{seed,startsAt:new Date(0),impacts}).frames,s.tick);
});

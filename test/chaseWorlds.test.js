const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../activacion/policias-core');
test('twenty unique named scenarios have distinct geometry and safe connected routes',async t=>{
 assert.equal(C.WORLDS.length,20);assert.equal(new Set(C.WORLDS.map(w=>w.id)).size,20);
 assert.equal(new Set(C.WORLDS.map(w=>JSON.stringify(C.mapFor(w.id).obstacles))).size,20);
 for(const world of C.WORLDS)await t.test(world.name,()=>{
  const m=C.mapFor(world.id),blocked=(x,y)=>C.blocked(x,y,C.CONFIG.radius,m),key=(x,y)=>x+','+y;
  for(const p of [...m.police,...m.thieves,...m.cells])assert.equal(blocked(p.x,p.y),false,'clear spawn/cell');
  for(let i=0;i<m.obstacles.length;i++)for(let j=i+1;j<m.obstacles.length;j++){const a=m.obstacles[i],b=m.obstacles[j];if(a.kind==='bars'||b.kind==='bars')continue;assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'obstacle overlap');}
  const seen=new Set(['1,1']),queue=[[1,1]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const a=x+dx,b=y+dy,k=key(a,b);if(!seen.has(k)&&!blocked(a,b)){seen.add(k);queue.push([a,b]);}}}
  for(let x=.5;x<m.width;x+=.5)for(let y=.5;y<m.height;y+=.5)if(!blocked(x,y))assert.ok(seen.has(key(x,y)),`unreachable ${x},${y}`);
  assert.ok(seen.has('22.5,18'),'rescue entrance reachable');
  const o=m.obstacles[0],p={team:'police',x:o.x-.4,y:o.y+1};for(let i=0;i<40;i++)C.move(p,1,0,25,C.CONFIG,m);assert.ok(p.x<=o.x-C.CONFIG.radius);
  assert.equal(C.clearLine({x:o.x-.1,y:o.y+1},{x:o.x+o.w+.1,y:o.y+1},m),false);
  const s=C.lobby(0);s.scenario_id=world.id;s.players=Array.from({length:4},(_,i)=>({id:String(i),color:C.COLORS[i],seen:3000}));C.balance(s.players);C.start(s,0,'r',{});C.advance(s,3000);
  C.capture(s,s.players[0],s.players[1],3001);assert.deepEqual({x:s.players[0].x,y:s.players[0].y},m.cells[0]);Object.assign(s.players[2],{x:s.players[0].x+.4,y:s.players[0].y});C.contacts(s,3025);assert.equal(s.players[0].captured,false);
  C.capture(s,s.players[0],s.players[1],3050);C.capture(s,s.players[2],s.players[3],3050);C.contacts(s,3050);assert.equal(s.winner,'police');
 });
 assert.equal(C.mapFor('__proto__'),C.MAP);assert.equal(C.mapFor(),C.MAP);
});

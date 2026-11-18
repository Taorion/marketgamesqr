const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(request) {
  const dom=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'}),w=dom.window,host=w.document.getElementById('host'),mounts=[];
  w.QoriSummit={mount(h,options){const game={options,destroyed:false,packet:()=>({from:0,runs:[]}),opponents(list){this.others=list;},finish(copy){this.message=copy;},destroy(){this.destroyed=true;}};mounts.push(game);return game;}};
  w.eval(fs.readFileSync('activacion/cumbre-modes.js','utf8'));
  let result;
  const controller=w.QoriSummitModes.mount(host,{request,solo:{seed:'solo'},onResult:r=>{result=r;}});
  return {w,host,mounts,result:()=>result,click:a=>host.querySelector(`[data-action="${a}"]`).click(),close(){controller.destroy();w.close();}};
}
function room(status='waiting') { return {code:'ABCD23',status,host_id:'p1',winner_id:null,server_now:new Date().toISOString(),starts_at:new Date(Date.now()+3000).toISOString(),config:{floors:8},prize:'Helado',seed:'shared',members:[{id:'p1',alias:'Ana',ready:false,connected:true,floor:0},{id:'p2',alias:'<img src=x onerror=alert(1)>',ready:false,connected:true,floor:0}],own:{id:'p1',state:{tick:0},result:null}}; }
test('the player chooses individual without creating a room',async()=>{
  const calls=[],env=setup(async body=>{calls.push(body);return {room:null};});
  await tick();env.click('solo');assert.equal(env.mounts[0].options.seed,'solo');assert.deepEqual(calls.map(c=>c.action),['resume']);env.close();
});
test('family lobby creates room, escapes aliases, waits for readiness, starts shared race and recovers winner reward',async()=>{
  let state=null;const calls=[];
  const env=setup(async body=>{calls.push(body);if(body.action==='create')state=room();if(body.action==='ready')state.members.forEach(m=>m.ready=true);if(body.action==='start')state.status='racing';return {room:state&&structuredClone(state)};});
  await tick();env.click('family');env.host.querySelector('.cumbre-alias').value='Ana';env.click('create');await tick();
  assert.match(env.host.querySelector('.cumbre-room-code').textContent,/ABCD23/);assert.equal(env.host.querySelector('img'),null);
  assert.equal(env.host.querySelector('[data-action="start"]').disabled,true);
  env.click('ready');await tick();assert.equal(env.host.querySelector('[data-action="start"]').disabled,false);
  env.click('start');await tick();assert.equal(env.mounts.length,1);assert.equal(env.mounts[0].options.seed,'shared');assert.equal(env.mounts[0].others.length,1);
  state.status='finished';state.winner_id='p1';state.own.result={rewarded:true,benefit_url:'winner-only'};
  env.host.querySelector('[data-action="resume"]').hidden=false;env.click('resume');await tick();
  assert.equal(env.result().benefit_url,'winner-only');assert.match(env.host.querySelector('.cumbre-network').textContent,/Ganaste/);
  assert.equal(env.mounts[0].destroyed,true);env.close();
});
test('a failed request keeps reconnect available and a loser never receives a reward',async()=>{
  let fail=true;const state=room('finished');state.winner_id='p2';
  const env=setup(async()=>{if(fail)throw new Error('Sin red');return {room:state};});await tick();
  assert.equal(env.host.querySelector('[data-action="resume"]').hidden,false);fail=false;env.click('resume');await tick();
  assert.equal(env.result(),undefined);assert.match(env.host.querySelector('.cumbre-network').textContent,/llegó primero/);assert.equal(env.host.querySelector('img'),null);env.close();
});

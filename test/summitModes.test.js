const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(request, options = {}) {
  const dom=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'}),w=dom.window,host=w.document.getElementById('host'),mounts=[];
  w.QoriSummit={mount(h,options){const game={options,destroyed:false,packet:()=>({from:0,runs:[]}),opponents(list){this.others=list;},finish(copy){this.message=copy;},destroy(){this.destroyed=true;}};mounts.push(game);return game;}};
  w.eval(fs.readFileSync('activacion/cumbre-modes.js','utf8'));
  let result;
  const controller=w.QoriSummitModes.mount(host,{request,solo:{seed:'solo'},onResult:r=>{result=r;},...options});
  return {w,host,mounts,controller,result:()=>result,click:a=>host.querySelector(`[data-action="${a}"]`).click(),close(){controller.destroy();w.close();}};
}
function room(status='waiting') { return {code:'ABCD23',status,host_id:'p1',winner_id:null,server_now:new Date().toISOString(),starts_at:new Date(Date.now()+3000).toISOString(),config:{floors:8},prize:'Helado',seed:'shared',members:[{id:'p1',alias:'Ana',ready:false,connected:true,floor:0},{id:'p2',alias:'<img src=x onerror=alert(1)>',ready:false,connected:true,floor:0}],own:{id:'p1',state:{tick:0},result:null}}; }
test('the player chooses individual without creating a room',async()=>{
  const calls=[],env=setup(async body=>{calls.push(body);return {room:null};});
  await tick();env.click('solo');assert.equal(env.mounts[0].options.seed,'solo');assert.deepEqual(calls.map(c=>c.action),['resume']);env.close();
});
test('family lobby starts with two connected players without readiness and recovers winner reward',async()=>{
  let state=null;const calls=[];
  const env=setup(async body=>{calls.push(body);if(body.action==='create')state=room();if(body.action==='ready')state.members.forEach(m=>m.ready=true);if(body.action==='start')state.status='racing';return {room:state&&structuredClone(state)};});
  await tick();env.click('family');env.host.querySelector('.cumbre-alias').value='Ana';env.click('create');await tick();
  assert.match(env.host.querySelector('.cumbre-room-code').textContent,/ABCD23/);assert.equal(env.host.querySelector('img'),null);
  assert.equal(env.host.querySelector('[data-action="ready"]'),null);
  assert.equal(env.host.querySelector('[data-action="start"]').disabled,false);
  assert.match(env.host.querySelector('[data-action="start"]').textContent,/2 jugadores/);
  env.click('start');await tick();assert.equal(env.mounts.length,1);assert.equal(env.mounts[0].options.seed,'shared');assert.equal(env.mounts[0].others.length,1);
  state.status='finished';state.winner_id='p1';state.own.result={rewarded:true,benefit_url:'winner-only'};
  env.host.querySelector('[data-action="resume"]').hidden=false;env.click('resume');await tick();
  assert.equal(env.result().benefit_url,'winner-only');assert.match(env.host.querySelector('.cumbre-network').textContent,/Ganaste/);
  assert.equal(env.mounts[0].destroyed,true);env.close();
});

test('start needs two online players, ignores disconnected extras and belongs to the host',async()=>{
  const state=room();state.members[1].connected=false;
  const env=setup(async()=>({room:structuredClone(state)}));
  try {
    await tick();assert.equal(env.host.querySelector('[data-action="start"]').disabled,true);
    state.members.push({id:'p3',alias:'Luis',connected:true,ready:false,floor:0});
    env.click('resume');await tick();
    assert.equal(env.host.querySelector('[data-action="start"]').disabled,false);
    assert.match(env.host.querySelector('[data-action="start"]').textContent,/2 jugadores/);
    state.host_id='p3';env.click('resume');await tick();
    assert.equal(env.host.querySelector('[data-action="start"]').hidden,true);
  } finally {env.close();}
});

test('a start click during an in-flight lobby poll is sent once after the poll',async()=>{
  const state=room(),calls=[];let release,pollStarted;
  const started=new Promise(resolve=>{pollStarted=resolve;});
  const env=setup(async body=>{
    calls.push(body.action);
    if(body.action==='state'){pollStarted();await new Promise(resolve=>{release=resolve;});}
    if(body.action==='start')state.status='racing';
    return {room:structuredClone(state)};
  });
  try {
    await started;env.click('start');env.click('start');
    assert.equal(calls.includes('start'),false);
    release();await tick();
    assert.deepEqual(calls,['resume','state','start']);
    assert.equal(env.mounts.length,1);
  } finally {release?.();env.close();}
});
test('a failed request keeps reconnect available and a loser never receives a reward',async()=>{
  let fail=true;const state=room('finished');state.winner_id='p2';
  const env=setup(async()=>{if(fail)throw new Error('Sin red');return {room:state};});await tick();
  assert.equal(env.host.querySelector('[data-action="resume"]').hidden,false);fail=false;env.click('resume');await tick();
  assert.equal(env.result(),undefined);assert.match(env.host.querySelector('.cumbre-network').textContent,/llegó primero/);assert.equal(env.host.querySelector('img'),null);env.close();
});

test('live movement is separate from authoritative requests and closes on the race result',async()=>{
  const state=room('racing');let receive,stopped=0;const poses=[];
  const env=setup(async()=>({room:structuredClone(state),live:{path:'/api/public/summit-live',token:'ticket'}}));
  env.w.QoriSummitLive={connect(access,onPose){receive=onPose;assert.equal(access.token,'ticket');return {send:p=>poses.push(p),destroy(){stopped++;}};}};
  try{
    await tick();const game=env.mounts[0];let remote;
    game.remotePose=(id,p)=>{remote={id,p};};
    game.options.onPose({tick:3,x:90});assert.equal(poses.length,1);
    receive('p2',{tick:4,x:100});assert.deepEqual(remote,{id:'p2',p:{tick:4,x:100}});
    state.status='finished';state.winner_id='p2';
    env.click('resume');await tick();assert.equal(stopped,1);
    assert.equal(env.result(),undefined);
  }finally{env.close();}
});

test('HTTP clock estimates cannot pause or accelerate a running race',async()=>{
  const state=room('racing');let monotonic=0;
  const env=setup(async()=>({room:structuredClone(state)}));
  Object.defineProperty(env.w.performance,'now',{value:()=>monotonic});
  try{
    await tick();const game=env.mounts[0],before=game.options.race.now();
    monotonic=100;state.server_now=new Date(Date.now()+10000).toISOString();
    await new Promise(resolve=>setTimeout(resolve,320));
    game.options.onFinish();await tick();
    assert.equal(game.options.race.now()-before,100);
  }finally{env.close();}
});

test('every terminal room offers one restart without replaying or reissuing its result',async()=>{
  for(const outcome of ['winner','loser','nobody','expired']) {
    const state=room(outcome==='expired'?'expired':'finished'),calls=[];let restarts=0,release;
    state.winner_id=outcome==='winner'?'p1':outcome==='loser'?'p2':null;
    if(outcome==='winner')state.own.result={rewarded:true,benefit_url:'existing-prize'};
    const env=setup(async body=>{calls.push(body.action);return {room:state};},{onRestart:()=>{restarts++;return new Promise(r=>{release=r;});}});
    try {
      await tick();assert.equal(env.host.querySelector('[data-action="restart"]').hidden,false);
      env.click('restart');env.click('restart');await tick();assert.equal(restarts,1);
      assert.deepEqual(calls,['resume']);assert.equal(env.result()?.benefit_url,outcome==='winner'?'existing-prize':undefined);
      release();await tick();assert.equal(env.host.querySelector('[data-action="restart"]').disabled,false);
    } finally {release?.();env.close();}
  }
});

test('a stalled request times out, aborts and allows reconnect; its late result is ignored',async()=>{
  let release,signal,calls=0;
  const env=setup((body,options)=>{
    calls++;if(calls===1){signal=options.signal;return new Promise(r=>{release=r;});}
    return Promise.resolve({room:null});
  },{requestTimeoutMs:20});
  try {
    await new Promise(r=>setTimeout(r,40));assert.equal(signal.aborted,true);
    assert.equal(env.host.querySelector('[data-action="resume"]').disabled,false);
    assert.match(env.host.querySelector('.cumbre-network').textContent,/tardó demasiado/);
    env.click('resume');await tick();assert.equal(calls,2);
    release({room:room('finished')});await tick();assert.equal(env.host.querySelector('.cumbre-room').hidden,true);
    assert.equal(env.host.querySelector('[data-action="family"]').disabled,false);
  } finally {env.close();}
});

test('destroy aborts an in-flight request and its completion cannot change a replacement screen',async()=>{
  let release,signal;
  const env=setup((body,options)=>{signal=options.signal;return new Promise(r=>{release=r;});});
  env.controller.destroy();assert.equal(signal.aborted,true);
  env.host.innerHTML='<button data-action="family" disabled>New session</button>';
  release({room:room('finished')});await tick();
  assert.equal(env.host.querySelector('button').disabled,true);assert.equal(env.host.textContent,'New session');env.w.close();
});

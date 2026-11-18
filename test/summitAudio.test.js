const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {environment}=require('./helpers/fakeSummitAudio');
const source=fs.readFileSync('activacion/cumbre-audio.js','utf8');
function setup(options){const env=environment(options),changes=[];vm.runInNewContext(source,env.root);const audio=env.root.QoriSummitAudio.create({onChange:s=>changes.push(s)});return {...env,audio,changes};}
test('music starts only after a gesture and schedules a bounded multi-instrument loop',async()=>{
 const env=setup();env.audio.setPlaying(true);assert.equal(env.contexts.length,0);assert.equal(env.timers.size,0);
 await env.audio.unlock();const context=env.contexts[0];assert.equal(env.timers.size,1);assert.equal(env.changes.at(-1).unlocked,true);
 let maximum=0;for(let i=0;i<600;i++){env.pump();maximum=Math.max(maximum,context.sources.filter(s=>!s.ended).length);}
 assert.ok(context.sources.some(s=>s.type==='square'));assert.ok(context.sources.some(s=>s.type==='triangle'));assert.ok(context.sources.some(s=>s.kind==='buffer'));
 assert.ok(new Set(context.sources.filter(s=>s.type==='square').map(s=>s.frequency.value)).size>8,'melody must vary across the loop');
 assert.ok(maximum<16,'the sequencer must not accumulate active voices');
 assert.equal(env.timers.size,1,'unlocking again must not duplicate sequencers');await env.audio.unlock();assert.equal(env.timers.size,1);
 env.audio.destroy();assert.equal(env.timers.size,0);assert.equal(context.state,'closed');
});
test('mute persists, stops scheduled notes immediately and suppresses effects',async()=>{
 const env=setup();env.audio.setPlaying(true);await env.audio.unlock();const context=env.contexts[0];
 env.audio.effect(660);await env.audio.setEnabled(false);
 assert.equal(env.stored.get('qori-summit-sound'),'off');assert.equal(env.timers.size,0);assert.ok(context.sources.every(s=>s.ended&&s.disconnected));
 const count=context.sources.length;env.audio.effect(880);await env.audio.unlock();assert.equal(context.sources.length,count);
 await env.audio.toggle();assert.equal(env.stored.get('qori-summit-sound'),'on');assert.equal(env.timers.size,1);env.audio.destroy();
 const muted=setup({muted:true});muted.audio.setPlaying(true);await muted.audio.unlock();assert.equal(muted.contexts.length,0);muted.audio.destroy();
});
test('background, terminal states and delayed timers do not leak music or replay overdue notes',async()=>{
 const env=setup();env.audio.setPlaying(true);await env.audio.unlock();const context=env.contexts[0];
 env.audio.setVisible(false);assert.equal(env.timers.size,0);assert.ok(context.sources.every(s=>s.ended));
 env.pump(30);env.audio.setVisible(true);assert.equal(env.timers.size,1);
 const before=context.sources.length;env.pump(15);assert.ok(context.sources.length-before<=6,'no catch-up burst after a stalled timer');
 env.audio.setPlaying(false);assert.equal(env.timers.size,0);assert.ok(context.sources.every(s=>s.ended));
 env.audio.effect(880,.3);assert.ok(context.sources.some(s=>!s.ended),'ending effect can play after background music stops');
 env.audio.destroy();assert.ok(context.sources.every(s=>s.ended));
});
test('unsupported audio and rejected resume never stop gameplay and can retry on a new gesture',async()=>{
 const absent=setup({unsupported:true});assert.equal(await absent.audio.unlock(),false);assert.equal(absent.changes.at(-1).available,false);absent.audio.destroy();
 const env=setup();const Context=env.root.AudioContext;
 Context.prototype.resume=function(){this.resumeCalls++;return Promise.reject(new Error('Gesture required'));};
 env.audio.setPlaying(true);assert.equal(await env.audio.unlock(),false);assert.equal(env.timers.size,0);
 const context=env.contexts[0];context.resume=async()=>{context.state='running';};
 assert.equal(await env.audio.unlock(),true);assert.equal(env.timers.size,1);env.audio.destroy();
});

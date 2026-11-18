const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { JSDOM } = require("jsdom");
const { play } = require("./helpers/summitBot");
function setup() {
  const dom = new JSDOM('<div id="host"></div>', { runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window; let clock = 0, id = 0; const frames = new Map();
  w.structuredClone = structuredClone;
  Object.defineProperty(w.performance, "now", { value: () => clock });
  w.requestAnimationFrame = fn => { frames.set(++id, fn); return id; }; w.cancelAnimationFrame = n => frames.delete(n);
  const labels=[];
  const context = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }),fillText(value,x,y){labels.push({value,x,y});} }, { get: (t, k) => t[k] || (() => {}) });
  w.HTMLCanvasElement.prototype.getContext = () => context;
  w.HTMLElement.prototype.setPointerCapture = () => {};
  for (const file of ["cumbre-core.js", "cumbre-view.js"]) w.eval(fs.readFileSync(path.join(__dirname, "..", "activacion", file), "utf8"));
  return { w, host: w.document.getElementById("host"), frames, labels,now:()=>clock,close: () => w.close(), frame() { clock += 1000 / 60; for (const [key, fn] of [...frames]) { frames.delete(key); fn(clock + .00001); } } };
}
test("the visible prize is safely rendered, keyboard play reaches it and returns a replay", () => {
  const env = setup(), { w, host } = env, config = { floors: 8 }, seed = "session-test";
  let result;
  const game = w.QoriSummit.mount(host, { config, seed, prize: '<img src=x onerror=alert(1)> café', onFinish: r => { result = r; } });
  assert.equal(host.querySelector(".cumbre-prize-label").textContent, '<img src=x onerror=alert(1)> café'); assert.equal(host.querySelector("img"), null);
  host.querySelector(".cumbre-start").click();
  const { trace } = play(config, seed); let previous = 0;
  const codes = [[1, "ArrowLeft"], [2, "ArrowRight"], [4, "Space"], [8, "KeyX"]];
  for (const [mask, count] of trace) {
    for (const [bit, code] of codes) if (Boolean(mask & bit) !== Boolean(previous & bit)) w.dispatchEvent(new w.KeyboardEvent(mask & bit ? "keydown" : "keyup", { code, bubbles: true }));
    previous = mask;
    for (let n = 0; n < count; n++) env.frame();
  }
  assert.equal(result?.won, true); assert.equal(host.querySelector(".cumbre-cover h2").textContent, "¡CIMA ALCANZADA!");
  assert.equal(w.QoriSummitCore.replay(config, seed, result.trace).won, true);
  game.destroy(); assert.equal(env.frames.size, 0); env.close();
});

test('multiplayer uses shared countdown, catches up with neutral input and stops on the server result', () => {
  const env = setup(), {w,host} = env; let serverClock = 10000;
  const initialState=w.QoriSummitCore.create({duration_seconds:45},'family');
  const game=w.QoriSummit.mount(host,{initialState,config:initialState.cfg,seed:'family',race:{startsAt:13000,now:()=>serverClock}});
  env.frame();assert.match(host.querySelector('.cumbre-cover').textContent,/3/);assert.equal(game.packet(0).runs.length,0);
  serverClock=14000;env.frame();assert.equal(game.packet(0).runs.reduce((sum,r)=>sum+r[1],0),60);
  assert.ok(game.packet(0).runs.every(r=>r[0]===0));
  game.opponents([{alias:'<img src=x>',x:120,y:380}]);env.frame();assert.equal(host.querySelector('img'),null);
  game.finish('Ana ganó el premio');assert.match(host.querySelector('.cumbre-cover').textContent,/Ana/);assert.equal(env.frames.size,0);
  game.destroy();env.close();
});
test("touch supports simultaneous direction and jump, cancels inputs, and tears down listeners", () => {
  const env = setup(), { w, host } = env; let result;
  const game = w.QoriSummit.mount(host, { config: { duration_seconds: 45 }, onFinish: r => { result = r; } });
  host.querySelector(".cumbre-start").click();
  function pointer(bit, name, id) { const e = new w.Event(name, { bubbles: true }); Object.defineProperty(e, "pointerId", { value: id }); host.querySelector(`[data-bit="${bit}"]`).dispatchEvent(e); }
  pointer(2, "pointerdown", 1); pointer(4, "pointerdown", 2);
  for (let i = 0; i < 20; i++) env.frame();
  pointer(2, "pointercancel", 1); pointer(4, "pointerup", 2);
  for (let i = 0; i < 2750 && !result; i++) env.frame();
  assert.ok(result); assert.ok(result.trace.some(run => run[0] === 6)); assert.ok(result.trace.some(run => run[0] === 0));
  game.destroy(); assert.equal(env.frames.size, 0); env.close();
});

test('remote movement is interpolated every frame and older HTTP snapshots cannot rewind it',()=>{
  const env=setup(),{w,host}=env,poses=[];
  const initial=w.QoriSummitCore.create({floors:8},'live'),y=initial.player.y;
  const game=w.QoriSummit.mount(host,{initialState:initial,race:{startsAt:0,now:env.now},onPose:p=>poses.push(p)});
  game.opponents([{id:'b',alias:'Luis',x:40,y,tick:0}]);
  const drawn=[];
  for(let frame=0;frame<90;frame++){
    if(frame%3===0)game.remotePose('b',{tick:frame,x:40+frame*2,y,face:1,lives:3,walking:true});
    if(frame%30===0)game.opponents([{id:'b',alias:'Luis',x:40,y,tick:0}]);
    env.frame();drawn.push(env.labels.filter(l=>l.value==='Luis').at(-1).x);
  }
  assert.ok(new Set(drawn.map(x=>Math.round(x))).size>70,'rival must move between network packets');
  for(let i=12;i<drawn.length;i++)assert.ok(drawn[i]>=drawn[i-1]&&drawn[i]-drawn[i-1]<4,'continuous forward movement, not snapshot jumps');
  assert.ok(drawn.at(-1)>185,'no half-second polling delay');
  assert.ok(poses.length>=29&&poses.length<=31,'movement sent at 20 Hz');
  game.remotePose('b',{tick:1,x:12,y,face:1,lives:3});env.frame();
  assert.ok(env.labels.filter(l=>l.value==='Luis').at(-1).x>=drawn.at(-1));
  game.remotePose('b',{tick:92,x:80,y,face:1,lives:2});env.frame();
  assert.equal(env.labels.filter(l=>l.value==='Luis').at(-1).x,80,'respawn is not interpolated across the mountain');
  game.destroy();env.close();
});

test('without a live channel the rival still eases toward HTTP positions without blocking local inputs',()=>{
  const env=setup(),{w,host}=env,initial=w.QoriSummitCore.create({floors:8},'fallback'),y=initial.player.y;
  const game=w.QoriSummit.mount(host,{initialState:initial,race:{startsAt:0,now:env.now}});
  game.opponents([{id:'b',alias:'Luis',x:40,y,tick:0}]);env.frame();
  game.opponents([{id:'b',alias:'Luis',x:140,y,tick:30}]);
  w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'ArrowRight'}));env.frame();
  const first=env.labels.filter(l=>l.value==='Luis').at(-1).x;assert.ok(first>40&&first<70);
  for(let i=0;i<30;i++)env.frame();
  assert.ok(env.labels.filter(l=>l.value==='Luis').at(-1).x>139);
  assert.ok(game.packet(0).runs.some(r=>r[0]===2));game.destroy();env.close();
});

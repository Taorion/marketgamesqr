/* Qori · Barrio del Farol. Original simulation; world units never depend on pixels. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object') module.exports = api; else root.QoriChaseCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const VERSION = 1;
  const COLORS = ['#ffcb52','#56c9ff','#f276a6','#9fe078','#bb9bff','#ff9257','#52dfca','#f0eef9'];
  const CONFIG = Object.freeze({ duration_seconds: 180, countdown_ms: 3000, radius: .28,
    police_speed: 3.25, thief_speed: 3.05, step_ms: 25, input_lease_ms: 650,
    disconnected_ms: 10000, abandon_ms: 30000, lobby_ms: 1800000, finished_ms: 300000 });
  const MAP = { width: 26, height: 22, name: 'Barrio del Farol',
    obstacles: [
      {x:4,y:4,w:4,h:3,hz:64,kind:'cafe'}, {x:12,y:3,w:4,h:3,hz:72,kind:'shop'},
      {x:20,y:3,w:3,h:2,hz:24,kind:'car'}, {x:3,y:11,w:3,h:2,hz:22,kind:'garden'},
      {x:9,y:9,w:3,h:4,hz:60,kind:'house'}, {x:16,y:9,w:4,h:1,hz:24,kind:'wall'},
      {x:17,y:12,w:2,h:2,hz:22,kind:'crates'}, {x:5,y:17,w:4,h:1,hz:16,kind:'bench'},
      {x:12,y:17,w:3,h:2,hz:24,kind:'garden'},
      {x:20,y:16,w:.3,h:5,hz:34,kind:'bars'}, {x:20,y:20.7,w:5,h:.3,hz:34,kind:'bars'},
      {x:24.7,y:16,w:.3,h:5,hz:34,kind:'bars'},
      {x:20,y:16,w:1.2,h:.3,hz:34,kind:'bars'}, {x:23.8,y:16,w:1.2,h:.3,hz:34,kind:'bars'}],
    prison: {x:20,y:16,w:5,h:5},
    cells: [{x:21.2,y:18},{x:23.5,y:18},{x:21.2,y:19.8},{x:23.5,y:19.8}],
    police: [{x:2,y:3},{x:2,y:5},{x:2,y:7},{x:2,y:9}],
    thieves: [{x:23,y:8},{x:24,y:10},{x:23,y:12},{x:24,y:14}]
  };
  function normalize(config={}) { return {...CONFIG, duration_seconds: Math.max(45, Math.min(300, Math.round(Number(config.duration_seconds) || 180)))}; }
  function blocked(x,y,r=CONFIG.radius) {
    if (x<r || y<r || x>MAP.width-r || y>MAP.height-r) return true;
    return MAP.obstacles.some(o => {
      const dx=x-Math.max(o.x,Math.min(x,o.x+o.w)), dy=y-Math.max(o.y,Math.min(y,o.y+o.h));
      return dx*dx+dy*dy < r*r;
    });
  }
  function clearLine(a,b) {
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.08));
    for(let i=0;i<=steps;i++) if(blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,.01)) return false;
    return true;
  }
  function touching(a,b) { return Math.hypot(a.x-b.x,a.y-b.y)<=CONFIG.radius*2 && clearLine(a,b); }
  function move(p,x,y,dt,config=CONFIG) {
    const length=Math.hypot(x,y); if(length>1){x/=length;y/=length;}
    const speed=p.team==='police'?config.police_speed:config.thief_speed;
    const dx=x*speed*dt/1000,dy=y*speed*dt/1000;
    if(!blocked(p.x+dx,p.y))p.x+=dx;
    if(!blocked(p.x,p.y+dy))p.y+=dy;
    p.moving=!!length; if(length){p.dx=x;p.dy=y;}
  }
  // Screen directions -> world directions, with equal diagonal and axial speed.
  function screenInput(x,y) { const a=x+y,b=y-x,n=Math.max(1,Math.hypot(a,b)); return {x:a/n,y:b/n}; }
  function balance(players) { players.forEach((p,i)=>{p.team=i%2===0?'thief':'police';}); }
  function lobby(now) {return {version:VERSION,status:'waiting',round_id:null,round:0,players:[],events:[],event_seq:0,updated:now,expires:now+CONFIG.lobby_ms};}
  function event(s,type,p,actor,now) {s.events.push({id:++s.event_seq,type,player:p?.id,actor:actor?.id,x:p?.x,y:p?.y,at:now,round_id:s.round_id});s.events=s.events.slice(-24);}
  function start(s,now,roundId,config) {
    s.config=normalize(config);s.round++;s.round_id=roundId;s.status='countdown';s.starts=now+s.config.countdown_ms;
    s.ends=s.starts+s.config.duration_seconds*1000;s.updated=now;s.winner=null;s.reason=null;s.events=[];
    let pi=0,ti=0;
    for(const p of s.players){Object.assign(p,p.team==='police'?MAP.police[pi++]:MAP.thieves[ti++]);Object.assign(p,{captured:false,cell:null,input:{x:0,y:0,until:0},seq:-1,moving:false,abandoned:false,ready:false});}
  }
  function finish(s,winner,reason,now){s.status='finished';s.winner=winner;s.reason=reason;s.finished=now;s.expires=now+CONFIG.finished_ms;s.players.forEach(p=>{p.moving=false;p.input={x:0,y:0,until:0};});event(s,'finish',null,null,now);}
  function capture(s,p,actor,now,reason='capture'){
    if(p.captured)return;
    event(s,reason,p,actor,now);
    const used=new Set(s.players.filter(q=>q.captured).map(q=>q.cell));
    p.cell=MAP.cells.findIndex((_,i)=>!used.has(i));p.captured=true;p.moving=false;
    Object.assign(p,MAP.cells[p.cell]);p.input={x:0,y:0,until:0};
  }
  function contacts(s,now){
    if(!['running','countdown'].includes(s.status))return;
    const police=s.players.filter(p=>p.team==='police'&&!p.abandoned),thieves=s.players.filter(p=>p.team==='thief');
    // Capture batch precedes rescue batch. Only thieves free before AND after it can rescue.
    const free=thieves.filter(p=>!p.captured&&!p.abandoned);
    for(const p of free){const cop=police.find(q=>touching(p,q));if(cop)capture(s,p,cop,now);}
    if(thieves.every(p=>p.captured)){finish(s,'police','all_captured',now);return;}
    for(const p of thieves.filter(q=>q.captured&&!q.abandoned)){
      const rescuer=free.find(q=>!q.captured&&q.id!==p.id&&touching(q,p));
      // A police body at the prisoner prevents a release/recapture flicker in the same step.
      if(rescuer&&!police.some(q=>touching(q,p))){p.captured=false;p.cell=null;event(s,'rescue',p,rescuer,now);}
    }
  }
  function advance(s,now){
    if(s.status==='waiting' || s.status==='finished'){if(now>=s.expires)s.status='closed';s.updated=now;return s;}
    if(!['countdown','running'].includes(s.status))return s;
    if(now<s.starts){s.updated=now;return s;}
    s.status='running';
    let t=Math.max(s.updated,s.starts);
    // No replay of stale movement after outages: inputs have a short server-time lease.
    while(t<Math.min(now,s.ends)&&s.status==='running'){
      const next=Math.min(t+CONFIG.step_ms,now,s.ends);
      // At the exact deadline time wins; a capture must have occurred strictly before it.
      if(next>=s.ends){finish(s,'thief','time',s.ends);break;}
      for(const p of s.players){
        if(next-p.seen>=CONFIG.abandon_ms && !p.abandoned){p.abandoned=true;if(p.team==='thief')capture(s,p,null,next,'abandon');}
        if(p.captured||p.abandoned){p.moving=false;continue;}
        const input=p.input||{},valid=input.until>t;
        move(p,valid?input.x:0,valid?input.y:0,next-t,s.config);
      }
      contacts(s,next);
      t=next;
      // Empty/offline rooms still finish; only movement leases need fine stepping.
      if(s.status==='running' && next-s.updated>1000 && s.players.every(p=>(p.input?.until||0)<=next)){
        const boundary=Math.min(now,s.ends-1,...s.players.filter(p=>!p.abandoned).map(p=>p.seen+CONFIG.abandon_ms));
        if(boundary>t)t=boundary;
      }
    }
    s.updated=now;return s;
  }
  function input(s,p,body,now){
    if(body.round_id!==s.round_id || s.status!=='running'||p.captured||p.abandoned)return false;
    if(!Number.isSafeInteger(body.seq)||body.seq<=p.seq||!Number.isFinite(body.x)||!Number.isFinite(body.y)||Math.abs(body.x)>1||Math.abs(body.y)>1)return false;
    p.seq=body.seq;p.input={x:body.x,y:body.y,until:now+CONFIG.input_lease_ms};return true;
  }
  return {VERSION,COLORS,CONFIG,MAP,normalize,blocked,clearLine,touching,move,screenInput,balance,lobby,start,finish,capture,contacts,advance,input};
});

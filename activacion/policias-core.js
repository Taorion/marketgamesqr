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
  // A room stores only a catalog ID. Geometry is shared verbatim by server and renderer.
  const WORLDS = [
    ['burgo','Burgo del Farol','borough','Callejones Tudor, carruajes y luz de gas.','#282c40','#68757b','#d3b99e','#685b79','#63856b','#e8c888'],
    ['volcan','Caldera del Dragón','volcano','Basalto, cráteres y ríos de lava fuera de las rutas.','#361d2e','#665459','#a16c59','#773f46','#78504b','#ffad62'],
    ['bosque','Bosque de las Luciérnagas','forest','Árboles gigantes, hongos y senderos encantados.','#122e32','#698074','#aa9973','#42685b','#6baf88','#b7f0b3'],
    ['hielo','Puerto de Escarcha','ice','Glaciares, cristales y auroras sobre la nieve.','#26365d','#b9d5df','#e2e8df','#6b9cac','#a2ccdb','#a8f0f4'],
    ['castillo','Castillo de la Corona','castle','Torres almenadas, patios y estandartes reales.','#2e293f','#8c8e94','#b2ad9f','#675a7a','#778d72','#edce83'],
    ['victoriano','Calle de la Bruma','victorian','Ladrillo inglés, ventanales y chimeneas en la niebla.','#303640','#7d8180','#bc8c77','#52616b','#839781','#e8c38e'],
    ['puerto','Muelles del Corsario','harbor','Almacenes, velas y madera junto al mar.','#183d4d','#969582','#c1a17b','#557c88','#7fa897','#edd593'],
    ['desierto','Oasis de los Astrónomos','desert','Cúpulas, obeliscos y arenisca bajo las estrellas.','#493546','#cfaf7d','#e3c295','#537e84','#8fa876','#ffd999'],
    ['pantano','Pantano de los Susurros','swamp','Sauces, raíces y refugios sobre aguas verdes.','#1e3438','#6c8072','#a39372','#52675c','#769770','#c1e598'],
    ['cementerio','Jardín de las Ánimas','graveyard','Mausoleos góticos, cipreses y faroles violetas.','#28243e','#7b7d8d','#a4a0b1','#635772','#6d7e86','#cdb4ef'],
    ['nubes','Ciudad sobre las Nubes','cloud','Torres celestes sobre una isla suspendida.','#5d7b9c','#c5cfcb','#e9dbba','#718aa0','#9cb8b0','#fff0b5'],
    ['cristal','Gruta de Amatista','crystal','Geodas gigantes y vetas de luz en la roca.','#302240','#7c6e8e','#b5a0ce','#795ba5','#a780b8','#e4b9fb'],
    ['reloj','Distrito del Relojero','clockwork','Engranajes de latón, talleres y relojes enormes.','#302d39','#938678','#b3946d','#5b6d72','#88967b','#ffda87'],
    ['mercado','Bazar de las Mil Lunas','market','Pabellones, alfombras y puestos de colores.','#35324d','#b4a28d','#d8ba98','#9e607d','#7da08b','#f1d08d'],
    ['biblioteca','Archivo de los Arcanos','library','Torres de libros, atriles y ventanas de observatorio.','#292942','#8a8394','#c3ac92','#655a87','#858da0','#dfc6ff'],
    ['ruinas','Ruinas del Primer Reino','ruins','Columnas partidas, arcos antiguos y musgo.','#233a40','#939b87','#bcbd9a','#6e8a80','#86a379','#e7d4a0'],
    ['otono','Aldea del Otoño Eterno','autumn','Molinos, robles cobrizos y hojas doradas.','#43323b','#aa967a','#d8ba91','#8b675c','#c48c55','#ffe0a0'],
    ['canales','Canales de Medianoche','canal','Palacios estrechos, canales y góndolas.','#203445','#879ba0','#c7b299','#5e7d8a','#7aa39a','#edd8a2'],
    ['jardin','Jardines de la Reina','garden','Invernaderos, fuentes y rosales monumentales.','#263a3d','#aaa994','#dbcfac','#618d87','#80a278','#f5c2ce'],
    ['luna','Santuario de la Luna','moon','Santuarios de jade, menhires y constelaciones.','#1e2541','#8995ac','#c6cfcd','#678c99','#8baeb0','#cde5ff']
  ].map(([id,name,biome,description,sky,ground,stone,roof,foliage,accent])=>({id,name,biome,description,sky,ground,stone,roof,foliage,accent}));
  // Nine hand-placed solid groups per scene; prison and spawn corridors remain reserved.
  const LAYOUTS = [null,
    [4,3,12,3,20,4,4,10,10,10,16,8,17,13,5,17,12,18],
    [5,4,13,3,20,3,3,10,9,9,16,11,17,14,6,17,12,18],
    [4,4,12,4,20,3,4,11,10,9,16,10,17,13,4,17,12,18],
    [4,3,13,4,20,3,3,11,10,10,16,8,17,12,5,18,12,17],
    [5,3,12,3,20,4,4,11,10,9,16,11,17,14,5,17,12,18],
    [4,4,13,3,20,4,3,11,9,10,16,9,17,13,5,18,12,17],
    [5,4,12,4,20,3,4,11,10,10,16,8,17,13,4,18,12,17],
    [4,3,13,3,20,4,3,10,9,9,16,11,17,14,5,18,12,17],
    [5,3,12,4,20,3,4,10,10,9,16,11,17,13,5,18,12,18],
    [4,4,13,4,20,3,3,10,9,10,16,8,17,13,6,18,12,17],
    [5,4,12,3,20,4,4,10,10,10,16,8,17,12,4,17,12,17],
    [4,3,13,4,20,4,3,11,9,9,16,10,17,13,6,17,12,18],
    [5,3,12,3,20,3,4,11,10,10,16,8,17,13,4,18,12,18],
    [4,4,13,3,20,3,3,11,9,10,16,8,17,12,6,18,12,18],
    [5,4,12,4,20,4,4,10,10,9,16,11,17,14,5,18,12,17],
    [4,3,13,3,20,3,3,11,9,10,16,8,17,14,6,17,12,17],
    [5,3,12,4,20,4,4,11,10,9,16,8,17,12,5,18,12,17],
    [4,4,13,4,20,4,3,10,9,9,16,11,17,14,4,17,12,18],
    [5,4,12,3,20,3,4,11,10,10,16,8,17,14,6,18,12,18]
  ];
  const shape=(kind,x,y,w,h,hz=45)=>({kind,x,y,w,h,hz});
  // Biomes also change route topology: groves, courtyards, terraces and market lanes.
  const SPECIAL = {
    bosque:[[4,3],[8,4],[13,3],[17,4],[20,5],[5,8],[10,8],[15,8],[19,10],[4,13],[8,12],[13,12],[16,15],[5,18],[10,18],[14,19]].map(([x,y],i)=>shape('garden',x,y,1.4+(i%3)*.25,1.5,50)),
    pantano:[[4,4],[8,3],[13,4],[18,3],[5,10],[10,9],[16,9],[19,12],[4,17],[9,16],[14,18]].map(([x,y],i)=>shape(i%3?'garden':'house',x,y,2.1,2,55)),
    hielo:[[4,3,3,2],[10,3,2,3],[16,3,4,2],[5,8,2,4],[10,9,4,2],[17,9,3,3],[3,16,4,2],[10,16,2,4],[15,17,2,2]].map(([x,y,w,h])=>shape('house',x,y,w,h,45)),
    volcan:[shape('house',4,3,4,4,75),shape('house',14,3,4,3,68),shape('house',9,10,4,3,55),shape('house',4,17,3,2,35),shape('house',16,14,2,2,40),shape('lava',4,10,2,3,8),shape('lava',18,8,3,3,8),shape('lava',10,17,4,2,8)],
    castillo:[shape('house',4,3,2,2,75),shape('house',17,3,2,2,75),shape('wall',7,3,8,1,25),shape('wall',5,7,1,7,25),shape('wall',17,7,1,6,25),shape('house',10,9,3,3,62),shape('house',4,17,3,2,55),shape('wall',9,17,7,1,25)],
    mercado:[[4,3],[10,3],[16,3],[4,9],[10,9],[16,9],[4,16],[11,16]].map(([x,y],i)=>shape(i%2?'shop':'cafe',x,y,3,2,45)),
    biblioteca:[[4,3],[9,3],[15,3],[4,9],[10,10],[17,9],[4,17],[10,17],[15,17]].map(([x,y],i)=>shape('house',x,y,2.5,i%2?3.5:2,60)),
    ruinas:[[4,4],[10,3],[17,4],[4,10],[11,10],[18,10],[5,17],[12,17]].map(([x,y],i)=>shape('house',x,y,i%2?3:2,2,40)),
    jardin:[shape('house',4,3,4,3,60),shape('house',14,3,4,3,60),shape('garden',5,9,2,4,24),shape('garden',10,10,4,2,24),shape('garden',17,9,2,4,24),shape('garden',5,17,3,2,24),shape('garden',12,17,4,2,24)]
  };
  const MAPS = Object.fromEntries(WORLDS.map((world,i)=>[world.id,i===0?MAP:{...MAP,name:world.name,obstacles:SPECIAL[world.id]?[...SPECIAL[world.id],...MAP.obstacles.slice(9).map(o=>({...o}))]:MAP.obstacles.map((o,j)=>j>=9?{...o}:{...o,x:LAYOUTS[i][j*2],y:LAYOUTS[i][j*2+1],...(j===0||j===1?{w:3+(i+j)%2}:{}),...(j===4?{h:3}: {})})}]));
  const world=id=>WORLDS.find(w=>w.id===id)||WORLDS[0];
  const mapFor=id=>Object.prototype.hasOwnProperty.call(MAPS,id)?MAPS[id]:MAP;
  function normalize(config={}) { return {...CONFIG, duration_seconds: Math.max(45, Math.min(300, Math.round(Number(config.duration_seconds) || 180)))}; }
  function blocked(x,y,r=CONFIG.radius,map=MAP) {
    if (x<r || y<r || x>map.width-r || y>map.height-r) return true;
    return map.obstacles.some(o => {
      const dx=x-Math.max(o.x,Math.min(x,o.x+o.w)), dy=y-Math.max(o.y,Math.min(y,o.y+o.h));
      return dx*dx+dy*dy < r*r;
    });
  }
  function clearLine(a,b,map=MAP) {
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.08));
    for(let i=0;i<=steps;i++) if(blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,.01,map)) return false;
    return true;
  }
  function touching(a,b,map=MAP) { return Math.hypot(a.x-b.x,a.y-b.y)<=CONFIG.radius*2 && clearLine(a,b,map); }
  function move(p,x,y,dt,config=CONFIG,map=MAP) {
    const length=Math.hypot(x,y); if(length>1){x/=length;y/=length;}
    const speed=p.team==='police'?config.police_speed:config.thief_speed;
    const dx=x*speed*dt/1000,dy=y*speed*dt/1000;
    if(!blocked(p.x+dx,p.y,config.radius,map))p.x+=dx;
    if(!blocked(p.x,p.y+dy,config.radius,map))p.y+=dy;
    p.moving=!!length; if(length){p.dx=x;p.dy=y;}
  }
  // Screen directions -> world directions, with equal diagonal and axial speed.
  function screenInput(x,y) { const a=x+y,b=y-x,n=Math.max(1,Math.hypot(a,b)); return {x:a/n,y:b/n}; }
  function balance(players) { players.forEach((p,i)=>{p.team=i%2===0?'thief':'police';}); }
  function lobby(now) {return {version:VERSION,scenario_id:'burgo',status:'waiting',round_id:null,round:0,players:[],events:[],event_seq:0,updated:now,expires:now+CONFIG.lobby_ms};}
  function place(s){const map=mapFor(s.scenario_id);let pi=0,ti=0;for(const p of s.players)Object.assign(p,p.team==='police'?map.police[pi++]:map.thieves[ti++]);}
  function event(s,type,p,actor,now) {s.events.push({id:++s.event_seq,type,player:p?.id,actor:actor?.id,x:p?.x,y:p?.y,at:now,round_id:s.round_id});s.events=s.events.slice(-24);}
  function start(s,now,roundId,config) {
    s.config=normalize(config);s.round++;s.round_id=roundId;s.status='countdown';s.starts=now+s.config.countdown_ms;
    s.ends=s.starts+s.config.duration_seconds*1000;s.updated=now;s.winner=null;s.reason=null;s.events=[];
    place(s);
    for(const p of s.players){Object.assign(p,{captured:false,cell:null,input:{x:0,y:0,until:0},seq:-1,moving:false,abandoned:false,ready:false});}
  }
  function finish(s,winner,reason,now){s.status='finished';s.winner=winner;s.reason=reason;s.finished=now;s.expires=now+CONFIG.finished_ms;s.players.forEach(p=>{p.moving=false;p.input={x:0,y:0,until:0};});event(s,'finish',null,null,now);}
  function capture(s,p,actor,now,reason='capture'){
    if(p.captured)return;
    event(s,reason,p,actor,now);
    const used=new Set(s.players.filter(q=>q.captured).map(q=>q.cell));
    const map=mapFor(s.scenario_id);p.cell=map.cells.findIndex((_,i)=>!used.has(i));p.captured=true;p.moving=false;
    Object.assign(p,map.cells[p.cell]);p.input={x:0,y:0,until:0};
  }
  function contacts(s,now){
    if(!['running','countdown'].includes(s.status))return;
    const map=mapFor(s.scenario_id);
    const police=s.players.filter(p=>p.team==='police'&&!p.abandoned),thieves=s.players.filter(p=>p.team==='thief');
    // Capture batch precedes rescue batch. Only thieves free before AND after it can rescue.
    const free=thieves.filter(p=>!p.captured&&!p.abandoned);
    for(const p of free){const cop=police.find(q=>touching(p,q,map));if(cop)capture(s,p,cop,now);}
    if(thieves.every(p=>p.captured)){finish(s,'police','all_captured',now);return;}
    for(const p of thieves.filter(q=>q.captured&&!q.abandoned)){
      const rescuer=free.find(q=>!q.captured&&q.id!==p.id&&touching(q,p,map));
      // A police body at the prisoner prevents a release/recapture flicker in the same step.
      if(rescuer&&!police.some(q=>touching(q,p,map))){p.captured=false;p.cell=null;event(s,'rescue',p,rescuer,now);}
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
        move(p,valid?input.x:0,valid?input.y:0,next-t,s.config,mapFor(s.scenario_id));
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
  return {VERSION,COLORS,CONFIG,MAP,WORLDS,world,mapFor,place,normalize,blocked,clearLine,touching,move,screenInput,balance,lobby,start,finish,capture,contacts,advance,input};
});

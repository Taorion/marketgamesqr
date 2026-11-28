/* Qori original art · Barrio del Farol. All pixels are drawn locally; no asset downloads. */
(function(root){
  'use strict';
  const C=root.QoriChaseCore,W=1080,H=700,INK='#211e2a',CREAM='#ffe3aa';
  const iso=(x,y,z=0)=>({x:500+(x-y)*20,y:91+(x+y)*10-z});
  const noise=(a,b=0)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function poly(c,points,fill,stroke){c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p.x),Math.round(p.y)):c.moveTo(Math.round(p.x),Math.round(p.y)));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function line(c,a,b,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(a.x),Math.round(a.y));c.lineTo(Math.round(b.x),Math.round(b.y));c.stroke();}
  function tile(c,x,y,w,h,z,color,stroke){poly(c,[iso(x,y,z),iso(x+w,y,z),iso(x+w,y+h,z),iso(x,y+h,z)],color,stroke);}
  function prism(c,x,y,w,h,z,top,left,right,base=0){
    poly(c,[iso(x,y+h,base),iso(x+w,y+h,base),iso(x+w,y+h,z),iso(x,y+h,z)],left,INK);
    poly(c,[iso(x+w,y,base),iso(x+w,y+h,base),iso(x+w,y+h,z),iso(x+w,y,z)],right,INK);
    tile(c,x,y,w,h,z,top,INK);
  }
  function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function tint(hex,amount){const n=parseInt(hex.slice(1),16),f=v=>Math.max(0,Math.min(255,v+amount));return `rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`;}
  function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffcb7900');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  function label(c,text,x,y,color=CREAM,size=10){c.font=`bold ${size}px monospace`;c.textAlign='center';const w=c.measureText(text).width+12;rect(c,x-w/2,y-11,w,16,'#14202bed');rect(c,x-w/2,y-11,2,16,color);c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));}

  // Shared hand-drawn actor: eight-way facing, eight running poses, breathing and prison pose.
  function actor(c,p,x,y,time,scale=1){
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
    const running=p.moving&&!p.captured&&!p.abandoned,phase=Math.floor(time/85)%8,step=running?[0,2,4,2,0,-2,-4,-2][phase]:0;
    const bob=running?Math.abs(step)*.5:Math.floor(Math.sin(time/430)*.65),sx=(p.dx||0)-(p.dy||0),sy=(p.dx||0)+(p.dy||0),back=sy<-.15,side=Math.abs(sx)>.2?Math.sign(sx):0;
    const r=(x,y,w,h,color)=>rect(c,x,y,w,h,color),base=p.color||C.COLORS[0],shade=tint(base,-55),light=tint(base,30);
    const skin=['#edbd92','#cf9674','#9f6d53','#dfac82'][Math.max(0,C.COLORS.indexOf(base))%4];
    ellipse(c,0,1,11+(running?1:0),4,'#08161f70');
    // Split cloak and leather boots; personal cloth stays visible on both teams.
    poly(c,[{x:-9,y:-31-bob},{x:9,y:-31-bob},{x:13+step*.4,y:-8-bob},{x:3,y:-10-bob},{x:0,y:-14-bob},{x:-10,y:-8-bob}],shade,INK);
    // Trouser legs, cuffs and shoe soles stay separate in each pose.
    r(-8,-14+step,7,13,INK);r(2,-14-step,7,13,INK);r(-6,-12+step,4,9,'#405364');r(3,-12-step,4,9,'#344659');
    r(-9,-7+step,9,8,'#32262b');r(1,-7-step,10,8,'#32262b');r(-8,-7+step,7,2,'#a17b52');r(2,-7-step,7,2,'#8a6447');r(-8,step,8,1,'#b49b76');r(2,-step,8,1,'#8c7966');
    // Far arm, shoulder seams and tailored jacket.
    r(side>0?-13:9,-29-bob-step*.6,5,15,INK);r(side>0?-12:10,-27-bob-step*.6,3,10,shade);
    r(-10,-30-bob,20,18,INK);r(-8,-30-bob,16,17,base);r(-8,-28-bob,4,14,light);r(5,-27-bob,3,14,shade);
    r(-7,-14-bob,14,3,'#253747');r(0,-14-bob,3,3,'#c9b288');r(-6,-29-bob,12,2,light);
    if(back){r(-5,-26-bob,10,2,light);r(0,-25-bob,1,12,shade);r(-6,-15-bob,12,1,'#d7b978');}
    else{r(0,-28-bob,1,13,shade);for(let i=0;i<3;i++)r(-1,-26-bob+i*4,3,1,'#efcf86');line(c,{x:-7,y:-29-bob},{x:6,y:-15-bob},'#5b3c30',3);r(5,-18-bob,5,5,'#967047');r(6,-18-bob,3,1,'#e1bf73');}
    const armX=side<0?-13:9;
    if(p.captured){r(-11,-24-bob,4,10,base);r(8,-24-bob,4,10,shade);r(-8,-18-bob,16,4,skin);r(-2,-19-bob,3,6,'#d5d6bf');}
    else{r(armX,-27-bob+step*.6,5,13,INK);r(armX+1,-26-bob+step*.6,3,9,base);r(armX,-16-bob+step*.6,5,5,skin);r(armX+1,-16-bob+step*.6,3,1,'#ffdbad');}
    // Neck, ears and softly shaded cheeks; face follows world motion projected onto screen.
    r(-3,-34-bob,7,5,skin);r(-9,-47-bob,18,15,INK);r(-7,-47-bob,14,14,skin);r(-9,-41-bob,3,6,skin);r(7,-41-bob,3,6,skin);r(-5,-46-bob,8,3,'#ffdab0');r(5,-43-bob,2,10,tint(skin,-25));
    if(back){r(-7,-47-bob,14,10,'#3f3440');r(-6,-39-bob,12,3,'#554350');}
    else{const face=side*2;r(-4+face,-41-bob,2,3,INK);r(3+face,-41-bob,2,3,INK);r(0+face,-37-bob,3,2,tint(skin,-25));r(-1+face,-34-bob,4,1,'#985e56');}
    if(p.team==='police'){
      // Watchman's kettle helmet: steel dome, broad brim, brass crest and cheek plates.
      poly(c,[{x:-10,y:-48-bob},{x:-8,y:-55-bob},{x:-3,y:-59-bob},{x:4,y:-59-bob},{x:9,y:-54-bob},{x:11,y:-48-bob}],'#667c86',INK);
      r(-6,-55-bob,5,7,'#bdc9bc');r(0,-57-bob,2,9,'#e5d49a');r(5,-53-bob,3,6,'#3e5263');
      poly(c,[{x:-14,y:-48-bob},{x:10,y:-49-bob},{x:14,y:-45-bob},{x:-12,y:-44-bob}],'#a2b0a5',INK);
      r(-12,-45-bob,24,1,'#d8cfad');r(-9,-43-bob,3,9,'#6e8588');r(7,-43-bob,3,9,'#4b626e');
      r(-2,-60-bob,4,4,'#cfa85d');r(-1,-62-bob,2,3,'#ffe2a0');
      r(-12,-31-bob,7,4,'#9daea6');r(6,-31-bob,7,4,'#667e82');r(-11,-31-bob,5,1,'#ddd5af');
      if(!back){poly(c,[{x:3,y:-28-bob},{x:8,y:-28-bob},{x:8,y:-23-bob},{x:5,y:-21-bob},{x:3,y:-23-bob}],'#e8c879',INK);r(5,-27-bob,1,4,'#6b5b5c');}
    }else if(p.team==='thief'){
      // Crooked felt hood and scarf evoke a street rogue; the mask stays readable.
      poly(c,[{x:-10,y:-46-bob},{x:-7,y:-53-bob},{x:3,y:-57-bob},{x:11,y:-53-bob},{x:8,y:-48-bob}],shade,INK);
      r(-6,-51-bob,12,2,base);r(-9,-47-bob,19,2,'#5d4543');r(4,-53-bob,4,1,light);
      poly(c,[{x:-7,y:-33-bob},{x:7,y:-33-bob},{x:9,y:-29-bob},{x:0,y:-27-bob},{x:-9,y:-30-bob}],'#d7b17c',INK);
      poly(c,[{x:7,y:-31-bob},{x:14+step*.5,y:-28-bob},{x:17+step*.5,y:-20-bob},{x:11,y:-23-bob}],'#ad805f',INK);
      if(!back){r(-9,-43-bob,18,6,'#101923');r(-5+side,-42-bob,4,2,'#fff1d3');r(3+side,-42-bob,4,2,'#fff1d3');r(-3+side,-42-bob,2,2,'#253746');r(4+side,-42-bob,2,2,'#253746');}
      else{r(-8,-41-bob,16,3,'#111d29');r(side<0?-11:8,-41-bob,4,7,'#202735');}
    }
    c.restore();
  }
  function portrait(canvas,p){canvas.width=64;canvas.height=72;const c=canvas.getContext('2d');if(!c)return;c.imageSmoothingEnabled=false;c.clearRect(0,0,64,72);ellipse(c,32,62,23,6,'#091b2a55');actor(c,{...p,dx:0,dy:1,moving:false,captured:false},32,65,0,1.05);}

  function createScene(canvas,id='burgo'){
    const T=C.world(id),M=C.mapFor(T.id),classic=['borough','victorian','canal'].includes(T.biome);
    const output=canvas.getContext('2d'),scene=document.createElement('canvas');scene.width=W;scene.height=H;
    const motionPreference=root.matchMedia?.('(prefers-reduced-motion: reduce)');
    const ctx=scene.getContext('2d'),ground=document.createElement('canvas');ground.width=W;ground.height=H;const g=ground.getContext('2d');
    const buildingKinds=new Set(['cafe','shop','house']);
    // Static textures and architecture are rasterized once, not reconstructed at frame rate.
    const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,T.sky);bg.addColorStop(.45,tint(T.sky,18));bg.addColorStop(1,tint(T.sky,-12));g.fillStyle=bg;g.fillRect(0,0,W,H);
    for(let i=0;i<160;i++){const x=noise(i,1)*W,y=noise(i,2)*H;rect(g,x,y,i%8===0?2:1,1,i%3?'#83b7b11c':'#edcf842b');}
    // Quiet illustrated border keeps the playable quarter distinct from the surrounding city.
    ellipse(g,879,65,26,26,'#d5d6b421');ellipse(g,886,60,22,22,'#303747');
    for(let i=0;i<(classic?13:0);i++){const x=40+i*81,y=98+(i%3)*9,h=28+noise(i,3)*27;
      poly(g,[{x,y},{x:x+25,y:y-h},{x:x+53,y},{x:x+53,y:y+42},{x,y:y+42}],'#202b3a');
      rect(g,x+36,y-h+8,7,h+13,'#202b3a');rect(g,x+34,y-h+6,11,3,'#24313d');
      for(let j=0;j<3;j++)rect(g,x+8+j*15,y+8,3,7,'#ebbe6920');
      if(i%4===0){rect(g,x-8,y-14,18,55,'#1c2837');poly(g,[{x:x-12,y:y-14},{x:x+1,y:y-49},{x:x+14,y:y-14}],'#1c2837');rect(g,x,y-52,2,11,'#788c8744');}
    }
    // Illustrated horizon is outside the playable island, never an invisible hazard.
    if(!classic)for(let i=0;i<8;i++){
      const x=15+i*145,y=132+(i%3)*12,h=50+noise(i,6)*50;
      if(['forest','swamp','autumn','garden'].includes(T.biome)){
        rect(g,x+35,y-h,8,h+30,tint(T.sky,-8));
        for(let j=0;j<5;j++)ellipse(g,x+36+(j-2)*12,y-h+20+Math.abs(j-2)*9,25,26,tint(T.foliage,-55));
      }else if(['volcano','ice','crystal','desert','moon','ruins'].includes(T.biome)){
        poly(g,[{x,y},{x:x+54,y:y-h},{x:x+135,y}],tint(T.roof,-23));
        poly(g,[{x:x+54,y:y-h},{x:x+80,y:y-h*.6},{x:x+55,y:y-h*.72},{x:x+34,y:y-h*.6}],T.biome==='volcano'?'#f9b26c':T.accent+'88');
      }else{
        rect(g,x+18,y-h,48,h+20,tint(T.stone,-65));
        poly(g,[{x:x+10,y:y-h},{x:x+42,y:y-h-24},{x:x+74,y:y-h}],tint(T.roof,-17));
        for(let j=0;j<3;j++)rect(g,x+27+j*12,y-h+16,4,11,T.accent+'44');
      }
    }
    if(['harbor','canal','swamp'].includes(T.biome)){
      for(let i=0;i<28;i++){const y=150+i*16;line(g,{x:25+noise(i,7)*70,y},{x:1050-noise(i,9)*80,y},T.accent+'12');}
      for(const x of [82,964]){poly(g,[{x:x-35,y:242},{x:x+40,y:242},{x:x+22,y:256},{x:x-18,y:256}],'#55464a');line(g,{x,y:240},{x,y:164},T.accent,2);poly(g,[{x:x+3,y:170},{x:x+3,y:231},{x:x+40,y:231}],T.stone,INK);}
    }
    if(T.biome==='cloud')for(let i=0;i<16;i++)ellipse(g,noise(i,5)*W,170+noise(i,7)*440,35+noise(i,3)*50,12+noise(i,9)*18,'#e7ece04a');
    if(T.biome==='ice')for(let i=0;i<4;i++){g.globalAlpha=.15;poly(g,[{x:30+i*230,y:10},{x:100+i*220,y:10},{x:250+i*190,y:150},{x:90+i*220,y:100}],i%2?'#a6e5d4':'#98b9f5');g.globalAlpha=1;}
    ellipse(g,540,565,380,48,'#08162544');ellipse(g,540,563,315,32,'#08162544');
    prism(g,-.35,-.35,26.7,22.7,0,T.ground,tint(T.ground,-30),tint(T.ground,-55),-23);
    for(let x=0;x<26;x+=.5)for(let y=0;y<22;y+=.5){
      const natural=['forest','swamp','autumn','garden'].includes(T.biome);
      const plaza=natural?Math.abs(y-(10+2*Math.sin(x/3)))<1.1||Math.abs(x-(12+2*Math.sin(y/4)))<1.1:x>=7.5&&x<20.5&&y>=6.5&&y<16.5,n=noise(x+1,y+1);
      const colors=[-14,-6,0,6,13].map(v=>tint(plaza?T.stone:T.ground,v));
      const organic=['forest','swamp','autumn','garden'].includes(T.biome)&&!plaza;
      tile(g,x+.015,y+.015,.49,.49,0,colors[Math.floor(n*5)],organic?null:plaza?'#737b70':tint(T.ground,-22));
      const p=iso(x+.05,y+.05);rect(g,p.x,p.y,3,1,plaza?'#c8bf9d66':'#9ab8ae55');
      if(organic){rect(g,p.x+2,p.y+1,2,3,tint(T.foliage,n>.5?-22:10));if(n>.7)rect(g,p.x-2,p.y+1,2,2,T.accent+'77');}
      if(T.biome==='ice'&&n>.91)line(g,iso(x,y),iso(x+.45,y+.35),T.accent,1);
      if(T.biome==='volcano'&&n>.96)line(g,iso(x,y),iso(x+.38,y+.25),'#d4926b',1);
      if(T.biome==='harbor'&&plaza)line(g,iso(x,y),iso(x+.45,y),tint(T.stone,-35),1);
      if(n>.83){const p=iso(x+.24,y+.27);rect(g,p.x,p.y,2,1,'#233d4640');}
    }
    // A brass-and-stone medallion marks the central square, flush with the pavement.
    const med=iso(15,14.5);ellipse(g,med.x,med.y,51,25,'#586c6c');ellipse(g,med.x,med.y,47,23,'#d0b98b');ellipse(g,med.x,med.y,43,21,'#737e72');ellipse(g,med.x,med.y,36,17,'#b4ae8a');
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line(g,{x:med.x+Math.cos(a)*14,y:med.y+Math.sin(a)*7},{x:med.x+Math.cos(a)*38,y:med.y+Math.sin(a)*19},'#e0c99b',2);}
    poly(g,[{x:med.x,y:med.y-13},{x:med.x+12,y:med.y},{x:med.x,y:med.y+13},{x:med.x-12,y:med.y}],'#e3c694','#6b7d73');
    // Thick curb, inset gutters, and small boundary studs.
    for(let y=0;y<22;y++){tile(g,0,y,.18,.94,3,'#9cb2a6','#3c6268');tile(g,25.82,y,.18,.94,3,'#ccb690','#5a7776');}
    for(let x=0;x<26;x++){tile(g,x,0,.94,.18,3,'#9db3a6','#3c6268');tile(g,x,21.82,.94,.18,3,'#ccb690','#5a7776');}
    for(const [x,y]of [[1.4,13],[8.2,7.4],[18.2,6],[24,5.8],[17,19.8]]){
      tile(g,x,y,.7,.55,1,'#263f4c','#a1a58e');for(let i=0;i<5;i++)tile(g,x+.1+i*.1,y+.08,.025,.38,2,'#728b8d');
    }
    for(let i=0;i<64;i++){const x=noise(i,4)*25+.5,y=noise(i,5)*21+.5;if(C.blocked(x,y,.5,M))continue;const p=iso(x,y);if(i%4===0){tile(g,x,y,.12,.2,1,T.accent+'66');}else rect(g,p.x,p.y,2,1,T.accent+'60');}
    tile(g,20.3,16.3,4.4,4.4,0,'#6d8483','#adc0a6');
    for(let x=20.5;x<24.7;x+=.5)for(let y=16.5;y<20.7;y+=.5)tile(g,x,y,.45,.45,0,(x+y)%1?'#627b7c':'#758b86','#526f74');
    tile(g,21.25,16,2.5,.32,1,'#c9b486');
    for(let i=0;i<5;i++)tile(g,21.35+i*.5,16,.18,.32,2,'#536b71');
    for(const cell of M.cells){const p=iso(cell.x,cell.y);ellipse(g,p.x,p.y,13,6,'#9fb9a140');}
    // Contact shadows stay grounded and do not disappear with an occluded building.
    for(const o of M.obstacles){const a=iso(o.x,o.y),b=iso(o.x+o.w,o.y),c=iso(o.x+o.w,o.y+o.h),d=iso(o.x,o.y+o.h),length=buildingKinds.has(o.kind)?28:10;
      poly(g,[a,b,{x:b.x+length,y:b.y+length*.42},{x:c.x+length,y:c.y+length*.42},{x:d.x+length,y:d.y+length*.42},d],'#162b3d45');
      tile(g,o.x-.08,o.y-.08,o.w+.16,o.h+.16,0,'#19343d50');
    }
    const lampPositions=[...M.obstacles.filter(o=>buildingKinds.has(o.kind)).map(o=>[o.x+.15,o.y+o.h-.05,42]),[20.15,16.15,42],[24.85,16.15,42]];
    for(const [x,y]of lampPositions){const p=iso(x,y);g.save();g.translate(p.x,p.y);g.scale(1,.48);glow(g,0,0,70,'#f5cc6e29');g.restore();}
    g.font='bold 9px monospace';g.textAlign='center';g.fillStyle='#c4c7ad';g.fillText('Q O R I   /   G U A R D I A S   Y   R U F I A N E S',540,17);
    g.font='bold 20px Georgia';g.fillStyle=T.accent;g.fillText(T.name,540,40);
    line(g,{x:338,y:33},{x:421,y:33},'#c9b57a55');line(g,{x:660,y:33},{x:743,y:33},'#c9b57a55');

    function face(c,o,side,u,z,w,h,color,stroke){
      const at=(u,z)=>side?iso(o.x+o.w,o.y+u,z):iso(o.x+u,o.y+o.h,z);
      poly(c,[at(u,z),at(u+w,z),at(u+w,z+h),at(u,z+h)],color,stroke);
    }
    function facadeWindow(c,o,side,u,z,w=.65,h=21){
      face(c,o,side,u-.09,z-3,w+.18,h+6,'#ddd1ad',INK);
      face(c,o,side,u,z,w,h,'#253c4a');face(c,o,side,u+.07,z+2,w-.14,h-4,'#e4b568');
      face(c,o,side,u+.12,z+4,(w-.24)*.48,h-8,'#ffdfa0');face(c,o,side,u+.12,z+h-7,w-.24,3,'#f5ca83');
      face(c,o,side,u+w*.46,z,.06,h,'#537275');face(c,o,side,u,z+h*.5,w,2,'#537275');
      // Diamond leadwork, a pointed crown and a deep Victorian stone sill.
      const at=(v,k)=>side?iso(o.x+o.w,o.y+v,k):iso(o.x+v,o.y+o.h,k);
      poly(c,[at(u-.06,z+h),at(u+w*.5,z+h+7),at(u+w+.06,z+h)],'#dec69b',INK);
      poly(c,[at(u+.06,z+h),at(u+w*.5,z+h+4),at(u+w-.06,z+h)],'#f4d087');
      for(let j=0;j<3;j++){const k=z+3+j*6;line(c,at(u+.08,k),at(u+w-.08,k+6),'#746a5d');line(c,at(u+w-.08,k),at(u+.08,k+6),'#746a5d');}
      face(c,o,side,u-.22,z-.5,.15,h+1,'#456d6e',INK);face(c,o,side,u+w+.07,z-.5,.15,h+1,'#36585e',INK);
      for(let k=0;k<4;k++){face(c,o,side,u-.21,z+3+k*4,.13,1,'#86a394');face(c,o,side,u+w+.08,z+3+k*4,.13,1,'#6e8b83');}
      face(c,o,side,u-.14,z-4,w+.28,3,'#e4d2ab',INK);
    }
    function lantern(c,x,y,z){const p=iso(x,y,z);rect(c,p.x-1,p.y-5,3,16,'#142d3b');rect(c,p.x-6,p.y-6,12,2,'#203c46');rect(c,p.x-4,p.y-3,8,11,'#dba35d');rect(c,p.x-2,p.y-2,4,9,'#ffe8a1');rect(c,p.x-5,p.y+8,10,2,INK);rect(c,p.x-4,p.y-3,1,10,'#355059');rect(c,p.x+3,p.y-3,1,10,'#355059');poly(c,[{x:p.x-7,y:p.y-5},{x:p.x,y:p.y-11},{x:p.x+7,y:p.y-5}],'#34515a',INK);}
    function building(c,o){
      const schemes={cafe:{front:'#e0c79e',side:'#ae9a85',roof:['#6a657e','#4b4c65','#828098']},shop:{front:'#bbc0a2',side:'#849a8f',roof:['#4e7775','#375b60','#71928b']},house:{front:'#d3b99e',side:'#a18b83',roof:['#6f5d75','#51465f','#968092']}};
      const s=T.biome==='borough'?schemes[o.kind]:{front:T.stone,side:tint(T.stone,-36),roof:[T.roof,tint(T.roof,-20),tint(T.roof,20)]},z=o.hz+10;
      prism(c,o.x,o.y,o.w,o.h,z,'#a7957e',s.front,s.side);
      // Stone plinth, plaster variation and exposed brickwork.
      for(const side of [false,true]){const length=side?o.h:o.w;
        face(c,o,side,0,0,length,10,side?'#4a626c':'#667572');face(c,o,side,0,11,length,2,'#cbb998');
        for(let row=0;row<3;row++)for(let u=row%2*.2;u<length;u+=.45){face(c,o,side,u,row*3,Math.min(.42,length-u),2,side?'#60767a':'#819087');}
        for(let i=0;i<28;i++){const u=noise(i,o.x)*(length-.2),v=15+noise(i,o.y)*(z-22);face(c,o,side,u,v,.08+noise(i,3)*.15,1,i%3?'#ead8b326':'#39475724');}
        for(let h=14;h<z-5;h+=9){face(c,o,side,0,h,.22,5,'#dcc6a5');face(c,o,side,length-.22,h,.22,5,'#9caa9b');}
        face(c,o,side,0,z-6,length,3,'#e2cbaa');face(c,o,side,0,z-10,length,2,'#736e68');
        // Red-brick ground floor below oak-framed plaster: the two eras share a facade.
        for(let k=12;k<32;k+=5)for(let u=0;u<length;u+=.38){const v=u+(k%2)*.16;if(v>=length)continue;face(c,o,side,v,k,Math.min(.34,length-v),4,side?'#70514c':(Math.floor(u*9)%2?'#a67459':'#98654f'));}
        for(const level of [33,z-17,z-4])face(c,o,side,0,level,length,3,'#543d37',INK);
        const at=(u,k)=>side?iso(o.x+o.w,o.y+u,k):iso(o.x+u,o.y+o.h,k);
        for(let u=.08;u<length;u+=.92){face(c,o,side,u,32,.11,z-34,'#5a4138');line(c,at(u+.06,z-15),at(Math.min(length-.08,u+.85),z-5),'#674b3c',3);}
        if(T.biome==='victorian')for(let k=32;k<z-7;k+=5)for(let u=0;u<length;u+=.38){const v=u+(k%2)*.16;if(v<length)face(c,o,side,v,k,Math.min(.34,length-v),4,side?'#785d59':'#b1806b');}
        if(T.biome==='canal'){face(c,o,side,0,32,length,z-39,s.front);for(let u=.2;u<length;u+=.7)face(c,o,side,u,32,.1,z-39,'#ebd8b7');}
      }
      const door=o.w/2-.36;
      face(c,o,false,door-.12,1,.96,34,'#e1c7a0',INK);face(c,o,false,door,1,.72,31,'#253847');
      face(c,o,false,door+.06,3,.6,27,'#5a6b65');face(c,o,false,door+.13,17,.46,10,'#c1b583');face(c,o,false,door+.13,5,.46,9,'#344c51');
      const handle=iso(o.x+door+.58,o.y+o.h,14);rect(c,handle.x,handle.y,2,3,'#f3cf7f');
      facadeWindow(c,o,false,.45,23,.6,22);facadeWindow(c,o,false,o.w-1.05,23,.6,22);facadeWindow(c,o,true,.55,27,.7,26);
      if(o.h>2.5)facadeWindow(c,o,true,o.h-1.2,27,.7,26);
      // Tiny wrought-iron balconies and flower boxes read on both visible faces.
      for(const u of [.45,o.w-1.05]){
        face(c,o,false,u-.12,19,.84,5,'#816e5d',INK);
        const p=iso(o.x+u+.3,o.y+o.h,24);for(let i=0;i<6;i++){rect(c,p.x-8+i*3,p.y+(i%2)*2,4,4,i%2?'#668f64':'#95ac72');if(i%3===0)rect(c,p.x-6+i*3,p.y-1,2,2,'#edb082');}
      }
      if(o.kind==='house'){
        face(c,o,false,.32,45,o.w-.64,2,'#dee1c0');
        for(let u=.4;u<o.w-.3;u+=.2)face(c,o,false,u,44,.035,10,'#354e5b');
        face(c,o,false,.32,54,o.w-.64,2,'#4b6670');
      }
      // Eaves, gable and individually patterned sloping roof tiles.
      const x=o.x-.18,y=o.y-.18,w=o.w+.36,h=o.h+.36,ridge=y+h/2,rise=43;
      prism(c,x,y,w,h,z+4,'#807c6c','#4e5155','#384f58',z-1);
      poly(c,[iso(x+w,y,z+4),iso(x+w,y+h,z+4),iso(x+w,ridge,z+4+rise)],s.front,INK);
      line(c,iso(x+w,ridge,z+5),iso(x+w,ridge,z+rise+4),'#563e38',4);
      line(c,iso(x+w,y+.15,z+7),iso(x+w,ridge,z+rise),'#684c40',3);line(c,iso(x+w,y+h-.15,z+7),iso(x+w,ridge,z+rise),'#684c40',3);
      const rose=iso(x+w,ridge,z+20);ellipse(c,rose.x,rose.y,7,9,'#3d424c');ellipse(c,rose.x,rose.y,4,6,'#e7bc7c');line(c,{x:rose.x,y:rose.y-6},{x:rose.x,y:rose.y+6},'#72543f');
      const roofZ=v=>z+5+rise*(1-Math.abs(v-h/2)/(h/2));
      for(let row=0;row<10;row++)for(let col=0;col<Math.ceil(w/.3);col++){
        const u=col*.3,v=row*h/10,ww=Math.min(.29,w-u),hh=h/10-.025;if(ww<=0)continue;
        poly(c,[iso(x+u,y+v,roofZ(v)),iso(x+u+ww,y+v,roofZ(v)),iso(x+u+ww,y+v+hh,roofZ(v+hh)),iso(x+u,y+v+hh,roofZ(v+hh))],s.roof[(row+col)%3],'#273c4744');
        if((row+col)%4===0)line(c,iso(x+u+.04,y+v,roofZ(v)+1),iso(x+u+ww-.04,y+v,roofZ(v)+1),'#f3c69c55');
      }
      line(c,iso(x,ridge,z+rise+6),iso(x+w,ridge,z+rise+6),'#c5b59a',3);
      for(const end of [x,x+w]){const p=iso(end,ridge,z+rise+6);line(c,p,{x:p.x,y:p.y-13},'#b9b08d',2);poly(c,[{x:p.x,y:p.y-17},{x:p.x+3,y:p.y-13},{x:p.x,y:p.y-9},{x:p.x-3,y:p.y-13}],'#d8bc7e');}
      line(c,iso(x,y+h,z+5),iso(x+w,y+h,z+5),'#e1bb91',2);
      const chimneyZ=z+rise-4;prism(c,o.x+.6,o.y+o.h/2-.3,.5,.55,chimneyZ+19,'#c09d7a','#9a6554','#704e4b',chimneyZ-6);prism(c,o.x+.53,o.y+o.h/2-.37,.64,.69,chimneyZ+21,'#413d4d','#c0a282','#927a6c',chimneyZ+17);
      for(const u of [.62,.94])prism(c,o.x+u,o.y+o.h/2-.15,.19,.24,chimneyZ+28,'#443741','#c58d69','#8f614f',chimneyZ+21);
      if(o.kind!=='house'){
        for(let i=0;i<10;i++){const u=o.x+.1+i*(o.w-.2)/10,color=i%2?'#e9d6a7':o.kind==='cafe'?'#aa5e57':'#38696d';
          poly(c,[iso(u,o.y+o.h,44),iso(u+(o.w-.2)/10,o.y+o.h,44),iso(u+(o.w-.2)/10,o.y+o.h+.64,35),iso(u,o.y+o.h+.64,35)],color,INK);
          const a=iso(u,o.y+o.h+.64,35),b=iso(u+(o.w-.2)/10,o.y+o.h+.64,35);poly(c,[a,b,{x:b.x,y:b.y+5},{x:a.x,y:a.y+5}],color);
        }
        const p=iso(o.x+o.w/2,o.y+o.h,57);label(c,o.kind==='cafe'?'EL GRIFO':'BOTICA LUNAR',p.x,p.y,'#ffe2a4',9);
        // Hanging guild sign: a crescent for the apothecary, a tankard for the inn.
        const sign=iso(o.x+o.w-.18,o.y+o.h+.14,67);line(c,{x:sign.x-2,y:sign.y-8},{x:sign.x+20,y:sign.y-8},'#302d38',3);line(c,{x:sign.x+14,y:sign.y-8},{x:sign.x+14,y:sign.y+3},'#c6a365');
        rect(c,sign.x+5,sign.y+1,19,20,'#332b34');rect(c,sign.x+6,sign.y+2,17,18,'#b18c57');rect(c,sign.x+8,sign.y+4,13,14,'#34535a');
        if(o.kind==='shop'){ellipse(c,sign.x+14,sign.y+10,5,5,'#f3dba0');ellipse(c,sign.x+17,sign.y+8,4,4,'#34535a');}else{rect(c,sign.x+11,sign.y+8,6,7,'#edce89');rect(c,sign.x+17,sign.y+9,3,5,'#d5ae67');rect(c,sign.x+10,sign.y+6,8,3,'#fff1c5');}
      }
      lantern(c,o.x+.15,o.y+o.h,z-30);
      // Rain pipe hugs the collision footprint.
      line(c,iso(o.x+o.w-.08,o.y+o.h,z-3),iso(o.x+o.w-.08,o.y+o.h,4),'#3b5862',3);line(c,iso(o.x+o.w-.12,o.y+o.h,z-3),iso(o.x+o.w-.12,o.y+o.h,4),'#92a89c');
    }
    function shrub(c,x,y,z,seed,large=false){
      const p=iso(x,y,z),r=large?18:8;
      for(let i=0;i<18;i++){const xx=p.x+(noise(i,seed)-.5)*r*2,yy=p.y+(noise(i+50,seed)-.5)*r*.95;
        rect(c,xx-4,yy-3,7+noise(i,9)*6,5+noise(i,8)*5,[-55,-30,-10,12,35].map(v=>tint(T.foliage,v))[Math.floor(noise(i,seed+1)*5)]);
      }
      if(!large)for(let i=0;i<3;i++)rect(c,p.x-5+i*5,p.y-4+(i%2)*3,3,3,['#e59f92','#f1cc84','#d1dfaa'][i]);
    }
    function crystal(c,x,y,z,size,color){
      const p=iso(x,y,z);poly(c,[{x:p.x,y:p.y-size},{x:p.x+size*.35,y:p.y-size*.55},{x:p.x+size*.23,y:p.y},{x:p.x-size*.23,y:p.y},{x:p.x-size*.35,y:p.y-size*.55}],color,INK);
      c.save();c.clip();for(let i=0;i<28;i++){const xx=p.x+(noise(i,x)-.5)*size*.7,yy=p.y-noise(i,y)*size;rect(c,xx,yy,2+i%3,1,i%3?tint(color,25):tint(color,-25));}c.restore();
      poly(c,[{x:p.x,y:p.y-size},{x:p.x+size*.35,y:p.y-size*.55},{x:p.x+size*.23,y:p.y},{x:p.x,y:p.y-4}],tint(color,-30));
      line(c,{x:p.x,y:p.y-size+3},{x:p.x-size*.23,y:p.y-size*.52},tint(color,55),2);
      line(c,{x:p.x-size*.18,y:p.y-size*.46},{x:p.x-size*.04,y:p.y-size*.27},tint(color,40));line(c,{x:p.x-size*.04,y:p.y-size*.27},{x:p.x-size*.12,y:p.y-size*.15},tint(color,40));
      rect(c,p.x-2,p.y-size*.55,3,5,CREAM);rect(c,p.x-4,p.y-size*.55+2,7,1,CREAM);
    }
    function ancientTree(c,o,willow=false){
      prism(c,o.x,o.y,o.w,o.h,8,tint(T.foliage,-23),'#60684e','#424b41');
      const x=o.x+o.w/2,y=o.y+o.h/2,p=iso(x,y);
      prism(c,x-.28,y-.28,.56,.56,67,'#c4a87f','#75624d','#4a4b43',8);
      for(let i=0;i<5;i++){const r=iso(x+(noise(i,3)-.5)*o.w*.8,y+(noise(i,6)-.5)*o.h*.8,9);line(c,iso(x,y,15),r,'#927c59',4);line(c,{x:r.x,y:r.y-1},{x:r.x+4,y:r.y-3},'#bb9e6b');}
      for(let i=0;i<5;i++){rect(c,p.x-3+i*2,p.y-57+noise(i,4)*12,1,25,'#4a443c');}
      for(const dir of [-1,1])line(c,iso(x,y,44),{x:p.x+dir*26,y:p.y-66},'#6c624c',6);
      for(let k=0;k<16;k++){const u=x+(noise(k,4)-.5)*o.w*.9,v=y+(noise(k,8)-.5)*o.h*.85;shrub(c,u,v,63+noise(k,2)*22,k+o.x,true);}
      if(willow)for(let k=0;k<12;k++){const a=iso(x+(noise(k,6)-.5)*o.w,y+(noise(k,7)-.5)*o.h,65);line(c,a,{x:a.x+4,y:a.y+26},T.foliage,2);}
      for(let i=0;i<3;i++){const q=iso(o.x+.45+i*.65,o.y+o.h-.2,10);rect(c,q.x-1,q.y-12,3,12,T.stone);ellipse(c,q.x,q.y-13,7,4,T.biome==='autumn'?'#e6b366':'#bd87ad');rect(c,q.x-3,q.y-15,2,2,CREAM);}
    }
    function column(c,x,y,height,width=.5){prism(c,x-.08,y-.08,width+.16,width+.16,6,T.stone,tint(T.stone,-20),tint(T.stone,-40));prism(c,x,y,width,width,height,T.stone,tint(T.stone,-16),tint(T.stone,-38),6);prism(c,x-.08,y-.08,width+.16,width+.16,height+4,T.stone,tint(T.stone,-25),tint(T.stone,-45),height);}
    function gear(c,x,y,r){ellipse(c,x,y,r,r,T.accent);ellipse(c,x,y,r-5,r-5,T.roof);for(let i=0;i<12;i++){const a=i*Math.PI/6;rect(c,x+Math.cos(a)*r-2,y+Math.sin(a)*r-2,5,5,T.accent);}ellipse(c,x,y,5,5,T.accent);for(let i=0;i<6;i++){const a=i*Math.PI/3;line(c,{x,y},{x:x+Math.cos(a)*(r-3),y:y+Math.sin(a)*(r-3)},T.accent,2);}}
    function monument(c,o){
      const b=T.biome,x=o.x,y=o.y,w=o.w,h=o.h,z=o.hz+10;
      if(['forest','swamp','autumn'].includes(b)){ancientTree(c,o,b==='swamp');
        if(b==='autumn'&&o.kind==='shop'){const p=iso(x+w*.5,y+h*.5,76);rect(c,p.x-10,p.y-3,20,22,T.stone);for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;line(c,p,{x:p.x+Math.cos(a)*26,y:p.y+Math.sin(a)*26},T.accent,5);}ellipse(c,p.x,p.y,4,4,INK);}
        return;
      }
      if(['volcano','ice','crystal'].includes(b)){
        prism(c,x,y,w,h,12,T.ground,tint(T.ground,-26),tint(T.ground,-45));
        if(b==='volcano'){
          const p=iso(x+w*.5,y+h*.5,0),a=iso(x,y+h,10),d=iso(x+w,y,10),e=iso(x+w,y+h,10);
          poly(c,[a,{x:p.x-17,y:p.y-z}, {x:p.x+18,y:p.y-z},d,e],T.roof,INK);
          poly(c,[{x:p.x+18,y:p.y-z},d,e,{x:p.x+8,y:p.y-8}],tint(T.roof,-25));
          c.save();c.clip();for(let i=0;i<35;i++)rect(c,p.x+noise(i,3)*65,p.y-noise(i,9)*z,4,2,i%2?'#a97764':'#50383e');c.restore();
          ellipse(c,p.x,p.y-z,20,8,'#2b1e2a');ellipse(c,p.x,p.y-z+1,14,4,'#ffad64');
          for(let i=0;i<3;i++)line(c,{x:p.x-10+i*9,y:p.y-z+5},{x:p.x-18+i*20,y:p.y-12},i%2?'#f6b66c':'#cd7255',2);
        }else for(let i=0;i<5;i++)crystal(c,x+.5+noise(i,2)*(w-1),y+.5+noise(i,5)*(h-1),12,35+noise(i,3)*45,i%2?T.accent:T.roof);
        return;
      }
      if(b==='market'){
        prism(c,x,y,w,h,23,T.stone,tint(T.stone,-25),tint(T.stone,-40));
        for(const u of [0,w-.15])for(const v of [0,h-.15])column(c,x+u,y+v,49,.12);
        for(let i=0;i<10;i++){const u=x+i*w/10;poly(c,[iso(u,y,48),iso(u+w/10,y,48),iso(u+w/10,y+h*.5,76),iso(u,y+h*.5,76)],i%2?T.accent:T.roof,INK);poly(c,[iso(u,y+h*.5,76),iso(u+w/10,y+h*.5,76),iso(u+w/10,y+h,48),iso(u,y+h,48)],i%2?T.stone:T.roof,INK);}
        for(let i=0;i<6;i++){const p=iso(x+.3+i*.5,y+h,28);ellipse(c,p.x,p.y,4,4,['#b98282','#8fb67d','#d5af69'][i%3]);}return;
      }
      if(b==='ruins'){
        prism(c,x,y,w,h,15,T.stone,tint(T.stone,-22),tint(T.stone,-40));
        for(let i=0;i<3;i++)column(c,x+.2+i*(w-.8)/2,y+h-.7,35+i%2*25,.55);
        prism(c,x+.05,y+h-.8,w-.1,.75,66,T.stone,tint(T.stone,-20),tint(T.stone,-40),59);
        for(let i=0;i<4;i++)shrub(c,x+.4+i*.6,y+.4,18,i);return;
      }
      if(b==='library'){
        prism(c,x,y,w,h,10,T.stone,tint(T.stone,-25),T.roof);
        for(let i=0;i<7;i++){const inset=i%2*.12,color=[T.roof,'#697d81','#9e6b7d'][i%3];prism(c,x+inset,y+inset,w-inset*2,h-inset*2,19+i*8,color,tint(color,-20),tint(color,-32),12+i*8);face(c,o,false,.2,14+i*8,w-.4,3,'#cfbe95');face(c,o,false,.3,15+i*8,w-.6,1,'#897866');for(const v of [.35,h-.5])face(c,o,true,v,12+i*8,.12,7,T.accent);const q=iso(x+w,y+h*.5,16+i*8);rect(c,q.x-2,q.y-2,4,2,T.accent);}
        const p=iso(x+w*.5,y+h*.5,80);ellipse(c,p.x,p.y,15,12,T.accent);ellipse(c,p.x,p.y,11,9,T.sky);line(c,{x:p.x-14,y:p.y},{x:p.x+14,y:p.y},T.accent,2);return;
      }
      if(b==='garden'){
        prism(c,x,y,w,h,12,T.stone,tint(T.stone,-20),T.roof);
        prism(c,x+.1,y+.1,w-.2,h-.2,54,'#b4d3c1','#78a9a0','#5d8989',12);
        for(let u=.15;u<w;u+=.5){face(c,o,false,u,13,.06,41,T.accent);line(c,iso(x+u,y,54),iso(x+u,y+h,54),T.accent);}
        for(let v=.15;v<h;v+=.5)face(c,o,true,v,13,.06,41,T.accent);
        for(let i=0;i<4;i++)shrub(c,x+.4+i*.6,y+h-.25,24,i);return;
      }
      // Fortresses, mausoleums and celestial sanctuaries share masonry, not silhouettes.
      const height=b==='harbor'?38:z;
      prism(c,x,y,w,h,height,T.stone,tint(T.stone,-23),tint(T.stone,-45));
      for(let k=9;k<height;k+=9)for(let u=0;u<w;u+=.6)face(c,o,false,u,k,Math.min(.56,w-u),1,tint(T.stone,-42));
      for(let k=10;k<height;k+=9){for(let v=0;v<h;v+=.6){face(c,o,true,v,k,Math.min(.55,h-v),1,tint(T.stone,-50));face(c,o,true,v,k,.025,8,tint(T.stone,-42));}for(let u=(k%2)*.25;u<w;u+=.6)face(c,o,false,u,k,.025,8,tint(T.stone,-40));}
      for(let i=0;i<24;i++)face(c,o,false,.15+noise(i,x)*(w-.4),5+noise(i,y)*(height-12),.08,2,tint(T.stone,i%3?-12:18));
      facadeWindow(c,o,false,.45,18,.6,25);if(w>3)facadeWindow(c,o,false,w-1.1,18,.6,25);
      facadeWindow(c,o,true,h*.5-.3,15,.55,22);
      if(b==='castle'){
        for(const u of [0,w-.6])for(const v of [0,h-.6]){prism(c,x+u,y+v,.6,.6,height+15,T.stone,tint(T.stone,-15),T.roof,height-10);for(const n of [0,.4])prism(c,x+u+n,y+v,.2,.6,height+20,T.accent,T.stone,T.roof,height+15);}
        for(let u=.2;u<w;u+=.65)prism(c,x+u,y+h-.22,.3,.22,height+6,T.stone,tint(T.stone,-25),T.roof,height);
        face(c,o,false,w*.5-.25,30,.5,27,T.roof,INK);const p=iso(x+w*.5,y+h,47);poly(c,[{x:p.x,y:p.y-4},{x:p.x+4,y:p.y},{x:p.x,y:p.y+4},{x:p.x-4,y:p.y}],T.accent);
      }else if(['desert','moon','cloud'].includes(b)){
        const p=iso(x+w*.5,y+h*.5,height);ellipse(c,p.x,p.y,Math.min(w,h)*13,20,T.roof);poly(c,[{x:p.x-20,y:p.y},{x:p.x,y:p.y-34},{x:p.x+20,y:p.y}],T.roof,INK);crystal(c,x+w*.5,y+h*.5,height+28,16,T.accent);
        for(const u of [.1,w-.5])column(c,x+u,y+h-.5,height+10,.4);
      }else if(b==='clockwork'){
        prism(c,x-.08,y-.08,w+.16,h+.16,height+5,T.roof,T.stone,T.roof,height);
        const p=iso(x+w*.5,y+h,height-20);ellipse(c,p.x,p.y,18,18,T.accent);ellipse(c,p.x,p.y,14,14,T.sky);line(c,p,{x:p.x,y:p.y-10},CREAM,2);line(c,p,{x:p.x+9,y:p.y+4},CREAM,2);gear(c,p.x+26,p.y+13,10);
        for(let i=0;i<12;i++){const a=i*Math.PI/6;rect(c,p.x+Math.cos(a)*11,p.y+Math.sin(a)*11,1,2,T.accent);}for(const v of [.3,h-.3])line(c,iso(x+w,y+v,4),iso(x+w,y+v,height+8),'#bc8d61',4);
      }else if(b==='graveyard'){
        poly(c,[iso(x,y,height),iso(x+w,y,height),iso(x+w*.5,y,height+30)],T.roof,INK);prism(c,x,y,w,h,height+3,T.roof,T.roof,tint(T.roof,-22),height);
        const p=iso(x+w*.5,y+h,height+8);line(c,{x:p.x,y:p.y-20},{x:p.x,y:p.y+3},T.accent,4);line(c,{x:p.x-7,y:p.y-13},{x:p.x+7,y:p.y-13},T.accent,3);
      }else{prism(c,x-.1,y-.1,w+.2,h+.2,height+5,T.roof,tint(T.roof,15),tint(T.roof,-20),height);for(let i=0;i<3;i++)column(c,x+.3+i*.8,y+.2,height+15,.22);}
    }
    function obstacle(c,o){
      if(o.kind==='lava'){
        prism(c,o.x,o.y,o.w,o.h,7,'#634c4e','#3a303c','#2c2934');tile(c,o.x+.12,o.y+.12,o.w-.24,o.h-.24,8,'#bb6049');
        for(let i=0;i<30;i++){const x=o.x+.2+noise(i,5)*(o.w-.4),y=o.y+.2+noise(i,7)*(o.h-.4);tile(c,x,y,.12+noise(i,3)*.2,.13,9,i%3?'#f6b064':'#f6d98c');}return;
      }
      if(['forest','swamp','autumn'].includes(T.biome)&&o.kind==='garden'){ancientTree(c,o,T.biome==='swamp');return;}
      if(!classic&&buildingKinds.has(o.kind)){monument(c,o);return;}
      if(!classic&&o.kind==='garden'&&['ice','crystal','moon','volcano'].includes(T.biome)){monument(c,{...o,kind:'house',hz:25});return;}
      if(!classic&&o.kind==='car'){
        if(T.biome==='clockwork'){prism(c,o.x,o.y,o.w,o.h,20,T.roof,T.stone,tint(T.stone,-25));const p=iso(o.x+o.w*.5,o.y+o.h,26);gear(c,p.x,p.y,18);return;}
        if(['forest','swamp','autumn','garden'].includes(T.biome)){ancientTree(c,{...o,hz:30});return;}
        monument(c,{...o,kind:'house',hz:25});return;
      }
      if(buildingKinds.has(o.kind)){building(c,o);return;}
      if(o.kind==='garden'){
        prism(c,o.x,o.y,o.w,o.h,13,'#aaac87','#829483','#506d70');tile(c,o.x+.12,o.y+.12,o.w-.24,o.h-.24,14,'#384f4b');
        for(let i=0;i<o.w/.35;i++){const a=iso(o.x+i*.35,o.y+o.h),b=iso(o.x+i*.35,o.y+o.h,12);line(c,a,b,'#617c77');}
        for(let i=0;i<11;i++)shrub(c,o.x+.3+noise(i,o.x)*(o.w-.6),o.y+.25+noise(i,o.y)*(o.h-.5),18,i);
        // A sculpted ornamental tree grows inside the existing solid planter.
        const tx=o.x+o.w*.54,ty=o.y+o.h*.43,p=iso(tx,ty);rect(c,p.x-3,p.y-54,6,40,'#3b4c46');rect(c,p.x-2,p.y-52,2,35,'#a6a07a');
        line(c,{x:p.x,y:p.y-37},{x:p.x-9,y:p.y-52},'#5a6b54',3);shrub(c,tx,ty,55,o.x,true);shrub(c,tx-.25,ty,67,o.y,true);return;
      }
      if(o.kind==='bars'){
        prism(c,o.x,o.y,o.w,o.h,6,'#a2b4a2','#708d88','#4a6a75');
        const n=Math.ceil(Math.max(o.w,o.h)/.23),end=(i,z)=>iso(o.x+o.w*i/n,o.y+o.h*i/n,z);
        for(let i=0;i<=n;i++){const a=end(i,6),b=end(i,36);line(c,a,b,INK,3);line(c,{x:a.x+1,y:a.y},{x:b.x+1,y:b.y},'#90b6b6');poly(c,[{x:b.x-2,y:b.y+1},{x:b.x,y:b.y-4},{x:b.x+2,y:b.y+1}],'#bed0bc');}
        for(const z of [12,32]){line(c,end(0,z),end(n,z),'#203b4b',4);line(c,end(0,z+1),end(n,z+1),'#789a9f');}
        for(const t of [0,1]){const x=o.x+o.w*t,y=o.y+o.h*t;prism(c,x-.07,y-.07,.2,.2,39,'#c5c4a3','#607f83','#425e70');}
        return;
      }
      if(o.kind==='car'){
        // Parked Victorian carriage, exactly the former obstacle's footprint.
        prism(c,o.x,o.y,o.w,o.h,14,'#8a6d52','#4d3737','#342d37',8);
        prism(c,o.x+.35,o.y+.12,1.95,o.h-.24,43,'#6f5b62','#643e50','#402f43',15);
        prism(c,o.x+.26,o.y+.04,2.13,o.h-.08,47,'#464457','#a48c6d','#655266',43);
        const side={...o};face(c,side,false,.6,25,.65,13,'#e3c184',INK);face(c,side,false,1.39,25,.65,13,'#e3c184',INK);
        for(const u of [.6,1.39]){face(c,side,false,u+.07,27,.51,9,'#6c9c9f');face(c,side,false,u+.1,28,.08,8,'#d1d9b8');face(c,side,false,u,24,.65,2,'#efcf87');}
        face(c,side,false,1.32,16,.045,25,'#cfb17a');face(c,side,false,1.2,22,.1,2,'#ffe0a0');
        for(const u of [.45,2.5]){const p=iso(o.x+u,o.y+o.h,6);ellipse(c,p.x,p.y,11,13,INK);ellipse(c,p.x,p.y,9,11,'#bf9868');ellipse(c,p.x,p.y,7,9,'#493c40');
          for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,p,{x:p.x+Math.cos(a)*8,y:p.y+Math.sin(a)*10},'#c7a378');}ellipse(c,p.x,p.y,2,3,'#f1ce8b');}
        prism(c,o.x+2.4,o.y+.24,.45,o.h-.48,27,'#a5825a','#574040','#342f3b',24);
        lantern(c,o.x+2.35,o.y+o.h-.1,35);return;
      }
      if(o.kind==='bench'){
        for(const u of [.4,o.w-.5])prism(c,o.x+u,o.y,.15,o.h,13,'#576e71','#263d4b','#213546');
        for(let i=0;i<4;i++)prism(c,o.x,o.y+i*.24,o.w,.19,15,'#ceaa76','#a47958','#735e50',12);
        for(let z=23;z<=32;z+=5)prism(c,o.x,o.y+.04,o.w,.12,z,'#d5b183','#b28a62','#7e6954',z-3);return;
      }
      if(o.kind==='wall'){
        prism(c,o.x,o.y,o.w,o.h,23,'#a6b29b','#87968a','#5d787d');
        for(let z=1;z<22;z+=5)for(let x=0;x<o.w;x+=.55)face(c,o,false,x+(z%2)*.1,z,Math.min(.49,o.w-x),4,z%2?'#9ba78e':'#748a82');
        prism(c,o.x-.06,o.y-.06,o.w+.12,o.h+.12,26,'#c9c3a3','#a1ab93','#81988f',23);
        for(let u=0;u<o.w;u+=.75)prism(c,o.x+u,o.y,Math.min(.38,o.w-u),o.h,33,'#c8bd9f','#8c9182','#687b79',26);
        for(let i=0;i<4;i++)shrub(c,o.x+.25+i*.9,o.y+.45,28,i+20);return;
      }
      const crate=(x,y,w,h,z,base=0)=>{prism(c,x,y,w,h,z,'#c7a16b','#a58157','#755e4a',base);for(let u=.2;u<w;u+=.25){line(c,iso(x+u,y+h,base+1),iso(x+u,y+h,z),'#675641');tile(c,x+u,y,.025,h,z+1,'#e1bc7d');}for(const v of [base+3,z-3])line(c,iso(x,y+h,v),iso(x+w,y+h,v),'#e1b87b',2);line(c,iso(x+.08,y+h,base+4),iso(x+w-.08,y+h,z-4),'#d6b17c',3);};
      crate(o.x,o.y,o.w,o.h,18);crate(o.x+.15,o.y+.1,1.05,.9,35,18);crate(o.x+1.15,o.y+.6,.7,.8,29,18);
      const barrel=iso(o.x+.4,o.y+o.h-.2,21);ellipse(c,barrel.x,barrel.y+6,10,6,'#503d36');rect(c,barrel.x-10,barrel.y-10,20,16,'#986e49');ellipse(c,barrel.x,barrel.y-10,10,5,'#c59a62');for(const h of [-6,2]){rect(c,barrel.x-10,barrel.y+h,20,2,'#41454a');rect(c,barrel.x-8,barrel.y+h,6,1,'#aeb0a0');}line(c,{x:barrel.x-2,y:barrel.y-8},{x:barrel.x-2,y:barrel.y+5},'#654a38');
      const p=iso(o.x+.6,o.y+o.h,11);rect(c,p.x-4,p.y-5,9,7,'#e1cca0');rect(c,p.x-2,p.y-3,5,1,'#6a7565');
    }
    const cached=M.obstacles.map(o=>{
      const scratch=document.createElement('canvas');scratch.width=W;scratch.height=H;const sc=scratch.getContext('2d');obstacle(sc,o);
      const corners=[iso(o.x,o.y),iso(o.x+o.w,o.y),iso(o.x,o.y+o.h),iso(o.x+o.w,o.y+o.h)];
      const x=Math.floor(Math.min(...corners.map(p=>p.x))-30),y=Math.floor(Math.min(...corners.map(p=>p.y))-o.hz-110),w=Math.ceil((o.w+o.h)*20+60),h=Math.ceil((o.w+o.h)*10+o.hz+150);
      const sprite=document.createElement('canvas');sprite.width=w;sprite.height=h;sprite.getContext('2d').drawImage(scratch,x,y,w,h,0,0,w,h);
      const mask=sprite.getContext('2d').getImageData(0,0,w,h).data;
      return {o,sprite,x,y,w,h,mask,sort:o.x+o.y+o.w+o.h-.3};
    });
    // Gas lamps stand on existing solid edges and participate in the depth order.
    const lamps=lampPositions.map(([x,y,z])=>({lamp:{x,y,z},sort:x+y+.01}));
    let camera=null;
    function draw(state,ownId,time=0,overview=false){
      ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);ctx.drawImage(ground,0,0);
      const reduced=motionPreference?.matches,clock=reduced?0:time;
      const players=(state?.players||[]).map((p,i)=>Number.isFinite(p.x)&&Number.isFinite(p.y)?p:{...p,...(p.team==='police'?M.police:M.thieves)[Math.floor(i/2)%4]});
      const objects=[...cached,...lamps,...players.map(p=>({p,sort:p.x+p.y}))].sort((a,b)=>a.sort-b.sort);
      for(const item of objects){
        if(item.lamp){const {x,y,z}=item.lamp,p=iso(x,y);ellipse(ctx,p.x,p.y,5,3,'#151d29');line(ctx,p,iso(x,y,z),'#222b35',4);line(ctx,{x:p.x+1,y:p.y-3},iso(x+.05,y,z-10),'#8d8b78');lantern(ctx,x,y,z);continue;}
        if(item.p){const p=item.p,pos=iso(p.x,p.y),own=p.id===ownId;
          if(own){ellipse(ctx,pos.x,pos.y,17,8,'#ffe6a029');ctx.strokeStyle='#ffe4a2';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(pos.x,pos.y,16,7,0,0,Math.PI*2);ctx.stroke();}
          if(p.moving&&!p.captured&&!reduced){for(let i=0;i<3;i++){const d=(clock/100+i)%3;rect(ctx,pos.x-4-i*3,pos.y+d,3-d*.5,2,'#ead6a440');}}
          actor(ctx,p,pos.x,pos.y,clock,1.05);
        }else{
          const {o,sprite,x,y}=item;
          const hidden=players.some(p=>{
            if(p.x+p.y>=item.sort)return false;
            const a=iso(p.x,p.y);
            return [[0,-44],[0,-25],[-7,-25],[7,-25]].some(([dx,dy])=>{
              const mx=Math.round(a.x+dx-x),my=Math.round(a.y+dy-y);
              return mx>=0&&my>=0&&mx<item.w&&my<item.h&&item.mask[(my*item.w+mx)*4+3]>180;
            });
          });
          ctx.globalAlpha=hidden?.34:1;ctx.drawImage(sprite,x,y);ctx.globalAlpha=1;
        }
      }
      // Light halos are restrained so the player palette stays readable.
      for(const [x,y,z]of lampPositions){const p=iso(x,y,z);glow(ctx,p.x,p.y,22+Math.sin(clock/700+x)*1.5,T.accent+'21');}
      if(['ice','volcano','cloud','crystal','moon','autumn'].includes(T.biome))for(let i=0;i<22;i++){
        const px=100+noise(i,4)*880,py=100+(noise(i,6)*430+clock*(T.biome==='volcano'?-.012:.009)+900)%430;
        rect(ctx,px+Math.sin(clock/1700+i)*5,py,T.biome==='autumn'?3:2,2,T.accent+'77');
      }
      // Blue moths gather only over the planters, a small enchanted detail away from routes.
      for(const o of M.obstacles.filter(o=>o.kind==='garden'))for(let i=0;i<3;i++){
        const p=iso(o.x+.6+i*.7,o.y+.5,36+i*8),a=clock/1400+i*2;
        rect(ctx,p.x+Math.sin(a)*8,p.y+Math.cos(a)*4,2,2,'#c4edd0');
        if(!reduced)rect(ctx,p.x+Math.sin(a)*8-2,p.y+Math.cos(a)*4+1,1,1,'#84bbb580');
      }
      for(const o of M.obstacles.filter(o=>buildingKinds.has(o.kind))){const p=iso(o.x+.85,o.y+o.h/2,o.hz+82);
        for(let i=0;i<3;i++){const phase=(clock/950+i*.7)%2.5;rect(ctx,p.x+phase*4,p.y-phase*8,4+phase*3,3+phase,'#c8d7d514');}
      }
      // Prison gateway sign is high enough to leave the opening unobstructed.
      for(const x of [21.1,23.9]){const p=iso(x,16,0);line(ctx,p,iso(x,16,47),'#355161',3);lantern(ctx,x,16,43);}
      const jail=iso(22.5,16,55);label(ctx,'PRISIÓN · RESCATE',jail.x,jail.y,T.accent,9);
      for(const e of state?.events||[]){const age=state.server_now-e.at;if(!['capture','rescue'].includes(e.type)||age<0||age>800)continue;const p=iso(e.x,e.y,21),t=age/800,col=e.type==='rescue'?'#9fe6bf':'#ffdc93';ctx.globalAlpha=1-t;
        for(let i=0;i<8;i++){const a=i*Math.PI/4,r=12+t*32;rect(ctx,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.6,3,3,col);}label(ctx,e.type==='rescue'?'¡LIBRE!':'¡CAPTURADO!',p.x,p.y-26-t*20,col,10);ctx.globalAlpha=1;
      }
      // Labels are a final pass: architecture never hides a player's identity.
      const nameplates=[];
      for(const p of players){const pos=iso(p.x,p.y),own=p.id===ownId,text=(own?'TÚ · ':'')+String(p.name||'').slice(0,12);ctx.font='bold 10px monospace';const width=ctx.measureText(text).width+12;
        let y=pos.y-76;
        for(let attempt=0;attempt<8&&nameplates.some(n=>Math.abs(n.x-pos.x)<(n.w+width)/2+3&&Math.abs(n.y-y)<18);attempt++)y-=18;
        nameplates.push({x:pos.x,y,w:width});if(y<pos.y-76)line(ctx,{x:pos.x,y:y+5},{x:pos.x,y:pos.y-67},'#bdc5af66');
        label(ctx,text,pos.x,y,p.color,10);
        if(own){const lift=Math.sin(clock/220)*2;poly(ctx,[{x:pos.x-5,y:y-21+lift},{x:pos.x+5,y:y-21+lift},{x:pos.x,y:y-14+lift}],'#ffe2a1',INK);}
        if(p.captured)label(ctx,'PRESO',pos.x,pos.y+15,'#d9c8a4',8);
      }
      ctx.textAlign='left';ctx.font='9px monospace';ctx.fillStyle='#c0baa9';ctx.fillText('CASCO · GUARDIA     ANTIFAZ · RUFIÁN',35,666);ctx.textAlign='right';ctx.fillStyle=T.accent;ctx.fillText(T.name.toUpperCase()+' / QORI',1045,666);
      const width=Math.max(1,Math.round(canvas.clientWidth||W)),height=Math.max(1,Math.round(canvas.clientHeight||H)),dpr=Math.min(2,root.devicePixelRatio||1);
      if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
      output.imageSmoothingEnabled=false;output.fillStyle='#142c3e';output.fillRect(0,0,canvas.width,canvas.height);
      const me=players.find(p=>p.id===ownId),follow=root.innerWidth<=760&&!overview&&me&&['running','countdown'].includes(state?.status);
      if(follow){const p=iso(me.x,me.y,25),h=365,w=Math.min(W,h*width/height),target={x:Math.max(0,Math.min(W-w,p.x-w/2)),y:Math.max(0,Math.min(H-h,p.y-h/2))};
        if(!camera||camera.id!==ownId||Math.hypot(camera.x-target.x,camera.y-target.y)>180)camera={...target,id:ownId};else{camera.x+=(target.x-camera.x)*.18;camera.y+=(target.y-camera.y)*.18;}
        output.drawImage(scene,Math.round(camera.x),Math.round(camera.y),w,h,0,0,canvas.width,canvas.height);
      }else{camera=null;const scale=Math.min(canvas.width/W,canvas.height/H),w=W*scale,h=H*scale;output.drawImage(scene,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}
    }
    return {draw,iso};
  }
  function create(canvas){
    let current='burgo',scene=createScene(canvas,current);
    return {iso,draw(state,own,time,overview){const next=C.world(state?.scenario_id).id;if(next!==current){current=next;scene=createScene(canvas,next);}scene.draw(state,own,time,overview);}};
  }
  root.QoriChaseView={create,portrait};
})(globalThis);

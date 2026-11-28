/* Original code-drawn pixel art. No remote assets, sprites or fonts required. */
(function(root){
  'use strict';
  const C=root.QoriChaseCore, M=C.MAP;
  const INK='#232b43',cream='#fff1cf';
  function create(canvas){
    const output=canvas.getContext('2d'),scene=document.createElement('canvas');scene.width=1080;scene.height=700;
    const ctx=scene.getContext('2d');canvas.width=1080;canvas.height=700;
    const ground=document.createElement('canvas');ground.width=1080;ground.height=700;
    let g=ground.getContext('2d');g.imageSmoothingEnabled=false;
    const iso=(x,y,z=0)=>({x:500+(x-y)*20,y:85+(x+y)*10-z});
    function poly(c,points,fill,stroke){c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p.x),Math.round(p.y)):c.moveTo(Math.round(p.x),Math.round(p.y)));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
    function tile(c,x,y,w,h,z,color,line){poly(c,[iso(x,y,z),iso(x+w,y,z),iso(x+w,y+h,z),iso(x,y+h,z)],color,line);}
    function box(c,x,y,w,h,z,top,left,right){
      poly(c,[iso(x,y+h),iso(x+w,y+h),iso(x+w,y+h,z),iso(x,y+h,z)],left,INK);
      poly(c,[iso(x+w,y),iso(x+w,y+h),iso(x+w,y+h,z),iso(x+w,y,z)],right,INK);
      tile(c,x,y,w,h,z,top,INK);
    }
    const grad=g.createLinearGradient(0,0,0,700);grad.addColorStop(0,'#182940');grad.addColorStop(1,'#334557');g.fillStyle=grad;g.fillRect(0,0,1080,700);
    // Floating quarter foundation and hand-laid pavement.
    box(g,-.25,-.25,26.5,22.5,-15,'#655749','#26333e','#1b2934');
    for(let x=0;x<26;x++)for(let y=0;y<22;y++){
      const plaza=x>7&&x<20&&y>6&&y<16;
      const shade=(x*17+y*29)%5;
      tile(g,x,y,1,1,0,(plaza?['#b9a386','#b39d81','#bca78d','#af987b','#b8a185']:['#647d80','#698488','#718c8e','#647f84','#738a89'])[shade],'#546d72');
      const p=iso(x+.2,y+.35);g.fillStyle=plaza?'#c9b99a':'#819a96';g.fillRect(p.x,p.y,3,1);
      if((x*31+y*11)%13===0){g.fillStyle='#465d62';g.fillRect(p.x+6,p.y+3,3,1);}
    }
    for(let i=0;i<22;i++){tile(g,0,i,.22,1,2,'#d7bf91');tile(g,25.78,i,.22,1,2,'#d7bf91');}
    for(let i=0;i<26;i++){tile(g,i,0,1,.22,2,'#d7bf91');tile(g,i,21.78,1,.22,2,'#d7bf91');}
    tile(g,20,16,5,5,0,'#897d78','#3c4654');
    for(let y=16.5;y<21;y+=.5)tile(g,20.3,y,4.4,.03,0,'#9e9185');
    // Insets, drain covers, curb paint and flower petals keep the streets alive.
    for(const [x,y]of [[2,15],[7,8],[15,7],[23,6],[18,19]]){
      tile(g,x,y,.65,.5,1,'#394d5d',INK);
      for(let i=0;i<4;i++)tile(g,x+.1+i*.12,y+.05,.025,.4,2,'#7f969b');
    }
    g.font='bold 13px monospace';g.textAlign='center';g.fillStyle='#f6dc9f';let sign=iso(22.5,16);g.fillText('PRISIÓN · ENTRADA',sign.x,sign.y-6);
    function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
    function windowAt(x,y,z){const p=iso(x,y,z);rect(p.x-7,p.y-11,15,19,INK);rect(p.x-5,p.y-9,11,14,'#f5ca78');rect(p.x-4,p.y-8,4,6,'#ffe6aa');rect(p.x,p.y-9,2,15,'#6b7479');rect(p.x-6,p.y-2,14,2,'#6b7479');rect(p.x-9,p.y+8,19,3,'#d4bf9c');}
    function building(o,time){
      const schemes={cafe:['#cb7666','#c8aa87','#9d7d6b'],shop:['#548b92','#e0bd89','#b39475'],house:['#7a8ea6','#b7b9a6','#8b9e98']};
      const colors=schemes[o.kind]||schemes.house;
      box(ctx,o.x+.15,o.y+.25,o.w+.3,o.h+.3,3,'#39495488','#39495488','#39495488');
      box(ctx,o.x,o.y,o.w,o.h,o.hz,colors[0],colors[1],colors[2]);
      box(ctx,o.x-.15,o.y-.15,o.w+.3,o.h+.3,o.hz+5,colors[0],'#795f64','#495968');
      for(let y=0;y<o.h+.2;y+=.3)tile(ctx,o.x-.1,o.y+y,o.w+.2,.035,o.hz+6,'#e6aa8a66');
      for(let x=0;x<o.w;x+=.45)for(let y=0;y<o.h;y+=.6)tile(ctx,o.x+x,o.y+y,.025,.28,o.hz+6,'#393e5477');
      ctx.save();ctx.translate(0,-o.hz);box(ctx,o.x+.6,o.y+.6,.55,.5,18,'#d7bba1','#9e8d83','#746e70');ctx.restore();
      for(let i=0;i<3;i++){let p=iso(o.x+.85,o.y+.85,o.hz+22+i*7+(time/80%7));rect(p.x+i*3,p.y,6+i*2,4,'#d2dad01a');}
      windowAt(o.x+.7,o.y+o.h,26);windowAt(o.x+o.w-.7,o.y+o.h,26);windowAt(o.x+o.w,o.y+.8,28);
      const door=iso(o.x+o.w/2,o.y+o.h);rect(door.x-9,door.y-29,19,29,INK);rect(door.x-6,door.y-26,13,25,'#6d6567');rect(door.x+3,door.y-12,2,2,'#efcb77');
      if(o.kind!=='house'){
        for(let i=0;i<8;i++)tile(ctx,o.x+i*o.w/8,o.y+o.h,o.w/8,.7,35,i%2?'#fff0c5':o.kind==='cafe'?'#b95763':'#4b918b',INK);
        let p=iso(o.x+o.w/2,o.y+o.h,47);rect(p.x-29,p.y-8,58,13,INK);ctx.fillStyle=cream;ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(o.kind==='cafe'?'CAFÉ QORI':'EL FAROL',p.x,p.y+2);
      }
      // Brick seams on the facade.
      for(let i=0;i<5;i++){let p=iso(o.x+.25+i*.6,o.y+o.h,8+(i%2)*5);rect(p.x,p.y,7,1,'#806d6055');}
    }
    function obstacle(o,time){
      if(['house','shop','cafe'].includes(o.kind))return building(o,time);
      if(o.kind==='bars'){
        box(ctx,o.x,o.y,o.w,o.h,4,'#a7abb0','#696f7e','#4b5969');
        const n=Math.ceil(Math.max(o.w,o.h)/.28);
        for(let i=0;i<=n;i++){let p=iso(o.x+o.w*i/n,o.y+o.h*i/n);rect(p.x-1,p.y-33,3,32,'#26384b');rect(p.x,p.y-32,1,28,'#abc4c3');}
        const a=iso(o.x,o.y,31),b=iso(o.x+o.w,o.y+o.h,31);ctx.strokeStyle='#b0b7b7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();return;
      }
      if(o.kind==='garden'){
        box(ctx,o.x,o.y,o.w,o.h,12,'#5d6254','#b59276','#7f7164');
        for(let i=0;i<18;i++){const x=o.x+.2+(i*.43)%(o.w-.3),y=o.y+.2+(i*.71)%(o.h-.3),p=iso(x,y,18+Math.sin(time/900+i)*1.4);rect(p.x-6,p.y-6,12,9,i%2?'#407b66':'#5d9670');rect(p.x-4,p.y-8,8,5,'#91b47a');if(i%3===0)rect(p.x,p.y-6,3,3,i%2?'#f1ba7b':'#e898b0');}return;
      }
      if(o.kind==='car'){
        box(ctx,o.x,o.y,o.w,o.h,15,'#dca76a','#9f6d5c','#725660');box(ctx,o.x+.6,o.y+.15,1.6,1.5,27,'#f0bd7b','#365a70','#436b7d');
        for(const [x,y]of [[o.x+.4,o.y+o.h],[o.x+2.5,o.y+o.h]]){const p=iso(x,y);rect(p.x-5,p.y-7,10,12,INK);rect(p.x-2,p.y-3,4,5,'#92918a');}return;
      }
      box(ctx,o.x,o.y,o.w,o.h,o.hz,o.kind==='wall'?'#a7b4b0':'#bf9465','#99755d','#735b53');
      for(let i=0;i<o.w;i+=.25)tile(ctx,o.x+i,o.y,.04,o.h,o.hz+1,'#5c514c');
      if(o.kind==='crates'){box(ctx,o.x+.3,o.y+.3,.9,.8,34,'#d8af74','#a5815e','#7e6153');}
    }
    function character(p,own,time){
      const pos=iso(p.x,p.y),x=Math.round(pos.x),y=Math.round(pos.y),walk=p.moving&&!p.captured?Math.sin(time/75):0,bob=p.captured?0:Math.abs(walk)*2;
      ctx.fillStyle='#15293d66';ctx.beginPath();ctx.ellipse(x,y,12,5,0,0,Math.PI*2);ctx.fill();
      if(own){ctx.strokeStyle='#fff0b8';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,15,7,0,0,Math.PI*2);ctx.stroke();}
      rect(x-8,y-10+walk*3,6,10,INK);rect(x+2,y-10-walk*3,6,10,INK);
      rect(x-10,y-25-bob,20,17,INK);rect(x-8,y-24-bob,16,15,p.color);rect(x-6,y-24-bob,4,14,'#ffffff44');
      rect(x-13,y-22-bob-walk*2,4,12,p.color);rect(x+9,y-22-bob+walk*2,4,12,p.color);rect(x-13,y-12-bob-walk*2,4,4,'#e3b49a');rect(x+9,y-12-bob+walk*2,4,4,'#e3b49a');
      rect(x-8,y-39-bob,16,15,INK);rect(x-6,y-37-bob,12,12,'#edc1a0');rect(x-5,y-37-bob,4,3,'#ffe0b6');
      if(p.team==='police'){rect(x-10,y-43-bob,20,6,'#253c63');rect(x-9,y-44-bob,18,3,'#426892');rect(x-9,y-38-bob,23,3,INK);rect(x-2,y-42-bob,4,4,'#ffda72');rect(x+4,y-23-bob,3,4,'#ffda72');}
      else {rect(x-8,y-35-bob,17,5,'#121c30');rect(x-4,y-34-bob,3,2,'#e9eaf1');rect(x+3,y-34-bob,3,2,'#e9eaf1');rect(x-9,y-39-bob,17,3,'#4d3b45');}
      if(p.team==='police'){rect(x-3,y-33-bob,2,2,INK);rect(x+4,y-33-bob,2,2,INK);}
      const name=(own?'TÚ · ':'')+p.name.slice(0,12);ctx.font='bold 10px monospace';ctx.textAlign='center';const w=ctx.measureText(name).width+10;
      rect(x-w/2,y-60,w,14,'#172537e8');ctx.fillStyle=p.color;ctx.fillText(name,x,y-50);
      if(own){const lift=Math.sin(time/200)*2;poly(ctx,[{x:x-4,y:y-71+lift},{x:x+4,y:y-71+lift},{x,y:y-65+lift}],'#ffda79');}
      if(p.captured){ctx.fillStyle=cream;ctx.font='bold 8px monospace';ctx.fillText('CAPTURADO',x,y+12);}
    }
    function draw(state,ownId,time,overview=false){
      ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,1080,700);ctx.drawImage(ground,0,0);
      const players=(state?.players||[]).map((p,i)=>Number.isFinite(p.x)?p:{...p,...(p.team==='police'?M.police:M.thieves)[Math.floor(i/2)%4]});
      const objects=[...M.obstacles.map(o=>({sort:o.x+o.y+o.w+o.h-.3,o})),...players.map(p=>({sort:p.x+p.y,p}))].sort((a,b)=>a.sort-b.sort);
      for(const item of objects){
        if(item.p)character(item.p,item.p.id===ownId,time);
        else{
          const o=item.o;const hidden=players.some(p=>{const a=iso(p.x,p.y,25),b=iso(o.x+o.w/2,o.y+o.h/2);return p.x+p.y<item.sort&&Math.abs(a.x-b.x)<(o.w+o.h)*10+12&&a.y>b.y-o.hz-18&&a.y<b.y+25;});
          ctx.globalAlpha=hidden?.38:1;obstacle(o,time);ctx.globalAlpha=1;
        }
      }
      for(const e of state?.events||[]){const age=state.server_now-e.at;if(!['capture','rescue'].includes(e.type)||age<0||age>650)continue;const p=iso(e.x,e.y,18);ctx.strokeStyle=e.type==='rescue'?'#99e4b3':'#ffe5a2';ctx.globalAlpha=1-age/650;ctx.lineWidth=3;ctx.strokeRect(p.x-10-age/35,p.y-10-age/35,20+age/17.5,20+age/17.5);ctx.globalAlpha=1;}
      ctx.fillStyle='#d5d8c9';ctx.font='11px monospace';ctx.textAlign='left';ctx.fillText('QORI ORIGINAL  /  BARRIO DEL FAROL',42,645);ctx.fillStyle='#9aaeb2';ctx.fillText('GORRA = POLICÍA     ANTIFAZ = LADRÓN',42,665);
      const width=Math.max(1,Math.round(canvas.clientWidth)),height=Math.max(1,Math.round(canvas.clientHeight));
      if(canvas.width!==width*2||canvas.height!==height*2){canvas.width=width*2;canvas.height=height*2;}
      output.imageSmoothingEnabled=false;output.fillStyle='#203346';output.fillRect(0,0,canvas.width,canvas.height);
      const me=players.find(p=>p.id===ownId),follow=root.innerWidth<=760&&!overview&&me&&['running','countdown'].includes(state?.status);
      if(follow){const p=iso(me.x,me.y,20),h=480,w=h*width/height,sx=Math.max(0,Math.min(1080-w,p.x-w/2)),sy=Math.max(0,Math.min(700-h,p.y-h/2));output.drawImage(scene,sx,sy,w,h,0,0,canvas.width,canvas.height);}
      else{const scale=Math.min(canvas.width/1080,canvas.height/700),w=1080*scale,h=700*scale;output.drawImage(scene,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}
    }
    return {draw,iso};
  }
  root.QoriChaseView={create};
})(globalThis);

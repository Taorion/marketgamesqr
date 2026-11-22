'use strict';
const $=id=>document.getElementById(id);let game=null,lastQR=null,pairTimer,allowedParents=[];
const sdk=new QoriPlayScreen({onState:state,onConnection:s=>{$('connection').textContent=s==='online'?'Pantalla conectada':s==='pair-again'?'Vuelve a vincular la pantalla':'Reconectando · anuncio disponible';$('fallback').hidden=s==='online';if(s!=='online'){$('qr').hidden=true;lastQR=null;}if(s==='pair-again')pair();}});
function state(s){$('stage').dataset.layout=s.campaign?.layout||'balanced';$('stage').dataset.orientation=s.orientation;game=s.game;
 $('game-state').textContent=({idle:'Escanea para jugar',ready:'Pulsa comenzar en tu teléfono',playing:'Partida en curso',paused:'Pantalla en pausa',disconnected:'Esperando reconexión',unavailable:'Campaña no disponible'})[s.status]||s.status;
 $('game-title').textContent=s.campaign?.game_key==='secuencia'?'Secuencia Qori':'Órbita Qori';
 if(s.campaign){$('headline').textContent=s.campaign.headline;$('description').textContent=s.campaign.description;}
 $('queue').textContent=s.queue?s.queue+' personas esperando':'Un jugador por turno';
 if(s.join?.url!==lastQR){lastQR=s.join?.url||null;if(!lastQR)$('qr').hidden=true;else sdk.showQR().then(q=>{if(q.url===lastQR&&q.image){$('qr').src=q.image;$('qr').hidden=false;}}).catch(()=>{$('qr').hidden=true;});}
 const parentOrigin=new URLSearchParams(location.search).get('parent_origin');if(window.parent!==window&&allowedParents.includes(parentOrigin))window.parent.postMessage({type:'qori-play:state',status:s.status,campaign_id:s.campaign?.id||null},parentOrigin);
}
async function pair(){clearInterval(pairTimer);try{const p=await sdk.beginPairing();$('pairing').hidden=false;$('pair-code').textContent=p.code;$('pair-status').textContent='Esperando confirmación del operador';
 pairTimer=setInterval(async()=>{try{if(await sdk.claimPairing()==='PAIRED'){clearInterval(pairTimer);$('pairing').hidden=true;}}catch(e){clearInterval(pairTimer);$('pair-status').textContent='Código vencido. Genera uno nuevo.';}},2000);
 }catch(e){$('connection').textContent=e.message;}}
$('new-pair').onclick=pair;$('fullscreen').onclick=()=>document.documentElement.requestFullscreen?.().catch(()=>{$('connection').textContent='Este reproductor no permite pantalla completa.';});
fetch('/api/play-capabilities').then(r=>r.json()).then(d=>allowedParents=d.embed_origins||[]);
window.addEventListener('message',e=>{if(e.source!==window.parent||!allowedParents.includes(e.origin))return;if(e.data?.type==='qori-play:pause')sdk.pause();if(e.data?.type==='qori-play:resume')sdk.resume();});
sdk.initialize().then(p=>{if(p){$('pairing').hidden=false;$('pair-code').textContent=p.code;pairTimer=setInterval(async()=>{try{if(await sdk.claimPairing()==='PAIRED'){clearInterval(pairTimer);$('pairing').hidden=true;}}catch{clearInterval(pairTimer);$('pair-status').textContent='Código vencido. Genera otro.';}},2000);}}).catch(e=>{$('connection').textContent=e.message;});
const canvas=$('game');let ctx;try{ctx=canvas.getContext('2d');}catch{}if(!ctx){$('fallback').hidden=false;$('game-state').textContent='Canvas no disponible';sdk.destroy();}
function draw(){if(!ctx)return;ctx.fillStyle='#102b52';ctx.fillRect(0,0,700,700);ctx.textAlign='center';ctx.font='28px system-ui';ctx.fillStyle='#d9e8ff';
 if(!game){ctx.fillText('Escanea · Conecta · Juega',350,330);}else if(game.game==='orbita'){
 for(let i=1;i<3;i++){ctx.strokeStyle='#325078';ctx.beginPath();ctx.moveTo(i*700/3,0);ctx.lineTo(i*700/3,700);ctx.stroke();}
 for(const o of game.obstacles){ctx.fillStyle='#ffba53';ctx.fillRect(o.lane*700/3+75,o.y*5.7,80,35);}
 const x=game.lane*700/3+116;ctx.fillStyle='#70e3df';ctx.beginPath();ctx.moveTo(x,570);ctx.lineTo(x-30,630);ctx.lineTo(x+30,630);ctx.fill();
 ctx.fillStyle='white';ctx.fillText('Puntos '+game.score+' · Vidas '+game.lives,350,45);
 }else{
 const symbols=['▲','●','■','✦'],colors=['#59c8ee','#ffbe56','#97d68e','#e395cf'];
 symbols.forEach((symbol,i)=>{const x=80+(i%2)*300,y=100+Math.floor(i/2)*240;ctx.fillStyle=game.symbol===i?colors[i]:'#27476f';ctx.fillRect(x,y,240,200);ctx.font='80px system-ui';ctx.fillStyle=game.symbol===i?'#062348':'#6683a8';ctx.fillText(symbol,x+120,y+125);});
 ctx.font='28px system-ui';ctx.fillStyle='white';ctx.fillText(game.phase==='show'?'Mira y recuerda':'Repite en tu teléfono',350,55);ctx.fillText('Puntos '+game.score,350,650);
 }requestAnimationFrame(draw);}
draw();window.addEventListener('pagehide',()=>{clearInterval(pairTimer);sdk.destroy();});

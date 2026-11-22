'use strict';
const $=id=>document.getElementById(id),ticket=location.hash.slice(1);history.replaceState(null,'',location.pathname);
if(ticket)sessionStorage.removeItem('qori-play-controller-v1');
let token=sessionStorage.getItem('qori-play-controller-v1'),ws,seq=0,current,notice,retry=500,stopped=false,ping,timer;
async function api(path,body,customer=false){const headers={'Content-Type':'application/json',...(token&&!customer?{Authorization:'Bearer '+token}:{})};if(customer)headers['X-Qori-Web']='1';
 const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers,body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error?.code||'REQUEST_FAILED');return d;}
function message(s){$('status').textContent=s;}
fetch('/api/play/v1/notice').then(r=>r.json()).then(d=>{notice=d;$('notice').textContent=d.text;});
$('join-form').onsubmit=async e=>{e.preventDefault();try{if(!notice||!ticket)throw Error('Escanea un QR vigente de la pantalla.');const d=await api('/api/play/v1/sessions/join',{ticket,accepted:true,adult:true,version:notice.version});token=d.controller_token;sessionStorage.setItem('qori-play-controller-v1',token);connect();}catch(e){message(e.message);}};
function render(s){current=s;seq=Math.max(seq,s.last_seq);$('join').hidden=true;$('session').hidden=false;
 const labels={QUEUED:'Estás en la cola. Turno '+s.position,READY:'Es tu turno. Mira la pantalla y pulsa comenzar.',PLAYING:'Control conectado',PAUSED:'La pantalla está en pausa',DISCONNECTED:'Recuperando conexión',COMPLETED:'Partida completada',FAILED:'Fin de la partida',EXPIRED:'La sesión terminó. Escanea un QR nuevo.'};$('state').textContent=labels[s.status];$('start').hidden=s.status!=='READY';
 const key=s.controls.join(',');if($('controls').dataset.actions!==key){const buttons=s.controls.map(action=>{const b=document.createElement('button');b.type='button';b.textContent=({left:'←',right:'→',a:'▲',b:'●',c:'■',d:'✦'})[action];b.setAttribute('aria-label',action);b.onclick=()=>input(action);return b;});$('controls').replaceChildren(...buttons);$('controls').dataset.actions=key;}for(const b of $('controls').children)b.disabled=s.status!=='PLAYING';$('gyro').hidden=!s.controls.includes('left')||s.status!=='PLAYING'||!window.DeviceOrientationEvent;
 $('result').textContent=s.result?'Puntaje verificado: '+s.result.score:'';$('reward').hidden=s.reward!=='RESERVED';
 $('cta').hidden=!s.cta_url;if(s.cta_url)$('cta').href=s.cta_url;
 if(s.reward==='ISSUED')$('result').textContent+=' · Beneficio disponible en tu Customer.';
}
function connect(){if(!window.WebSocket){message('Este navegador no admite el control. Usa uno compatible.');return;}
 const url=new URL('/api/play/v1/live',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(url);
 ws.onopen=()=>ws.send(JSON.stringify({type:'auth',role:'controller',token}));
 ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.type==='ready'){retry=500;message('Conectado a tu pantalla');}if(d.type==='state')render(d.state);if(d.type==='error')api('/api/play/v1/sessions/status').then(s=>{seq=s.last_seq;render(s);});};
 ws.onclose=e=>{clearInterval(ping);if(stopped)return;message('Reconectando. Tus controles no pasan a otra pantalla.');if(e.code===1008){sessionStorage.removeItem('qori-play-controller-v1');message('Sesión no disponible. Escanea un QR nuevo.');return;}timer=setTimeout(connect,retry);retry=Math.min(retry*2,10000);};
 ws.onerror=()=>message('Sin conexión. Espera para continuar.');ping=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'ping'}));},3000);
}
function input(action){if(ws?.readyState===1)ws.send(JSON.stringify({type:'input',seq:++seq,action}));}
$('start').onclick=()=>input('start');
let gyroHandler;
$('gyro').onclick=async()=>{try{if(DeviceOrientationEvent.requestPermission&&await DeviceOrientationEvent.requestPermission()!=='granted')throw Error('Permiso no concedido. Usa los botones.');if(gyroHandler)return;let previous=0;gyroHandler=e=>{const direction=e.gamma>18?1:e.gamma< -18?-1:0;if(direction&&direction!==previous&&current?.status==='PLAYING')input(direction>0?'right':'left');previous=direction;};window.addEventListener('deviceorientation',gyroHandler);message('Inclinación activa; puedes seguir usando los botones.');}catch(e){message(e.message);}};
$('claim-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/customer/play/claim',{controller_token:token,accepted:true,version:'play-claim-sandbox-1'},true);message('Beneficio sintético guardado en tu Customer.');$('reward').hidden=true;}catch(e){message('No se pudo reclamar: '+e.message);}};
$('cta').onclick=()=>api('/api/play/v1/sessions/event',{type:'cta_opened'}).catch(()=>{});
window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);clearInterval(ping);ws?.close();if(gyroHandler)window.removeEventListener('deviceorientation',gyroHandler);});
if(token)connect();

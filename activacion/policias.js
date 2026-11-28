(function(root){
  'use strict';
  const C=root.QoriChaseCore;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(container,options){
    container.innerHTML=`<section class="chase" aria-label="Policías y Ladrones">
      <header class="chase-heading"><div><span class="chase-kicker">QORI ORIGINAL · MULTIJUGADOR</span><h2>Policías <em>&</em> Ladrones</h2><p>Una noche, un barrio y dos equipos.</p></div><button data-exit class="chase-quiet">Salir de la sala</button></header>
      <div class="chase-hud"><strong data-clock>03:00</strong><span data-team>Elige tu apodo</span><span data-count>2–8 participantes</span><span data-connection>Conectando…</span></div>
      <div class="chase-layout"><aside class="chase-sidebar">
        <div data-entry><h3>Reúne a tu equipo</h3><label>Tu apodo<input data-alias maxlength="16" autocomplete="nickname" placeholder="Cómo te llamamos"></label><button data-create>Crear sala</button><div class="chase-divider">o entra con un código</div><label>Código de sala<input data-code maxlength="6" placeholder="ABC234" autocomplete="off" autocapitalize="characters"></label><button data-join class="chase-secondary">Unirme</button></div>
        <div data-lobby hidden><span class="chase-kicker">SALA DEL BARRIO</span><strong data-roomcode class="chase-code"></strong><button data-share class="chase-secondary">Copiar enlace de invitación</button><div data-roster class="chase-roster"></div><div class="chase-lobby-actions"><button data-ready class="chase-secondary">Estoy listo</button><button data-start>Iniciar partida</button></div><p data-lobby-note></p></div>
        <details class="chase-rules" open><summary>Cómo jugar</summary><p>Los policías capturan al tocar. Si todos los ladrones terminan en prisión, ganan los policías. Si queda uno libre cuando termina el tiempo, ganan los ladrones.</p><p><b>Rescata:</b> entra por la puerta de la prisión y toca a un compañero preso. Solo él queda libre. El reloj continúa.</p><p><b>Muévete:</b> WASD o flechas. En celular, arrastra el joystick. Tu flecha te identifica.</p></details>
      </aside><div class="chase-play"><div class="chase-viewport"><canvas tabindex="0" aria-label="Barrio isométrico. Usa WASD, flechas o joystick para moverte."></canvas><div data-overlay class="chase-overlay" hidden></div><button data-map class="chase-map chase-quiet">Ver mapa completo</button><div data-joystick class="chase-joystick" role="group" aria-label="Joystick: arrastra para moverte"><span></span><b>MOVER</b></div></div><div class="chase-bottom"><span data-instruction>Tu color identifica a tu personaje. La gorra y el antifaz identifican al equipo.</span><label>Sonido<input data-volume type="range" min="0" max="100" value="35" aria-label="Volumen del juego"></label></div></div></div>
      <section data-results class="chase-results" hidden><span class="chase-kicker">RONDA COMPLETA</span><h3 data-winner></h3><p data-reason></p><div data-final-roster class="chase-final-roster"></div><div class="chase-result-actions"><button data-restart>Preparar revancha</button><button data-new-room class="chase-secondary">Cambiar de sala</button><button data-benefit class="chase-secondary">Ver mi resultado / beneficio</button></div><small>La revancha conserva tu identidad. Los beneficios corresponden a tu primera ronda; no se duplican al cambiar de sala ni al volver a jugar.</small></section>
      <p data-message class="chase-message" role="status" aria-live="polite"></p>
    </section>`;
    const $=s=>container.querySelector(s),el=$('.chase'),canvas=$('canvas'),view=QoriChaseView.create(canvas);
    let state=null,previous=null,received=performance.now(),dead=false,ws=null,socketKey=null,seq=0,round=null,raf,mutating=false,polling=false,lastEvent=0,lastCountdown=null,lastInput=0,lastPacket='',audio=null,volume=.35,overview=false,duplicate=false;
    const keys=new Set(),controllers=new Set();let stick={x:0,y:0},pointer=null;
    const message=text=>{$('[data-message]').textContent=text||'';};
    let transportVersion=0;
    const abortable=async body=>{const c=new AbortController();controllers.add(c);
      const cancelled=new Promise((_,reject)=>c.signal.addEventListener('abort',()=>{const error=new Error('Solicitud cancelada');error.name='AbortError';reject(error);},{once:true}));
      const timeout=setTimeout(()=>c.abort(),10000);
      try{return await Promise.race([options.request(body,{signal:c.signal}),cancelled]);}finally{clearTimeout(timeout);controllers.delete(c);}
    };
    function clearRoom(clearCode=false){
      transportVersion++;const socket=ws;ws=null;socketKey=null;socket?.close();
      state=null;previous=null;round=null;seq=0;lastEvent=0;lastCountdown=null;rosterKey='';duplicate=false;
      keys.clear();stick={x:0,y:0};pointer=null;lastPacket='';
      if(clearCode)$('[data-code]').value='';paintUI();
    }
    function sound(kind){
      if(!audio||volume===0||document.hidden)return;
      const notes=kind==='capture'?[620,330,180]:kind==='rescue'?[392,523,784]:kind==='finish'?[392,494,587,784]:[660];
      notes.forEach((f,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*.09;osc.type='square';osc.frequency.value=f;gain.gain.setValueAtTime(volume*.06,t);gain.gain.exponentialRampToValueAtTime(.001,t+.14);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.15);});
    }
    function unlock(){if(!audio){try{audio=new(root.AudioContext||root.webkitAudioContext)();}catch(_){}}audio?.resume();}
    function own(){return state?.players.find(p=>p.id===state.own_id);}
    function connect(live){
      if(!live||duplicate||dead)return;
      if(ws&&[0,1].includes(ws.readyState)&&socketKey===state?.id)return;
      ws?.close();socketKey=state?.id;
      const socket=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+live.path);ws=socket;
      socket.onopen=()=>{if(ws===socket)socket.send(JSON.stringify({type:'auth',token:live.token}));};
      socket.onmessage=e=>{try{const data=JSON.parse(e.data);if(data.type==='state'&&ws===socket)accept(data.room);}catch(_){}};
      socket.onclose=e=>{if(ws!==socket)return;if(e.code===4001){duplicate=true;message('Esta sesión está abierta en otra pestaña. Recarga aquí para recuperarla.');}ws=null;};
      socket.onerror=()=>{};
    }
    function accept(next){
      if(dead||!next)return;
      if(state?.id===next.id&&next.server_now<state.server_now)return;
      if(next.round_id!==round){round=next.round_id;seq=0;previous=null;lastEvent=next.event_seq||0;}
      else previous=state;
      state=next;received=performance.now();
      if(own())$('[data-alias]').value=own().name;
      seq=Math.max(seq,(own()?.input_sequence??-1)+1);
      for(const event of next.events||[]){if(event.id>lastEvent){sound(event.type);if(event.type==='capture'||event.type==='rescue'){const p=next.players.find(q=>q.id===event.player);message(p?.name+(event.type==='capture'?' fue capturado.':' está libre de nuevo.'));}}lastEvent=Math.max(lastEvent,event.id);}
      paintUI();
    }
    function roster(players){return players.map(p=>`<div class="chase-player ${p.id===state.own_id?'is-you':''}"><span class="chase-avatar ${p.team}" style="--player:${esc(p.color)}" aria-hidden="true"></span><div><b>${esc(p.name)}${p.id===state.own_id?' · tú':''}</b><small>${p.team==='police'?'Policía · gorra':'Ladrón · antifaz'}${p.abandoned?' · Abandonó':p.captured?' · Capturado':state.status==='waiting'?(p.ready?' · Listo':' · En sala'):' · Libre'}</small></div><i style="background:${p.connected?p.color:'#677382'}" title="${p.connected?'Conectado':'Reconectando'}"></i></div>`).join('');}
    let rosterKey='';
    function paintUI(){
      const has=!!state; $('[data-entry]').hidden=has;$('[data-lobby]').hidden=!has;
      $('[data-exit]').hidden=!has;
      if(!has){el.classList.remove('is-playing');$('[data-results]').hidden=true;$('[data-overlay]').hidden=true;$('[data-clock]').textContent='03:00';$('[data-team]').textContent='Elige tu apodo';$('[data-team]').style.color='';$('[data-count]').textContent='2–8 participantes';$('[data-instruction]').textContent='Crea una sala o entra con un código. Tu resultado anterior se conserva.';return;}
      const p=own(),waiting=state.status==='waiting',finished=state.status==='finished',closed=state.status==='closed';
      el.classList.toggle('is-playing',['countdown','running'].includes(state.status));
      $('[data-roomcode]').textContent=state.code;
      $('[data-team]').textContent=p?(p.team==='police'?'GORRA · Policía':'ANTIFAZ · Ladrón'):'Observando';
      $('[data-team]').style.color=p?.color||'';
      const thieves=state.players.filter(q=>q.team==='thief');$('[data-count]').textContent=waiting?state.players.length+'/8 en sala':`${thieves.filter(q=>!q.captured).length} libres · ${thieves.filter(q=>q.captured).length} presos`;
      const key=JSON.stringify(state.players.map(({x,y,dx,dy,moving,input_sequence,...p})=>p))+state.status;
      if(key!==rosterKey){rosterKey=key;$('[data-roster]').innerHTML=roster(state.players);if(finished)$('[data-final-roster]').innerHTML=roster(state.players);}
      $('.chase-lobby-actions').hidden=!waiting;$('[data-start]').hidden=state.host_id!==state.own_id;$('[data-start]').disabled=state.players.length<2;
      $('[data-ready]').textContent=p?.ready?'Listo ✓':'Estoy listo';
      $('[data-lobby-note]').textContent=waiting?(state.host_id===state.own_id?'Eres anfitrión. Puedes iniciar con 2 a 8 conectados; las señales de listo son informativas.':'El anfitrión iniciará la partida. Puedes marcarte listo.'):'Cada color es una persona. El equipo gana junto.';
      $('[data-results]').hidden=!finished;
      $('[data-instruction]').textContent=p?.captured?'Estás capturado. Un ladrón libre puede tocarte para rescatarte. Sigue observando.':p?.team==='police'?'Captura a todos por contacto. Puedes vigilar la entrada de la prisión.':'Escapa y rescata a tus compañeros tocándolos dentro de la prisión.';
      if(finished){$('[data-winner]').textContent=state.winner==='police'?'¡Ganan los policías!':'¡Ganan todos los ladrones!';$('[data-reason]').textContent=state.reason==='all_captured'?'Todos los ladrones quedaron presos al mismo tiempo.':state.reason==='police_left'?'El equipo policial abandonó la persecución.':'Terminó el tiempo y quedó al menos un ladrón libre. También ganan sus compañeros presos.';$('[data-restart]').disabled=state.host_id!==state.own_id&&state.players.some(q=>q.id===state.host_id&&q.connected);}
      $('[data-exit]').textContent=closed?'Volver a las salas':'Salir de la sala';
      if(closed)message('La sala se cerró por inactividad. Pulsa Volver a las salas para crear o unirte a otra.');
      $('[data-overlay]').hidden=!closed;$('[data-overlay]').textContent=closed?'SALA CERRADA':'';
    }
    async function action(name,extra={}){
      if(mutating||dead)return;mutating=true;unlock();message('');
      try{const data=await abortable({action:name,room_id:name==='leave'?state?.id:undefined,round_id:state?.round_id||undefined,...extra});if(dead)return;
        if(name==='claim'){await options.onResult?.(data);message(data.message);}
        else if(name==='leave'){clearRoom(true);options.onExit?.();message('Ya puedes crear una sala o unirte con otro código.');}
        else{if(data.room)accept(data.room);else if(name==='resume')clearRoom();connect(data.live);}
      }catch(error){if(!dead)message(error.name==='AbortError'?'La conexión tardó demasiado. Puedes reintentar.':error.message);}finally{mutating=false;}
    }
    $('[data-create]').onclick=()=>action('create',{alias:$('[data-alias]').value});
    $('[data-join]').onclick=()=>action('join',{alias:$('[data-alias]').value,code:$('[data-code]').value.trim().toUpperCase()});
    $('[data-start]').onclick=()=>action('start');$('[data-ready]').onclick=()=>action('ready',{ready:!own()?.ready});
    $('[data-restart]').onclick=()=>action('restart');$('[data-benefit]').onclick=()=>action('claim');
    $('[data-new-room]').onclick=()=>action('leave');
    $('[data-exit]').onclick=()=>state?action('leave'):options.onExit?.();
    $('[data-map]').onclick=()=>{overview=!overview;$('[data-map]').textContent=overview?'Seguir mi personaje':'Ver mapa completo';};
    $('[data-volume]').oninput=e=>{volume=Number(e.target.value)/100;unlock();try{localStorage.setItem('qori-chase-volume',String(volume));}catch(_){}};
    try{const saved=localStorage.getItem('qori-chase-volume');if(saved!==null)volume=Math.max(0,Math.min(1,Number(saved)||0));$('[data-volume]').value=volume*100;}catch(_){}
    const invited=new URLSearchParams(location.search).get('room');if(invited)$('[data-code]').value=invited.slice(0,6);
    $('[data-share]').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',state.code);try{await navigator.clipboard.writeText(url.href);message('Enlace copiado. Compártelo con tu equipo.');}catch(_){message('Comparte el código '+state.code+' y el enlace de esta activación.');}};
    function keyboard(event,down){if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;const key=event.key.toLowerCase();if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key))return;event.preventDefault();down?keys.add(key):keys.delete(key);if(down)unlock();}
    const keyDown=e=>keyboard(e,true),keyUp=e=>keyboard(e,false),reset=()=>{keys.clear();stick={x:0,y:0};sendInput(true);};
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',reset);
    function visibility(){if(document.hidden){reset();audio?.suspend();}else if(audio)audio.resume();}document.addEventListener('visibilitychange',visibility);
    const joystick=$('[data-joystick]'),knob=joystick.querySelector('span');
    function touch(e){const r=joystick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/40,y=(e.clientY-r.top-r.height/2)/40,n=Math.max(1,Math.hypot(x,y));stick={x:x/n,y:y/n};knob.style.transform=`translate(${stick.x*35}px,${stick.y*35}px)`;e.preventDefault();}
    joystick.onpointerdown=e=>{pointer=e.pointerId;joystick.setPointerCapture(pointer);unlock();touch(e);};joystick.onpointermove=e=>{if(e.pointerId===pointer)touch(e);};
    joystick.onpointerup=joystick.onpointercancel=joystick.onlostpointercapture=()=>{pointer=null;stick={x:0,y:0};knob.style.transform='';sendInput(true);};
    function intention(){let x=stick.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=stick.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);return C.screenInput(x,y);}
    function sendInput(force=false){
      if(dead||duplicate||state?.status!=='running')return;
      const now=performance.now(),i=intention(),packet=JSON.stringify(i);
      if(!force&&now-lastInput<75||!force&&packet===lastPacket&&now-lastInput<250)return;
      lastInput=now;lastPacket=packet;const body={type:'input',round_id:state.round_id,seq:seq++,...i};
      if(ws?.readyState===1)ws.send(JSON.stringify(body));else if(!polling){polling=true;const version=transportVersion;abortable({...body,action:'input'}).then(data=>{if(version!==transportVersion)return;if(data.room)accept(data.room);connect(data.live);}).catch(()=>{}).finally(()=>polling=false);}
    }
    const heartbeat=setInterval(async()=>{
      if(dead||duplicate||polling||mutating||!state)return;
      if(ws?.readyState===1){ws.send(JSON.stringify({type:'heartbeat'}));return;}
      polling=true;const version=transportVersion;try{const data=await abortable({action:'state'});if(version!==transportVersion)return;if(data.room)accept(data.room);connect(data.live);}catch(_){if(version===transportVersion)message('Reconectando… Tu personaje permanece en la sala.');}finally{polling=false;}
    },1000);
    function frame(time){
      if(dead)return;sendInput();
      const now=state?state.server_now+performance.now()-received:0;
      $('[data-connection]').textContent=ws?.readyState===1?'● En vivo':state?'Reconectando · HTTP':'El barrio te espera';
      if(state){
        const seconds=state.status==='waiting'||state.status==='countdown'?(state.config?.duration_seconds||180):Math.max(0,Math.ceil((state.ends-now)/1000));$('[data-clock]').textContent=state.status==='finished'?'FINAL':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
        if(state.status==='countdown'&&now<state.starts){const n=Math.ceil((state.starts-now)/1000);$('[data-overlay]').hidden=false;$('[data-overlay]').textContent=n;if(n!==lastCountdown){lastCountdown=n;sound('countdown');}}
        else if(state.status!=='closed')$('[data-overlay]').hidden=true;
      }
      let render=state;
      if(state){const t=Math.min(1,(performance.now()-received)/100);render={...state,server_now:now,players:state.players.map(p=>{const before=previous?.players.find(q=>q.id===p.id);if(!before||p.captured!==before.captured||Math.hypot(p.x-before.x,p.y-before.y)>2)return p;return {...p,x:before.x+(p.x-before.x)*t,y:before.y+(p.y-before.y)*t};})};}
      view.draw(render,state?.own_id,time,overview);raf=requestAnimationFrame(frame);
    }
    paintUI();raf=requestAnimationFrame(frame);action('resume');
    return {destroy(){dead=true;cancelAnimationFrame(raf);clearInterval(heartbeat);controllers.forEach(c=>c.abort());ws?.close();audio?.close();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility);container.innerHTML='';}};
  }
  root.QoriChase={mount};
})(globalThis);

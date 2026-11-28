const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const C=require('../activacion/policias-core');
function fixture(customRequest){
 const dom=new JSDOM('<main></main>',{url:'http://localhost/activacion/barrio?room=ABC234',runScripts:'outside-only'}),w=dom.window,requests=[],sent=[];let frame;
 w.QoriChaseCore=C;w.QoriChaseView={create:()=>({draw(){}})};w.requestAnimationFrame=cb=>{frame=cb;return 1;};w.cancelAnimationFrame=()=>{};
 class Socket{constructor(){this.readyState=1;Socket.instance=this;}send(body){sent.push(JSON.parse(body));}close(){this.readyState=3;}}
 w.WebSocket=Socket;
 let room=null;const p={id:'me',name:'<script>bad</script>',color:C.COLORS[0],team:'thief',seen:Date.now(),connected:true,x:23,y:8,input_sequence:-1};
 function state(status='waiting'){return {id:'room',code:'ABC234',own_id:'me',host_id:'me',round:status==='waiting'?0:1,round_id:status==='waiting'?null:'round1',status,server_now:Date.now(),starts:Date.now()-1000,ends:Date.now()+180000,config:C.CONFIG,players:[p,{...p,id:'other',name:'Policía',team:'police',color:C.COLORS[1],x:2,y:3}],events:[],event_seq:0};}
 w.eval(fs.readFileSync(path.join(__dirname,'../activacion/policias.js'),'utf8'));
 const instance=w.QoriChase.mount(w.document.querySelector('main'),{request:async body=>{requests.push(body);if(customRequest){const result=await customRequest(body);if(result!==undefined)return result;}if(body.action==='leave')room=null;if(body.action==='create'||body.action==='join')room=state();if(body.action==='start')room=state('running');if(body.action==='ready')room.players[0].ready=body.ready;return {room,live:room?{path:'/api/public/chase-live',token:'test'}:null};}});
 const $=s=>w.document.querySelector(s),flush=()=>new Promise(r=>setImmediate(r));
 return {dom,w,$,requests,sent,instance,flush,get frame(){return frame;},push(s){Socket.instance.onmessage({data:JSON.stringify({type:'state',room:s})});},state};
}
test('lobby has rules, invitation code, personal color/team, escaped names and host start',async()=>{const f=fixture();try{await f.flush();assert.equal(f.$('[data-code]').value,'ABC234');f.$('[data-alias]').value='Ana';f.$('[data-create]').click();await f.flush();assert.equal(f.$('[data-entry]').hidden,true);assert.match(f.$('[data-roster]').textContent,/<script>bad<\/script>/);assert.equal(f.$('[data-roster] script'),null);assert.equal(f.$('[data-start]').hidden,false);f.$('[data-ready]').click();await f.flush();assert.equal(f.requests.at(-1).ready,true);}finally{f.instance.destroy();f.dom.window.close();}});
test('keyboard and touch send normalized intentions only; blur stops movement; cleanup removes listeners',async()=>{const f=fixture();try{await f.flush();f.$('[data-create]').click();await f.flush();f.$('[data-start]').click();await f.flush();await new Promise(r=>setTimeout(r,80));f.w.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'d',cancelable:true}));f.frame(100);let input=f.sent.find(x=>x.type==='input');assert.ok(input.x>0&&input.y<0);assert.ok(Math.hypot(input.x,input.y)<=1.00001);assert.equal(input.round_id,'round1');assert.equal(input.position,undefined);
 f.w.dispatchEvent(new f.w.Event('blur'));input=f.sent.at(-1);assert.equal(input.x,0);assert.equal(input.y,0);
 const joystick=f.$('[data-joystick]');joystick.setPointerCapture=()=>{};joystick.getBoundingClientRect=()=>({left:0,top:0,width:110,height:110});joystick.onpointerdown({pointerId:1,clientX:95,clientY:55,preventDefault(){}});await new Promise(r=>setTimeout(r,80));f.frame(200);input=f.sent.at(-1);assert.ok(input.x>0&&input.y<0);joystick.onpointercancel();assert.equal(f.sent.at(-1).x,0);
 const before=f.sent.length;f.instance.destroy();f.w.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'w'}));assert.equal(f.sent.length,before);
 }finally{f.instance.destroy();f.dom.window.close();}});
test('late snapshots cannot rewind current state; prisoner sees rescue guidance and final team result',async()=>{const f=fixture();try{await f.flush();f.$('[data-create]').click();await f.flush();const s=f.state('running');s.server_now+=1000;s.players[0].captured=true;f.push(s);assert.match(f.$('[data-instruction]').textContent,/Estás capturado/);const older=f.state('waiting');older.server_now=s.server_now-1;f.push(older);assert.match(f.$('[data-instruction]').textContent,/Estás capturado/);s.status='finished';s.winner='thief';s.reason='time';s.server_now++;f.push(s);assert.equal(f.$('[data-results]').hidden,false);assert.match(f.$('[data-winner]').textContent,/todos los ladrones/);assert.match(f.$('[data-reason]').textContent,/compañeros presos/);}finally{f.instance.destroy();f.dom.window.close();}});
test('failure and no-result resume leave room creation reachable; destroy aborts pending request',async()=>{const f=fixture();await f.flush();assert.equal(f.$('[data-entry]').hidden,false);f.instance.destroy();assert.equal(f.w.document.querySelector('main').innerHTML,'');f.dom.window.close();});

test('returning player sees room creation first and only requests the previous benefit explicitly',async()=>{
 const f=fixture(async body=>body.action==='resume'?{room:null,can_play:true,has_result:true}:undefined);
 try{await f.flush();assert.equal(f.$('[data-entry]').hidden,false);assert.equal(f.$('[data-saved-benefit]').hidden,false);
  assert.deepEqual(f.requests.map(r=>r.action),['resume']);f.$('[data-saved-benefit]').click();await f.flush();assert.equal(f.requests.at(-1).action,'claim');
 }finally{f.instance.destroy();f.dom.window.close();}
});

test('finished room exit clears results and input state, preserving the alias for a new room without reload',async()=>{
 const f=fixture();try{await f.flush();f.$('[data-create]').click();await f.flush();const s=f.state('finished');s.winner='thief';s.reason='time';f.push(s);
 assert.equal(f.$('[data-results]').hidden,false);f.$('[data-new-room]').click();await f.flush();
 assert.equal(f.$('[data-results]').hidden,true);assert.equal(f.$('[data-entry]').hidden,false);assert.equal(f.$('[data-lobby]').hidden,true);assert.equal(f.$('[data-overlay]').hidden,true);assert.equal(f.$('[data-code]').value,'');
 assert.equal(f.$('[data-alias]').value,s.players[0].name);f.$('[data-create]').click();await f.flush();assert.equal(f.$('[data-lobby]').hidden,false);assert.equal(f.requests.at(-1).round_id,undefined);
 }finally{f.instance.destroy();f.dom.window.close();}
});

test('closed room exposes exit and does not leave its overlay over the next lobby',async()=>{
 const f=fixture();try{await f.flush();f.$('[data-create]').click();await f.flush();f.push(f.state('closed'));
 assert.equal(f.$('[data-exit]').textContent,'Volver a las salas');f.$('[data-exit]').click();await f.flush();
 assert.equal(f.$('[data-overlay]').hidden,true);assert.equal(f.$('[data-entry]').hidden,false);
 f.$('[data-code]').value='NEW234';f.$('[data-join]').click();await f.flush();assert.equal(f.requests.at(-1).action,'join');assert.equal(f.$('[data-lobby]').hidden,false);
 }finally{f.instance.destroy();f.dom.window.close();}
});

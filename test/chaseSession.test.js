const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('activacion/activation.js','utf8');
const session=source.slice(source.indexOf('function setSummitSessionBusy('),source.indexOf('function renderExperience()'));
const mount=source.slice(source.indexOf('function renderMinigame()'),source.indexOf('  if (currentActivation.activation_type === "QORI_SUMMIT")',source.indexOf('function renderMinigame()')))+'}';
function setup(response={room:null,can_play:true}){
 const dom=new JSDOM('<form id="form"><button type="submit">Continuar</button></form><div id="stage"><div id="body"></div></div><div id="ticket"></div><section id="chaseSessionControls"><button id="chaseRetrySession"></button></section>',{url:'https://example.invalid/activacion/barrio?room=OLD234&customer_publication=publication',runScripts:'outside-only'}),w=dom.window,calls=[],mounts=[],key='qori-chase:barrio';
 Object.assign(w,{currentActivation:{activation_type:'QORI_CHASE',public_slug:'barrio'},summitSessionVersion:0,summitPendingRequests:new Set(),participant:null,gameSessionToken:null,gameState:null,participantForm:w.document.querySelector('form'),experienceStage:w.document.querySelector('#stage'),experienceBody:w.document.querySelector('#body'),ticketResult:w.document.querySelector('#ticket'),experienceTitle:{},experienceCopy:{},participantPayload:()=>({}),setProgress(){},setStatus(){},cleanupGameState(){w.gameState?.cleanupFns.forEach(fn=>fn());},renderResult(){throw Error('Must return to game, not just render the old prize');},api:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(url.endsWith('/participants'))return {participant:{id:'fresh'},game_session_token:'fresh-token'};return response;},QoriChase:{mount(host,options){mounts.push(options);return {destroy(){}};}}});
 w.sessionStorage.setItem(key,JSON.stringify({participant_id:'existing',game_session_token:'existing-token'}));w.eval(session+mount);
 return {w,dom,calls,mounts,key,close:()=>dom.window.close()};
}
test('reopening without an active room reuses the authenticated session instead of registering again',async()=>{
 const f=setup();try{await f.w.startGameSession();assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.action,'resume');assert.equal(f.w.participant.id,'existing');assert.equal(f.mounts.length,1);assert.equal(f.w.participantForm.classList.contains('hidden'),true);
 f.mounts[0].onExit();assert.ok(f.w.sessionStorage.getItem(f.key));assert.equal(new URL(f.w.location.href).searchParams.has('room'),false);assert.equal(new URL(f.w.location.href).searchParams.get('customer_publication'),'publication');
 await f.w.startGameSession();assert.equal(f.calls.some(c=>c.url.endsWith('/participants')),false);assert.equal(f.mounts.length,2);
 }finally{f.close();}
});
test('reopening a finished room restores its rematch UI rather than asking for new participant data',async()=>{
 const f=setup({room:{status:'finished'}});try{assert.equal(await f.w.resumeChaseSession(),true);assert.equal(f.mounts.length,1);assert.equal(f.w.gameSessionToken,'existing-token');}finally{f.close();}
});
test('invalid credentials are cleared while transient failure keeps the session available for retry',async()=>{
 const f=setup();try{const original=f.w.api;f.w.api=async()=>{throw Object.assign(Error('Sin conexión'),{status:503});};await assert.rejects(f.w.resumeChaseSession(),/Sin conexión/);assert.ok(f.w.sessionStorage.getItem(f.key));
 f.w.api=async()=>{throw Object.assign(Error('Sesión inválida'),{status:403});};assert.equal(await f.w.resumeChaseSession(),false);assert.equal(f.w.sessionStorage.getItem(f.key),null);
 f.w.api=original;await f.w.startGameSession();assert.equal(f.w.participant.id,'fresh');
 }finally{f.close();}
});
test('stalled session recovery times out and leaves the retry control enabled without erasing the token',async()=>{
 const f=setup();try{let timeout;f.w.setTimeout=fn=>{timeout=fn;return 1;};f.w.clearTimeout=()=>{};f.w.api=()=>new Promise(()=>{});const pending=f.w.startGameSession();assert.equal(f.w.document.querySelector('#chaseRetrySession').disabled,true);timeout();await pending;
 assert.equal(f.w.document.querySelector('#chaseRetrySession').disabled,false);assert.ok(f.w.sessionStorage.getItem(f.key));assert.equal(f.mounts.length,0);
 }finally{f.close();}
});

test('new tab enters the game with the Customer-owned session, even alongside an old reward',async()=>{
 const f=setup();try{
  f.w.sessionStorage.clear();f.w.api=async()=>({participant:{id:'returning'},game_session_token:'owned-token',rewarded:true});
  assert.equal(await f.w.startGameSession(),true);assert.equal(f.mounts.length,1);
  assert.equal(f.w.participant.id,'returning');assert.equal(f.w.ticketResult.classList.contains('hidden'),true);
  assert.equal(JSON.parse(f.w.sessionStorage.getItem(f.key)).game_session_token,'owned-token');
  f.w.renderResult=async()=>{f.w.ticketResult.classList.remove('hidden');};
  let returned=false;f.w.experienceStage.scrollIntoView=()=>{returned=true;};
  await f.mounts[0].onResult({rewarded:true});const back=f.w.ticketResult.querySelector('button');
  assert.equal(back.textContent,'Volver al juego');back.click();assert.equal(returned,true);assert.equal(f.w.ticketResult.classList.contains('hidden'),true);
 }finally{f.close();}
});

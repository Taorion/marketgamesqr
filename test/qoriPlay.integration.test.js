const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55489/qori_play_qa';
Object.assign(process.env,{DB_SSL:'false',NODE_ENV:'test',QORI_PLAY_SANDBOX_ENABLED:'true',QORI_INVOICE_SANDBOX_ENABLED:'true',AGENDA_PUSH_WORKER_ENABLED:'false',JWT_SECRET:crypto.randomBytes(32).toString('hex'),QORI_INVOICE_ENCRYPTION_KEY:crypto.randomBytes(32).toString('hex'),QORI_INVOICE_IDENTITY_KEY:crypto.randomBytes(32).toString('hex')});
const {query,pool}=require('../backend/src/config/db'),svc=require('../backend/src/play/service'),cfg=require('../backend/src/play/config'),reward=require('../backend/src/play/rewards'),{fixture,person,pair,join}=require('./fixtures/qoriPlay');
let server,base,lock;
async function req(path,{account,token,app,body,method=body?'POST':'GET'}={}){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(account?{Authorization:'Bearer '+account.token,'X-Qori-Account':account.id}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(app?{'X-Qori-App':app}: {})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};
}
before(async()=>{assert.equal((await query('select current_database() n')).rows[0].n,'qori_play_qa');lock=await pool.connect();assert.equal((await lock.query('select pg_try_advisory_lock(53003817) ok')).rows[0].ok,true,'Stop preview before tests');server=require('../backend/src/app').app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;process.env.QORI_PLAY_PUBLIC_ORIGIN=base;require('../backend/src/config/env').env.corsOrigins.push(base);});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(lock){await lock.query('select pg_advisory_unlock(53003817)');lock.release();}await pool.end();});
test('flags fail closed outside the isolated local sandbox',async()=>{process.env.QORI_PLAY_SANDBOX_ENABLED='false';assert.equal((await req('/api/play/v1/notice')).status,404);process.env.QORI_PLAY_SANDBOX_ENABLED='true';process.env.NODE_ENV='production';assert.equal(cfg.enabled(),false);process.env.NODE_ENV='test';assert.equal((await req('/api/health')).status,200);});
test('HTTP size, compressed-body and malformed JSON rejection are sanitized',async()=>{
 assert.equal((await req('/api/play/v1/sessions/join',{body:{ticket:'x'.repeat(3000)}})).status,413);
 const zipped=await fetch(base+'/api/play/v1/sessions/join',{method:'POST',headers:{'Content-Type':'application/json','Content-Encoding':'gzip'},body:require('node:zlib').gzipSync('{}')});assert.equal(zipped.status,415);
 const malformed=await fetch(base+'/api/play/v1/sessions/join',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"private":'});assert.equal(malformed.status,400);assert.ok(!(await malformed.text()).includes('private'));
});
test('operator ownership, machine scopes, pairing single use and device rotation',async()=>{
 const a=await fixture(),b=await fixture();
 assert.equal((await req('/api/play/v1/manage/dashboard',{account:a.owner,app:a.app.id})).status,200);
 assert.equal((await req('/api/play/v1/manage/dashboard',{account:b.owner,app:a.app.id})).status,404);
 assert.equal((await req('/api/play/v1/manage/screens/'+a.screen.id+'/state',{token:b.token,method:'PUT',body:{paused:true}})).status,404);
 const device=await pair(a);await assert.rejects(svc.claimPair(device.pair.challenge),e=>e.code==='PAIRING_UNAVAILABLE');
 const snapshot=await svc.snapshot(device.device_token);assert.ok(snapshot.join.url.includes('/play/controller/#'));assert.ok(!JSON.stringify(snapshot).includes(a.buyer.email));
 const rotated=await svc.rotateDevice(device.device_token);await assert.rejects(svc.snapshot(device.device_token),e=>e.status===401);assert.equal((await svc.snapshot(rotated.device_token)).screen_id,a.screen.id);
 assert.equal((await svc.analytics(a.app.id)).billing_enabled,false);
});
test('join consent, replay, queue, authorization and server-only score',async()=>{
 const a=await fixture(),device=await pair(a),snapshot=await svc.snapshot(device.device_token),ticket=new URL(snapshot.join.url).hash.slice(1);
 assert.equal((await req('/api/play/v1/sessions/join',{body:{ticket,accepted:false,adult:true,version:cfg.consent.version}})).status,400);
 const first=await req('/api/play/v1/sessions/join',{body:{ticket,accepted:true,adult:true,version:cfg.consent.version}});assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.status,'READY');
 await assert.rejects(svc.join(ticket),e=>e.code==='JOIN_UNAVAILABLE');
 const second=await join(device);assert.equal(second.status,'QUEUED');assert.equal((await svc.personal(second.controller_token)).position,1);
 await assert.rejects(svc.input(second.controller_token,{seq:1,action:'start'}),e=>e.code==='SESSION_NOT_PLAYING');
 assert.equal((await req('/api/play/v1/sessions/complete',{token:first.data.controller_token,body:{score:999999}})).status,404);
 await svc.input(first.data.controller_token,{seq:1,action:'start'});await assert.rejects(svc.input(first.data.controller_token,{seq:1,action:'left'}),e=>e.code==='SEQUENCE_CONFLICT');
 assert.equal((await query('select count(*)::int n from play_reward_grants where session_id=$1',[first.data.session_id])).rows[0].n,0);
 await query("update play_sessions set last_seen_at=now()-interval '40 seconds' where id=$1",[first.data.session_id]);await svc.tickScreen(a.screen.id);
 assert.equal((await svc.personal(first.data.controller_token)).status,'EXPIRED');assert.equal((await svc.personal(second.controller_token)).status,'READY');
});
async function win(f,device){
 const s=await join(device);await svc.input(s.controller_token,{seq:1,action:'start'});let seq=1;
 for(let n=0;n<20;n++){
  const state=(await query('select game_state,status from play_sessions where id=$1',[s.session_id])).rows[0];if(state.status==='COMPLETED')return s;
  if(state.game_state.phase==='show'){await query("update play_sessions set last_tick_at=last_tick_at-interval '2 seconds' where id=$1",[s.session_id]);await svc.tickScreen(f.screen.id);}
  else await svc.input(s.controller_token,{seq:++seq,action:'abcd'[state.game_state.sequence[state.game_state.index]]});
 }
 throw Error('Did not complete deterministic game');
}
test('verified game reserves one budgeted reward, reuses QR engine and private Customer claim',async()=>{
 const a=await fixture(),device=await pair(a),s=await win(a,device);
 assert.equal((await svc.personal(s.controller_token)).result.method,'SERVER_SIMULATION');
 const first=await reward.claim(a.buyer,s.controller_token),again=await reward.claim(a.buyer,s.controller_token);assert.equal(first.qr_code_id,again.qr_code_id);
 assert.equal((await query('select qr_used_total from business_qr_credit_accounts where business_id=$1',[a.business.id])).rows[0].qr_used_total,1);
 const other=await person();await assert.rejects(reward.claim(other,s.controller_token),e=>e.code==='ALREADY_CLAIMED');
 await assert.rejects(reward.detail(other,first.qr_code_id),e=>e.status===404);
 assert.equal((await reward.list(a.buyer)).rewards.length,1);
 const next=await win(a,device);assert.equal((await svc.personal(next.controller_token)).reward,'NONE');
 assert.equal((await svc.analytics(a.app.id)).verified_redemptions,0);
 const qr=(await query('select token,metadata from qr_codes where id=$1',[first.qr_code_id])).rows[0];assert.equal(qr.metadata.customer_account_id,undefined);
 const redeemPayload={mode:'STANDALONE',idempotency_key:crypto.randomUUID(),beneficiary:{name:'Persona sintética de redención',email:crypto.randomUUID()+'@example.invalid',data_use_confirmed:true,marketing_consent:false}};
 const redeemed=await require('../backend/src/services/qrService').redeemQr(qr.token,a.user,redeemPayload);assert.equal(redeemed.status,'REDEEMED');
 const replay=await require('../backend/src/services/qrService').redeemQr(qr.token,a.user,redeemPayload);assert.equal(replay.idempotent_replay,true);
 assert.equal((await svc.analytics(a.app.id)).verified_redemptions,1);
 assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[a.business.id])).rows[0].n,0);
});
test('expired tickets, revoked apps and insufficient machine scopes fail closed',async()=>{
 const a=await fixture(),device=await pair(a),snapshot=await svc.snapshot(device.device_token),ticket=new URL(snapshot.join.url).hash.slice(1);
 await query("update play_join_tickets set expires_at=now()-interval '1 second' where token_hash=$1",[cfg.hash(ticket)]);await assert.rejects(svc.join(ticket),e=>e.code==='JOIN_UNAVAILABLE');
 const oauth=require('../backend/src/invoice/oauth'),read=await oauth.issue(a.key.client_id,a.key.client_secret,'play:analytics');
 assert.equal((await req('/api/play/v1/manage/locations',{token:read.access_token,body:{name:'No permitido'}})).status,403);
 await query('update invoice_apps set active=false where id=$1',[a.app.id]);await assert.rejects(svc.snapshot(device.device_token),e=>e.code==='APPLICATION_DISABLED');
 assert.equal((await req('/api/play/v1/manage/dashboard',{token:a.token})).status,401);
});
test('QR adapter rolls back credit and QR together; original two-argument generator remains operational',async()=>{
 const a=await fixture(),generate=require('../backend/src/services/qrService').generateQr;
 const data={business_id:a.business.id,campaign_id:a.source.id,game_id:a.source.game_id,reward_id:a.source.reward_id,player:{external_id:'rollback-'+crypto.randomUUID()},metadata:{source:'QORI_PLAY_SANDBOX'}},actor={type:'game',game:{id:a.source.game_id,business_id:a.business.id}};
 await assert.rejects(require('../backend/src/config/db').withTransaction(async db=>{await generate(data,actor,db);throw Error('TEST_ROLLBACK');}),/TEST_ROLLBACK/);
 assert.equal((await query('select count(*)::int n from qr_codes where business_id=$1',[a.business.id])).rows[0].n,0);
 assert.equal((await query('select qr_used_total from business_qr_credit_accounts where business_id=$1',[a.business.id])).rows[0].qr_used_total,0);
 assert.ok((await generate(data,actor)).qr_code.id);
 assert.equal((await query('select qr_used_total from business_qr_credit_accounts where business_id=$1',[a.business.id])).rows[0].qr_used_total,1);
});
test('sponsor approval, budget commitments and data API tables are protected',async()=>{
 const a=await fixture(),b=await fixture();await assert.rejects(svc.sponsor(b.user,a.app.id,a.source.id),e=>e.status===404);
 await assert.rejects(svc.approve(a.user,a.campaign.id,{reward_cap:2,reward_cost_minor:0,budget_minor:0,min_score:0}),e=>e.code==='REWARD_BUDGET_REQUIRED');
 const device=await pair(a),session=await win(a,device);
 await assert.rejects(svc.approve(a.user,a.campaign.id,{reward_cap:0,reward_cost_minor:0,budget_minor:0,min_score:0}),e=>e.code==='EXISTING_COMMITMENTS');
 const tables=(await query("select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and left(relname,5)='play_'")).rows;
 assert.equal(tables.length,13);assert.ok(tables.every(t=>t.relrowsecurity));
 assert.equal((await query("select count(*)::int n from pg_policies where schemaname='public' and left(tablename,5)='play_'")).rows[0].n,0);
 await svc.blockOrganization(a.partner.id,false,b.user.id);await svc.tickScreen(a.screen.id);await assert.rejects(svc.personal(session.controller_token),e=>e.status===403);
});
test('screen pause, heartbeat recovery, abandonment and input isolation',async()=>{
 const a=await fixture({game:'orbita',cap:0}),device=await pair(a),s=await join(device);await svc.input(s.controller_token,{seq:1,action:'start'});
 await svc.screenState(a.app.id,a.screen.id,{paused:true});await svc.tickScreen(a.screen.id);assert.equal((await svc.personal(s.controller_token)).status,'PAUSED');
 await svc.screenState(a.app.id,a.screen.id,{paused:false});await svc.tickScreen(a.screen.id);assert.equal((await svc.personal(s.controller_token)).status,'PLAYING');
 await query("update play_sessions set last_seen_at=now()-interval '13 seconds' where id=$1",[s.session_id]);await svc.tickScreen(a.screen.id);assert.equal((await svc.personal(s.controller_token)).status,'DISCONNECTED');
 await svc.heartbeat(s.controller_token,'controller');assert.equal((await svc.personal(s.controller_token)).status,'PLAYING');
 await assert.rejects(svc.personal(device.device_token),e=>e.status===401);await assert.rejects(svc.snapshot(s.controller_token),e=>e.status===401);
 await query("update play_screens set last_seen_at=now()-interval '46 seconds' where id=$1",[a.screen.id]);await svc.tickScreen(a.screen.id);assert.equal((await svc.personal(s.controller_token)).status,'EXPIRED');
});
function socket(role,token,origin=base){
 const WebSocket=require('ws'),ws=new WebSocket(base.replace('http:','ws:')+'/api/play/v1/live',{origin}),messages=[],waiters=[];
 ws.on('error',()=>{});ws.on('open',()=>ws.send(JSON.stringify({type:'auth',role,token})));ws.on('message',raw=>{const d=JSON.parse(raw);messages.push(d);for(const wake of [...waiters])wake();});
 const wait=predicate=>new Promise((resolve,reject)=>{const check=()=>{const i=messages.findIndex(predicate);if(i<0)return;clearTimeout(timer);waiters.splice(waiters.indexOf(check),1);resolve(messages.splice(i,1)[0]);};const timer=setTimeout(()=>{waiters.splice(waiters.indexOf(check),1);reject(Error('WebSocket timeout'));},4000);waiters.push(check);check();});
 return {ws,wait,send:d=>ws.send(JSON.stringify(d))};
}
test('actual WebSockets coexist with Cumbre, authenticate roles, reject forged scores and recover; measured input propagation',async t=>{
 const a=await fixture({game:'orbita',cap:0}),device=await pair(a),s=await join(device);
 const summit=require('../backend/src/services/summitLiveService'),stopSummit=summit.attach(server);
 const stop=require('../backend/src/play/realtime').attach(server);let screen,control,summitSocket;
 try{
  await new Promise(r=>setTimeout(r,100));screen=socket('screen',device.device_token);control=socket('controller',s.controller_token);
  await screen.wait(d=>d.type==='ready');await control.wait(d=>d.type==='ready');
  summitSocket=new (require('ws'))(base.replace('http:','ws:')+summit.PATH,{origin:base});await require('node:events').once(summitSocket,'open');
  const summitReady=require('node:events').once(summitSocket,'message');summitSocket.send(JSON.stringify({type:'auth',token:summit.ticket({status:'racing',own:{id:'synthetic'},seed:'synthetic-room',starts_at:new Date(),config:{duration_seconds:45,floors:8}}).token}));assert.equal(JSON.parse((await summitReady)[0]).type,'ready');
  control.send({type:'input',seq:1,action:'start'});await control.wait(d=>d.type==='ack'&&d.seq===1);
  const timings=[];for(let i=2;i<=13;i++){const lane=i%2===0?0:1,start=performance.now();control.send({type:'input',seq:i,action:i%2===0?'left':'right'});await control.wait(d=>d.type==='ack'&&d.seq===i);await screen.wait(d=>d.type==='state'&&d.state.game?.lane===lane);timings.push(performance.now()-start);await new Promise(r=>setTimeout(r,90));}
  timings.sort((a,b)=>a-b);t.diagnostic('Local input-to-state n=12 p50='+timings[6].toFixed(1)+'ms p95='+timings[11].toFixed(1)+'ms; not hardware latency or a load certification');
  const closed=new Promise(r=>control.ws.once('close',code=>r(code)));control.send({type:'input',seq:14,action:'left',score:9999});assert.equal(await closed,1008);
  assert.equal((await svc.personal(s.controller_token)).last_seq,13);
  control=socket('controller',s.controller_token);await control.wait(d=>d.type==='ready');assert.equal((await control.wait(d=>d.type==='state')).state.session_id,s.session_id);
  const foreign=socket('screen',device.device_token,'https://other.example.invalid');const result=await new Promise(r=>{foreign.ws.once('unexpected-response',(_req,res)=>{res.resume();foreign.ws.terminate();r(res.statusCode);});});assert.equal(result,403);
 }finally{summitSocket?.terminate();stopSummit();screen?.ws.terminate();control?.ws.terminate();await stop();}
});
test('real operator, Player SDK and mobile scripts use HTTP and WebSocket end to end (DOM, not visual hardware)',async()=>{
 const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..'),a=await fixture(),windows=[];
 const stop=require('../backend/src/play/realtime').attach(server);
 async function until(fn){for(let i=0;i<150;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('UI did not settle: '+String(fn));}
 function page(file,account,fragment=''){
  const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:base+'/'+file.replace('index.html','')+fragment,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;windows.push(w);
  w.fetch=(url,opts={})=>fetch(new URL(url,base),{...opts,headers:{...(account?{Authorization:'Bearer '+account.token,'X-Qori-Account':account.id}:{}),...opts.headers}});
  w.WebSocket=class extends require('ws'){constructor(url){super(String(url),{origin:base});}};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(_,k)=>()=>{}});
  w.requestAnimationFrame=()=>0;
  return w;
 }
 function script(w,file){w.eval(fs.readFileSync(path.join(root,file),'utf8'));}
 try{
  await new Promise(r=>setTimeout(r,100));
  const operator=page('play/operator/index.html',a.owner);script(operator,'play/operator/app.js');await until(()=>!operator.document.getElementById('workspace').hidden);
  const form=operator.document.getElementById('location-form');form.elements.name.value='Sede creada desde panel';form.dispatchEvent(new operator.Event('submit',{cancelable:true}));
  await until(()=>operator.document.getElementById('locations').textContent.includes('Sede creada'));
  operator.document.getElementById('key').click();await until(()=>!operator.document.getElementById('secret-panel').hidden);assert.match(operator.document.getElementById('secret').textContent,/qi_sbx_/);
  operator.document.getElementById('hide-secret').click();assert.equal(operator.document.getElementById('secret').textContent,'');
  const screen=page('play/screen/index.html');script(screen,'play/sdk/screen-v1.js');script(screen,'play/screen/player.js');
  await until(()=>/^[A-F0-9]{12}$/.test(screen.document.getElementById('pair-code').textContent));
  await svc.confirmPair(a.app.id,a.screen.id,screen.document.getElementById('pair-code').textContent);
  await until(()=>!screen.document.getElementById('qr').hidden);
  const deviceToken=screen.localStorage.getItem('qori-play-device-v1'),state=await svc.snapshot(deviceToken);
  const mobile=page('play/controller/index.html',a.buyer,new URL(state.join.url).hash);script(mobile,'play/controller/controller.js');await until(()=>mobile.document.getElementById('notice').textContent.includes('Juego'));
  for(const checkbox of mobile.document.querySelectorAll('#join-form input[type=checkbox]'))checkbox.checked=true;
  mobile.document.getElementById('join-form').dispatchEvent(new mobile.Event('submit',{cancelable:true}));await until(()=>!mobile.document.getElementById('start').hidden&&!mobile.document.getElementById('session').hidden);
  mobile.document.getElementById('start').click();await until(()=>mobile.document.getElementById('state').textContent==='Control conectado');
  assert.equal(mobile.location.hash,'');
  const token=mobile.sessionStorage.getItem('qori-play-controller-v1');
  for(let i=0;i<30;i++){
   const s=await svc.controller({query},token);if(s.status==='COMPLETED')break;
   if(s.game_state.phase==='show'){await query("update play_sessions set last_tick_at=last_tick_at-interval '2 seconds' where id=$1",[s.id]);await svc.tickScreen(a.screen.id);}
   else{const action='abcd'[s.game_state.sequence[s.game_state.index]],seq=s.last_seq;mobile.document.querySelector('[aria-label="'+action+'"]').click();await until(async()=>(await svc.personal(token)).last_seq>seq);}
  }
  await until(()=>!mobile.document.getElementById('reward').hidden);
  for(const checkbox of mobile.document.querySelectorAll('#claim-form input[type=checkbox]'))checkbox.checked=true;
  mobile.document.getElementById('claim-form').dispatchEvent(new mobile.Event('submit',{cancelable:true}));
  await until(async()=>(await reward.list(a.buyer)).rewards.length===1);
  const rewardsPage=page('play/rewards/index.html',a.buyer);script(rewardsPage,'play/rewards/app.js');await until(()=>rewardsPage.document.querySelector('#rewards button'));rewardsPage.document.querySelector('#rewards button').click();await until(()=>rewardsPage.document.querySelector('#rewards img'));
  assert.match(screen.document.getElementById('headline').textContent,/pausa/);
 }finally{for(const w of windows){w.dispatchEvent(new w.Event('pagehide'));w.close();}await stop();}
});
test('participant export, immediate leave and Customer deletion preserve commercial records',async()=>{
 const privacy=require('../backend/src/play/privacy'),a=await fixture(),device=await pair(a),s=await join(device),queued=await join(device);
 const exported=await req('/api/play/v1/sessions/export',{token:s.controller_token});assert.equal(exported.status,200);assert.equal(exported.data.session_id,s.session_id);assert.equal(JSON.stringify(exported.data).includes('controller_hash'),false);
 assert.equal((await req('/api/play/v1/sessions/leave',{token:s.controller_token,body:{}})).status,200);
 await assert.rejects(svc.personal(s.controller_token),e=>e.code==='INVALID_CONTROLLER');await svc.tickScreen(a.screen.id);assert.equal((await svc.personal(queued.controller_token)).status,'READY');await privacy.leave(queued.controller_token);
 const won=await win(a,device),grant=await reward.claim(a.buyer,won.controller_token);
 const own=await require('../backend/src/services/customerService').exportData(a.buyer);assert.equal(own.play.sessions[0].id,won.session_id);assert.equal((await privacy.exportCustomer(a.owner)).sessions.length,0);
 const deleted=await req('/api/customer/me',{account:a.buyer,method:'DELETE',body:{confirmation:'ELIMINAR MI CUENTA'}});assert.equal(deleted.status,200,JSON.stringify(deleted.data));
 const kept=(await query('select customer_id,qr_code_id from play_reward_grants where session_id=$1',[won.session_id])).rows[0];assert.equal(kept.customer_id,null);assert.equal(kept.qr_code_id,grant.qr_code_id);assert.equal((await query('select count(*)::int n from qr_codes where id=$1',[grant.qr_code_id])).rows[0].n,1);
});
test('webhooks persist atomically, isolate apps, retry, sign, rotate, revoke and dead-letter',async()=>{
 const hooks=require('../backend/src/play/webhooks'),a=await fixture(),b=await fixture();process.env.QORI_PLAY_WEBHOOK_HOSTS='hooks.example.invalid';
 const created=await req('/api/play/v1/manage/webhooks',{token:a.token,body:{url:'https://hooks.example.invalid/events',events:['game_finished']}});assert.equal(created.status,200);const h=created.data;
 assert.equal((await req('/api/play/v1/manage/webhooks/'+h.id,{token:b.token,method:'DELETE'})).status,404);
 await svc.event({query},'game_finished',{app_id:a.app.id,screen_id:a.screen.id},'synthetic-1');await svc.event({query},'game_finished',{app_id:a.app.id,screen_id:a.screen.id},'synthetic-1');
 let listed=await hooks.list(a.app.id);assert.equal(listed.deliveries.length,1);assert.equal(JSON.stringify(listed).includes(h.secret),false);assert.equal((await hooks.list(b.app.id)).deliveries.length,0);
 assert.equal(await hooks.next(()=>{throw Error('must stay off');}),false);process.env.QORI_PLAY_WEBHOOK_DELIVERY_ENABLED='true';
 try{
 let calls=0;const sender=async(url,body,headers)=>{calls++;assert.equal(require('../play/examples/verify-webhook.cjs').verify(h.secret,headers['X-Qori-Delivery'],headers['X-Qori-Timestamp'],body,headers['X-Qori-Signature']),true);assert.equal(JSON.stringify(JSON.parse(body)).includes(a.buyer.id),false);return 503;};
 await hooks.next(sender);listed=await hooks.list(a.app.id);assert.equal(listed.deliveries[0].status,'PENDING');assert.equal(listed.deliveries[0].attempts,1);assert.equal(await hooks.next(sender),false);
 for(let n=1;n<6;n++){await query('update play_webhook_deliveries set next_attempt_at=now() where id=$1',[listed.deliveries[0].id]);await hooks.next(sender);}assert.equal((await hooks.list(a.app.id)).deliveries[0].status,'DEAD');assert.equal(calls,6);
 const rotated=await hooks.change(a.app.id,h.id,true);assert.notEqual(rotated.secret,h.secret);
 await svc.event({query},'game_finished',{app_id:a.app.id,screen_id:a.screen.id},'synthetic-2');await Promise.all([hooks.next(async()=>204),hooks.next(async()=>204)]);assert.equal((await hooks.list(a.app.id)).deliveries.filter(d=>d.status==='DELIVERED').length,1);
 await svc.event({query},'game_finished',{app_id:a.app.id,screen_id:a.screen.id},'synthetic-3');await hooks.change(a.app.id,h.id);assert.equal((await hooks.list(a.app.id)).deliveries.filter(d=>d.status==='CANCELLED').length,1);
 }finally{delete process.env.QORI_PLAY_WEBHOOK_DELIVERY_ENABLED;}
});
test('parallel finishes sharing one campaign do not deadlock or exceed its single reward cap',async()=>{
 const f=await fixture(),devices=[];
 for(let i=0;i<4;i++){const screen=i?await svc.screen(f.app.id,{location_id:f.location.id,name:'Simultánea '+i,orientation:'landscape'}):f.screen;if(i)await svc.assign(f.app.id,screen.id,f.campaign.id);devices.push({f:{...f,screen},device:await pair({...f,screen})});}
 await Promise.all(devices.map(x=>win(x.f,x.device)));
 assert.equal((await query("select count(*)::int n from play_sessions where campaign_id=$1 and status='COMPLETED'",[f.campaign.id])).rows[0].n,4);
 assert.equal((await query('select count(*)::int n from play_reward_grants where campaign_id=$1',[f.campaign.id])).rows[0].n,1);
});
test('runtime restart preserves session sequence and late completed-game input does not disconnect',async()=>{
 const f=await fixture(),device=await pair(f),won=await win(f,device);let stop,control;
 try{
 for(let restart=0;restart<2;restart++){
 stop=require('../backend/src/play/realtime').attach(server);await new Promise(r=>setTimeout(r,100));control=socket('controller',won.controller_token);await control.wait(d=>d.type==='ready');const state=(await control.wait(d=>d.type==='state')).state;
 assert.equal(state.status,'COMPLETED');control.send({type:'input',seq:state.last_seq+1,action:'a'});assert.equal((await control.wait(d=>d.type==='error')).code,'SESSION_NOT_PLAYING');assert.equal(control.ws.readyState,1);assert.equal((await svc.personal(won.controller_token)).last_seq,state.last_seq);
 control.ws.terminate();await stop();stop=null;
 }
 assert.equal((await query("select count(*)::int n from play_events where session_id=$1 and event_type='game_finished'",[won.session_id])).rows[0].n,1);
 }finally{control?.ws.terminate();if(stop)await stop();}
});
test('bounded local concurrency: ten screens and ten controllers remain isolated',async t=>{
 const f=await fixture({game:'orbita',cap:0}),prepared=[];
 for(let i=0;i<10;i++){const screen=i===0?f.screen:await svc.screen(f.app.id,{location_id:f.location.id,name:'Concurrente '+i,orientation:'landscape'});if(i)await svc.assign(f.app.id,screen.id,f.campaign.id);const device=await pair({...f,screen}),session=await join(device);prepared.push({screen,device,session});}
 const stop=require('../backend/src/play/realtime').attach(server),peers=[];
 try{await new Promise(r=>setTimeout(r,100));for(const x of prepared){const screen=socket('screen',x.device.device_token),control=socket('controller',x.session.controller_token);peers.push(screen,control);await screen.wait(d=>d.type==='ready');await control.wait(d=>d.type==='ready');x.display=screen;x.control=control;}
 const timings=await Promise.all(prepared.map(async(x,i)=>{const start=performance.now();x.control.send({type:'input',seq:1,action:'start'});await x.control.wait(d=>d.type==='ack'&&d.seq===1);x.control.send({type:'input',seq:2,action:i%2?'right':'left'});await x.control.wait(d=>d.type==='ack'&&d.seq===2);const shown=await x.display.wait(d=>d.type==='state'&&d.state.game?.lane===(i%2?2:0));assert.equal(shown.state.screen_id,x.screen.id);return performance.now()-start;}));
 timings.sort((a,b)=>a-b);t.diagnostic('10 screen/controller pairs, two actions each, local p50='+timings[5].toFixed(1)+'ms p95='+timings[9].toFixed(1)+'ms; short bounded experiment');
 }finally{peers.forEach(p=>p.ws.terminate());await stop();}
});

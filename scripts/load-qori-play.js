// Isolated synthetic laboratory only; never accepts a DB or target URL argument.
const crypto=require('node:crypto'),fs=require('node:fs'),http=require('node:http'),{once}=require('node:events');
Object.assign(process.env,{DATABASE_URL:'postgresql://postgres@127.0.0.1:55489/qori_play_qa',DB_SSL:'false',NODE_ENV:'test',QORI_PLAY_SANDBOX_ENABLED:'true',QORI_INVOICE_SANDBOX_ENABLED:'true',QORI_PLAY_CONNECTIONS_PER_IP:'200',JWT_SECRET:crypto.randomBytes(32).toString('hex'),QORI_INVOICE_ENCRYPTION_KEY:crypto.randomBytes(32).toString('hex'),QORI_INVOICE_IDENTITY_KEY:crypto.randomBytes(32).toString('hex')});
const {pool,query}=require('../backend/src/config/db'),svc=require('../backend/src/play/service'),runtime=require('../backend/src/play/realtime'),{fixture,pair,join}=require('../test/fixtures/qoriPlay'),{each}=require('../backend/src/play/concurrency'),WebSocket=require('ws');
const screens=[],peers=new Set(),latencies=[],errors=[];let lock,server,stop,base,heartbeat,rounds=0,acknowledged=0,terminalInputRaces=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(role,token){
 const ws=new WebSocket(base.replace('http:','ws:')+runtime.PATH,{origin:base}),p={ws,state:null,ready:false,pending:new Map()};peers.add(p);ws.on('error',()=>{});
 ws.on('message',raw=>{const d=JSON.parse(raw);if(d.type==='ready')p.ready=true;if(d.type==='state')p.state=d.state;if(d.type==='ack'){const request=p.pending.get(d.seq);if(request){p.pending.delete(d.seq);clearTimeout(request.timer);latencies.push(performance.now()-request.start);acknowledged++;request.resolve();}}});
 ws.on('close',()=>{for(const request of p.pending.values()){clearTimeout(request.timer);request.reject(Error('CLOSED'));}p.pending.clear();peers.delete(p);});
 ws.on('message',raw=>{const d=JSON.parse(raw);if(d.type==='error'){for(const request of p.pending.values()){clearTimeout(request.timer);request.reject(Error(d.code));}p.pending.clear();}});
 await once(ws,'open');ws.send(JSON.stringify({type:'auth',role,token}));const deadline=Date.now()+10000;while(!p.ready){if(Date.now()>deadline)throw Error('AUTH_TIMEOUT');await wait(10);}return p;
}
function input(p,seq,action){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{p.pending.delete(seq);reject(Error('ACK_TIMEOUT'));},10000);p.pending.set(seq,{resolve,reject,timer,start:performance.now()});p.ws.send(JSON.stringify({type:'input',seq,action}));});}
async function main(){
 lock=await pool.connect();if(!(await lock.query('select pg_try_advisory_lock(53003817) ok')).rows[0].ok)throw Error('STOP_PREVIEW_AND_TESTS');
 console.log('Preparing 100 synthetic screens across four applications.');
 for(let org=0;org<4;org++){
 const f=await fixture({game:'orbita',cap:0});await query('update play_campaigns set max_sessions=1000 where id=$1',[f.campaign.id]);
 for(let n=0;n<25;n++){const screen=n?await svc.screen(f.app.id,{location_id:f.location.id,name:'Load '+n,orientation:'landscape'}):f.screen;if(n)await svc.assign(f.app.id,screen.id,f.campaign.id);screens.push({screen,device:await pair({...f,screen}),seq:0});}
 }
 server=http.createServer((_q,r)=>r.end('synthetic load lab'));server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;process.env.QORI_PLAY_PUBLIC_ORIGIN=base;stop=runtime.attach(server);await wait(100);
 heartbeat=setInterval(()=>{for(const p of peers)if(p.ws.readyState===1)p.ws.send(JSON.stringify({type:'ping'}));},3000);
 await each(screens,async x=>{x.display=await connect('screen',x.device.device_token);x.session=await join(x.device);x.control=await connect('controller',x.session.controller_token);await input(x.control,++x.seq,'start');});
 console.log('Holding 200 authenticated sockets for 60 seconds, rotating completed games.');const start=performance.now();
 while(performance.now()-start<60000){
 await each(screens,async x=>{try{
 if(!x.control.state)return;
 if(['COMPLETED','FAILED','EXPIRED'].includes(x.control.state.status)){
 const closed=once(x.control.ws,'close');x.control.ws.close();await closed;await svc.heartbeat(x.device.device_token,'screen');x.session=await join(x.device);x.seq=0;x.control=await connect('controller',x.session.controller_token);await input(x.control,++x.seq,'start');
 }else if(x.control.state.status==='PLAYING')await input(x.control,++x.seq,x.seq%2?'left':'right');
 if(x.display.state&&x.display.state.screen_id!==x.screen.id)throw Error('CROSS_SCREEN_STATE');
 }catch(e){if(e.message==='SESSION_NOT_PLAYING'){const state=await svc.personal(x.session.controller_token);x.control.state=state;x.seq=state.last_seq;if(['COMPLETED','FAILED','EXPIRED'].includes(state.status)){terminalInputRaces++;return;}}errors.push(e.message);}});rounds++;await wait(500);
 }
 latencies.sort((a,b)=>a-b);const output={at:new Date().toISOString(),screens:100,applications:4,measured_seconds:(performance.now()-start)/1000,rounds,acknowledged,errors:errors.reduce((a,e)=>(a[e]=(a[e]||0)+1,a),{}),ack_p50_ms:latencies[Math.floor(latencies.length*.5)],ack_p95_ms:latencies[Math.floor(latencies.length*.95)],runtime:{...runtime.metrics},memory_rss_bytes:process.memoryUsage().rss,scope:'Loopback Node/PostgreSQL; ACK latency, not rendered pixels, mobile network or production capacity'};
 output.terminal_input_races_recovered=terminalInputRaces;fs.writeFileSync('docs/qori-play/load-results.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));if(errors.length||runtime.metrics.failures)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{clearInterval(heartbeat);for(const p of peers)p.ws.terminate();if(stop)await stop();if(server)await new Promise(r=>server.close(r));if(screens.length)await query("update play_sessions set status='EXPIRED',finished_at=coalesce(finished_at,now()) where screen_id=any($1::uuid[]) and status not in ('COMPLETED','FAILED','EXPIRED')",[screens.map(s=>s.screen.id)]);if(lock){await lock.query('select pg_advisory_unlock(53003817)');lock.release();}await pool.end();});

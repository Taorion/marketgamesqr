const {WebSocketServer,WebSocket}=require('ws'),{pool}=require('../config/db'),cfg=require('./config'),svc=require('./service');
const PATH='/api/play/v1/live';
const metrics={cycles:0,failures:0,last_cycle_ms:0,max_cycle_ms:0,connections:0};
function attach(server){
 if(!cfg.enabled())return async()=>{};
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false}),peers=new Map(),ips=new Map(),pending=new Set();
 let stopped=false,ready=false,busy=false,lease,lastSweep=0,hookBusy=false;
 const initialize=(async()=>{lease=await pool.connect();const lock=await lease.query('select pg_try_advisory_lock(53003818) acquired');if(!lock.rows[0].acquired)throw Error('PLAY_RUNTIME_ALREADY_RUNNING');ready=true;})();
 initialize.catch(()=>{ready=false;console.error('PLAY_RUNTIME_UNAVAILABLE');});
 initialize.then(()=>lease.on('error',()=>{ready=false;for(const ws of wss.clients)ws.close(1013,'Runtime unavailable');})).catch(()=>{});
 function upgrade(req,socket,head){
 if(req.url?.split('?')[0]!==PATH)return; // Coexist with other upgrade handlers.
 let origin=false;try{origin=req.headers.origin===cfg.origin();}catch{}
 const ip=req.socket.remoteAddress;
 const perIp=Math.min(200,Math.max(2,Number.parseInt(process.env.QORI_PLAY_CONNECTIONS_PER_IP,10)||20));
 if(!ready||!cfg.enabled()||req.url!==PATH||!origin||wss.clients.size>=200||(ips.get(ip)||0)>=perIp){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
 wss.handleUpgrade(req,socket,head,ws=>{ws.ip=ip;ips.set(ip,(ips.get(ip)||0)+1);wss.emit('connection',ws);});
 }
 server.on('upgrade',upgrade);
 function send(ws,data){if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>32768)return ws.close(1008,'Slow connection');ws.send(JSON.stringify(data));}}
 wss.on('connection',ws=>{
 metrics.connections=wss.clients.size;
 let token,role,peerKey,lastWindow=Date.now(),count=0,chain=Promise.resolve();const authTimer=setTimeout(()=>ws.close(1008,'Authentication required'),3000);ws.alive=true;
 ws.on('pong',()=>{ws.alive=true;});ws.on('error',()=>{});
 ws.on('message',(raw,binary)=>{
 const now=Date.now();if(now-lastWindow>=1000){lastWindow=now;count=0;}if(++count>20||binary){ws.close(1008,'Invalid stream');return;}
 chain=chain.then(async()=>{
 if(!cfg.enabled()||stopped)throw Error('Disabled');const d=JSON.parse(raw.toString());
 if(!role){
 if(d.type!=='auth'||!['screen','controller'].includes(d.role)||!cfg.validToken(d.token)||Object.keys(d).some(k=>!['type','role','token'].includes(k)))throw Error('Auth');
 ws.resourceId=await svc.heartbeat(d.token,d.role);token=d.token;role=d.role;peerKey=role+':'+cfg.hash(token);peers.get(peerKey)?.close(1000,'Reconnected');peers.set(peerKey,ws);ws.role=role;ws.token=token;clearTimeout(authTimer);
 send(ws,{type:'ready'});return;
 }
 if(d.type==='ping'&&Object.keys(d).length===1){await svc.heartbeat(token,role);return;}
 if(role==='controller'&&d.type==='input'&&Number.isInteger(d.seq)&&typeof d.action==='string'&&Object.keys(d).every(k=>['type','seq','action'].includes(k))){
 const ack=await svc.input(token,{seq:d.seq,action:d.action});send(ws,{type:'ack',...ack});
 // Send fresh screen state immediately after an accepted input, independent of periodic tick.
 const s=await svc.controller({query:require('../config/db').query},token);
 for(const peer of peers.values())if(peer.role==='screen'&&peer.resourceId===s.screen_id)send(peer,{type:'state',state:await svc.snapshot(peer.token)});
 return;
 }
 if(role==='screen'&&d.type==='pause'&&typeof d.paused==='boolean'&&Object.keys(d).length===2){const s=await svc.device({query:require('../config/db').query},token);await svc.screenState(s.app_id,s.id,{paused:d.paused});return;}
 throw Error('Unsupported message');
 }).catch(e=>{if(['SEQUENCE_CONFLICT','SESSION_NOT_PLAYING','SCREEN_NOT_READY'].includes(e.code)){send(ws,{type:'error',code:e.code});}else ws.close(1008,'Session unavailable');});
 const running=chain;pending.add(running);running.finally(()=>pending.delete(running));
 });
 ws.on('close',()=>{clearTimeout(authTimer);const remaining=Math.max(0,(ips.get(ws.ip)||1)-1);if(remaining)ips.set(ws.ip,remaining);else ips.delete(ws.ip);if(peers.get(peerKey)===ws)peers.delete(peerKey);metrics.connections=wss.clients.size;});
 });
 const timer=setInterval(async()=>{
 if(!ready||busy||stopped)return;busy=true;const started=performance.now();
 try{await svc.tick();await require('./concurrency').each([...peers.values()],async ws=>{try{send(ws,{type:'state',state:ws.role==='screen'?await svc.snapshot(ws.token):await svc.personal(ws.token)});}catch{ws.close(1008,'Session unavailable');}});
 if(Date.now()-lastSweep>60000){await svc.retention();lastSweep=Date.now();}
 }catch{metrics.failures++;console.error('PLAY_TICK_UNAVAILABLE');}finally{metrics.cycles++;metrics.last_cycle_ms=Math.round(performance.now()-started);metrics.max_cycle_ms=Math.max(metrics.max_cycle_ms,metrics.last_cycle_ms);busy=false;}
 },250);timer.unref();
 const ping=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},10000);ping.unref();
 const hooks=setInterval(async()=>{if(!ready||stopped||hookBusy)return;hookBusy=true;try{await require('./webhooks').next();}catch{console.error('PLAY_WEBHOOK_WORKER_UNAVAILABLE');}finally{hookBusy=false;}},1000);hooks.unref();
 return async()=>{stopped=true;clearInterval(timer);clearInterval(ping);clearInterval(hooks);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();await initialize.catch(()=>{});while(busy||hookBusy)await new Promise(r=>setTimeout(r,10));await Promise.allSettled([...pending]);if(lease){try{await lease.query('select pg_advisory_unlock(53003818)');lease.release();}catch{lease.release(true);}}};
}
module.exports={attach,PATH,metrics};

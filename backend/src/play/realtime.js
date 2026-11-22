const {WebSocketServer,WebSocket}=require('ws'),{pool}=require('../config/db'),cfg=require('./config'),svc=require('./service');
const PATH='/api/play/v1/live';
function attach(server){
 if(!cfg.enabled())return async()=>{};
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false}),peers=new Map(),ips=new Map();
 let stopped=false,ready=false,busy=false,lease,lastSweep=0;
 const initialize=(async()=>{lease=await pool.connect();const lock=await lease.query('select pg_try_advisory_lock(53003818) acquired');if(!lock.rows[0].acquired)throw Error('PLAY_RUNTIME_ALREADY_RUNNING');ready=true;})();
 initialize.catch(()=>{ready=false;console.error('PLAY_RUNTIME_UNAVAILABLE');});
 function upgrade(req,socket,head){
 if(req.url?.split('?')[0]!==PATH)return; // Coexist with other upgrade handlers.
 let origin=false;try{origin=req.headers.origin===cfg.origin();}catch{}
 const ip=req.socket.remoteAddress;
 if(!ready||!cfg.enabled()||req.url!==PATH||!origin||wss.clients.size>=200||(ips.get(ip)||0)>=20){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
 wss.handleUpgrade(req,socket,head,ws=>{ws.ip=ip;ips.set(ip,(ips.get(ip)||0)+1);wss.emit('connection',ws);});
 }
 server.on('upgrade',upgrade);
 function send(ws,data){if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>32768)return ws.close(1008,'Slow connection');ws.send(JSON.stringify(data));}}
 wss.on('connection',ws=>{
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
 }).catch(e=>{if(e.code==='SEQUENCE_CONFLICT'){send(ws,{type:'error',code:'SEQUENCE_CONFLICT'});}else ws.close(1008,'Session unavailable');});
 });
 ws.on('close',()=>{clearTimeout(authTimer);ips.set(ws.ip,Math.max(0,(ips.get(ws.ip)||1)-1));if(peers.get(peerKey)===ws)peers.delete(peerKey);});
 });
 const timer=setInterval(async()=>{
 if(!ready||busy||stopped)return;busy=true;
 try{await svc.tick();for(const ws of peers.values()){try{send(ws,{type:'state',state:ws.role==='screen'?await svc.snapshot(ws.token):await svc.personal(ws.token)});}catch{ws.close(1008,'Session unavailable');}}
 if(Date.now()-lastSweep>60000){await svc.retention();lastSweep=Date.now();}
 }catch{console.error('PLAY_TICK_UNAVAILABLE');}finally{busy=false;}
 },250);timer.unref();
 const ping=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},10000);ping.unref();
 return async()=>{stopped=true;clearInterval(timer);clearInterval(ping);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();await initialize.catch(()=>{});while(busy)await new Promise(r=>setTimeout(r,10));if(lease){await lease.query('select pg_advisory_unlock(53003818)');lease.release();}};
}
module.exports={attach,PATH};

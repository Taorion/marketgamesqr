const crypto=require('node:crypto');
const jwt=require('jsonwebtoken');
const {WebSocketServer,WebSocket}=require('ws');
const {env}=require('../config/env');
const service=require('./chaseService');
const PATH='/api/public/chase-live', audience='qori-chase-v1';
const key=crypto.createHmac('sha256',env.jwtSecret).update(audience).digest();
function ticket(room,activation){return {path:PATH,token:jwt.sign({sub:room.own_id,room:room.id,activation},key,{algorithm:'HS256',audience,expiresIn:'2h'})};}
function attach(server){
  const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false}), rooms=new Map();
  let stopped=false,sweeping=false;
  function upgrade(req,socket,head){
    if(req.url?.split('?')[0]!==PATH)return;
    let origin=false;try{origin=new URL(req.headers.origin).host===req.headers.host;}catch(_){}
    if(!origin||wss.clients.size>=1024){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  }
  server.on('upgrade',upgrade);
  wss.on('connection',ws=>{
    let claims,peers,busy=false,count=0,windowAt=Date.now();
    const timeout=setTimeout(()=>ws.close(1008,'Autenticación requerida'),5000);
    ws.alive=true;ws.on('pong',()=>{ws.alive=true;});ws.on('error',()=>{});
    ws.on('message',async(raw,binary)=>{
      if(busy)return;
      try{
        if(Date.now()-windowAt>1000){count=0;windowAt=Date.now();}
        if(binary||++count>35)throw Error('Frecuencia inválida');
        const body=JSON.parse(raw.toString());busy=true;
        if(!claims){
          if(body.type!=='auth')throw Error('Sesión inválida');
          const verified=jwt.verify(body.token,key,{algorithms:['HS256'],audience});
          const state=await service.streamAction(verified,{type:'heartbeat'});
          claims=verified;peers=rooms.get(claims.room)||new Map();
          peers.get(claims.sub)?.close(4001,'Conectado en otra pestaña');peers.set(claims.sub,ws);rooms.set(claims.room,peers);
          clearTimeout(timeout);send(ws,{type:'state',room:{...state,own_id:claims.sub}});
        }else{
          if(Date.now()>claims.exp*1000)throw Error('Renueva la conexión');
          if(!['input','heartbeat'].includes(body.type))return;
          const state=await service.streamAction(claims,body);broadcast(peers,state);
        }
      }catch(_){ws.close(1008,'Sesión inválida');}finally{busy=false;}
    });
    ws.on('close',()=>{clearTimeout(timeout);if(peers?.get(claims?.sub)===ws)peers.delete(claims.sub);if(peers?.size===0)rooms.delete(claims.room);});
  });
  function send(ws,data){if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(JSON.stringify(data));}
  function broadcast(peers,room){for(const [id,ws]of peers)send(ws,{type:'state',room:{...room,own_id:id}});}
  const pending=new Set();
  const timer=setInterval(()=>{
    for(const [id,peers]of rooms){if(pending.has(id))continue;pending.add(id);service.tick(id).then(state=>{if(state&&!stopped)broadcast(peers,state);}).catch(()=>{}).finally(()=>pending.delete(id));}
  },100);
  const cleanup=setInterval(async()=>{if(sweeping)return;sweeping=true;try{await service.sweep();await service.settle();}catch(error){console.error('Chase cleanup:',error.message);}finally{sweeping=false;}},5000);
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
  for(const t of [timer,cleanup,heartbeat])t.unref();
  return ()=>{stopped=true;for(const t of [timer,cleanup,heartbeat])clearInterval(t);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();rooms.clear();wss.close();};
}
module.exports={PATH,ticket,attach};

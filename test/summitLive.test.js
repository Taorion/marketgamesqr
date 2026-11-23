const test = require('node:test'), assert = require('node:assert/strict');
const http = require('node:http'), { once } = require('node:events');
const { WebSocket } = require('ws');
const live = require('../backend/src/services/summitLiveService');
function access(id, seed='room-a', starts=Date.now()-5000) {
  return live.ticket({status:'racing',own:{id},seed,starts_at:new Date(starts).toISOString(),config:{duration_seconds:45,floors:8}});
}
async function fixture() {
  const server=http.createServer((req,res)=>res.end('ok')),stop=live.attach(server),clients=[];
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`,url=origin.replace('http','ws')+live.PATH;
  async function client(ticket,customOrigin=origin) {
    const ws=new WebSocket(url,{origin:customOrigin}),messages=[];clients.push(ws);
    ws.on('message',raw=>messages.push(JSON.parse(raw)));ws.on('error',()=>{});
    await once(ws,'open');
    if(ticket){const ready=once(ws,'message');ws.send(JSON.stringify({type:'auth',token:ticket.token}));await ready;}
    return {ws,messages};
  }
  return {client,url,clients,async close(){for(const ws of clients)ws.terminate();stop();await new Promise(resolve=>server.close(resolve));}};
}
const pose=tick=>({tick,x:86+tick,y:1124,face:1,lives:3,walking:true,hammer:false,stunned:false});
const send=(c,tick,extra={})=>c.ws.send(JSON.stringify({type:'pose',pose:pose(tick),...extra}));
function until(c,predicate) {
  if(predicate(c.messages))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{c.ws.off('message',check);reject(new Error('Timed out waiting for relay'));},2000);
    function check(){if(predicate(c.messages)){clearTimeout(timer);c.ws.off('message',check);resolve();}}
    c.ws.on('message',check);
  });
}
test('real-time poses are room-scoped, identity-bound and never carry prize commands',async()=>{
  const f=await fixture();
  try{
    const a=await f.client(access('a')),b=await f.client(access('b')),outsider=await f.client(access('c','room-b'));
    a.ws.send(JSON.stringify({type:'winner',winner_id:'a',rewarded:true}));
    send(a,1,{id:'c',room:'room-b',rewarded:true});await until(b,m=>m.length===2);
    assert.deepEqual(b.messages[1],{type:'pose',id:'a',pose:pose(1)});
    assert.equal(a.messages.length,1);assert.equal(outsider.messages.length,1);
    send(a,1);send(a,0);send(a,2,{pose:{...pose(2),x:9000}});
    send(a,2,{pose:{...pose(2),tick:9999}});send(a,3);
    await until(b,m=>m.some(v=>v.pose?.tick===3));
    assert.deepEqual(b.messages.slice(1).map(m=>m.pose.tick),[1,3]);
  }finally{await f.close();}
});
test('invalid, expired and cross-origin sessions cannot subscribe',async()=>{
  const f=await fixture();
  try{
    for(const token of ['invalid',access('expired','old',Date.now()-120000).token]){
      const c=await f.client(),closed=once(c.ws,'close');c.ws.send(JSON.stringify({type:'auth',token}));
      assert.equal((await closed)[0],1008);
    }
    const bad=new WebSocket(f.url,{origin:'https://elsewhere.invalid'});bad.on('error',()=>{});
    const [error]=await once(bad,'error');assert.match(error.message,/403/);
    assert.equal(live.ticket({status:'waiting',own:{id:'x'}}),null);
  }finally{await f.close();}
});
test('eight players relay 20 movement updates each with no database calls or HTTP polling',async()=>{
  const f=await fixture();
  try{
    const clients=[];for(let n=0;n<8;n++)clients.push(await f.client(access('p'+n)));
    for(let tick=1;tick<=20;tick++)for(const c of clients)send(c,tick);
    await Promise.all(clients.map(c=>until(c,m=>m.length===141)));
    for(let n=0;n<8;n++){
      assert.equal(clients[n].messages.slice(1).filter(m=>m.id==='p'+n).length,0);
      assert.equal(new Set(clients[n].messages.slice(1).map(m=>m.id)).size,7);
    }
    const oldClosed=once(clients[0].ws,'close'),replacement=await f.client(access('p0'));
    assert.equal((await oldClosed)[0],1000);
    send(replacement,21);await until(clients[1],m=>m.some(v=>v.id==='p0'&&v.pose?.tick===21));
  }finally{await f.close();}
});

test('browser client authenticates, reconnects after a dropped socket and stops cleanly',async()=>{
  const {JSDOM}=require('jsdom'),fs=require('node:fs');
  const f=await fixture(),dom=new JSDOM('',{url:f.url.replace('ws:','http:'),runScripts:'outside-only'}),w=dom.window,sockets=[];
  let reconnect;
  w.WebSocket=class extends WebSocket{
    constructor(url){super(url,{origin:w.location.origin});sockets.push(this);this.on('error',()=>{});reconnect?.(this);}
  };
  w.eval(fs.readFileSync('activacion/cumbre-live.js','utf8'));
  const received=[],client=w.QoriSummitLive.connect(access('browser'),(id,p)=>received.push({id,p}));
  try{
    await once(sockets[0],'message');
    const other=await f.client(access('other'));
    client.send(pose(1));await until(other,m=>m.some(v=>v.id==='browser'));
    assert.equal(sockets[0].url.includes('token'),false,'credentials must not enter URLs or access logs');
    const response=once(sockets[0],'message');send(other,2);await response;
    assert.equal(received[0].id,'other');
    const recreated=new Promise(resolve=>{reconnect=resolve;});sockets[0].terminate();
    const replacement=await recreated;await once(replacement,'message');
    client.send(pose(3));await until(other,m=>m.some(v=>v.id==='browser'&&v.pose?.tick===3));
    const closed=once(replacement,'close');client.destroy();await closed;
    assert.equal(sockets.length,2);
  }finally{client.destroy();w.close();await f.close();}
});

test('only committed server notifications can broadcast impacts to their own room',async()=>{
 const f=await fixture();
 try{
  const a=await f.client(access('a')),b=await f.client(access('b')),outside=await f.client(access('c','room-b'));
  const impact={id:'a:1:b',attacker_id:'a',target_id:'b',tick:2,direction:1};
  a.ws.send(JSON.stringify({type:'impact',impact}));send(a,1);await until(b,m=>m.some(v=>v.type==='pose'));
  assert.equal(b.messages.some(m=>m.type==='impact'),false);
  live.notify('room-a',[impact]);await until(a,m=>m.some(v=>v.type==='impact'));await until(b,m=>m.some(v=>v.type==='impact'));
  assert.deepEqual(b.messages.at(-1),{type:'impact',impact});assert.equal(outside.messages.length,1);
 }finally{await f.close();}
});

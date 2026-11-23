(function(global){'use strict';
class QoriPlayScreen{
 constructor({onState=()=>{},onConnection=()=>{}}={}){this.listeners=new Set([onState]);this.connection=onConnection;this.token=localStorage.getItem('qori-play-device-v1');this.stopped=false;this.backoff=500;}
 async request(path,body={}){const r=await fetch('/api/play/v1/'+path,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',...(this.token?{Authorization:'Bearer '+this.token}:{})},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error?.code||'REQUEST_FAILED');return d;}
 async initialize(){if(!global.WebSocket){this.connection('fallback');return;}if(this.token){this.connect();return null;}return this.beginPairing();}
 async beginPairing(){this.pair=await this.request('device-pairings');return {code:this.pair.code,expires_at:this.pair.expires_at};}
 async claimPairing(){const d=await this.request('device-pairings/claim',{challenge:this.pair.challenge});if(d.status==='PAIRED'){this.token=d.device_token;localStorage.setItem('qori-play-device-v1',this.token);this.connect();}return d.status;}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 connect(){if(this.stopped)return;const url=new URL('/api/play/v1/live',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
 const ws=this.ws=new WebSocket(url);this.connection('connecting');
 ws.onopen=()=>ws.send(JSON.stringify({type:'auth',role:'screen',token:this.token}));
 ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.type==='ready'){this.backoff=500;this.connection('online');}if(d.type==='state')for(const fn of this.listeners)fn(d.state);};
 ws.onclose=e=>{clearInterval(this.ping);if(this.stopped)return;this.connection('fallback');if(e.code===1008){localStorage.removeItem('qori-play-device-v1');this.token=null;this.connection('pair-again');return;}this.retry=setTimeout(()=>this.connect(),this.backoff);this.backoff=Math.min(10000,this.backoff*2);};
 ws.onerror=()=>this.connection('fallback');clearInterval(this.ping);this.ping=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'ping'}));},3000);
 }
 async showQR(){return this.request('device/qr');}
 pause(){if(this.ws?.readyState===1)this.ws.send(JSON.stringify({type:'pause',paused:true}));}
 resume(){if(this.ws?.readyState===1)this.ws.send(JSON.stringify({type:'pause',paused:false}));}
 async rotate(){const d=await this.request('device/rotate');this.token=d.device_token;localStorage.setItem('qori-play-device-v1',this.token);clearTimeout(this.retry);if(this.ws){this.ws.onclose=null;this.ws.close(1000);}this.connect();}
 destroy(){this.stopped=true;clearTimeout(this.retry);clearInterval(this.ping);this.ws?.close(1000);this.listeners.clear();}
}
global.QoriPlayScreen=QoriPlayScreen;
})(window);

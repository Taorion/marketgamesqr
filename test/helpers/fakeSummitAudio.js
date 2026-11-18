function environment({muted=false,unsupported=false}={}) {
 const timers=new Map(),contexts=[],stored=new Map(muted?[['qori-summit-sound','off']]:[]);let nextId=0;
 class Param {
  constructor(){this.value=0;this.events=[];}
  setValueAtTime(value,at){this.value=value;this.events.push({kind:'set',value,at});}
  linearRampToValueAtTime(value,at){this.events.push({kind:'linear',value,at});}
  exponentialRampToValueAtTime(value,at){this.events.push({kind:'exponential',value,at});}
 }
 class Node {
  constructor(context,kind){this.context=context;this.kind=kind;this.frequency=new Param();this.gain=new Param();this.connections=[];this.type='';this.disconnected=false;}
  connect(target){this.connections.push(target);return target;}
  disconnect(){this.disconnected=true;}
  start(at=0){this.startedAt=at;this.context.sources.push(this);}
  stop(at=this.context.currentTime){this.stoppedAt=at;if(at<=this.context.currentTime)this.end();}
  end(){if(!this.ended){this.ended=true;this.onended?.();}}
 }
 class Context {
  constructor(){this.currentTime=0;this.state='suspended';this.sampleRate=8000;this.destination={};this.sources=[];this.gains=[];this.resumeCalls=0;contexts.push(this);}
  createGain(){const node=new Node(this,'gain');this.gains.push(node);return node;}
  createOscillator(){return new Node(this,'oscillator');}
  createBufferSource(){return new Node(this,'buffer');}
  createBiquadFilter(){return new Node(this,'filter');}
  createBuffer(channels,length){const samples=new Float32Array(length);return {getChannelData:()=>samples};}
  resume(){this.resumeCalls++;if(this.rejectResume)return Promise.reject(new Error('Gesture required'));this.state='running';this.onstatechange?.();return Promise.resolve();}
  close(){this.state='closed';this.onstatechange?.();return Promise.resolve();}
  advance(seconds){this.currentTime+=seconds;for(const source of this.sources)if(source.stoppedAt<=this.currentTime)source.end();}
 }
 const root={AudioContext:unsupported?undefined:Context,document:{hidden:false},localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},
  setInterval:fn=>{timers.set(++nextId,fn);return nextId;},clearInterval:id=>timers.delete(id)};
 return {root,contexts,timers,stored,pump(seconds=.05){contexts.forEach(c=>c.advance(seconds));for(const fn of [...timers.values()])fn();}};
}
module.exports={environment};

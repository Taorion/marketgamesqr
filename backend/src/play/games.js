// Trusted built-in plugins only. Inputs contain actions, never scores or client time.
const manifests=Object.freeze({
 orbita:{id:'orbita',version:1,title:'Órbita Qori',controls:['left','right'],duration:200,description:'Cambia de carril y esquiva obstáculos.'},
 secuencia:{id:'secuencia',version:1,title:'Secuencia Qori',controls:['a','b','c','d'],duration:300,description:'Recuerda los símbolos que muestra la pantalla.'}
});
const rng=s=>{s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng;};
function initial(id,seed){if(!manifests[id])throw Error('Unknown game');const s={game:id,version:1,tick:0,rng:seed>>>0,score:0,done:false,won:false};if(id==='orbita')Object.assign(s,{lane:1,lives:3,obstacles:[]});else{Object.assign(s,{round:0,index:0,sequence:[],phase:'show',phaseAt:0});for(let i=0;i<3;i++)s.sequence.push((rng(s)>>>16)%4);}return s;}
function step(s,action){
 if(s.done)return s;
 if(action){
  if(!manifests[s.game].controls.includes(action))throw Error('Invalid control');
  if(s.game==='orbita'){s.lane=Math.max(0,Math.min(2,s.lane+(action==='left'?-1:1)));return s;}
  if(s.phase!=='answer')return s;
  if('abcd'.indexOf(action)!==s.sequence[s.index]){s.done=true;s.won=false;return s;}
  s.index++;s.score+=10;
  if(s.index===s.sequence.length){s.round++;if(s.round===3){s.done=true;s.won=true;}else{s.sequence.push((rng(s)>>>16)%4);s.index=0;s.phase='show';s.phaseAt=s.tick;}}return s;
 }
 s.tick++;
 if(s.game==='orbita'){
  if(s.tick%20===0)s.obstacles.push({lane:(rng(s)>>>16)%3,y:0});
  for(const o of s.obstacles)o.y+=2;
  for(const o of s.obstacles.filter(o=>o.y>=100)){if(o.lane===s.lane)s.lives--;else s.score+=10;}
  s.obstacles=s.obstacles.filter(o=>o.y<100);
  if(s.lives<=0){s.done=true;s.won=false;}
  if(s.tick>=manifests.orbita.duration){s.done=true;s.won=s.lives>0;}
 }else{
  if(s.phase==='show'&&s.tick-s.phaseAt>=s.sequence.length*8+8){s.phase='answer';s.phaseAt=s.tick;}
  if(s.tick>=manifests.secuencia.duration){s.done=true;s.won=false;}
 }
 return s;
}
function visible(s,role){if(!s?.game)return null;const {rng:privateSeed,sequence,...out}=s;
 if(s.game==='secuencia'){const elapsed=s.tick-s.phaseAt;out.symbol=role==='screen'&&s.phase==='show'&&elapsed%8<6?sequence[Math.floor(elapsed/8)]??null:null;}
 return out;}
module.exports={manifests,initial,step,visible};

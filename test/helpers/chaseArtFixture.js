const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../../activacion/policias-core');
let native;try{native=require('../../tmp/chase-art-tools/node_modules/@napi-rs/canvas');}catch(_){}
function fixture({width=1080,height=700,reduced=false,source}={}){
 if(!native)throw Error('Install optional @napi-rs/canvas@1.2.1 in tmp/chase-art-tools to run artwork checks.');
 let allocations=0;
 const document={createElement(){allocations++;return native.createCanvas(1,1);}};
 const context={QoriChaseCore:C,document,innerWidth:width,devicePixelRatio:1,matchMedia:()=>({matches:reduced})};
 vm.runInNewContext(source||fs.readFileSync(path.join(__dirname,'../../activacion/policias-view.js'),'utf8'),context);
 const canvas=native.createCanvas(width,height);canvas.clientWidth=width;canvas.clientHeight=height;
 const view=context.QoriChaseView.create(canvas);
 const state=C.lobby(1000);state.players=C.COLORS.map((color,i)=>({id:String(i),name:['Aurora','Bruno','Luna','Mateo','Violeta','Leo','Mar','Nieve'][i],color,seen:1000}));C.balance(state.players);C.start(state,1000,'art-round',{});
 const positions=[[15,12],[13,7.6],[21.2,18],[18,10.7],[23.5,19.8],[7,11],[19.2,17],[7.8,14]];
 state.players.forEach((p,i)=>Object.assign(p,{x:positions[i][0],y:positions[i][1],captured:i===2||i===4,moving:i!==2&&i!==4,dx:i%2?1:-1,dy:0}));state.status='running';state.server_now=6000;
 return {canvas,view,state,context,get allocations(){return allocations;},native};
}
module.exports={fixture,available:!!native};

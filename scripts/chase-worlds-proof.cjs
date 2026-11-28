// Local render review of the real Canvas code. These are fixture renders, not browser screenshots.
const fs=require('node:fs'),path=require('node:path'),C=require('../activacion/policias-core');
const {fixture}=require('../test/helpers/chaseArtFixture');
const folder=path.resolve(__dirname,'../docs/qa/policias-worlds');fs.mkdirSync(folder,{recursive:true});
const f=fixture(),sheet=f.native.createCanvas(1440,1300),c=sheet.getContext('2d');c.fillStyle='#202635';c.fillRect(0,0,1440,1300);c.imageSmoothingEnabled=false;
for(const [i,w]of C.WORLDS.entries()){
 const state={...f.state,scenario_id:w.id,players:[]};f.view.draw(state,null,6100,true);
 const x=(i%4)*360,y=Math.floor(i/4)*260;c.drawImage(f.canvas,x,y,360,233);c.fillStyle=w.accent;c.font='bold 14px sans-serif';c.textAlign='center';c.fillText((i+1)+'. '+w.name,x+180,y+250);
 if(['volcan','bosque','hielo','castillo','biblioteca'].includes(w.id))fs.writeFileSync(path.join(folder,w.id+'.png'),f.canvas.toBuffer('image/png'));
}
fs.writeFileSync(path.join(folder,'20-escenarios.png'),sheet.toBuffer('image/png'));console.log('Rendered 20 worlds and 5 full-size scene previews.');

// Renders the actual game renderer with fixture states. These PNGs are artwork
// renders, not browser or live-match screenshots. No database or network access.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const {fixture}=require('../test/helpers/chaseArtFixture');
const folder=path.resolve(__dirname,'../docs/qa/policias-art-v3');fs.mkdirSync(folder,{recursive:true});
const f=fixture();f.view.draw(f.state,'0',6100);fs.writeFileSync(path.join(folder,'barrio-y-prision.png'),f.canvas.toBuffer('image/png'));
const sheet=f.native.createCanvas(640,180),c=sheet.getContext('2d');c.fillStyle='#183543';c.fillRect(0,0,640,180);c.imageSmoothingEnabled=false;
f.state.players.forEach((p,i)=>{const canvas=f.native.createCanvas(64,72);f.context.QoriChaseView.portrait(canvas,p);c.drawImage(canvas,i*80+8,20);c.font='bold 11px monospace';c.textAlign='center';c.fillStyle=p.color;c.fillText(p.name,i*80+40,111);c.font='10px monospace';c.fillStyle='#d2d8c0';c.fillText(p.team==='police'?'POLICÍA':'LADRÓN',i*80+40,132);});fs.writeFileSync(path.join(folder,'personajes.png'),sheet.toBuffer('image/png'));
const mobile=fixture({width:390,height:390});mobile.view.draw(mobile.state,'0',6100);fs.writeFileSync(path.join(folder,'camara-movil.png'),mobile.canvas.toBuffer('image/png'));
const times=[];for(let i=0;i<60;i++){const start=performance.now();f.view.draw(f.state,'0',6100+i*17);times.push(performance.now()-start);}times.sort((a,b)=>a-b);
const report={renderer:'native Skia Canvas; not browser FPS',frames:60,p50_ms:Number(times[30].toFixed(2)),p95_ms:Number(times[57].toFixed(2)),fixture_players:8,files:['barrio-y-prision.png','personajes.png','camara-movil.png']};
fs.writeFileSync(path.join(folder,'render-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));

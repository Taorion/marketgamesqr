const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {fixture,available}=require('./helpers/chaseArtFixture');
const options={skip:available?false:'Optional native Canvas: npm install --prefix tmp/chase-art-tools --no-package-lock --ignore-scripts @napi-rs/canvas@1.2.1'};
const hash=c=>crypto.createHash('sha256').update(c.toBuffer('image/png')).digest('hex');
test('eight player scene renders lobby, pursuit, prison and effects without mutating authoritative state',options,()=>{
 const f=fixture(),before=JSON.stringify(f.state),count=f.allocations;
 for(const status of ['waiting','countdown','running','finished','closed']){const state={...f.state,status,events:[{type:'capture',player:'2',x:17,y:12,at:5800},{type:'rescue',player:'4',x:23.5,y:19.8,at:5800}]};f.view.draw(state,'0',6000);}
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.allocations,count,'No new offscreen surfaces in the frame loop');
 const pixels=f.canvas.getContext('2d').getImageData(0,0,1080,700).data;let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===255)opaque++;assert.equal(opaque,1080*700);
});
test('all eight portraits retain distinct personal colors and readable role differences',options,()=>{
 const f=fixture(),images=new Set();for(const p of f.state.players){const c=f.native.createCanvas(64,72);f.context.QoriChaseView.portrait(c,p);images.add(hash(c));const other=f.native.createCanvas(64,72);f.context.QoriChaseView.portrait(other,{...p,team:p.team==='police'?'thief':'police'});assert.notEqual(hash(c),hash(other));}assert.equal(images.size,8);
});
test('mobile follow camera and overview render different valid frames, including prison teleport',options,()=>{
 const f=fixture({width:390,height:390});f.view.draw(f.state,'0',6000,false);const follow=hash(f.canvas);f.view.draw(f.state,'0',6000,true);assert.notEqual(hash(f.canvas),follow);Object.assign(f.state.players[0],{x:21.2,y:18,captured:true});f.view.draw(f.state,'0',6200,false);assert.equal(f.canvas.width,390);assert.equal(f.canvas.height,390);
});
test('animation advances but reduced-motion scene is stable',options,()=>{
 const animated=fixture();animated.view.draw(animated.state,'0',6100);const first=hash(animated.canvas);animated.view.draw(animated.state,'0',6500);assert.notEqual(hash(animated.canvas),first);
 const reduced=fixture({reduced:true});reduced.view.draw(reduced.state,'0',6100);const still=hash(reduced.canvas);reduced.view.draw(reduced.state,'0',6500);assert.equal(hash(reduced.canvas),still);
});

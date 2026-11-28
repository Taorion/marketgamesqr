const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../activacion/policias-core'),{fixture,available}=require('./helpers/chaseArtFixture');
test('all twenty scenes render distinct art and reuse surfaces after selection without mutating room state',{skip:!available},()=>{
 const f=fixture(),hashes=new Set();
 for(const world of C.WORLDS){const s={...f.state,scenario_id:world.id},before=JSON.stringify(s);f.view.draw(s,'0',6100);const count=f.allocations;
 hashes.add(crypto.createHash('sha256').update(f.canvas.toBuffer('image/png')).digest('hex'));f.view.draw(s,'0',6200);
 assert.equal(f.allocations,count,world.id+' allocated during animation');assert.equal(JSON.stringify(s),before);
 }
 assert.equal(hashes.size,20);
 const mobile=fixture({width:390,height:390});for(const w of C.WORLDS)mobile.view.draw({...mobile.state,scenario_id:w.id},'0',6100);assert.equal(mobile.canvas.width,390);
});

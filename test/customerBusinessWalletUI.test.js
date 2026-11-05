const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom');
const wait=async fn=>{for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Not settled');};
function setup(){
 const w=new JSDOM('<main></main>',{url:'https://example.test/customer/#businesses',runScripts:'outside-only'}).window;
 w.HTMLDialogElement.prototype.close=function(){this.remove();};
 for(const f of ['wallet-model.js','business-wallet.js'])w.eval(fs.readFileSync('customer-web/'+f,'utf8'));
 const cards=[{id:'stamp',business_id:'one',business_name:'Café <privado>',kind:'STAMP',title:'Sellos',status:'ACTIVE'},{id:'ticket',business_id:'one',business_name:'Café <privado>',kind:'TICKET',title:'Actividad',status:'READY'},{id:'gift',business_id:'one',business_name:'Café <privado>',kind:'TICKET',benefit_category:'USER_GIFT',title:'Café regalado',sender_name:'Amiga',status:'READY'},{id:'points',business_id:'two',business_name:'Café <privado>',kind:'POINTS',title:'Puntos',status:'ACTIVE'}];
 const calls=[],connections=[{business_id:'one',name:'Café <privado>',verified_identity:true,auto_capture:false,book_id:'personal'}];
 const ctx={books:[{id:'personal',name:'Personal',currency:'COP'},{id:'home',name:'Casa',currency:'COP'}],book:{id:'personal'},refresh:async()=>{},showError:(m,n)=>n.textContent=m,
 request:async(u,b,m)=>{calls.push({u,b,m});return u==='/wallet/overview'?{cards,pending_benefits:[{id:'inv',business_id:'one',business_name:'Café <privado>',kind:'TICKET',purchased_product:true,title:'Regalo pendiente'}]}:u==='/relationships'?{relationships:[]}:u==='/finance-connections'?{connections}:u==='/product-gifts'?{orders:[{business_id:'one',business_name:'Café <privado>',product_name:'Café',recipient_name:'Amigo',sale_id:'sale',amount:'8000'}]}:{};},
 dialog:(_,h)=>{const d=w.document.createElement('dialog');d.innerHTML='<div class="dialog-body">'+h+'</div><p id="dialogError"></p>';w.document.body.append(d);return d;}};
 return {w,ctx,calls,cards,connections,page:w.document.querySelector('main')};
}
test('same-name businesses stay separate and each benefit is grouped by its true category',async()=>{
 const {w,ctx,cards,page}=setup();try{
  const groups=w.QoriWallet.groups(cards);assert.equal(groups.length,2);
  assert.equal(groups[0].sections.find(s=>s.kind==='TICKET').cards.length,1);assert.equal(groups[0].sections.find(s=>s.kind==='USER_GIFT').cards.length,1);
  assert.equal(w.QoriWallet.groups(cards,{kind:'USER_GIFT'})[0].cards[0].id,'gift');
  await w.QoriBusinessWallet.render(page,ctx,c=>'<p data-card="'+c.id+'">'+c.title+'</p>');
  assert.equal(page.querySelectorAll('.business-vault').length,2);assert.equal(page.querySelector('privado'),null);
  const first=page.querySelector('.business-vault');assert.equal(first.querySelectorAll('.benefit-section').length,5);
  const people=[...first.querySelectorAll('.benefit-section')].find(e=>e.querySelector('summary').textContent.includes('personas'));
  assert.ok(people.querySelector('[data-card=gift]'));assert.match(people.textContent,/Regalo pendiente/);assert.equal(people.querySelector('[data-card=ticket]'),null);
  assert.ok(first.querySelector('[data-purchase-receipt=sale]'));
 }finally{w.close();}
});
test('automatic purchases require an explicit saved choice and bind the selected pocket',async()=>{
 const {w,ctx,calls,connections}=setup();try{
  w.QoriBusinessWallet.settings(ctx,connections[0]);const form=w.document.querySelector('form');
  assert.equal(form.elements.enabled.checked,false);form.elements.enabled.checked=true;form.elements.book_id.value='home';
  form.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:form.querySelector('button')}));
  await wait(()=>calls.length);assert.equal(calls[0].u,'/finance-connections/one/capture');assert.deepEqual(JSON.parse(JSON.stringify(calls[0].b)),{enabled:true,book_id:'home',confirmed:true});
 }finally{w.close();}
});
test('purchase receipt renders canonical items without exposing a redemption ticket',async()=>{
 const {w,ctx,calls}=setup();try{
  ctx.request=async(u)=>{calls.push(u);return {receipt:{id:'sale',business_name:'Café',status:'PAID',paid_at:'2026-11-05T12:00:00Z',amount:'15000',currency:'COP',products:[{name:'Café',quantity:2,amount_minor:1000000},{name:'Pan',quantity:1,amount_minor:500000}],automatic:true}};};
  await w.QoriBusinessWallet.receipt(ctx,'sale');assert.equal(calls[0],'/purchase-receipts/sale');
  assert.equal(w.document.querySelectorAll('.purchase-receipt-lines>div').length,2);assert.match(w.document.body.textContent,/Cantidad: 2/);assert.equal(w.document.querySelector('img'),null);
 }finally{w.close();}
});

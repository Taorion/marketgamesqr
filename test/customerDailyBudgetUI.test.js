const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const settle=async fn=>{for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main></main>',{url:'https://example.test/customer/#home',runScripts:'outside-only'}).window;w.HTMLDialogElement.prototype.close=function(){this.remove();};
 for(const file of ['daily-money.js','product-budget.js'])w.eval(fs.readFileSync('customer-web/'+file,'utf8'));
 const calls=[],ctx={book:{id:'book',name:'Casa <privada>',currency:'COP'},account:{timezone:'America/Bogota'},refresh:async()=>{},showError:(m,n)=>{if(n)n.textContent=m;},request:async(u,b,m)=>{calls.push({u,b,m});return {};},dialog:(t,h)=>{const d=w.document.createElement('dialog');d.innerHTML='<h2>'+t+'</h2><div class="dialog-body">'+h+'</div>';w.document.body.append(d);return d;}};
 return {w,ctx,calls};
}
test('daily money needs only amount and concept; today and selected pocket currency are preserved on retries',async()=>{
 const {w,ctx,calls}=setup();try{
  let attempt=0;ctx.request=async(u,b)=>{calls.push({u,b});if(!attempt++)throw Error('Sin conexión');return {};};
  w.QoriDailyMoney.open(ctx,'INCOME');const f=w.document.querySelector('form');assert.equal(w.document.querySelector('privada'),null);assert.equal(f.querySelector('details').open,false);assert.ok(f.elements.occurred_at.value);assert.equal(w.document.activeElement,f.elements.amount);assert.equal(f.elements.kind,undefined);
  f.elements.amount.value='15000';f.elements.merchant.value='Venta';const submit=()=>f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[type=submit]')}));submit();await settle(()=>w.document.querySelector('#dialogError').textContent==='Sin conexión');submit();await settle(()=>calls.length===2);
  assert.equal(calls[0].b.request_id,calls[1].b.request_id);assert.equal(calls[1].b.kind,'INCOME');assert.equal(calls[1].b.currency,'COP');assert.equal(calls[1].b.category,'otros');assert.equal(calls[1].b.amount,'15000');
 }finally{w.close();}
});
test('expense shortcut points to existing scheduled payments without creating a duplicate movement',()=>{
 const {w,ctx,calls}=setup();try{w.QoriDailyMoney.open(ctx,'EXPENSE');w.document.querySelector('#dailyAgenda').click();assert.equal(w.location.hash,'#payments');assert.equal(calls.length,0);}finally{w.close();}
});
test('product budget computes quantity live and sends published identity and expected price only',async()=>{
 const {w,ctx,calls}=setup();try{
  const product={id:'pub',business_name:'Café',product_name:'<img src=x>',product_price:'80',product_currency:'COP',terms:'Condiciones'};
  w.QoriProductBudget.fromPublication(ctx,product);const f=w.document.querySelector('form');assert.equal(w.document.querySelector('img'),null);f.elements.quantity.value='3';f.elements.quantity.dispatchEvent(new w.Event('input'));assert.match(w.document.querySelector('#productBudgetTotal').textContent,/240/);
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[type=submit]')}));await settle(()=>calls.length);assert.equal(calls[0].u,'/purchases/from-publication');assert.equal(calls[0].b.quantity,3);assert.equal(calls[0].b.expected_unit_price,'80');assert.equal(calls[0].b.publication_id,'pub');assert.equal(calls[0].b.target_date,null);assert.equal(calls[0].b.estimated_amount,undefined);
 }finally{w.close();}
});
test('price changes and removed products retain the old source and require an explicit refresh',()=>{
 const {w}=setup();try{
  const p={id:'p',currency:'COP',status:'PLANNED',source_snapshot:{business_name:'Tienda',product_name:'Café',publication_id:'pub',quantity:2,unit_price:'80',regular_price:'100',currency:'COP',captured_at:'2026-11-04T00:00:00Z'},source:{available:true,price_changed:true,unit_price:'90'}};
  const page=w.document.querySelector('main');page.innerHTML=w.QoriProductBudget.sourceCard(p);assert.match(page.textContent,/El precio cambió/);assert.match(page.textContent,/40/);assert.ok(page.querySelector('[data-refresh-source]'));
  p.source={available:false};page.innerHTML=w.QoriProductBudget.sourceCard(p);assert.match(page.textContent,/ya no está disponible/);assert.equal(page.querySelector('[data-refresh-source]'),null);
 }finally{w.close();}
});

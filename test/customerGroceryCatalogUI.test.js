const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
function setup(){
 const w=new JSDOM('<main></main>',{url:'https://example.test/customer/#groceries/new',runScripts:'outside-only'}).window;
 w.HTMLDialogElement.prototype.close=function(){this.remove();};w.HTMLElement.prototype.scrollIntoView=function(){};
 for(const file of ['grocery-math.js','grocery-catalog.js','groceries.js'])w.eval(fs.readFileSync('customer-web/'+file,'utf8'));
 const key=w.QoriGroceryMath.productKey,products=[{key:key('Arroz','kg'),name:'Arroz',unit:'kg',suggested_quantity:2,last_price:'4500',last_bought_on:'2026-11-01'},{key:key('Jabón','unidad'),name:'Jabón',unit:'unidad',suggested_quantity:1,last_price:null},{key:key('<img src=x>','unidad'),name:'<img src=x>',unit:'unidad',suggested_quantity:1,last_price:'0',last_bought_on:'2026-10-01'}],calls=[];
 const ctx={book:{id:'book',name:'Casa',currency:'COP'},account:{timezone:'America/Bogota'},showError:(m,n)=>n.textContent=m,refresh:async()=>{},request:async(u,b)=>{calls.push({u,b});return {products,currency:'COP'};},dialog:(t,h)=>{const d=w.document.createElement('dialog');d.innerHTML='<h2>'+t+'</h2><div class="dialog-body">'+h+'</div>';w.document.body.append(d);return d;}};
 return {w,ctx,calls,products};
}
test('frequent products reuse last unit price only as estimate, allow manual choice and escape names',async()=>{
 const {w,ctx,products}=setup();try{
  let added;await w.QoriGroceryCatalog.open(ctx,[],items=>added=items);const f=w.document.querySelector('form'),rows=f.querySelectorAll('[data-product]');assert.equal(w.document.querySelector('img'),null);
  rows[0].querySelector('[data-pick]').click();assert.equal(rows[0].querySelector('[data-estimate]').value,'4500');assert.match(rows[0].textContent,/2026-11-01/);
  rows[1].querySelector('[data-pick]').click();assert.equal(rows[1].querySelector('[data-estimate]').value,'');
  f.elements.pricing.value='manual';f.elements.pricing.dispatchEvent(new w.Event('change'));assert.equal(rows[0].querySelector('[data-estimate]').value,'');rows[0].querySelector('[data-estimate]').value='4700';
  f.elements.search.value='jabon';f.elements.search.dispatchEvent(new w.Event('input'));assert.ok(rows[0].hidden);assert.ok(!rows[1].hidden);
  f.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(added.length,2);assert.equal(added[0].estimated_price,'4700');assert.equal(added[1].estimated_price,null);assert.ok(added.every(i=>!i.in_cart&&i.actual_price===null));assert.notEqual(added[0].id,products[0].key);
 }finally{w.close();}
});
test('quick picker prevents duplicates by name and unit and adds selected items to the new list',async()=>{
 const {w,ctx,calls}=setup();try{
  const page=w.document.querySelector('main');w.QoriGroceries.editor(page,ctx);
  await w.QoriGroceryCatalog.open(ctx,[{name:' ARROZ ',unit:'KG'}],()=>{});assert.ok(w.document.querySelector('[data-product="0"] [data-pick]').disabled);w.document.querySelector('dialog').close();
  page.querySelector('#groceryCatalog').click();await new Promise(r=>setTimeout(r,20));const f=w.document.querySelector('dialog form');f.querySelector('[data-product="0"] [data-pick]').click();f.dispatchEvent(new w.Event('submit',{cancelable:true}));
  const items=w.QoriGroceries.read(page.querySelector('form'));assert.equal(items.length,1);assert.equal(items[0].quantity,2);assert.equal(items[0].estimated_price,'4500');assert.equal(items[0].actual_price,null);assert.match(page.querySelector('#groceryLive').textContent,/9.000/);assert.ok(calls.every(c=>!c.b));
  page.querySelector('#groceryMode').click();assert.ok(page.querySelector('#groceryCatalog').hidden);
 }finally{w.close();}
});

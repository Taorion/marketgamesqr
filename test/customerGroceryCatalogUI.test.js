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
test('list names are visible when creating and editing; every list has a safe rename action',async()=>{
 const {w,ctx}=setup();try{
  const page=w.document.querySelector('main');w.QoriGroceries.editor(page,ctx);
  const title=page.querySelector('#groceryListName');assert.ok(title);assert.equal(title.closest('details'),null);
  title.value='Mercado de la familia <img src=x>';title.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(page.querySelector('h1').textContent,title.value);assert.equal(page.querySelector('img'),null);
  const summary={estimated_minor:0,unknown_prices:0},lists=['PLANNED','ARCHIVED','PURCHASED'].map((status,i)=>({id:'list-'+i,title:'Lista '+i,revision:2,status,items:[],currency:'COP',summary}));
  let sent,refreshed=false;ctx.request=async(u,b,m)=>{if(b){sent={u,b,m};return {list:{id:'list-2',title:b.title,revision:3}};}return {lists};};ctx.refresh=async()=>{refreshed=true;};
  await w.QoriGroceries.render(page,ctx,'groceries');assert.equal(page.querySelectorAll('[data-rename]').length,3);
  page.querySelector('[data-rename="list-2"]').click();const form=w.document.querySelector('#groceryRenameForm');assert.equal(form.elements.title.value,'Lista 2');
  form.elements.title.value='  Compras del paseo  ';await form.onsubmit(new w.Event('submit',{cancelable:true}));
  assert.equal(sent.u,'/groceries/list-2/title');assert.equal(sent.m,'PATCH');assert.equal(sent.b.title,'Compras del paseo');assert.equal(sent.b.revision,2);assert.equal(refreshed,true);assert.equal(w.document.querySelector('dialog'),null);
 }finally{w.close();}
});

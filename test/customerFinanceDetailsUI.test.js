const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const settle=async fn=>{for(let i=0;i<400;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main id="page"></main>',{url:'http://localhost/customer/#groceries/new',runScripts:'outside-only'}).window,calls=[];
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.close=function(){this.remove();};
 for(const f of ['debt-math.js','debt-components.js','debts.js','grocery-math.js','groceries.js'])w.eval(fs.readFileSync(path.join(__dirname,'../customer-web',f),'utf8'));
 const book={id:'book',name:'Casa',currency:'COP'},ctx={book,account:{id:'a',currency:'COP',timezone:'America/Bogota'},refresh:async()=>{},showError:(m,n)=>{if(n)n.textContent=m;},dialog:(title,html)=>{w.document.querySelector('dialog')?.remove();const d=w.document.createElement('dialog');d.innerHTML='<header>'+title+'</header><div class="dialog-body">'+html+'<p id="dialogError"></p></div>';w.document.body.append(d);return d;},
 request:async(url,body,method)=>{calls.push({url,body,method});if(url.endsWith('/candidates'))return {movements:[{entry_id:'expense',date:'2026-11-04',merchant:'Mercado',amount_minor:18000,currency:'COP'}]};if(url==='/groceries')return body?{list:{...body,id:'list',revision:1,currency:'COP'}}:{lists:[]};return {};}};
 return {w,ctx,calls,page:w.document.querySelector('#page')};
}
test('grocery editor records pending items and actual prices separately before payment confirmation',async()=>{
 const {w,ctx,calls,page}=setup();try{
  await w.QoriGroceries.render(page,ctx,'groceries/new');const f=page.querySelector('form');
  page.querySelector('#groceryQuick').value='Arroz';page.querySelector('#groceryAdd').click();const r=f.querySelector('.grocery-item');
  r.querySelector('[data-k=name]').value='Arroz';r.querySelector('[data-k=quantity]').value='2';r.querySelector('[data-k=estimated_price]').value='100';r.querySelector('[data-k=in_cart]').checked=true;r.querySelector('[data-k=actual_quantity]').value='2';r.querySelector('[data-k=actual_price]').value='90';f.dispatchEvent(new w.Event('input'));page.querySelector('#groceryMode').click();
  assert.match(page.querySelector('#groceryLive').textContent,/200/);assert.match(page.querySelector('#groceryLive').textContent,/180/);assert.equal(calls.length,0);
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[value=checkout]')}));
  await settle(()=>w.document.querySelector('#groceryPaid'));assert.match(w.document.querySelector('dialog').textContent,/Resumen de tu mercado/);assert.ok(!calls.some(c=>c.url.endsWith('/complete')));w.document.querySelector('#groceryPaid').click();await settle(()=>w.document.querySelector('#groceryCheckout'));assert.equal(calls.filter(c=>c.body).length,1);assert.equal(calls[0].body.items[0].estimated_price,'100');assert.equal(calls[0].body.items[0].actual_price,'90');
  const cf=w.document.querySelector('#groceryCheckout');cf.elements.movement.value='entry:expense';cf.elements.movement.dispatchEvent(new w.Event('change'));assert.equal(cf.elements.paid_on.required,false);assert.ok(cf.elements.carry_forward.checked);
  cf.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:cf.querySelector('button.primary')}));await settle(()=>calls.some(c=>c.url.endsWith('/complete')));
  const sent=calls.find(c=>c.url.endsWith('/complete'));assert.equal(sent.body.entry_id,'expense');assert.equal(sent.body.carry_forward,true);assert.equal(sent.body.confirmed,true);
 }finally{w.close();}
});
test('unpriced grocery items never show a complete saving and quantities not bought remain pending',()=>{
 const {w,ctx,page}=setup();try{
  const items=[{id:'x',name:'<img src=x>',quantity:2,unit:'kg',estimated_price:null,in_cart:true,actual_quantity:1,actual_price:'15'}],summary=w.QoriGroceryMath.summary(items);
  w.QoriGroceries.comparison(page,ctx,{id:'g',title:'Mercado',currency:'COP',items,summary,actual:{amount_minor:1500},needs_review:false,next_list_id:'next'});
  assert.equal(page.querySelector('img'),null);assert.match(page.textContent,/Comparación por revisar/);assert.ok(page.querySelector('[href="#groceries/next"]'));
 }finally{w.close();}
});
test('credit charge editor preserves modes, renders percentages and submits named costs',async()=>{
 const {w,ctx,calls,page}=setup();try{
  w.QoriDebts.edit(ctx);const f=w.document.querySelector('form');assert.ok(f.elements.credit_type.options.length>=10);f.elements.credit_type.value='MORTGAGE';
  f.querySelector('[data-charge-add]').click();const r=f.querySelector('.debt-charge-row');r.querySelector('[data-c=name]').value='Seguro de vivienda';r.querySelector('[data-c=mode]').value='SPREAD';r.querySelector('[data-c=mode]').dispatchEvent(new w.Event('change'));r.querySelector('[data-c=amount]').value='120';r.querySelector('[data-c=months]').value='12';
  assert.equal(r.querySelector('[data-c-wrap=months]').hidden,false);assert.equal(r.querySelector('[data-c-wrap=percent]').hidden,true);
  f.elements.name.value='Vivienda';f.elements.principal.value='10000';f.elements.months.value='24';f.elements.rate_percent.value='12';
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('button.primary')}));await settle(()=>calls.some(c=>c.body));
  const sent=calls.find(c=>c.body);assert.equal(sent.body.credit_type,'MORTGAGE');assert.equal(sent.body.charges[0].mode,'SPREAD');assert.equal(sent.body.charges[0].months,12);
  page.innerHTML=w.QoriDebtComponents.breakdown({principal_minor:5000,interest_minor:2500,insurance_minor:2000,fee_minor:2500},'COP');assert.match(page.textContent,/50.00 %/);assert.match(page.textContent,/20.00 %/);assert.match(page.textContent,/5.00 %/);
 }finally{w.close();}
});
test('application opens a saved grocery list with the selected accounting book',async()=>{
 const {w,ctx,page}=setup();try{
  w.document.body.innerHTML='<div id="app"></div><p id="announcement"></p>';w.history.replaceState(null,'','#groceries/list');w.setInterval=()=>0;
  let rendered;w.QoriAccounting={selector:()=>{}};w.QoriGroceries={render:(_p,c,r)=>{rendered={c,r};}};
  w.fetch=async url=>({ok:true,status:200,json:async()=>url.endsWith('/me')?{account:{id:'a',full_name:'Buyer',currency:'COP'}}:url.endsWith('/finance-books')?{books:[{...ctx.book,is_default:true}]}:{cards:[],relationships:[]}});
  w.eval(fs.readFileSync(path.join(__dirname,'../customer-web/app.js'),'utf8'));await settle(()=>rendered);assert.equal(rendered.r,'groceries/list');assert.equal(rendered.c.book.id,'book');
  const active=w.document.querySelector('.sidebar [aria-current=page]');assert.equal(active.getAttribute('href'),'#groceries');assert.equal(active.textContent,'Mercado y hogar');
 }finally{w.close();}
});

test('quick capture starts without errors, accepts household needs and saves unfinished input',async()=>{
 const {w,ctx,calls,page}=setup();try{
  w.QoriGroceries.editor(page,ctx);const f=page.querySelector('form'),quick=page.querySelector('#groceryQuick');
  assert.equal(page.querySelectorAll('.grocery-item').length,0);assert.equal(page.querySelector('#groceryLive').textContent,'');
  assert.equal(page.querySelector('#groceryError').textContent,'');assert.equal(f.querySelector('[value=checkout]').hidden,true);
  quick.value='Bolsas de basura';quick.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(page.querySelectorAll('.grocery-item').length,1);assert.equal(quick.value,'');assert.equal(calls.length,0);
  assert.match(page.querySelector('#groceryLive').textContent,/Precio por definir/);
  assert.match(page.querySelector('#grocerySaveState').textContent,/sin guardar/i);
  quick.value='Jabón';
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[value=save]')}));
  await settle(()=>calls.some(c=>c.body));
  const data=calls[0].body;assert.deepEqual(Array.from(data.items,i=>i.name),['Bolsas de basura','Jabón']);
  assert.ok(data.items.every(i=>i.estimated_price===null&&!i.in_cart));assert.equal(calls.length,1);
  assert.ok(data.items.every(i=>i.quantity===1&&i.unit==='unidad'));
 }finally{w.close();}
});
test('save retry preserves item identities and typed quick capture without creating a second list',async()=>{
 const {w,ctx,page}=setup();try{
  const sent=[];ctx.request=async(u,b,m)=>{sent.push({u,b,m});if(sent.length===1)throw Error('Sin conexión');return {list:{...b,id:'saved',revision:1,currency:'COP'}};};
  w.QoriGroceries.editor(page,ctx);const f=page.querySelector('form');page.querySelector('#groceryQuick').value='Papel higiénico';
  const submit=()=>f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[value=save]')}));
  submit();await settle(()=>page.querySelector('#groceryError').textContent==='Sin conexión');
  assert.equal(page.querySelectorAll('.grocery-item').length,1);assert.match(page.querySelector('#grocerySaveState').textContent,/sin guardar/i);
  submit();await settle(()=>sent.length===2);assert.equal(sent[0].b.request_id,sent[1].b.request_id);
  assert.equal(sent[0].b.items[0].id,sent[1].b.items[0].id);assert.equal(sent[1].b.items.length,1);
 }finally{w.close();}
});
test('planning and shopping preserve estimates and block incomplete checkout',async()=>{
 const {w,ctx,calls,page}=setup();try{
  w.QoriGroceries.editor(page,ctx);page.querySelector('#groceryQuick').value='Leche';page.querySelector('#groceryAdd').click();
  const f=page.querySelector('form'),r=f.querySelector('.grocery-item');
  const qty=r.querySelector('[data-k=quantity]');qty.value='3';qty.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(r.querySelector('[data-k=actual_quantity]').value,'3');
  page.querySelector('#groceryMode').click();assert.equal(f.querySelector('[value=checkout]').hidden,false);
  r.querySelector('[data-k=in_cart]').checked=true;f.dispatchEvent(new w.Event('input'));
  assert.equal(r.querySelector('.grocery-actual').hidden,false);
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[value=checkout]')}));
  await settle(()=>page.querySelector('#groceryError').textContent);assert.equal(calls.length,0);assert.match(page.querySelector('#groceryError').textContent,/precios reales/);
  page.querySelector('#groceryMode').click();assert.equal(r.querySelector('.grocery-actual').hidden,true);assert.equal(r.querySelector('[data-k=in_cart]').checked,true);
  assert.equal(r.querySelector('[data-remove-item]').hidden,true);r.querySelector('[data-remove-item]').click();assert.equal(page.querySelectorAll('.grocery-item').length,1);assert.ok(r.querySelector('[data-k=estimated_price]').readOnly);
 }finally{w.close();}
});
test('live mode auto saves, restores the cart and labels quick additions as extras',async()=>{
 const {w,ctx,page}=setup();try{
  let saved=null;const writes=[];ctx.request=async(url,body)=>{if(body){writes.push(body);saved={...body,id:'live',revision:(saved?.revision||0)+1,currency:'COP'};return {list:saved};}return saved;};
  w.QoriGroceries.editor(page,ctx);page.querySelector('#groceryQuick').value='Arroz';page.querySelector('#groceryAdd').click();
  let row=page.querySelector('.grocery-item');row.querySelector('[data-k=estimated_price]').value='10';row.querySelector('[data-k=estimated_price]').dispatchEvent(new w.Event('input',{bubbles:true}));page.querySelector('#groceryMode').click();
  row.querySelector('[data-k=in_cart]').click();const actual=row.querySelector('[data-k=actual_price]');assert.equal(w.document.activeElement,actual);actual.value='8';actual.dispatchEvent(new w.Event('input',{bubbles:true}));
  page.querySelector('#groceryQuick').value='Dulce';page.querySelector('#groceryAdd').click();const extra=page.querySelectorAll('.grocery-item')[1];assert.equal(extra.dataset.origin,'EXTRA');assert.ok(extra.querySelector('[data-k=in_cart]').checked);extra.querySelector('[data-k=actual_price]').value='4';extra.querySelector('[data-k=actual_price]').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.match(page.querySelector('#groceryRunning').textContent,/12/);await settle(()=>saved);assert.equal(writes.length,1);assert.equal(saved.items[0].shopping_origin,'PLANNED');assert.equal(saved.items[1].shopping_origin,'EXTRA');
  w.QoriGroceries.editor(page,ctx,saved);assert.equal(page.querySelector('#groceryMode').getAttribute('aria-pressed'),'true');assert.match(page.querySelector('#groceryRunning').textContent,/12/);assert.ok(page.querySelector('[data-k=estimated_price]').readOnly);
  const f=page.querySelector('form');f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[value=checkout]')}));await settle(()=>w.document.querySelector('#groceryPaid'));
  assert.match(w.document.querySelector('dialog').textContent,/Compras adicionales/);assert.match(w.document.querySelector('dialog').textContent,/Dulce/);assert.match(w.document.querySelector('dialog').textContent,/de más/);assert.equal(writes.length,1);
 }finally{w.close();}
});
test('live auto save serializes edits made during a pending request',async()=>{
 const {w,ctx,page}=setup();try{
  let release;const sent=[];ctx.request=async(url,body)=>{sent.push(body);if(sent.length===1)await new Promise(r=>release=r);return {list:{...body,id:'live',revision:sent.length,currency:'COP'}};};
  w.QoriGroceries.editor(page,ctx);page.querySelector('#groceryQuick').value='Pan';page.querySelector('#groceryAdd').click();page.querySelector('#groceryMode').click();await settle(()=>release);
  const r=page.querySelector('.grocery-item');r.querySelector('[data-k=in_cart]').click();r.querySelector('[data-k=actual_price]').value='7';r.querySelector('[data-k=actual_price]').dispatchEvent(new w.Event('input',{bubbles:true}));release();await settle(()=>sent.length===2);await settle(()=>/Lista guardada/.test(page.querySelector('#grocerySaveState').textContent));
  assert.equal(sent[1].revision,1);assert.equal(sent[1].items[0].actual_price,'7');assert.ok(sent[1].items[0].in_cart);
 }finally{w.close();}
});
test('list directory prioritizes pending needs and separates purchased history safely',async()=>{
 const {w,ctx,page}=setup();try{
  const item={id:'x',name:'<img src=x> Jabón',quantity:1,unit:'unidad',estimated_price:null,in_cart:false},summary=w.QoriGroceryMath.summary([item]);
  ctx.request=async()=>({lists:[{id:'past',title:'Compra anterior',status:'PURCHASED',items:[item],summary,currency:'COP',actual:{amount_minor:2000}},{id:'next',title:'Lo que falta',status:'PLANNED',items:[item],summary,currency:'COP'}]});
  await w.QoriGroceries.render(page,ctx);
  assert.equal(page.querySelector('h1').textContent,'Mercado y hogar');assert.equal(page.querySelector('img'),null);
  const pending=page.querySelector('[aria-labelledby=groceryPendingTitle]');
  assert.match(pending.textContent,/Lo que falta/);assert.doesNotMatch(pending.textContent,/Compra anterior/);
  assert.match(pending.textContent,/Precios por definir/);assert.equal(page.querySelector('.grocery-history').open,false);
  assert.match(page.querySelector('.grocery-history').textContent,/Compra anterior/);
  assert.ok(page.querySelector('.grocery-welcome [href="#groceries/next"]'));
 }finally{w.close();}
});

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const settle=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
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
  await w.QoriGroceries.render(page,ctx,'groceries/new');const f=page.querySelector('form'),r=f.querySelector('.grocery-item');
  r.querySelector('[data-k=name]').value='Arroz';r.querySelector('[data-k=quantity]').value='2';r.querySelector('[data-k=estimated_price]').value='100';r.querySelector('[data-k=in_cart]').checked=true;r.querySelector('[data-k=actual_quantity]').value='2';r.querySelector('[data-k=actual_price]').value='90';f.dispatchEvent(new w.Event('input'));
  assert.match(page.querySelector('#groceryLive').textContent,/200/);assert.match(page.querySelector('#groceryLive').textContent,/180/);assert.equal(calls.length,0);
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[value=checkout]')}));
  await settle(()=>w.document.querySelector('#groceryCheckout'));assert.equal(calls.filter(c=>c.body).length,1);assert.equal(calls[0].body.items[0].estimated_price,'100');assert.equal(calls[0].body.items[0].actual_price,'90');
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
 }finally{w.close();}
});

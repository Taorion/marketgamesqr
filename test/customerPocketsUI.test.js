const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const settle=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main id="page"></main>',{url:'https://gosqori.com/customer/#pockets',runScripts:'outside-only'}).window;
 w.HTMLDialogElement.prototype.close=function(){this.remove();};
 for(const f of ['accounting.js','pockets.js'])w.eval(fs.readFileSync(path.join(__dirname,'../customer-web',f),'utf8'));
 const books=[{id:'personal',name:'Personal',currency:'COP',revision:1,opening_amount:'-100'},{id:'business',name:'Mi negocio <privado>',currency:'COP',revision:2,opening_amount:'1000'},{id:'child',name:'Hijo',currency:'COP',revision:1,opening_amount:null}];
 const flow={from:'2026-11-01',to:'2026-11-04',income_minor:0,expense_minor:0};
 const data={books:books.map(b=>({...b,cash_minor:b.opening_amount==null?null:Number(b.opening_amount)*100,liabilities_minor:0,flow}))};
 const calls=[],ctx={account:{currency:'COP',timezone:'America/Bogota'},books,book:books[0],request:async(u,b,m)=>{calls.push({u,b,m});return b?{book:{id:'created'}}:data;},refresh:async()=>{},selectBook:async(id,route)=>{calls.push({id,route});},showError:(m,e)=>{if(e)e.textContent=m;},dialog:(t,h)=>{const d=w.document.createElement('dialog');d.innerHTML='<header>'+t+'</header>'+h+'<p id="dialogError"></p>';w.document.body.append(d);return d;}};
 return {w,ctx,calls,data,page:w.document.querySelector('main')};
}
test('pocket cards keep a negative personal balance visible alongside a positive business and an unknown child balance',async()=>{
 const {w,ctx,calls,page}=setup();try{
  await w.QoriPockets.render(page,ctx);const cards=page.querySelectorAll('.pocket-card');
  assert.equal(cards.length,3);assert.ok(cards[0].classList.contains('is-negative'));assert.ok(cards[1].classList.contains('is-positive'));assert.ok(cards[2].classList.contains('is-unknown'));
  assert.match(cards[0].querySelector('.pocket-amount').textContent,/-/);assert.match(cards[2].textContent,/Saldo por definir/);assert.equal(page.querySelector('privado'),null);
  assert.equal(page.querySelectorAll('.wealth-total').length,0);
  cards[1].querySelector('[data-pocket-open]').click();await settle(()=>calls.some(c=>c.id==='business'));assert.equal(calls.find(c=>c.id==='business').route,'home');
 }finally{w.close();}
});
test('create pocket uses a suggested name, sends signed starting balance atomically and opens its finances',async()=>{
 const {w,ctx,calls}=setup();try{
  w.QoriAccounting.createBook(ctx);const f=w.document.querySelector('form');
  assert.equal(f.elements.opening_amount.value,'');f.querySelector('[data-pocket-preset="Mi negocio"]').click();assert.equal(f.elements.name.value,'Mi negocio');
  f.elements.opening_amount.value='-250';f.elements.opening_amount.dispatchEvent(new w.Event('input'));assert.equal(f.elements.opening_date.required,true);
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[type=submit]')}));
  await settle(()=>calls.some(c=>c.id==='created'));const sent=calls.find(c=>c.u==='/finance-books');
  assert.equal(sent.b.opening_amount,'-250');assert.ok(sent.b.opening_date);assert.equal(sent.b.name,'Mi negocio');assert.equal(calls.find(c=>c.id==='created').route,'home');
 }finally{w.close();}
});
test('leaving the initial balance blank preserves unknown cash and retries reuse the creation identity',async()=>{
 const {w,ctx,calls}=setup();try{
  let failing=true;ctx.request=async(u,b,m)=>{calls.push({u,b,m});if(failing)throw Error('Sin conexión');return {book:{id:'created'}};};
  w.QoriAccounting.createBook(ctx);const f=w.document.querySelector('form');f.elements.name.value='Casa';
  const send=()=>f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[type=submit]')}));
  send();await settle(()=>w.document.querySelector('#dialogError').textContent);failing=false;send();await settle(()=>calls.filter(c=>c.u).length===2);
  const sent=calls.filter(c=>c.u);assert.equal('opening_amount' in sent[0].b,false);assert.equal('opening_date' in sent[0].b,false);assert.equal(sent[0].b.request_id,sent[1].b.request_id);
 }finally{w.close();}
});
test('renaming an unknown pocket does not assign zero or send a balance update',async()=>{
 const {w,ctx,calls}=setup();try{
  w.QoriAccounting.renameBook(ctx,ctx.books[2]);const f=w.document.querySelector('form');f.elements.name.value='Estudios de mi hijo';
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[type=submit]')}));await settle(()=>calls.length);
  assert.equal(calls[0].m,'PATCH');assert.equal(calls[0].u,'/finance-books/child/name');assert.equal(calls[0].b.revision,1);assert.equal('opening_amount' in calls[0].b,false);
 }finally{w.close();}
});
test('selecting a pocket replaces a stale book URL and pins subsequent movement requests to the selected pocket',async()=>{
 const {w,ctx}=setup();try{
  w.history.replaceState(null,'','?book=personal#home');w.document.body.innerHTML='<div id="app"></div><p id="announcement"></p>';w.setInterval=()=>0;
  let context;w.QoriAccounting={selector:()=>{},render:(_p,c)=>{context=c;}};
  w.fetch=async url=>({ok:true,status:200,json:async()=>url.endsWith('/me')?{account:{id:'a',full_name:'Buyer',currency:'COP'}}:url.endsWith('/finance-books')?{books:ctx.books.map((b,i)=>({...b,is_default:!i}))}:{cards:[],relationships:[]}});
  w.eval(fs.readFileSync(path.join(__dirname,'../customer-web/app.js'),'utf8'));await settle(()=>context);
  await context.selectBook('business','home');assert.equal(new URL(w.location.href).searchParams.get('book'),'business');assert.equal(w.location.hash,'#home');assert.equal(context.book.id,'business');
  let header;w.fetch=async(_u,o)=>{header=o.headers['X-Qori-Book'];return {ok:true,json:async()=>({})};};await context.request('/entries',{kind:'EXPENSE'});assert.equal(header,'business');
 }finally{w.close();}
});
test('switching pockets from a saved grocery list opens the new pocket list directory',async()=>{
 const {w,ctx}=setup();try{
  w.history.replaceState(null,'','?book=personal#groceries/private-list');w.document.body.innerHTML='<div id="app"></div><p id="announcement"></p>';w.setInterval=()=>0;
  let current,route;w.QoriAccounting={selector:()=>{}};w.QoriGroceries={render:(_p,c,r)=>{current=c;route=r;}};
  w.fetch=async url=>({ok:true,status:200,json:async()=>url.endsWith('/me')?{account:{id:'a',full_name:'Buyer',currency:'COP'}}:url.endsWith('/finance-books')?{books:ctx.books.map((b,i)=>({...b,is_default:!i}))}:{cards:[],relationships:[]}});
  w.eval(fs.readFileSync(path.join(__dirname,'../customer-web/app.js'),'utf8'));await settle(()=>current);
  await current.selectBook('business');assert.equal(route,'groceries');assert.equal(current.book.id,'business');assert.equal(w.location.hash,'#groceries');
 }finally{w.close();}
});

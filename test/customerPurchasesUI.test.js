const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
async function settle(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');}
function setup(){
 const w=new JSDOM('<main id="page"></main>',{url:'http://localhost/customer/#purchases',runScripts:'outside-only'}).window;
 const plan={id:'plan-1',revision:1,title:'Café <QA>',category:'alimentacion',currency:'COP',estimated_amount:'200',estimated_minor:20000,status:'PLANNED',target_date:null,note:''};
 const data={currency:'COP',spent_minor:15000,obligations_minor:10000,planned_minor:20000,projected_remaining_minor:55000,plans:[plan]},calls=[],errors=[];
 w.HTMLDialogElement.prototype.close=function(){this.remove();};
 const ctx={account:{currency:'COP',timezone:'America/Bogota'},showError:e=>errors.push(e),dialog(title,html){
  w.document.querySelector('dialog')?.remove();const d=w.document.createElement('dialog');d.innerHTML='<h2>'+title+'</h2><div class="dialog-body">'+html+'<p id="dialogError"></p></div>';w.document.body.append(d);return d;
 },request:async(url,body,method)=>{
  calls.push({url,body,method});if(url.startsWith('/purchases/overview'))return data;
  if(url.endsWith('/candidates'))return {movements:[{sale_id:'sale-1',date:'2026-11-03',merchant:'Negocio Qori',amount_minor:15000,currency:'COP'}]};
  if(url.startsWith('/explore/directory'))return {businesses:[{slug:'rey-del-sabor',name:'Rey del sabor'}]};
  if(url.startsWith('/explore?'))return {publications:[{id:'offer-1',kind:'PRODUCT',title:'Café de regalo',business_name:'Rey del sabor',product_price:'220',description:'Términos del negocio'}]};
  return {ok:true};
 }};
 w.eval(fs.readFileSync(path.join(__dirname,'../customer-web/purchases.js'),'utf8'));
 return {w,ctx,page:w.document.querySelector('#page'),data,plan,calls,errors};
}
test('purchase outlook distinguishes budget from bank balance and never counts another currency in the list',async()=>{
 const {w,ctx,page,data}=setup();try{
  data.plans.push({...data.plans[0],id:'usd',title:'USD only',currency:'USD'});
  await w.QoriPurchases.render(page,ctx);
  assert.match(page.querySelector('.purchase-budget').textContent,/no representa tu saldo bancario/);
  assert.match(page.querySelector('.purchase-total').textContent,/550/);assert.doesNotMatch(page.querySelector('#purchasePlans').textContent,/USD only/);
  assert.equal(page.querySelector('qa'),null);assert.match(page.textContent,/Café <QA>/);
  data.projected_remaining_minor=null;await w.QoriPurchases.render(page,ctx);assert.ok(page.querySelector('.purchase-budget a[href="#planning"]'));assert.equal(page.querySelector('.purchase-total'),null);
 }finally{w.close();}
});
test('planning saves intent only and keeps the same request identity when a save is retried',async()=>{
 const {w,ctx,page,calls}=setup();try{
  await w.QoriPurchases.render(page,ctx);page.querySelector('#newPurchase').click();
  const f=w.document.querySelector('#purchasePlanForm');f.elements.title.value='Mercado';f.elements.estimated_amount.value='300';
  const send=ctx.request;let failed=false;ctx.request=async(...args)=>{const r=await send(...args);if(args[0]==='/purchases'&&!failed){failed=true;throw Error('Reintenta');}return r;};
  const event={preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button[type=submit]')};
  await f.onsubmit(event);await f.onsubmit(event);
  const requests=calls.filter(c=>c.url==='/purchases');assert.equal(requests.length,2);assert.equal(requests[0].body.request_id,requests[1].body.request_id);assert.equal(requests[0].body.estimated_amount,'300');assert.equal(calls.some(c=>c.url==='/entries'),false);
 }finally{w.close();}
});
test('registered purchase completion sends the canonical sale instead of creating another expense',async()=>{
 const {w,ctx,page,calls}=setup();try{
  await w.QoriPurchases.render(page,ctx);page.querySelector('[data-link]').click();await settle(()=>w.document.querySelector('#purchaseCompleteForm'));
  const f=w.document.querySelector('#purchaseCompleteForm');f.elements.movement.value='sale:sale-1';
  await f.onsubmit({preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button')});
  const sent=calls.find(c=>c.url.endsWith('/complete'));assert.equal(sent.body.sale_id,'sale-1');assert.equal(sent.body.confirmed,true);assert.equal(sent.body.amount,undefined);assert.equal(calls.some(c=>c.url==='/entries'),false);
 }finally{w.close();}
});
test('benefits show published prices and warn when they exceed the planned amount without inventing discounts',async()=>{
 const {w,ctx,page}=setup();try{
  await w.QoriPurchases.render(page,ctx);page.querySelector('[data-opportunities]').click();
  await settle(()=>w.document.querySelector('#purchaseOpportunities a'));
  const offers=w.document.querySelector('#purchaseOpportunities');assert.match(offers.textContent,/Supera el importe que planeaste/);
  assert.ok(offers.querySelector('a[href="#publication/offer-1"]'));assert.ok(offers.querySelector('a[href="#business/rey-del-sabor"]'));assert.doesNotMatch(offers.textContent,/ahorras|mejor precio/i);
 }finally{w.close();}
});

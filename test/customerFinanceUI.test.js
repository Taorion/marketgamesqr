const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const root=path.resolve(__dirname,'..'),load=(w,f)=>w.eval(fs.readFileSync(path.join(root,f),'utf8'));
const rows=[
 {id:'sale:sale-1',sale_id:'sale-1',merchant:'Café Qori',date:'2026-11-03',source:'QORI',kind:'EXPENSE',status:'PAID',amount_minor:1200000,purchase_minor:1200000,pending_minor:0,currency:'COP',category:'alimentacion',priority:'FLEXIBLE',note:'Mi café',products:[]},
 {id:'manual:manual-1',entry_id:'manual-1',merchant:'Transporte',date:'2026-11-03',source:'MANUAL',kind:'EXPENSE',status:'PAID',amount_minor:500000,purchase_minor:500000,pending_minor:0,currency:'COP',category:'transporte',priority:'ESSENTIAL',note:'Trayecto al trabajo',products:[]}
];
function setup(){
 const dom=new JSDOM('<main id="page"></main>',{url:'http://localhost/customer/#finances',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.remove();this.onclose?.();};w.HTMLElement.prototype.scrollIntoView=function(){};w.setInterval=()=>0;
 const calls=[],errors=[],ctx={account:{currency:'COP',timezone:'America/Bogota'},showError:e=>errors.push(e),refreshFinance:async()=>{},dialog(title,html){w.document.querySelector('dialog')?.remove();const d=w.document.createElement('dialog');d.innerHTML='<h2>'+title+'</h2><div class="dialog-body">'+html+'<p id="dialogError"></p></div>';w.document.body.append(d);return d;},request:async(url,body,method)=>{
  calls.push({url,body,method});
  if(url.startsWith('/dashboard'))return require('../backend/src/services/customerFinance').summarize(rows.map(r=>({...r,refunded_minor:0})),{from:'2026-11-01',to:'2026-11-03',previous_from:'2026-10-01',previous_to:'2026-10-03',timezone:'America/Bogota'},'COP',[],[]);
  if(url==='/planning')return {budgets:[],goals:[],recurring:[{id:'recurring-1',name:'Internet',amount:'60000',currency:'COP',kind:'EXPENSE',next_date:'2026-11-03',frequency:'month'}]};
  if(url==='/finance-connections')return {connections:[]};
  if(url.startsWith('/sales/'))return {movement:rows[0],receipts:[],adjustments:[]};
  return {entry:{id:'saved-1'}};
 }};
 return {dom,w,ctx,calls,errors,page:w.document.querySelector('#page')};
}
async function settle(fn){for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');}
test('the app refreshes finances automatically and keeps sale actions when refreshing invitations',async()=>{
 const {w}=setup();let sync,renders=0;const contexts=[];
 try{
  w.document.body.innerHTML='<main id="app"></main><p id="announcement"></p>';
  Object.defineProperty(w.document,'hidden',{value:false});
  w.setInterval=fn=>{sync=fn;return 0;};
  w.fetch=async url=>({ok:true,status:200,json:async()=>url.endsWith('/me')?{account:{full_name:'Andrea QA',currency:'COP',timezone:'America/Bogota'}}:url.endsWith('/relationships')?{relationships:[]}:{cards:[],purchased_gifts:[],pending_invitations:1}});
  w.QoriFinance={render(){renders++;},openSale(){}};
  w.QoriInvitations={render(page,ctx){contexts.push(ctx);}};
  load(w,'customer-web/wallet-model.js');load(w,'customer-web/app.js');await settle(()=>renders===1);
  await sync();assert.equal(renders,2);
  w.location.hash='invitations';await settle(()=>contexts.length>0);await sync();
  assert.equal(typeof contexts.at(-1).openSale,'function');
 }finally{w.close();}
});
test('financial overview renders the backend summary and chart actions lead to its history',async()=>{
 const {w,ctx,page,errors}=setup();try{
  load(w,'customer-web/finance.js');await w.QoriFinance.render(page,ctx,'finances');assert.deepEqual(errors,[]);
  assert.match(page.querySelector('.finance-hero').textContent,/17.000/);assert.equal(page.querySelectorAll('[data-category]').length,2);
  assert.match(page.textContent,/Desde Qori Empresa/);assert.equal(page.querySelectorAll('[data-movement]').length,2);
  page.querySelector('[data-day]').click();assert.equal(w.location.hash,'#history');
 }finally{w.close();}
});
test('history filters preserve real source and CSV safely exports text without formula execution',async()=>{
 const s=setup(),{w,ctx,page}=s;try{
  load(w,'customer-web/finance.js');await w.QoriFinance.render(page,ctx,'history');assert.equal(page.querySelectorAll('[data-movement]').length,2);
  const f=page.querySelector('#movementFilters');f.elements.source.value='QORI';f.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(page.querySelectorAll('[data-movement]').length,1);assert.match(page.querySelector('#movementList').textContent,/Café Qori/);
  const output=w.QoriFinance.csv([{...rows[0],merchant:'=HYPERLINK("bad")'}]);assert.match(output,/"'=HYPERLINK/);assert.match(output,/12000.00/);
  await w.QoriFinance.openSale('sale-1',ctx);assert.match(w.document.querySelector('dialog').textContent,/Compra de Qori Empresa/);assert.equal(w.document.querySelector('[name=amount]'),null);
 }finally{w.close();}
});
test('manual capture sends products, categories and a stable identity without overwriting the total category',async()=>{
 const {w,ctx,calls,errors}=setup();try{
  load(w,'customer-web/finance.js');w.QoriFinance.editEntry(ctx);
  const f=w.document.querySelector('#expenseForm');f.elements.merchant.value='Tienda';f.elements.amount.value='15000';f.querySelector('[name=category]').value='supermercado';
  w.document.querySelector('#addExpenseProduct').click();f.querySelector('[name=p_name]').value='Pan';f.querySelector('[name=p_quantity]').value='2';f.querySelector('[name=p_amount]').value='15000';
  w.document.querySelector('#addExpenseSplit').click();f.querySelector('#expenseSplits select').value='alimentacion';f.querySelector('[name=s_amount]').value='15000';
  await f.onsubmit({preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button.primary')});
  assert.deepEqual(errors,[]);const sent=calls.find(c=>c.url==='/entries').body;assert.equal(sent.category,'supermercado');assert.equal(sent.amount,'15000');assert.equal(sent.products[0].quantity,2);assert.equal(sent.splits[0].category,'alimentacion');assert.match(sent.request_id,/^[a-f0-9-]{36}$/);
 }finally{w.close();}
});
test('recurring payments require an explicit paid date and preserve the due date for idempotency',async()=>{
 const {w,ctx,page,calls,errors}=setup();try{
  load(w,'customer-web/finance.js');await w.QoriFinance.render(page,ctx,'planning');assert.equal(calls.some(c=>c.url.endsWith('/record')),false);
  page.querySelector('[data-record]').click();const f=w.document.querySelector('dialog form');f.elements.paid_on.value='2026-11-03';
  await f.onsubmit({preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button')});
  assert.deepEqual(errors,[]);const sent=calls.find(c=>c.url.endsWith('/record')).body;assert.equal(sent.expected_date,'2026-11-03');assert.equal(sent.paid_on,'2026-11-03');assert.equal(sent.confirmed,true);
 }finally{w.close();}
});
test('Empresa sends the selected original sale to the verified Customer account and reports acceptance status',async()=>{
 const {w}=setup(),calls=[];let sent=false;
 w.authHeaders=()=>({});w.api=async(url,options)=>{
  const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
  if(url.endsWith('/lookup'))return {buyer:{public_id:'customer-qa',full_name:'Andrea Customer'}};
  if(url.endsWith('/sale-deliveries')&&options.method==='POST'){sent=true;return {invitation:{state:'PENDING'}};}
  return {sales:[{id:'original-sale',product_name:'Café',customer_name:'Andrea',sale_amount:'12000',currency:'COP',sale_status:'PAID',created_at:'2026-11-03',delivery_state:sent?'PENDING':null,recipient_name:'Andrea Customer'}],next_offset:null};
 };
 try{
  load(w,'empresa/js/customer-finance.js');w.QoriCustomerFinance.open();await settle(()=>w.document.querySelector('[data-select-sale]'));
  w.document.querySelector('[data-select-sale]').click();const search=w.document.querySelector('#findFinanceBuyer');search.elements.query.value='andrea@example.test';
  await search.onsubmit({preventDefault(){},stopPropagation(){},target:search,submitter:search.querySelector('button')});
  const form=w.document.querySelector('#sendFinanceSale');form.elements.identity.checked=true;
  await form.onsubmit({preventDefault(){},stopPropagation(){},target:form,submitter:form.querySelector('button')});
  const payload=calls.find(c=>c.body?.sale_id).body;assert.equal(payload.sale_id,'original-sale');assert.equal(payload.public_id,'customer-qa');assert.equal(payload.identity_checked,true);assert.equal(payload.amount,undefined);
  assert.match(w.document.querySelector('#deliveryMessage').textContent,/podrá revisarla/);assert.match(w.document.querySelector('#deliverySales').textContent,/Por aceptar/);
 }finally{w.close();}
});

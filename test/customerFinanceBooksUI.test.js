const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const load=(w,file)=>w.eval(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
const personal={id:'11111111-1111-4111-8111-111111111111',name:'Personal',currency:'COP',is_default:true,opening_amount:null,opening_date:null,revision:1};
const cattle={id:'22222222-2222-4222-8222-222222222222',name:'Ganado <privado>',currency:'COP',opening_amount:'5000',opening_date:'2026-11-01',revision:2};
const account={id:'account-1',full_name:'Andrea',currency:'COP',timezone:'America/Bogota'};
test('negative and incomplete forecasts stay explicit and onboarding reflects all three prerequisites',async()=>{
 const w=new JSDOM('<main id="page"></main>',{url:'https://gosqori.com/customer/',runScripts:'outside-only'}).window;
 try{
  load(w,'customer-web/accounting.js');const page=w.document.querySelector('main'),data={...summary(cattle),setup:{income_count:1,expense_count:1},projected_remaining_minor:-50000,grocery:{lists:1,estimated_minor:10000,unknown_prices:2}};
  const ctx={account,book:cattle,books:[cattle],request:async()=>data,refresh(){},showError(e){throw Error(e);}};
  await w.QoriAccounting.render(page,ctx);assert.ok(page.querySelector('.money-forecast.is-negative'));assert.match(page.querySelector('.money-forecast').textContent,/Estimación parcial/);assert.match(page.querySelector('.money-projection-warning').textContent,/2 artículos/);assert.match(page.querySelector('.money-forecast-value').textContent,/-/);assert.equal(page.querySelector('.money-start').open,false);assert.match(page.querySelector('.money-start').textContent,/3 de 3 pasos/);
 }finally{w.close();}
});
test('home offers an eventual plan, keeps unknown cash neutral and highlights only estimates',async()=>{
 const {w,calls}=setup();try{
  await settle(()=>w.document.querySelector('#bookEventual'));const forecast=w.document.querySelector('.money-forecast');
  assert.ok(forecast.classList.contains('is-unknown'));assert.match(forecast.textContent,/Por definir/);assert.match(forecast.textContent,/no dinero garantizado/);
  w.document.querySelector('#bookEventual').click();const f=w.document.querySelector('dialog form');assert.equal(f.elements.frequency.value,'once');assert.equal(f.elements.kind.value,'EXPENSE');assert.equal(calls.filter(c=>c.method==='POST').length,0);
  w.document.querySelector('dialog').close();
  const select=w.document.querySelector('[name=activeBook]');select.value=cattle.id;select.dispatchEvent(new w.Event('change'));
  await settle(()=>w.document.querySelector('.money-forecast.is-positive'));
  assert.match(w.document.querySelector('.money-forecast-value').textContent,/5.150/);
  assert.equal(w.document.querySelectorAll('.book-stats .money-income').length,1);assert.equal(w.document.querySelectorAll('.book-stats .money-expense').length,3);
 }finally{w.close();}
});
const summary=book=>({book,currency:'COP',today:'2026-11-04',from:'2026-11-01',to:'2026-11-30',balance_minor:book.opening_amount==null?null:500000,income_minor:70000,spent_minor:30000,pending_minor:20000,essential_minor:20000,expected_income_minor:40000,planned_minor:5000,projected_expenses_minor:55000,available_after_commitments_minor:book.opening_amount==null?null:480000,projected_remaining_minor:book.opening_amount==null?null:515000,commitments:[],movements:[],transfers:[]});
const settle=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<div id="app"></div><p id="announcement"></p>',{url:'http://localhost/customer/',runScripts:'outside-only'}).window,calls=[];
 w.setInterval=()=>0;w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.remove();};
 w.fetch=async(url,o)=>{calls.push({url,...o});const book=o.headers['X-Qori-Book']===cattle.id?cattle:personal;
  return {ok:true,status:200,json:async()=>url.endsWith('/me')?{account}:url.endsWith('/finance-books')?{books:[personal,cattle]}:url.endsWith('/finance-home')?summary(book):url.endsWith('/relationships')?{relationships:[]}:url.endsWith('/recurring')?{recurring:{id:'rule'}}:url.endsWith('/entries')?{entry:{id:'entry'}}:{cards:[],purchased_gifts:[],pending_invitations:0}};
 };
 for(const file of ['wallet-model.js','accounting.js','finance.js','payments.js','app.js'])load(w,'customer-web/'+file);
 return {w,calls};
}
test('default home is financial, unknown cash requires setup, book switching keeps expense and income forms scoped',async()=>{
 const {w,calls}=setup();try{
  await settle(()=>w.document.querySelector('#bookExpense'));
  assert.equal(w.document.querySelector('nav [aria-current]').getAttribute('href'),'#home');assert.ok(w.document.querySelector('.book-onboarding'));
  assert.match(w.document.querySelector('.book-balance').textContent,/Por definir/);
  const selector=w.document.querySelector('[name=activeBook]');selector.value=cattle.id;selector.dispatchEvent(new w.Event('change'));
  await settle(()=>w.document.querySelector('#bookExpense')&&w.document.querySelector('.book-heading').textContent.includes('Ganado'));
  assert.equal(w.document.querySelector('privado'),null);assert.equal(w.document.querySelector('.book-onboarding').open,true);assert.match(w.document.querySelector('.book-onboarding').textContent,/1 de 3 pasos/);
  assert.match(w.document.querySelector('.book-balance').textContent,/5.000/);assert.equal(w.localStorage.getItem('qori-book:account-1'),cattle.id);
  w.document.querySelector('#bookIncome').click();let f=w.document.querySelector('#expenseForm');
  assert.equal(f.elements.kind.value,'INCOME');assert.match(f.textContent,/Ganado <privado>/);
  f.elements.merchant.value='Venta de ganado';f.elements.amount.value='100';const oldPage=w.document.querySelector('#page');
  f.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:f.querySelector('button.primary')}));
  await settle(()=>calls.some(c=>c.url.endsWith('/entries')));
  const sent=calls.find(c=>c.url.endsWith('/entries'));assert.equal(sent.headers['X-Qori-Book'],cattle.id);assert.equal(JSON.parse(sent.body).kind,'INCOME');
  await settle(()=>w.document.querySelector('#page')!==oldPage&&w.document.querySelector('#expectedIncome'));
  w.document.querySelector('#expectedIncome').click();f=w.document.querySelector('dialog form');
  assert.equal(f.elements.kind.value,'INCOME');assert.equal(f.elements.priority.value,'ESSENTIAL');assert.match(f.textContent,/Ganado/);
 }finally{w.close();}
});
test('opening setup requires an explicit dated balance and preserves the revision on save',async()=>{
 const {w,calls}=setup();try{
  await settle(()=>w.document.querySelector('#setupBalance'));w.document.querySelector('#setupBalance').click();
  const f=w.document.querySelector('dialog form');assert.equal(f.elements.opening_amount.value,'');assert.ok(f.elements.opening_date.required);
  assert.match(f.textContent,/antes de los movimientos de ese día/);f.elements.opening_amount.value='0';const oldPage=w.document.querySelector('#page');
  f.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:f.querySelector('button.primary')}));
  await settle(()=>calls.some(c=>c.method==='PUT'));
  const saved=JSON.parse(calls.find(c=>c.method==='PUT').body);assert.equal(saved.opening_amount,'0');assert.equal(saved.revision,1);
  await settle(()=>w.document.querySelector('#page')!==oldPage&&w.document.querySelector('#bookExpense'));
 }finally{w.close();}
});
test('new book form and transfers distinguish a cash transfer from expense capture',async()=>{
 const {w,calls}=setup();try{
  await settle(()=>w.document.querySelector('#addBook'));w.document.querySelector('#addBook').click();
  let f=w.document.querySelector('dialog form');assert.equal(f.elements.name.value,'');assert.match(f.textContent,/Moneda/);w.document.querySelector('dialog').close();
  w.document.querySelector('#bookTransfer').click();f=w.document.querySelector('dialog form');
  assert.equal(f.elements.from_book_id.value,personal.id);assert.equal(f.elements.to_book_id.value,cattle.id);
  f.elements.amount.value='20';f.querySelector('[type=checkbox]').checked=true;const oldPage=w.document.querySelector('#page');
  f.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:f.querySelector('button.primary')}));
  await settle(()=>calls.some(c=>c.url.endsWith('/finance-transfers')));
  assert.equal(calls.some(c=>c.url.endsWith('/entries')),false);
  const body=JSON.parse(calls.find(c=>c.url.endsWith('/finance-transfers')).body);assert.equal(body.confirmed,true);assert.equal(body.amount,'20');
  await settle(()=>w.document.querySelector('#page')!==oldPage&&w.document.querySelector('#bookExpense'));
 }finally{w.close();}
});

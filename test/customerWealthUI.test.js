
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const settle=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main id="page"></main>',{url:'https://gosqori.com/customer/#wealth',runScripts:'outside-only'}).window;
 w.HTMLDialogElement.prototype.close=function(){this.remove();};
 w.eval(fs.readFileSync(path.join(__dirname,'../customer-web/wealth.js'),'utf8'));
 const book={id:'b',name:'Casa',currency:'COP'},calls=[],ctx={book,books:[book],account:{currency:'COP',timezone:'America/Bogota'},refresh:async()=>{},showError:(m,e)=>{if(e)e.textContent=m;},request:async(u,b,m)=>{calls.push({u,b,m});return {};},dialog:(t,h)=>{const d=w.document.createElement('dialog');d.innerHTML='<header>'+t+'</header><div>'+h+'</div>';w.document.body.append(d);return d;}};
 return {w,ctx,calls,page:w.document.querySelector('main')};
}
test('negative net worth is red, missing totals are incomplete and currency totals remain independent',async()=>{
 const {w,ctx,page}=setup();try{
  const book={...ctx.book,cash_minor:-10000,non_cash_minor:50000,assets_minor:50000,liabilities_minor:80000,net_worth_minor:-30000,debt_minor:70000,debt_charges_minor:0,pending_sales_minor:0,items:[],debts:[]};
  ctx.request=async()=>({as_of:'2026-11-04',books:[book],currencies:[{...book,missing_books:[]},{currency:'USD',assets_minor:null,liabilities_minor:0,net_worth_minor:null,cash_minor:null,known_cash_minor:0,missing_books:['Dólares <privado>']}]});
  await w.QoriWealth.render(page,ctx);
  assert.equal(page.querySelectorAll('.wealth-totals .wealth-total').length,2);
  assert.ok(page.querySelector('.wealth-number.money-expense'));assert.match(page.textContent,/pasivos registrados superan/);
  assert.match(page.textContent,/Completa el saldo de: Dólares <privado>/);assert.equal(page.querySelector('privado'),null);
  assert.match(page.textContent,/Los bienes no son efectivo/);
 }finally{w.close();}
});
test('asset form sends a valuation, not a cash movement, and retries use one identity',async()=>{
 const {w,ctx,calls}=setup();try{
  let fail=true;ctx.request=async(u,b,m)=>{calls.push({u,b,m});if(fail)throw Error('Sin conexión');return {};};
  w.QoriWealth.edit(ctx);const f=w.document.querySelector('form');
  f.elements.name.value='Mi parte de la casa';f.elements.amount.value='200000';f.elements.valued_on.value='2026-11-01';
  const submit=()=>f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('button')}));
  submit();await settle(()=>f.querySelector('[role=alert]').textContent);fail=false;submit();await settle(()=>calls.length===2);
  assert.equal(calls[0].u,'/wealth/items');assert.equal(calls[0].b.kind,'ASSET');assert.equal(calls[1].b.request_id,calls[0].b.request_id);assert.equal(calls[0].b.amount,'200000');assert.ok(calls.every(c=>c.u!=='/entries'));
 }finally{w.close();}
});
test('cashflow communicates signed results, daily closing balances and a partial month',()=>{
 const {w,page}=setup();try{
  const data={from:'2026-11-03',to:'2026-11-04',partial_month:true,opening_minor:10000,income_minor:1000,expense_minor:15000,net_minor:-14000,transfers_in_minor:2000,transfers_out_minor:0,closing_minor:-2000,days:[{date:'2026-11-04',income_minor:1000,expense_minor:15000,transfer_minor:2000,balance_minor:-2000}]};
  page.innerHTML=w.QoriWealth.flow(data,'COP');assert.doesNotMatch(page.textContent,/mitad de mes|2026-11-/);assert.match(page.querySelector('.finance-section-head p').textContent,/Noviembre de 2026/);assert.match(page.textContent,/Saldo de partidaAl 3 de noviembre/);assert.match(page.querySelector('caption').textContent,/Movimientos desde el 3 de noviembre/);assert.match(page.querySelector('.wealth-result span').textContent,/Saldo al 4 de noviembre/);assert.ok(page.querySelector('.wealth-result.money-expense'));assert.equal(page.querySelectorAll('tbody tr').length,1);assert.match(page.querySelector('tbody td:last-child').textContent,/-.*20/);
 }finally{w.close();}
});
test('patrimony loading failure offers a retry without displaying invented zero values',async()=>{
 const {w,ctx,page}=setup();try{ctx.request=async()=>{throw Error('Sin conexión');};await w.QoriWealth.mount(page,ctx);assert.match(page.textContent,/No pudimos calcular/);assert.equal(page.querySelector('.wealth-number'),null);assert.equal(page.querySelector('button').textContent,'Reintentar');}finally{w.close();}
});

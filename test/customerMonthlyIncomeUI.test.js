const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const settle=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main id="page"></main>',{url:'https://gosqori.com/customer/#income',runScripts:'outside-only'}).window;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.close=function(){this.remove();};
 for(const file of ['payments.js','income.js'])w.eval(fs.readFileSync(path.join(__dirname,'../customer-web',file),'utf8'));
 const calls=[],book={id:'book',name:'Casa <privada>',currency:'COP'};
 const item={id:'receipt',recurring_id:'salary',name:'Salario <img src=x>',kind:'INCOME',currency:'COP',frequency:'month',due_date:'2026-11-05',scheduled_date:'2026-11-05',estimated_amount:'300',billed_amount:null,actual_amount:null,status:'PENDING',revision:1,active:true,note:''};
 const data={book,today:'2026-11-04',year:2026,currency:'COP',current:{month:'2026-11',monthly_declared_minor:30000,monthly_sources:1,received_minor:0,pending_minor:30000,overdue_minor:0},rules:[{id:'salary',name:'Salario',amount:'300',currency:'COP',frequency:'month',kind:'INCOME',active:true,anchor_date:'2026-01-05',next_date:'2026-01-05',remind_days:3,reminders_enabled:true}],items:[item],months:[{month:'2026-01',from:'2026-01-01',closed:true,opening_minor:10000,income_minor:10000,expense_minor:30000,net_minor:-20000,transfers_in_minor:0,transfers_out_minor:0,closing_minor:-10000},{month:'2026-02',from:'2026-02-01',closed:true,opening_minor:-10000,income_minor:5000,expense_minor:0,net_minor:5000,transfers_in_minor:0,transfers_out_minor:0,closing_minor:-5000}],insights:{sample_months:['2026-01','2026-02'],average_income_minor:7500,average_expense_minor:15000,average_result_minor:-7500,deficit_months:['2026-01'],negative_balance_months:['2026-01','2026-02']}};
 const ctx={book,account:{id:'a',timezone:'America/Bogota',currency:'COP'},request:async(u,b,m)=>{calls.push({u,b,m});return u.startsWith('/income-months')?data:{};},refresh:async()=>{},showError:(m,e)=>{if(e)e.textContent=m;},dialog:(t,h)=>{w.document.querySelector('dialog')?.remove();const d=w.document.createElement('dialog');d.innerHTML='<h2>'+t+'</h2><div class="dialog-body">'+h+'<p id="dialogError"></p></div>';w.document.body.append(d);return d;}};
 return {w,ctx,calls,data,page:w.document.querySelector('main')};
}
test('salary and rent declaration states its motive and interval without claiming it is received',async()=>{
 const {w,ctx,calls}=setup();try{
  w.QoriPayments.ruleForm(ctx,async()=>{},null,'INCOME','month');const f=w.document.querySelector('form');
  assert.match(f.textContent,/Motivo del ingreso/);assert.match(f.textContent,/no aumenta tu saldo/);assert.equal(f.elements.priority.closest('label').hidden,true);assert.equal(f.elements.category.closest('label').hidden,true);
  f.querySelector('[data-income-example="1"]').click();assert.equal(f.elements.name.value,'Arriendo de propiedad');assert.equal(f.elements.frequency.value,'month');assert.equal(f.elements.kind.value,'INCOME');
  f.elements.amount.value='450';f.elements.next_date.value='2026-11-05';
  await f.onsubmit({preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button.primary')});
  assert.equal(calls[0].u,'/recurring');assert.equal(calls[0].b.amount,'450');assert.equal(calls[0].b.kind,'INCOME');assert.ok(calls[0].b.request_id);assert.equal(calls.some(c=>c.u==='/entries'),false);
 }finally{w.close();}
});
test('income screen distinguishes declared and received money and renders negative monthly balances safely',async()=>{
 const {w,ctx,calls,page}=setup();try{
  await w.QoriIncome.render(page,ctx);assert.equal(page.querySelector('img'),null);assert.match(page.textContent,/Casa <privada>/);
  assert.match(page.querySelector('.income-declaration').textContent,/300/);assert.match(page.querySelector('.income-metrics').textContent,/Recibido durante/);
  const rows=page.querySelectorAll('tbody tr');assert.equal(rows.length,2);assert.ok(rows[0].querySelector('td:last-child').classList.contains('income-negative'));assert.ok(rows[1].querySelector('td:nth-child(5)').classList.contains('income-positive'));assert.ok(rows[1].querySelector('td:last-child').classList.contains('income-negative'));
  assert.match(page.textContent,/2 terminaron con saldo negativo/);assert.equal(calls.filter(c=>c.b).length,0);
  page.querySelector('[data-income-pay=PAY]').click();const f=w.document.querySelector('dialog form');assert.match(f.textContent,/Fecha real de recepción/);assert.match(w.document.querySelector('dialog h2').textContent,/ingreso recibido/);
  f.elements.amount.value='290';f.elements.paid_on.value='2026-11-04';
  await f.onsubmit({preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button.primary')});
  assert.equal(calls.find(c=>c.b).u,'/payment-agenda/receipt/payment');assert.equal(calls.find(c=>c.b).b.amount,'290');assert.equal(calls.find(c=>c.b).b.action,'PAY');
 }finally{w.close();}
});
test('year filter requests the selected historical year and absence of opening balance stays explicit',async()=>{
 const {w,ctx,calls,data,page}=setup();try{
  data.months[0].closing_minor=null;data.months[0].opening_minor=null;data.insights.sample_months=[];
  await w.QoriIncome.render(page,ctx);assert.match(page.querySelector('tbody').textContent,/Por definir/);assert.match(page.textContent,/Aún no hay meses completos/);
  const f=page.querySelector('#incomeYear');f.elements.year.value='2025';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle(()=>calls.some(c=>c.u==='/income-months?year=2025'));
 }finally{w.close();}
});
test('income source retry preserves identity and correcting a receipt uses income-specific wording',async()=>{
 const {w,ctx,calls}=setup();try{
  ctx.request=async(u,b,m)=>{calls.push({u,b,m});throw Error('Sin conexión');};
  w.QoriPayments.ruleForm(ctx,async()=>{},null,'INCOME','month');let f=w.document.querySelector('form');f.elements.name.value='Salario';f.elements.amount.value='500';
  const submit=()=>f.onsubmit({preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button.primary')});
  await submit();await submit();assert.equal(calls[0].b.request_id,calls[1].b.request_id);
  w.QoriPayments.pay(ctx,async()=>{},{id:'x',kind:'INCOME',name:'Salario',due_date:'2026-11-01',status:'PAID'},'REOPEN');
  assert.match(w.document.querySelector('dialog').textContent,/ingreso dejará de sumar/);assert.doesNotMatch(w.document.querySelector('dialog').textContent,/sumar en tus gastos/);
 }finally{w.close();}
});

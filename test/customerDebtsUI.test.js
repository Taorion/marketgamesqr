const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const settle=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main id="page"></main>',{url:'http://localhost/customer/#debts',runScripts:'outside-only'}).window,calls=[];
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.close=function(){this.remove();};
 for(const f of ['debt-math.js','debts.js'])w.eval(fs.readFileSync(path.join(__dirname,'../customer-web',f),'utf8'));
 const debt={id:'11111111-1111-4111-8111-111111111111',name:'Vehículo <seguro>',lender:'Entidad',principal:'1000',rate_percent:12,rate_type:'NAMV',months:12,installment:'88.85',monthly_fee:'10',as_of:'2026-01-01',next_due:'2026-11-05',revision:1,status:'ACTIVE',projection_mode:'AUTO',currency:'COP'};
 debt.plan=w.QoriDebtMath.compare(debt).baseline;
 const ctx={account:{id:'buyer',timezone:'America/Bogota'},book:{id:'book',name:'Ganado',currency:'COP'},refresh:async()=>{},showError:(m,n)=>{if(n)n.textContent=m;},
 dialog:(title,html)=>{const d=w.document.createElement('dialog');d.innerHTML='<header>'+title+'</header><div class="dialog-body">'+html+'<p id="dialogError"></p></div>';w.document.body.append(d);return d;},
 request:async(url,body,method)=>{calls.push({url,body,method});if(url==='/debts/scenarios')return {scenarios:[]};if(url==='/finance-home')return {balance_minor:200000};if(url.endsWith('/candidates'))return {entries:[{id:'existing',date:'2026-11-04',merchant:'Pago de cuota',amount:'98.85'}]};if(url==='/debts/'+debt.id)return {debt,plan:debt.plan,payments:[],events:[]};return {debts:[debt]};}};
 return {w,ctx,calls,debt,page:w.document.querySelector('#page')};
}
test('debt list exposes meaningful actions and escapes creditor labels',async()=>{
 const {w,ctx,calls,page}=setup();try{
  await w.QoriDebts.render(page,ctx);assert.match(page.textContent,/Mis deudas, con un plan/);assert.match(page.textContent,/Ganado/);assert.equal(page.querySelector('seguro'),null);
  page.querySelector('#newDebt').click();const f=w.document.querySelector('form');
  assert.equal(f.elements.rate_type.options.length,3);assert.equal(f.elements.projection_mode.options.length,2);assert.match(f.textContent,/no crea un ingreso ni un gasto/);
  f.elements.name.value='Mi préstamo';f.elements.principal.value='1000';f.elements.months.value='12';f.elements.rate_percent.value='24';
  f.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:f.querySelector('button.primary')}));
  await settle(()=>calls.some(c=>c.url==='/debts'&&c.body));const sent=calls.find(c=>c.body);
  assert.equal(sent.body.rate_percent,24);assert.equal(sent.body.installment,null);assert.equal(sent.body.months,12);
 }finally{w.close();}
});
test('calculator changes four scenarios locally, exports table selection and clears invalid results',async()=>{
 const {w,ctx,calls,page}=setup();try{
  await w.QoriDebts.render(page,ctx,'debt-simulator');const f=page.querySelector('form');
  assert.equal(page.querySelectorAll('.debt-scenario').length,0);
  page.querySelector('#debtExample').click();assert.equal(page.querySelectorAll('.debt-scenario').length,4);assert.ok(page.querySelector('svg[role=img]'));
  const initial=page.querySelector('.shorter>strong').textContent;page.querySelector('[data-percent="50"]').click();assert.equal(f.elements.lump_sum.value,'5000000.00');assert.notEqual(page.querySelector('.shorter>strong').textContent,initial);
  page.querySelector('[data-percent="100"]').click();assert.match(page.querySelector('#debtSchedule').textContent,/No quedan cuotas/);
  assert.equal(calls.filter(c=>c.body).length,0);
  f.elements.lump_sum.value='10000001';f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true}));assert.equal(page.querySelectorAll('.debt-scenario').length,0);assert.match(page.querySelector('#debtSimError').textContent,/superar/);
  f.elements.lump_sum.value='0';f.elements.rate_percent.value='';f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true}));assert.match(page.querySelector('#debtSimError').textContent,/Indica la tasa/);
 }finally{w.close();}
});
test('saving a scenario is explicit and never records an actual payment',async()=>{
 const {w,ctx,calls,page}=setup();try{
  await w.QoriDebts.render(page,ctx,'debt-simulator');page.querySelector('#debtExample').click();page.querySelector('#debtSaveScenario').click();
  const f=w.document.querySelector('dialog form');assert.match(f.textContent,/No registra un pago/);f.elements.name.value='Mi prima';
  f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('button.primary')}));
  await settle(()=>calls.some(c=>c.body));const sent=calls.find(c=>c.body);assert.equal(sent.url,'/debts/scenarios');assert.equal(sent.body.name,'Mi prima');assert.equal(sent.body.input.lump_sum,'2000000');
  assert.equal(calls.some(c=>/payments/.test(c.url)),false);
 }finally{w.close();}
});
test('real payment asks for receipt breakdown and can reuse an existing expense',async()=>{
 const {w,ctx,calls,debt}=setup();try{
  await w.QoriDebts.pay(ctx,debt.id);const f=w.document.querySelector('dialog form');
  assert.equal(f.elements.principal_paid.value,'78.85');assert.equal(f.elements.interest_paid.value,'10.00');assert.equal(f.elements.fees_paid.value,'10');
  assert.ok(f.querySelector('[type=checkbox]').required);assert.equal(f.elements.entry_id.options.length,2);
  f.elements.entry_id.value='existing';f.elements.entry_id.dispatchEvent(new w.Event('change'));assert.equal(f.elements.paid_on.value,'2026-11-04');
  f.querySelector('[type=checkbox]').checked=true;f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('button.primary')}));
  await settle(()=>calls.some(c=>c.body));const sent=calls.find(c=>c.body);assert.equal(sent.body.entry_id,'existing');assert.equal(sent.body.confirmed,true);assert.equal(sent.body.revision,1);
 }finally{w.close();}
});
test('main application routes reach debts and simulator while retaining book context',async()=>{
 const w=new JSDOM('<div id="app"></div><p id="announcement"></p>',{url:'http://localhost/customer/#debt-simulator',runScripts:'outside-only'}).window;try{
  w.setInterval=()=>0;w.HTMLDialogElement.prototype.showModal=function(){};
  const rendered=[];w.QoriAccounting={selector:()=>{}};w.QoriDebts={render:(_page,ctx,route)=>rendered.push({ctx,route})};
  w.fetch=async url=>({ok:true,status:200,json:async()=>url.endsWith('/me')?{account:{id:'a',full_name:'Buyer',currency:'COP'}}:url.endsWith('/finance-books')?{books:[{id:'book',currency:'COP',name:'Personal',is_default:true}]}:{cards:[],relationships:[]}});
  w.eval(fs.readFileSync(path.join(__dirname,'../customer-web/app.js'),'utf8'));
  await settle(()=>rendered.length);assert.equal(rendered[0].route,'debt-simulator');assert.equal(rendered[0].ctx.book.id,'book');assert.match(w.document.querySelector('nav').textContent,/Mis finanzas/);
 }finally{w.close();}
});

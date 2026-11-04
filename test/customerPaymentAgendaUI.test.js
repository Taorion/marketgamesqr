const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const source=fs.readFileSync(path.join(__dirname,'../customer-web/payments.js'),'utf8');
const item={id:'item-1',recurring_id:'rule-1',name:'Energía <QA>',kind:'EXPENSE',category:'servicios',currency:'COP',scheduled_date:'2026-11-15',due_date:'2026-11-15',estimated_amount:'120000',billed_amount:null,actual_amount:null,paid_on:null,status:'PENDING',revision:1,remind_days:3,reminders_enabled:true,note:''};
async function settle(check){for(let i=0;i<80;i++){if(check())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');}
function setup(){
 const dom=new JSDOM('<main id="page"></main>',{url:'https://gosqori.com/customer/#payments',runScripts:'outside-only'}),w=dom.window,calls=[],errors=[];
 const data={month:'2026-11',currency:'COP',today:'2026-11-03',summary:{estimated_minor:12000000,paid_minor:0,pending_minor:12000000,overdue_minor:0},items:[{...item}],reminders:[],rules:[{id:'rule-1',name:'Energía QA',amount:'120000',currency:'COP',frequency:'month',active:true,remind_days:3,reminders_enabled:true}]};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.remove();};
 const ctx={account:{id:'buyer-1',timezone:'America/Bogota',currency:'COP'},showError:(e)=>errors.push(e),dialog(title,html){w.document.querySelector('dialog')?.remove();const d=w.document.createElement('dialog');d.innerHTML='<h2>'+title+'</h2><div class="dialog-body">'+html+'<p id="dialogError"></p></div>';w.document.body.append(d);d.showModal();return d;},
  request:async(url,body,method)=>{calls.push({url,body,method});if(url==='/payment-agenda/push')return {configured:false,subscriptions:[]};if(url.startsWith('/payment-agenda?'))return data;return {ok:true};}};
 w.eval(source);return {w,ctx,calls,errors,data,page:w.document.querySelector('main')};
}
async function submit(w){const f=w.document.querySelector('dialog form');await f.onsubmit({preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button.primary')});}
test('monthly agenda displays estimate, invoice, due date and payment separately and does not post expenses on load',async()=>{
 const {w,ctx,calls,page}=setup();try{await w.QoriPayments.render(page,ctx);assert.match(page.textContent,/120.000/);assert.match(page.textContent,/2026-11-15/);assert.match(page.textContent,/Por confirmar/);assert.equal(page.querySelector('QA'),null);assert.equal(calls.some(c=>c.body),false);assert.ok(page.querySelector('#paymentsCsv'));assert.ok(page.querySelector('#paymentsCalendar'));}finally{w.close();}
});
test('record payment sends the final amount and actual date for the selected monthly occurrence',async()=>{
 const {w,ctx,calls,page,errors}=setup();try{await w.QoriPayments.render(page,ctx);page.querySelector('[data-pay=PAY]').click();const f=w.document.querySelector('dialog form');f.elements.amount.value='128500';f.elements.paid_on.value='2026-11-02';f.elements.confirmed.checked=true;await submit(w);
  const sent=calls.find(c=>c.url.endsWith('/payment'));assert.equal(sent.url,'/payment-agenda/item-1/payment');assert.equal(sent.body.amount,'128500');assert.equal(sent.body.paid_on,'2026-11-02');assert.equal(sent.body.confirmed,true);assert.equal(sent.body.revision,1);assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('editing a bill preserves its original estimate and only changes this occurrence',async()=>{
 const {w,ctx,calls,page}=setup();try{await w.QoriPayments.render(page,ctx);page.querySelector('[data-bill]').click();const f=w.document.querySelector('dialog form');f.elements.billed_amount.value='125000';f.elements.due_date.value='2026-11-20';f.elements.note.value='Factura recibida';await submit(w);const sent=calls.find(c=>c.method==='PUT');assert.equal(sent.url,'/payment-agenda/item-1');assert.equal(sent.body.estimated_amount,undefined);assert.equal(sent.body.billed_amount,'125000');assert.equal(sent.body.due_date,'2026-11-20');}finally{w.close();}
});
test('a new recurring obligation records its first due date, estimate and reminder preference',async()=>{
 const {w,ctx,calls,page}=setup();try{await w.QoriPayments.render(page,ctx);page.querySelector('#newObligation').click();const f=w.document.querySelector('dialog form');f.elements.name.value='Arriendo';f.elements.amount.value='1000000';f.elements.next_date.value='2026-11-05';f.elements.remind_days.value='5';f.elements.reminders_enabled.checked=false;await submit(w);const sent=calls.find(c=>c.url==='/recurring');assert.equal(sent.body.frequency,'month');assert.equal(sent.body.remind_days,5);assert.equal(sent.body.reminders_enabled,false);assert.equal(sent.body.next_date,'2026-11-05');}finally{w.close();}
});
test('paid obligations allow correction, retain history and export safe spreadsheets and calendar events',async()=>{
 const {w,ctx,page,data}=setup();try{Object.assign(data.items[0],{status:'PAID',actual_amount:'128500',paid_on:'2026-11-02',revision:2});await w.QoriPayments.render(page,ctx);assert.ok(page.querySelector('[data-pay=CORRECT]'));assert.equal(page.querySelector('[data-pay=PAY]'),null);assert.match(page.textContent,/8.500/);
  const csv=w.QoriPayments.csv([{...item,name:'=FORMULA()',status:'PAID',actual_amount:'128500',paid_on:'2026-11-02'}],data.today);assert.match(csv,/"'=FORMULA/);assert.match(csv,/8500.00/);
  const ics=w.QoriPayments.calendar([item,data.items[0]]);assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,1);assert.match(ics,/DTSTART;VALUE=DATE:20261115/);assert.match(ics,/TRIGGER:-P3D/);
 }finally{w.close();}
});
test('notification permission is requested only from the enable button',async()=>{
 const {w,ctx,page,calls}=setup();let permissions=0;try{
  const sub={endpoint:'https://fcm.googleapis.com/qa',toJSON(){return {endpoint:this.endpoint,keys:{}};}};
  w.Notification={requestPermission:async()=>{permissions++;return 'granted';}};w.PushManager=function(){};
  Object.defineProperty(w.navigator,'serviceWorker',{value:{ready:Promise.resolve({pushManager:{getSubscription:async()=>null,subscribe:async()=>sub}})}});
  const original=ctx.request;ctx.request=async(url,body,method)=>url==='/payment-agenda/push'&&!body?{configured:true,public_key:Buffer.alloc(65,1).toString('base64url'),subscriptions:[]}:original(url,body,method);
  await w.QoriPayments.render(page,ctx);await settle(()=>page.querySelector('#paymentPushToggle'));assert.equal(permissions,0);
  page.querySelector('#paymentPushToggle').click();await settle(()=>calls.some(c=>c.body?.subscription));assert.equal(permissions,1);
 }finally{w.close();}
});
test('service worker suppresses other-account, settled and signed-out reminders',async()=>{
 const handlers={},shown=[],source=fs.readFileSync(path.join(__dirname,'../customer-web/sw.js'),'utf8');let response={public_id:'current',count:1},ok=true;
 vm.runInNewContext(source,{URL,caches:{},fetch:async()=>({ok,json:async()=>response}),self:{location:{origin:'https://gosqori.com'},addEventListener:(n,f)=>handlers[n]=f,registration:{showNotification:async(...args)=>shown.push(args)}}});
 async function send(public_id){let promise;handlers.push({data:{json:()=>({public_id})},waitUntil:p=>promise=p});await promise;}
 await send('other');assert.equal(shown.length,0);response.count=0;await send('current');assert.equal(shown.length,0);response.count=1;ok=false;await send('current');assert.equal(shown.length,0);ok=true;await send('current');assert.equal(shown.length,1);assert.equal(shown[0][1].data.url,'/customer/#payments');
});

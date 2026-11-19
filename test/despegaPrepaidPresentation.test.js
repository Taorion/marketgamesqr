const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const {listPlans}=require('../backend/src/services/subscriptionService');
test('Activar Qori shows prepaid billing and selection with API data or offline fallback',async()=>{
 const dom=new JSDOM(fs.readFileSync(require.resolve('../paquetes/index.html'),'utf8'),{url:'https://gosqori.com/paquetes/',runScripts:'outside-only'});
 try{const w=dom.window;w.HTMLElement.prototype.scrollIntoView=()=>{};w.fetch=async()=>({ok:true,json:async()=>({plans:listPlans()})});w.eval(fs.readFileSync(require.resolve('../paquetes/js/app.js'),'utf8'));
 for(const offline of [false,true]){
  if(offline)w.fetch=async()=>{throw Error('Offline');};await w.loadPlans();
  const cards=[...w.document.querySelectorAll('.plan-card')];assert.match(cards[0].textContent,/Prepago/);assert.match(cards[0].querySelector('.plan-price-row').textContent,/75\.000.*prepago/);assert.doesNotMatch(cards[0].querySelector('.plan-price-row').textContent,/\/ mes|Suscripción mensual/);
  assert.match(cards[0].textContent,/hasta agotar.*tickets/);
  for(const card of cards.slice(1))assert.match(card.querySelector('.plan-price-row').textContent,/\/ mes/);
  w.selectPlan('DESPEGA');assert.equal(w.document.getElementById('formEyebrow').textContent,'Despega prepago');assert.match(w.document.getElementById('signupPlanSummary').textContent,/Sin cobro mensual automático/);
  w.selectPlan('STARTER');assert.equal(w.document.getElementById('formEyebrow').textContent,'Suscripción Crece');assert.match(w.document.getElementById('signupPlanSummary').textContent,/\/ mes/);
 }
 }finally{dom.window.close();}
});
test('Empresa price and account timing do not inherit a monthly expiry for Despega',()=>{
 const s=fs.readFileSync(require.resolve('../empresa/js/app.js'),'utf8'),block=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a))),ctx={copMoney:n=>'$'+n,state:{}};vm.createContext(ctx);
 vm.runInContext(block('function planMonthlyLabel(', '\nfunction addPlanBillingPeriod(')+block('function subscriptionTimingText(', '\nfunction formatDateTimeLocal('),ctx);
 const p=listPlans().find(p=>p.code==='DESPEGA');assert.match(ctx.planMonthlyLabel(p),/prepago/);assert.doesNotMatch(ctx.planMonthlyLabel(p),/\/ mes/);
 assert.match(ctx.subscriptionTimingText(p),/sin vencimiento por fecha/);assert.match(ctx.subscriptionTimingText({...p,access_status:'TICKETS_EXHAUSTED'}),/Recarga tickets/);
});

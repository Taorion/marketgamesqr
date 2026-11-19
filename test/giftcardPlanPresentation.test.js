const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const {listPlans}=require('../backend/src/services/subscriptionService');
const source=fs.readFileSync(require.resolve('../empresa/js/app.js'),'utf8');
const block=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
test('portal plan cards and offline suggestions show the actual names, prices and Gift Card allowance',()=>{
 const ctx={state:{subscriptionPlans:[]},formatLimitValue:String};vm.createContext(ctx);vm.runInContext(block('function publicSubscriptionPlan(', '\nfunction ',)+block('function planBenefitList(', '\nfunction renderSubscriptionPricing('),ctx);
 for(const [code,name,price,count] of [['DESPEGA','Despega',75000,5],['STARTER','Crece',229000,12],['GROWTH','Escala',999000,30],['PRO','Expande',1999000,70]]){
  const fallback=ctx.publicSubscriptionPlan(code),plan=listPlans().find(p=>p.code===code);assert.equal(fallback.name,name);assert.equal(fallback.monthly_price_cop,price);assert.equal(fallback.limits.gift_cards_month,count);assert.ok(ctx.planBenefitList(plan).includes(`${count} tarjetas regalo al mes`));
 }
});
test('public plan table uses the backend quota and keeps correct values when the API is unavailable',async()=>{
 const dom=new JSDOM(fs.readFileSync(require.resolve('../paquetes/index.html'),'utf8'),{url:'https://gosqori.com/paquetes/',runScripts:'outside-only'});try{const w=dom.window;w.fetch=async()=>({ok:true,json:async()=>({plans:listPlans()})});w.eval(fs.readFileSync(require.resolve('../paquetes/js/app.js'),'utf8'));await w.loadPlans();const cells=()=>[...w.document.querySelectorAll('#giftCardPlanLimits td')].map(c=>c.textContent);assert.deepEqual(cells(),['5/mes','12/mes','30/mes','70/mes']);
 w.fetch=async()=>({ok:true,json:async()=>({plans:listPlans().map(p=>p.code==='DESPEGA'?{...p,limits:{...p.limits,gift_cards_month:7}}:p)})});await w.loadPlans();assert.equal(cells()[0],'7/mes','live entitlement takes precedence over static copy');w.fetch=async()=>{throw Error('Offline');};await w.loadPlans();assert.deepEqual(cells(),['5/mes','12/mes','30/mes','70/mes']);}finally{dom.window.close();}
});
test('gift issuance UI states remaining monthly slots independently of purchased emissions',()=>{
 const ctx={state:{rewardPassContext:{giftcard_balance:2,giftcard_plan_name:'Despega',giftcard_monthly_limit:5,giftcard_monthly_remaining:0}},rewardPassTicketContext:{textContent:''},toNumber:Number};vm.createContext(ctx);vm.runInContext(block('function renderRewardPassContext(', '\nasync function loadRewardPasses('),ctx);ctx.renderRewardPassContext();assert.match(ctx.rewardPassTicketContext.textContent,/2 emisiones/);assert.match(ctx.rewardPassTicketContext.textContent,/quedan 0 de 5 tarjetas regalo/);
});

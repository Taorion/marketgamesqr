const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('empresa/js/app.js','utf8');
const {listPlans}=require('../backend/src/services/subscriptionService');
function setup(plan,canBill=true){
 const w=new JSDOM(`<select id="subscriptionRenewalPlanSelect"><option value="STARTER" selected>Crece</option></select><button id="subscriptionRenewalButton"></button><button id="subscriptionAutoRenewButton"></button><button id="subscriptionAutoRenewRefreshButton"></button><button id="subscriptionAutoRenewCancelButton"></button><div id="subscriptionAutoRenewClarity"></div><span id="subscriptionAutoRenewStatus"></span><p id="subscriptionRenewalMessage"></p><span id="accountBillingStatus"></span>`,{runScripts:'outside-only'}).window;
 w.state={subscription:{plan},subscriptionPlans:listPlans()};w.subscriptionAutoRenewBusy=false;
 Object.assign(w,{renderAccountAutoRenewal(){},canManageBusinessBilling:()=>canBill,escapeHtml:String,planMonthlyLabel:p=>p.name,autoRenewFirstChargeDate:()=>null,copMoney:String,formatDateOnly:String,subscriptionAccessLabel:()=>plan.access_status,subscriptionTimingText:()=>'',setInlineMessage:(el,text)=>{el.textContent=text;}});
 w.eval(source.slice(source.indexOf('function renewalPaymentMode()'),source.indexOf('function accountValue(')));
 return w;
}
test('expired Descubre and each free program can pay a chosen plan without misleading card enrollment',()=>{
 for(const code of ['DESCUBRE','PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS','UN_REGALO_PERSONAL','PREPAID_QR']){
  const plan={...listPlans().find(p=>p.code===code),access_status:'LOCKED',portal_access_allowed:false};const w=setup(plan);
  try{w.renderSubscriptionRenewal();assert.equal(w.document.querySelector('#subscriptionRenewalButton').disabled,false,code);assert.match(w.document.querySelector('#subscriptionRenewalMessage').textContent,/Conservas esta cuenta/);assert.equal(w.document.querySelector('#subscriptionAutoRenewClarity').hidden,true);assert.equal(w.document.querySelector('#subscriptionAutoRenewButton').hidden,true);}finally{w.close();}
 }
});
test('billing roles and an existing automatic mandate still block unauthorized or duplicate checkout',()=>{
 const plan={...listPlans().find(p=>p.code==='STARTER'),billing_period:'monthly',current_period_ends_at:new Date(Date.now()+86400000).toISOString(),auto_renew:{mercado_pago_preapproval_id:'existing',status:'AUTHORIZED',enabled:true}};
 for(const canBill of [true,false]){const w=setup(plan,canBill);try{w.renderSubscriptionRenewal();assert.equal(w.document.querySelector('#subscriptionRenewalButton').disabled,true);}finally{w.close();}}
});

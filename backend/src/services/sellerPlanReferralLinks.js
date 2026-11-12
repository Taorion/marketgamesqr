const {PLAN_CATALOG}=require('./subscriptionService');
// Only plans offered by the public signup checkout. Internal/test/quoted plans
// must not produce a link that suggests they can be purchased here.
const paidCodes=['DESPEGA','STARTER','GROWTH','PRO'];
function planReferralLinks(freeUrl,paidUrl){
  return [{code:'PENSE_EN_TI',name:'Pensé en ti',monthly_price_cop:0,
    summary:'La cuenta gratuita para empezar con Qori. Su apertura no genera comisión.',url:freeUrl},
    ...paidCodes.map(code=>{const plan=PLAN_CATALOG[code],url=new URL(paidUrl);
      url.searchParams.set('plan',code);
      return {code,name:plan.name,monthly_price_cop:Number(plan.monthly_price_cop),summary:plan.access_summary,url:url.toString()};
    })];
}
module.exports={planReferralLinks};

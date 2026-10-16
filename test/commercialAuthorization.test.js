const test = require("node:test");
const assert = require("node:assert/strict");
const { termsSchema, policyAllows, assertConvertible, requireSuperadmin, requireOwner } = require("../backend/src/services/commercialAuthorization");
const { applyCommercialEntitlements, commercialPrice } = require("../backend/src/services/commercialTerms");
const { planFromBusiness, listPlans } = require("../backend/src/services/subscriptionService");
const { buildTerms } = require("../backend/src/services/commercialAdminService");
const now = new Date("2026-10-16T12:00:00Z");
const terms = termsSchema.parse({plan_code:"STARTER",discount_percent:10,discount_months:3,trial_days:7,modules:["products"],benefit_days:30,bonus_tickets:50});
const policy = {is_active:true,seller_id:"s1",expires_at:"2026-12-01T00:00:00Z",version:2,plan_codes:["STARTER"],max_discount_percent:10,max_discount_months:3,max_trial_days:7,max_bonus_tickets:50,max_benefit_days:30,allowed_modules:["products"],max_limits:{users:4}};
const deal = {id:"d1",status:"APPROVED",seller_id:"s1",approved_by:"admin",approval_source:"POLICY",policy_version:2,valid_until:"2026-11-01T00:00:00Z",terms};
test("only superadmin authorizes staff and limits; sellers cannot see other portfolios",()=>{
  assert.throws(()=>requireSuperadmin({role:"ADMIN_MARKET_GAMES"}),{status:403});
  assert.throws(()=>requireSuperadmin({role:"QORI_SELLER"}),{status:403});
  assert.throws(()=>requireOwner({role:"QORI_SELLER",id:"s2"},"s1"),{status:403});
  assert.doesNotThrow(()=>requireOwner({role:"QORI_SUPERADMIN",id:"admin"},"s1"));
});
test("policy requires all dimensions, ownership and expiration to match",()=>{
  assert.equal(policyAllows(policy,terms,"s1",now),true);
  for(const patch of [{discount_percent:11},{trial_days:8},{discount_months:4},{bonus_tickets:51},{benefit_days:31},{modules:["analytics"]},{plan_code:"PRO"},{limit_overrides:{users:5}},{limit_overrides:{contacts:1}}]) assert.equal(policyAllows(policy,{...terms,...patch},"s1",now),false);
  assert.equal(policyAllows(policy,terms,"s2",now),false);
  assert.equal(policyAllows({...policy,is_active:false},terms,"s1",now),false);
  assert.equal(policyAllows({...policy,expires_at:now.toISOString()},terms,"s1",now),false);
});
test("approved offers are rechecked at application including policy revision and expiration",()=>{
  const user={id:"s1",role:"QORI_SELLER"};
  assert.doesNotThrow(()=>assertConvertible(deal,user,policy,now));
  assert.throws(()=>assertConvertible(deal,user,{...policy,version:3},now),{status:400});
  assert.throws(()=>assertConvertible({...deal,status:"PENDING"},user,policy,now),{status:400});
  assert.throws(()=>assertConvertible({...deal,valid_until:now.toISOString()},user,policy,now),{status:400});
});
test("unknown fields, forged modules and indefinite benefits are rejected",()=>{
  for(const patch of [{plan_code:"INTERNAL"},{modules:["forged"]},{discount_percent:100},{benefit_days:0},{approved_by:"self"},{limit_overrides:{admin:true}}]) assert.equal(termsSchema.safeParse({...terms,...patch}).success,false);
});
test("authorized modules extend real feature limits without mutating the catalog",()=>{
  const plan=listPlans().find(p=>p.code==="DESPEGA");
  const original=JSON.stringify(plan);
  const grant={...buildTerms({...deal,terms:{...terms,plan_code:"DESPEGA"}},now)};
  const row={settings:{qori_commercial:grant}};
  const effective=applyCommercialEntitlements(plan,row,new Date("2026-10-17T00:00:00Z"));
  assert.equal(effective.features.products,true);
  assert.ok(effective.limits.gift_inventory_products>=300);
  assert.equal(JSON.stringify(plan),original);
  assert.equal(applyCommercialEntitlements(plan,row,new Date(grant.benefits_ends_at)).features.products,plan.features.products);
  assert.equal(applyCommercialEntitlements(plan,{settings:{qori_commercial:{...grant,status:"REVOKED"}}},now).features.products,plan.features.products);
});
test("discount begins after the trial, ends on time and is scoped to the approved plan",()=>{
  const plan=listPlans().find(p=>p.code==="STARTER");
  const grant=buildTerms(deal,now);
  const row={settings:{qori_commercial:grant}};
  assert.equal(commercialPrice(plan,row,now),null);
  assert.equal(commercialPrice(plan,row,new Date(grant.discount_starts_at)).price_cop,206100);
  const {monthlyChargeForBusiness}=require("../backend/src/services/mercadoPagoService").__testing;
  assert.equal(monthlyChargeForBusiness(plan,row,new Date(grant.discount_starts_at)).price_cop,206100);
  assert.equal(monthlyChargeForBusiness(plan,row,new Date(grant.discount_ends_at)).price_cop,229000);
  assert.equal(commercialPrice(plan,row,new Date(grant.discount_ends_at)),null);
  assert.equal(commercialPrice({...plan,code:"PRO"},row,new Date(grant.discount_starts_at)),null);
});
test("commercial trial ends without the normal 15-day paid-subscription grace",()=>{
  const yesterday=new Date(Date.now()-86400000).toISOString();
  const row={plan_code:"STARTER",plan_type:"premium_monthly",subscription_status:"ACTIVE",subscription_current_period_ends_at:yesterday,settings:{qori_commercial:{status:"ACTIVE",plan_code:"STARTER",deal_id:"d1",approved_by:"admin",trial_ends_at:yesterday}}};
  assert.equal(planFromBusiness(row).portal_access_allowed,false);
  assert.equal(planFromBusiness(row).grace_period_days,0);
  row.subscription_current_period_ends_at=new Date(Date.now()+30*86400000).toISOString();
  assert.equal(planFromBusiness(row).portal_access_allowed,true);
  assert.equal(planFromBusiness(row).grace_period_days,15);
});

const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID:uuid}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='subscription-upgrade-local-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db');
const {app}=require('../backend/src/app');
const {env}=require('../backend/src/config/env');
const jwt=require('jsonwebtoken');
const payments=require('../backend/src/services/mercadoPagoService');
const {planFromBusiness,assertLimitForBusiness}=require('../backend/src/services/subscriptionService');
const originalFetch=global.fetch;
let server,base,admin,owner,business,order,other,requestCount=0;
const businessRow=async (id=business.id)=>(await query('select * from businesses where id=$1',[id])).rows[0];
async function api(path,user,body,method=body?'POST':'GET'){
 const response=await originalFetch(base+path,{method,headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.'+(++requestCount%250),...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:0},env.jwtSecret)}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,data:await response.json()};
}
const addonPath=id=>'/api/admin/accounts/businesses/'+id+'/subscription-addons';
async function addonBody(extra={}){return {modules:['showcase'],limits:{showcases:3},expires_at:null,expected_updated_at:(await businessRow()).updated_at.toISOString(),reason:'Ampliación acordada tras verificar el pago',...extra};}
async function approve(id=order.id){return withTransaction(async db=>{
 const row=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[id])).rows[0];
 return payments.__testing.finalizeApprovedCreditPurchase(db,row,{id:uuid(),status:'approved',transaction_amount:Number(row.price_cop),currency_id:'COP'});
});}
after(async()=>{global.fetch=originalFetch;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
test('expired and free accounts pay in place; paid additions enforce authorization, quantities and history',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 env.mercadoPagoAccessToken='TEST-local-only';env.mercadoPagoWebhookSecret='local-only';
 global.fetch=async(input,options)=>{
  assert.ok(String(input).startsWith('https://api.mercadopago.com/')&&String(input).endsWith('/checkout/preferences'),'No real payment requests');
  return new Response(JSON.stringify({id:uuid(),init_point:'https://example.test/checkout'}),{status:201});
 };
 admin=await require('./helpers/adminIdentity').admin(query);
 business=(await query(`insert into businesses(name,slug,plan_code,plan_type,subscription_status,subscription_current_period_ends_at,settings)
 values('Prueba vencida QA',$1,'DESCUBRE','premium_monthly','ACTIVE',now()-interval '5 days','{"contact_name":"Titular original","custom_history":"preserved"}') returning *`,['upgrade-'+uuid()])).rows[0];
 owner=(await query(`insert into app_users(business_id,email,full_name,role,password_hash) values($1,$2,'Titular QA','BUSINESS_OWNER','qa') returning *`,[business.id,uuid()+'@example.test'])).rows[0];
 await withTransaction(async db=>{await require('../backend/src/services/qrCreditService').resetIncludedTickets(db,{business_id:business.id,quantity:25,period_key:uuid()});});
 other=(await query(`insert into businesses(name,slug,plan_code,subscription_status) values('Otra cuenta QA',$1,'PENSE_EN_TI','ACTIVE') returning *`,['other-'+uuid()])).rows[0];
 await t.test('expired trial can read billing, cannot operate and cannot receive paid extras',async()=>{
  assert.equal((await api('/api/business/profile',owner)).status,200);
  const identity=await api('/api/auth/me',owner);
  assert.equal(identity.status,200);
  assert.equal(identity.data.user.subscription.plan.portal_access_allowed,false);
  for(const path of ['/api/public/subscription-plans','/api/qr/credits/me']) {
   assert.equal((await api(path,owner)).status,200,path);
  }
  assert.equal((await api('/api/payments/qr-credits/offers',owner)).status,400,'ticket top-ups require an active plan');
  assert.equal((await api('/api/business/catalogs',owner)).status,403);
  const detail=await api('/api/admin/accounts/businesses/'+business.id,admin);
  assert.equal(detail.status,200,JSON.stringify(detail));assert.equal(detail.data.record.subscription_addons.eligible,false);
  assert.equal((await api(addonPath(business.id),admin,await addonBody(),'PATCH')).status,400);
 });
 await t.test('checkout reuses the same account, preserves unpaid state and is idempotent',async()=>{
  const body={plan_code:'STARTER',idempotency_key:uuid()};
  let result=await api('/api/payments/subscriptions/checkout',owner,body);assert.equal(result.status,201,JSON.stringify(result));order=result.data.order;
  const repeated=await api('/api/payments/subscriptions/checkout',owner,body);assert.equal(repeated.data.order.id,order.id);
  assert.equal(order.business_id,business.id);assert.equal((await businessRow()).plan_code,'DESCUBRE');
  assert.equal((await api(addonPath(business.id),admin,await addonBody(),'PATCH')).status,400);
 });
 await t.test('confirmed payment activates only the chosen plan and retains identity, data and remaining trial tickets',async()=>{
  await approve();const row=await businessRow();const plan=planFromBusiness(row);
  assert.equal(row.id,business.id);assert.equal(row.plan_code,'STARTER');assert.equal(row.settings.custom_history,'preserved');
  assert.equal(plan.features.communications,false);assert.equal(plan.limits.showcases,1);assert.equal(plan.portal_access_allowed,true);
  assert.equal((await query('select count(*)::int n from app_users where business_id=$1',[row.id])).rows[0].n,1);
  const balance=(await query('select * from business_qr_credit_accounts where business_id=$1',[row.id])).rows[0];
  assert.equal(Number(balance.qr_balance),25+50);assert.equal(Number(balance.included_balance),50);
  await approve();assert.equal(Number((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[row.id])).rows[0].qr_balance),75);
  assert.equal((await api('/api/business/catalogs',owner)).status,200);
 });
 await t.test('superadmin adds exact total quantities with audit and same-session enforcement',async()=>{
  const body=await addonBody({modules:['showcase','communications'],limits:{showcases:3,communication_emails_month:200,communication_emails_day:50}});
  for(const user of [null,owner])assert.equal((await api(addonPath(business.id),user,body,'PATCH')).status,user?403:401);
  assert.equal((await api(addonPath(business.id),admin,{...body,limits:{showcases:-1}},'PATCH')).status,400);
  assert.equal((await api(addonPath(business.id),admin,{...body,limits:{unknown:1}},'PATCH')).status,400);
  const result=await api(addonPath(business.id),admin,body,'PATCH');assert.equal(result.status,200,JSON.stringify(result));
  const plan=planFromBusiness(await businessRow());assert.equal(plan.limits.showcases,3);assert.equal(plan.features.communications,true);assert.equal(plan.limits.communication_emails_month,200);
  assert.equal((await api('/api/business/communications',owner)).status,200);
  await assertLimitForBusiness(business.id,'showcases',2,'vitrinas');
  await assert.rejects(assertLimitForBusiness(business.id,'showcases',3,'vitrinas'),/vitrinas/i);
  assert.equal((await api(addonPath(business.id),admin,body,'PATCH')).status,400,'stale edit rejected');
  assert.equal((await api(addonPath(other.id),admin,{...body,expected_updated_at:other.updated_at.toISOString()},'PATCH')).status,400,'another unpaid account cannot use this payment');
  const history=(await query("select detail from qori_commercial_audit where entity_id=$1 and action='ACCOUNT_SUBSCRIPTION_ADDONS_UPDATED'",[business.id])).rows;
  assert.equal(history.length,1);assert.equal(history[0].detail.after.payment_order_id,order.id);assert.equal(history[0].detail.payment_recorded,false);
 });
 await t.test('customer profile cannot self-grant extras; expiry, suspension and plan change revoke access',async()=>{
  await api('/api/business/profile',owner,{settings:{subscription_addons:{modules:['rms'],limits:{showcases:999}}}},'PATCH');
  assert.equal(planFromBusiness(await businessRow()).limits.showcases,3);
  const row=await businessRow();
  assert.equal(planFromBusiness({...row,plan_code:'DESPEGA'}).features.communications,false);
  await query("update businesses set subscription_status='SUSPENDED' where id=$1",[business.id]);
  assert.equal((await api('/api/business/communications',owner)).status,403);
  await query("update businesses set subscription_status='ACTIVE',subscription_current_period_ends_at=now()-interval '20 days' where id=$1",[business.id]);
  assert.equal((await api('/api/business/communications',owner)).status,403);
  assert.equal((await api(addonPath(business.id),admin,await addonBody(),'PATCH')).status,400);
  assert.equal((await api(addonPath(business.id),admin,await addonBody({modules:[],limits:{}}),'PATCH')).status,200,'expired additions can be removed');
  assert.equal(planFromBusiness(await businessRow()).limits.showcases,1);
 });
 for(const code of ['PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS','UN_REGALO_PERSONAL'])await t.test(code+' can purchase a paid plan without signup',async()=>{
  await query('update businesses set plan_code=$2,subscription_current_period_ends_at=null where id=$1',[business.id,code]);
  const result=await api('/api/payments/subscriptions/checkout',owner,{plan_code:'STARTER',idempotency_key:uuid()});assert.equal(result.status,201,JSON.stringify(result));assert.equal(result.data.order.business_id,business.id);
 });
});

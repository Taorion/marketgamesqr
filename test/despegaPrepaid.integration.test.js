const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID:uuid}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='despega-local-only';
process.env.AGENDA_PUSH_WORKER_ENABLED='false';
for(const key of ['RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASS'])process.env[key]='';
const {query,pool,withTransaction}=require('../backend/src/config/db');
const {app}=require('../backend/src/app'),{env}=require('../backend/src/config/env'),jwt=require('jsonwebtoken');
const payments=require('../backend/src/services/mercadoPagoService');
const {getBusinessSubscription,planFromBusiness,setBusinessSubscription}=require('../backend/src/services/subscriptionService');
const {consumeQrCredits}=require('../backend/src/services/qrCreditService');
let server,base,seq=0;const actualFetch=global.fetch,providerCalls=[];
before(async()=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');
 env.mercadoPagoAccessToken='TEST-local-only';env.mercadoPagoWebhookSecret='local-only';
 global.fetch=async(url,options)=>{
  assert.equal(String(url),'https://api.mercadopago.com/checkout/preferences');
  const body=JSON.parse(options.body);providerCalls.push(body);
  return new Response(JSON.stringify({id:uuid(),init_point:'https://example.test/checkout'}),{status:201});
 };
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{global.fetch=actualFetch;server.closeAllConnections();await new Promise(r=>server.close(r));await pool.end();});
async function api(path,user,body){const r=await actualFetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.'+(++seq),...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:0},env.jwtSecret)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
function registration(code='DESPEGA',cycle='prepaid'){return {plan_code:code,billing_cycle:cycle,company_name:'Prepago QA '+uuid(),contact_name:'Propietario QA',email:uuid()+'@example.test',nit:uuid(),phone:'3100000000',password:'SoloPrueba!2026',password_confirm:'SoloPrueba!2026',terms_accepted:true,privacy_accepted:true};}
async function approve(id,amount=75000){return withTransaction(async db=>{const order=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[id])).rows[0];return payments.__testing.finalizeApprovedCreditPurchase(db,order,{id:'qa-'+id,status:'approved',currency_id:'COP',transaction_amount:amount});});}
test('Despega signup, payment, balance exhaustion and recharge use prepaid access',async t=>{
 let b,u,order;
 await t.test('checkout charges 75000 once and account stays inactive before payment',async()=>{
  const r=await api('/api/public/signup/portal',null,registration());assert.equal(r.status,201,JSON.stringify(r));
  b=r.data.business;u=r.data.user;order=r.data.order;
  assert.equal(b.is_active,false);assert.equal(b.subscription_status,'PENDING_PAYMENT');
  assert.equal(r.data.plan.billing_period,'prepaid');
  const stored=(await query('select * from qr_credit_purchase_orders where id=$1',[order.id])).rows[0];
  assert.equal(stored.metadata.signup.billing_cycle,'prepaid');assert.equal(Number(stored.price_cop),75000);
  assert.match(stored.package_title,/prepago/);assert.doesNotMatch(stored.package_title,/mensual|suscripci/);
  assert.equal(providerCalls.at(-1).items[0].unit_price,75000);assert.match(providerCalls.at(-1).items[0].title,/prepago/);
 });
 await t.test('underpayment cannot activate and an approved payment grants exactly 25 tickets without a due date',async()=>{
  await assert.rejects(approve(order.id,74999),/no cubre/);
  assert.equal((await query('select is_active from businesses where id=$1',[b.id])).rows[0].is_active,false);
  const paid=await approve(order.id);assert.equal(paid.subscription.billing_cycle,'prepaid');assert.equal(paid.subscription.current_period_ends_at,null);
  const row=(await query('select * from businesses where id=$1',[b.id])).rows[0];assert.equal(row.subscription_current_period_ends_at,null);assert.equal(row.is_active,true);
  assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,25);
  const again=await approve(order.id);assert.equal(again.duplicate,true);
  assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,25);
 });
 await t.test('old monthly deadlines cannot expire Despega while tickets remain',async()=>{
  await query("update businesses set subscription_current_period_ends_at=now()-interval '180 days' where id=$1",[b.id]);
  const p=(await getBusinessSubscription(b.id)).plan;assert.equal(p.portal_access_allowed,true);assert.equal(p.monthly_payment_required,false);assert.equal(p.current_period_ends_at,null);assert.equal(p.official_payment_due_at,null);
  assert.equal((await api('/api/business/interactive-activations',u)).status,200);
 });
 await t.test('the last ticket exhausts operational access, but the account can still buy credits',async()=>{
  await withTransaction(db=>consumeQrCredits(db,b.id,25,null,u.id,'QA prepaid exhaustion'));
  const p=(await getBusinessSubscription(b.id)).plan;assert.equal(p.access_status,'TICKETS_EXHAUSTED');assert.equal(p.portal_access_allowed,false);
  const locked=await api('/api/business/interactive-activations',u);assert.equal(locked.status,403);assert.match(locked.data.error.message,/tickets/);
  const offers=await api('/api/payments/qr-credits/offers',u);assert.equal(offers.status,200);
  const offer=offers.data.packages.find(p=>p.package_size===50);assert.ok(offer);
  const purchase=await api('/api/payments/qr-credits/checkout',u,{package_code:offer.code,idempotency_key:uuid()});assert.equal(purchase.status,201,JSON.stringify(purchase));
  await approve(purchase.data.order.id,Number(purchase.data.order.price_cop));
  assert.equal((await getBusinessSubscription(b.id)).plan.portal_access_allowed,true);
  assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,50);
 });
 await t.test('recurring charges and monthly renewal of Despega are unavailable',async()=>{
  const calls=providerCalls.length;
  const auto=await api('/api/payments/subscriptions/auto-renewal',u,{plan_code:'DESPEGA'});assert.equal(auto.status,400);assert.match(auto.data.error.message,/prepago/);
  const renewal=await api('/api/payments/subscriptions/checkout',u,{plan_code:'DESPEGA'});assert.equal(renewal.status,400);assert.match(renewal.data.error.message,/Recarga/);
  assert.equal(providerCalls.length,calls);
  await setBusinessSubscription(b.id,{plan_code:'DESPEGA',subscription_current_period_ends_at:'2027-01-01T00:00:00.000Z'});
  assert.equal((await query('select subscription_current_period_ends_at from businesses where id=$1',[b.id])).rows[0].subscription_current_period_ends_at,null);
 });
});
test('monthly plans retain their deadline and cannot request prepaid billing',async()=>{
 for(const code of ['STARTER','GROWTH','PRO']){
  const expired=planFromBusiness({plan_code:code,subscription_status:'ACTIVE',subscription_current_period_ends_at:'2020-01-01',qr_balance:500});assert.equal(expired.portal_access_allowed,false);assert.equal(expired.monthly_payment_required,true);
  const r=await api('/api/public/signup/portal',null,registration(code));assert.equal(r.status,400);assert.match(r.data.error.message,/mensual/);
 }
 const r=await api('/api/public/signup/portal',null,{...registration('STARTER','monthly'),payment_mode:'one_time'});assert.equal(r.status,201,JSON.stringify(r));
 const paid=await approve(r.data.order.id,229000);assert.equal(paid.subscription.billing_cycle,'monthly');assert.ok(new Date(paid.subscription.current_period_ends_at)>new Date());
});

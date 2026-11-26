const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID:id}=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';
const {query,pool,withTransaction}=require('../backend/src/config/db'),recovery=require('../backend/src/services/subscriptionPaymentRecovery'),payments=require('../backend/src/services/mercadoPagoService'),{env}=require('../backend/src/config/env');
const originalFetch=global.fetch;after(()=>{global.fetch=originalFetch;return pool.end();});
test('provider recovery preserves manual renewal and credits tickets and seller commission exactly once',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 const admin=await require('./helpers/adminIdentity').admin(query);
 const seller=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Recovery seller','QORI_SELLER') returning *",[id()+'@example.test'])).rows[0];
 const b=(await query("insert into businesses(name,slug,plan_code,plan_type,subscription_status,subscription_current_period_ends_at) values('Recovery QA',$1,'STARTER','premium_monthly','ACTIVE',now()+interval '30 days') returning *",[id()])).rows[0];
 await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)',[b.id,seller.id,admin.id]);
 await withTransaction(db=>require('../backend/src/services/qrCreditService').resetIncludedTickets(db,{business_id:b.id,quantity:25,period_key:id()}));
 const makeOrder=async()=> (await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,metadata) values($1,'STARTER',0,'Crece',229000,$2,$3) returning *",[b.id,id(),{signup:{type:'portal_monthly_subscription',plan_code:'STARTER',billing_cycle:'monthly'}}])).rows[0];
 const o=await makeOrder(),payload={order_id:o.id,expected_period_end:b.subscription_current_period_ends_at.toISOString(),reason:'Pago reportado por el cliente, verificar conservando la fecha.'};
 env.mercadoPagoAccessToken='TEST-local';env.mercadoPagoWebhookSecret='TEST-local';
 let matches=[],payment={id:'recovery-'+id(),external_reference:o.external_reference,status:'approved',transaction_amount:229000,currency_id:'COP',live_mode:true,date_approved:new Date().toISOString()};
 global.fetch=async url=>{assert.ok(String(url).startsWith('https://api.mercadopago.com/'));return new Response(JSON.stringify(String(url).includes('/search?')?{results:matches,paging:{total:matches.length}}:payment),{status:200});};
 await t.test('only superadmin and matching business/order/period can request verification',async()=>{
  await assert.rejects(()=>recovery.request(seller,b.id,payload),/superadmin/);
  await assert.rejects(()=>recovery.request(admin,id(),payload),/encontrad/);
  await assert.rejects(()=>recovery.request(admin,b.id,{...payload,expected_period_end:new Date().toISOString()}),/cambió/);
  await recovery.request(admin,b.id,payload);
 });
 await t.test('absence of provider approval never credits the payment',async()=>{
  assert.equal((await recovery.recover(o.id)).status,'WAITING_PROVIDER');
  assert.equal((await query('select credited_at from qr_credit_purchase_orders where id=$1',[o.id])).rows[0].credited_at,null);
 });
 await t.test('invalid amount and currency fail without extending access or granting commissions',async()=>{
  matches=[payment];payment={...payment,transaction_amount:1};assert.equal((await recovery.recover(o.id)).status,'ERROR');
  payment={...payment,transaction_amount:229000,currency_id:'USD'};assert.equal((await recovery.recover(o.id)).status,'ERROR');
  assert.equal((await query('select count(*)::int n from qori_seller_commissions where order_id=$1',[o.id])).rows[0].n,0);payment.currency_id='COP';
 });
 await t.test('verified payment preserves date and history, unlocks extras and attributes commission',async()=>{
  assert.equal((await recovery.recover(o.id)).status,'CONFIRMED');
  const current=(await query('select * from businesses where id=$1',[b.id])).rows[0];assert.equal(current.subscription_current_period_ends_at.toISOString(),payload.expected_period_end);
  const credits=(await query('select qr_balance,included_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0];assert.equal(Number(credits.qr_balance),75);assert.equal(Number(credits.included_balance),50);
  assert.equal((await require('../backend/src/services/adminSubscriptionAddons').context(current)).eligible,true);
  const commissions=(await query('select * from qori_seller_commissions where order_id=$1',[o.id])).rows;assert.equal(commissions.length,1);assert.equal(commissions[0].seller_id,seller.id);assert.equal(commissions[0].status,'PENDING');
  await recovery.recover(o.id);await payments.processMercadoPagoResource('payment',payment.id);
  assert.equal((await query('select count(*)::int n from qori_seller_commissions where order_id=$1',[o.id])).rows[0].n,1);
  assert.equal(Number((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance),75);
 });
 await t.test('multiple matching payments and changed renewal require review',async()=>{
  const other=await makeOrder();await recovery.request(admin,b.id,{...payload,order_id:other.id});
  matches=[{...payment,id:'a',external_reference:other.external_reference},{...payment,id:'b',external_reference:other.external_reference}];assert.equal((await recovery.recover(other.id)).status,'ERROR');
  matches=[matches[0]];payment=matches[0];await query("update businesses set subscription_current_period_ends_at=subscription_current_period_ends_at+interval '1 day' where id=$1",[b.id]);
  assert.equal((await recovery.recover(other.id)).status,'ERROR');assert.equal((await query('select credited_at from qr_credit_purchase_orders where id=$1',[other.id])).rows[0].credited_at,null);
 });
});

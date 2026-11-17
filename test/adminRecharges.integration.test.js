const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID:uuid}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='admin-recharges-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
for(const k of ['RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASS'])process.env[k]='';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),{env}=require('../backend/src/config/env'),jwt=require('jsonwebtoken');
const payments=require('../backend/src/services/mercadoPagoService'),actualFetch=global.fetch;
let server,base,admin,business,other,owner,n=0,providerCalls=0;
async function api(path,body,user=admin){const r=await actualFetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.'+(++n),...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:user.password_version||0},env.jwtSecret)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function createBusiness(plan){return (await query("insert into businesses(name,slug,plan_code,subscription_status,subscription_current_period_ends_at) values($1,$1,$2,'ACTIVE',now()+interval '30 days') returning *",['qa-recharges-'+uuid(),plan])).rows[0];}
async function credit(order,amount=order.price_cop){return withTransaction(async db=>{const o=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[order.id])).rows[0];return payments.__testing.finalizeApprovedCreditPurchase(db,o,{id:'qa-'+order.id,status:'approved',currency_id:'COP',transaction_amount:Number(amount)});});}
after(async()=>{global.fetch=actualFetch;if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Admin recharge purchases preserve authorization, chosen business and verified crediting',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');
 admin=(await query("insert into app_users(email,full_name,role,password_hash) values('cbotero@gosqori.com','Admin QA','QORI_SUPERADMIN','qa') on conflict(email) do update set role='QORI_SUPERADMIN',is_active=true returning *")).rows[0];
 business=await createBusiness('UN_REGALO_PERSONAL');other=await createBusiness('PENSE_EN_TI');
 owner=(await query("insert into app_users(email,password_hash,full_name,role,business_id) values($1,'qa','Owner QA','BUSINESS_OWNER',$2) returning *",[uuid()+'@example.test',business.id])).rows[0];
 await query('insert into qori_giftcard_credit_accounts(business_id,balance,welcome_granted) values($1,5,5)',[business.id]);
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 env.mercadoPagoAccessToken='TEST-local-only';env.mercadoPagoWebhookSecret='qa-secret';
 global.fetch=async(url,options)=>{assert.ok(String(url).startsWith('https://api.mercadopago.com/'));providerCalls++;const d=JSON.parse(options.body);assert.equal(d.metadata.business_id,business.id);assert.ok(d.back_urls.success.includes('/admin/?recharge_business='+business.id));assert.ok(d.back_urls.success.endsWith('#recargas'));return new Response(JSON.stringify({id:uuid(),init_point:'https://example.test/pay'}),{status:201});};
 const path='/api/admin/recharges/businesses/'+business.id;
 await t.test('Admin sees four gift packages with independent balances and ticket catalog',async()=>{
  const search=await api('/api/admin/recharges/businesses?search='+business.slug);assert.equal(search.status,200);assert.equal(search.data.businesses[0].id,business.id);
  const r=await api(path);assert.equal(r.status,200);assert.equal(r.data.giftcard_balance,5);assert.equal(r.data.ticket_balance,0);
  assert.deepEqual(r.data.giftcard_packages.map(p=>[p.package_size,p.price_cop]),[[10,25000],[25,62500],[50,125000],[100,250000]]);assert.ok(r.data.ticket_packages.length);
 });
 await t.test('business owners and anonymous callers cannot use Admin recharge APIs',async()=>{
  assert.equal((await api(path,null,owner)).status,403);assert.equal((await api(path+'/checkout',{package_code:'GF10',idempotency_key:uuid()},owner)).status,403);
  assert.equal((await api(path,null,null)).status,401);
  await assert.rejects(()=>payments.createAdminCreditCheckout(owner,other.id,{package_code:'GF10'}));
 });
 await t.test('checkout prices are authoritative; retries create one order without crediting',async()=>{
  const body={package_code:'GF25',idempotency_key:uuid()};
  assert.equal((await api(path+'/checkout',{...body,price_cop:1})).status,400);
  const first=await api(path+'/checkout',body),again=await api(path+'/checkout',body);assert.equal(first.status,200);assert.equal(first.data.order.id,again.data.order.id);assert.equal(providerCalls,1);
  assert.equal(Number(first.data.order.price_cop),62500);assert.equal((await api(path)).data.giftcard_balance,5);
  const saved=(await query('select * from qr_credit_purchase_orders where id=$1',[first.data.order.id])).rows[0];assert.equal(saved.business_id,business.id);assert.equal(saved.created_by_user_id,admin.id);assert.equal(saved.metadata.source,'admin_recharges');
  assert.equal((await api(path+'/checkout',{...body,package_code:'GF100'})).status,400);
  await assert.rejects(()=>credit(first.data.order,1));assert.equal((await api(path)).data.giftcard_balance,5);
  await credit(first.data.order);await credit(first.data.order);const result=(await api(path)).data;assert.equal(result.giftcard_balance,30);assert.equal(result.ticket_balance,0);assert.ok(result.orders[0].credited_at);
  assert.equal((await query('select * from qori_giftcard_credit_accounts where business_id=$1',[other.id])).rowCount,0);
 });
 await t.test('other programs and inactive businesses cannot buy gift capacity',async()=>{
  const p='/api/admin/recharges/businesses/'+other.id;
  assert.deepEqual((await api(p)).data.giftcard_packages,[]);assert.equal((await api(p+'/checkout',{package_code:'GF10',idempotency_key:uuid()})).status,403);
  await query('update businesses set is_active=false where id=$1',[other.id]);assert.equal((await api(p+'/checkout',{package_code:'GF10',idempotency_key:uuid()})).status,404);
  assert.equal((await api('/api/admin/recharges/businesses/not-a-uuid')).status,400);
 });
 await t.test('ticket checkout remains separate and preserves the free gift program',async()=>{
  const r=await api(path+'/checkout',{package_code:'QR50',idempotency_key:uuid()});assert.equal(r.status,200);await credit(r.data.order);
  const result=(await api(path)).data;assert.equal(result.giftcard_balance,30);assert.equal(result.ticket_balance,50);
  assert.equal((await query('select plan_code from businesses where id=$1',[business.id])).rows[0].plan_code,'UN_REGALO_PERSONAL');
 });
});

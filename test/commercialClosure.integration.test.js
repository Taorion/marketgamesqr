const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='closure-test-secret-local-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken');
const uid=()=>crypto.randomUUID();let server,base;
async function user(role){return (await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Closure QA',$2) returning *",[uid()+'@example.test',role])).rows[0];}
async function call(path,u,body,method=body?'POST':'GET'){const r=await fetch(base+'/api/admin/commercial'+path,{method,headers:{'Content-Type':'application/json',...(u?{Authorization:'Bearer '+jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
test('only admin closes after confirmed subscription payment and live access; enrollment alone never closes',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const admin=await user('QORI_SUPERADMIN'),seller=await user('QORI_SELLER'),owner=await user('BUSINESS_OWNER');
 await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status) values($1,$2,'3100000000','Bogotá','4610','2026-11-07-ciiu4610','APPROVED')",[seller.id,uid()]);
 const b=(await query("insert into businesses(name,slug,plan_code,plan_type,portal_status,subscription_status,subscription_started_at,subscription_current_period_ends_at,settings) values('Closure QA',$1,'STARTER','premium_monthly','ACTIVE','ACTIVE',now()-interval '1 day',now()+interval '30 days','{}') returning *",[uid()])).rows[0];
 await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)',[b.id,seller.id,admin.id]);
 const p=(await query("insert into qori_sales_prospects(seller_id,business_id,business_name,contact_name,email,stage) values($1,$2,'Closure QA','Contact QA',$3,'WON') returning *",[seller.id,b.id,uid()+'@example.test'])).rows[0];
 const open=(await query("insert into qori_sales_prospects(seller_id,business_name,contact_name,email) values($1,'Open QA','Contact QA',$2) returning *",[seller.id,uid()+'@example.test'])).rows[0];
 const patch={business_name:'Open QA',contact_name:'Contact QA',email:open.email,stage:'LOST'};
 const body={payment_order_id:uid(),payment_verified:true,subscription_verified:true,reason:'Pago y suscripción verificados por el administrador.'},route='/prospects/'+p.id+'/closure';
 await t.test('seller cannot close, forge closure metadata or mark lost through either UI API',async()=>{
  assert.equal((await call('/prospects',seller,patch)).status,403);
  assert.equal((await call('/prospects/'+open.id,seller,patch,'PATCH')).status,403);
  assert.equal((await call('/prospects/'+open.id,seller,{...patch,stage:'WON'},'PATCH')).status,400);
  assert.equal((await call('/prospects/'+open.id,seller,{...patch,stage:'NEW',closed_at:new Date().toISOString()},'PATCH')).status,400);
  for(const [u,status] of [[null,401],[seller,403],[owner,403]]){assert.equal((await call(route,u)).status,status);assert.equal((await call(route,u,body)).status,status);}
  await query("update qori_sales_prospects set stage='LOST' where id=$1",[open.id]);assert.equal((await call('/prospects/'+open.id,seller,{...patch,stage:'NEW'},'PATCH')).status,403);
 });
 let order;
 async function payment(type='portal_monthly_subscription',status='APPROVED',amount=120000,business=b.id,code='STARTER',credited=true){
  return (await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,status,credited_at,metadata) values($1,$2,0,'Closure QA',$3,$4,$5,case when $6 then now() else null end,$7::jsonb) returning *",[business,code,amount,uid(),status,credited,JSON.stringify({signup:{type,plan_code:code}})])).rows[0];
 }
 await t.test('inscription, pending, cancelled, unpaid, ticket and wrong-plan orders are not closure proof',async()=>{
  let preview=(await call(route,admin)).data;assert.equal(preview.can_close,false);assert.equal(preview.prospect.closed_at,null);
  for(const args of [['portal_monthly_subscription','PENDING',120000,b.id,'STARTER',false],['portal_monthly_subscription','CANCELLED'],['portal_monthly_subscription','APPROVED',0],['qr_tickets','APPROVED',120000,b.id,'QR50'],['portal_monthly_subscription','APPROVED',120000,b.id,'GROWTH'],['portal_monthly_subscription','APPROVED',120000,b.id,'STARTER',false]]){
   const o=await payment(...args);assert.equal((await call(route,admin,{...body,payment_order_id:o.id})).status,400);
  }
  order=await payment();body.payment_order_id=order.id;
  const foreign=(await query("insert into businesses(name,slug,plan_code) values('Foreign QA',$1,'STARTER') returning id",[uid()])).rows[0];
  const other=await payment('portal_monthly_subscription','APPROVED',120000,foreign.id);assert.equal((await call(route,admin,{...body,payment_order_id:other.id})).status,400);
  assert.equal((await call(route,admin,{...body,payment_verified:false})).status,400);assert.equal((await call(route,admin,{...body,subscription_verified:false})).status,400);
 });
 await t.test('payment alone does not close inactive, suspended, expired, free or trial subscriptions',async()=>{
  for(const status of ['PENDING_PAYMENT','SUSPENDED','CANCELLED']){await query('update businesses set subscription_status=$2 where id=$1',[b.id,status]);assert.equal((await call(route,admin,body)).status,400);}
  await query("update businesses set subscription_status='ACTIVE',is_active=false where id=$1",[b.id]);assert.equal((await call(route,admin,body)).status,400);
  await query("update businesses set is_active=true,subscription_current_period_ends_at=now()-interval '1 day' where id=$1",[b.id]);assert.equal((await call(route,admin,body)).status,400);
  for(const code of ['DESCUBRE','PENSE_EN_TI']){await query("update businesses set plan_code=$2,subscription_current_period_ends_at=now()+interval '30 days' where id=$1",[b.id,code]);assert.equal((await call(route,admin,body)).status,400);}
  await query("update businesses set plan_code='STARTER',settings=$2::jsonb where id=$1",[b.id,JSON.stringify({qori_commercial:{status:'ACTIVE',plan_code:'STARTER',approved_by:admin.id,deal_id:uid(),trial_ends_at:new Date(Date.now()+31*86400000).toISOString()}})]);assert.equal((await call(route,admin,body)).status,400);
  await query("update businesses set settings='{}' where id=$1",[b.id]);
 });
 await t.test('admin explicitly closes once and Seller can only read the audited result',async()=>{
  assert.equal((await call(route,admin)).data.can_close,true);
  const results=await Promise.all([call(route,admin,body),call(route,admin,body)]);assert.ok(results.every(r=>r.status===200));assert.equal(results.filter(r=>r.data.already_closed).length,1);
  const saved=(await query('select * from qori_sales_prospects where id=$1',[p.id])).rows[0];assert.equal(saved.closed_by,admin.id);assert.equal(saved.closed_payment_order_id,order.id);assert.ok(saved.closed_at);
  assert.equal((await query("select count(*)::int n from qori_commercial_audit where action='PROSPECT_CLOSURE_VALIDATED' and entity_id=$1",[p.id])).rows[0].n,1);
  const visible=(await call('/prospects?search='+encodeURIComponent(p.email),seller)).data.rows[0];assert.ok(visible.closed_at);assert.equal((await call(route,admin)).data.can_close,false);
  assert.equal((await call('/prospects/'+p.id,seller,{...patch,email:p.email,stage:'NEW'},'PATCH')).status,400);
  assert.equal((await query("select count(*)::int n from qori_seller_commissions where order_id=$1",[order.id])).rows[0].n,0,'closing does not fabricate commissions or payments');
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});


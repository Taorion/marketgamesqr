const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='referral-local-qa-only-secret-32chars';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
const {env}=require('../backend/src/config/env'),jwt=require('jsonwebtoken');
const payments=require('../backend/src/services/mercadoPagoService');
const actualFetch=global.fetch;let server,base,admin,seller,other,paid,signupClient=0;
const uid=randomUUID,sign=u=>jwt.sign({sub:u.id,password_version:0},env.jwtSecret);
async function api(path,u,body,method=body?'POST':'GET'){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(u?{Authorization:'Bearer '+sign(u)}:{}),...(path==='/api/public/signup/portal'?{'X-Forwarded-For':'198.51.100.'+(++signupClient)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};
}
async function person(role,name){const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa',$2,$3) returning *",[uid()+'@example.test',name,role])).rows[0];if(role==='QORI_SELLER')await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3105550000','Bogotá','4610','2026-11-11-comisiones-vf1','APPROVED','DOCUMENTS')",[u.id,String(Date.now())+String(Math.floor(Math.random()*10000))]);return u;}
const body=()=>({company_name:'Referencia QA '+uid(),contact_name:'Cliente de prueba',nit:uid(),email:uid()+'@example.test',phone:'3105550000',password:'PruebaLocal!2026',password_confirm:'PruebaLocal!2026',terms_accepted:true,privacy_accepted:true,plan_code:'STARTER',commercial_advisor_id:seller.id});
async function approve(id){return withTransaction(async db=>{const o=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[id])).rows[0];return payments.__testing.finalizeApprovedCreditPurchase(db,o,{id:uid(),status:'approved',transaction_amount:Number(o.price_cop),currency_id:'COP'});});}
after(async()=>{global.fetch=actualFetch;if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Referral checkout through payment, supervision and administrative reassignment',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 env.mercadoPagoAccessToken='TEST-local-only';env.mercadoPagoWebhookSecret='local-only';
 global.fetch=async(input,options)=>{if(String(input).startsWith('https://api.mercadopago.com/')){assert.ok(String(input).endsWith('/checkout/preferences'));return new Response(JSON.stringify({id:uid(),init_point:'https://example.test/checkout'}),{status:201});}assert.ok(String(input).startsWith(base),'No external requests in QA');return actualFetch(input,options);};
 admin=await person('QORI_SUPERADMIN','Supervisión QA');seller=await person('QORI_SELLER','Embajadora Referencia QA');other=await person('QORI_SELLER','Segundo Embajador QA');
 await t.test('paid signup freezes owner before creating order, audits exact order, no unpaid commission',async()=>{
  const r=await api('/api/public/signup/portal',null,body());assert.equal(r.status,201,JSON.stringify(r));paid=r.data;
  assert.equal(paid.business.is_active,false);
  const o=(await query('select * from qr_credit_purchase_orders where id=$1',[paid.order.id])).rows[0];assert.equal(o.commission_seller_id,seller.id);
  const audit=(await query("select detail from qori_commercial_audit where entity_id=$1 and action='PAID_SIGNUP_CREATED'",[paid.business.id])).rows[0];assert.equal(audit.detail.order_id,o.id);
  assert.equal((await query('select * from qori_seller_commissions where order_id=$1',[o.id])).rowCount,0);
  const own=await api('/api/seller/accounts',seller);assert.ok(own.data.accounts.some(b=>b.id===paid.business.id));
  assert.ok(!(await api('/api/seller/accounts',other)).data.accounts.some(b=>b.id===paid.business.id));
 });
 await t.test('verified payment credits only once to the linked seller and dashboard balance',async()=>{
  const before=Number((await api('/api/seller/dashboard',seller)).data.totals.pending_cop);
  await Promise.all([approve(paid.order.id),approve(paid.order.id)]);
  const c=(await query('select * from qori_seller_commissions where order_id=$1',[paid.order.id])).rows;assert.equal(c.length,1);assert.equal(c[0].seller_id,seller.id);assert.equal(c[0].status,'PENDING');assert.equal(Number(c[0].amount_cop),114500);
  assert.equal(Number((await api('/api/seller/dashboard',seller)).data.totals.pending_cop)-before,114500);
 });
 await t.test('superadmin sees all five ledgers, filters, totals and pagination; seller and anonymous are denied',async()=>{
  for(const view of ['accounts','orders','commissions','payouts','history']){
   const path='/api/seller/admin/supervision?'+new URLSearchParams({view,business_id:paid.business.id});
   const r=await api(path,admin);assert.equal(r.status,200,JSON.stringify(r));assert.ok(Number.isInteger(r.data.summary.total));
   assert.equal((await api(path,seller)).status,403);assert.equal((await api(path,null)).status,401);
   if(['accounts','orders','commissions'].includes(view))assert.equal(r.data.rows.length,1);
  }
  const bootstrap=await api('/api/seller/admin/supervision/bootstrap',admin);assert.ok(bootstrap.data.sellers.some(s=>s.id===seller.id));
  assert.equal((await api('/api/seller/admin/supervision/bootstrap',seller)).status,403);
  for(const params of [{seller_id:'bad-id'},{business_id:'bad-id'},{offset:-1},{view:'bad'},{extra:'x'}])assert.equal((await api('/api/seller/admin/supervision?'+new URLSearchParams(params),admin)).status,400);
  const all=await api('/api/seller/admin/supervision?view=accounts',admin);if(all.data.has_more){const next=await api('/api/seller/admin/supervision?view=accounts&offset=30',admin);assert.ok(!next.data.rows.some(n=>all.data.rows.some(a=>a.id===n.id)));}
 });
 await t.test('direct signup remains unassigned and is visible to Admin; forged and mixed advisors are rejected',async()=>{
  const input=body();delete input.commercial_advisor_id;const direct=await api('/api/public/signup/portal',null,input);assert.equal(direct.status,201,JSON.stringify(direct));
  const unassigned=await api('/api/seller/admin/supervision?'+new URLSearchParams({view:'orders',seller_id:'unassigned',business_id:direct.data.business.id}),admin);assert.equal(unassigned.data.rows.length,1);assert.equal(unassigned.data.rows[0].seller_id,null);
  const assigned=await api('/api/seller/admin/supervision?'+new URLSearchParams({view:'orders',seller_id:seller.id,business_id:direct.data.business.id}),admin);assert.equal(assigned.data.rows.length,0);
  assert.equal((await api('/api/public/signup/portal',null,{...body(),commercial_advisor_id:direct.data.user.id})).status,400);
  assert.equal((await api('/api/public/signup/portal',null,{...body(),commercial_advisor_id:'invalid'})).status,400);
  assert.equal((await api('/api/public/signup/portal',null,{...body(),sales_advisor_code:'OTHER'})).status,400);
 });
 await t.test('only superadmin reassigns; stale edits fail; existing orders and commissions keep original seller',async()=>{
  const patch={seller_id:other.id,expected_seller_id:seller.id,reason:'Reasignación de cartera verificada en QA.'},path='/api/admin/commercial/customers/'+paid.business.id;
  assert.equal((await api(path,seller,patch,'PATCH')).status,403);
  const change=await api(path,admin,patch,'PATCH');assert.equal(change.status,200,JSON.stringify(change));
  assert.equal((await api(path,admin,{...patch,seller_id:null},'PATCH')).status,400);
  const order=(await api('/api/seller/admin/supervision?view=orders&business_id='+paid.business.id,admin)).data.rows[0];assert.equal(order.seller_id,seller.id);assert.equal(order.current_seller_id,other.id);
  const c=(await query('select seller_id from qori_seller_commissions where order_id=$1',[paid.order.id])).rows[0];assert.equal(c.seller_id,seller.id);
  await assert.rejects(query('update qr_credit_purchase_orders set commission_seller_id=$2 where id=$1',[paid.order.id,other.id]),/atribuci/);
  const renewal=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,metadata) values($1,'STARTER',0,'Renovación QA',229000,$2,$3) returning *",[paid.business.id,uid(),JSON.stringify({signup:{type:'portal_monthly_subscription_auto_renewal',plan_code:'STARTER'}})])).rows[0];assert.equal(renewal.commission_seller_id,other.id);
  const history=await api('/api/seller/admin/supervision?view=history&business_id='+paid.business.id,admin);assert.ok(history.data.rows.some(h=>h.detail.previous_seller_id===seller.id&&h.detail.seller_id===other.id));
 });
 await t.test('free signup via link keeps its seller for future paid conversion',async()=>{
  const input=body();delete input.plan_code;const r=await api('/api/pense-en-ti/signup',null,input);assert.equal(r.status,200,JSON.stringify(r));
  const o=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,metadata) values($1,'STARTER',0,'Conversión QA',229000,$2,$3) returning *",[r.data.business_id,uid(),JSON.stringify({signup:{type:'portal_monthly_subscription',plan_code:'STARTER'}})])).rows[0];assert.equal(o.commission_seller_id,seller.id);
  await approve(o.id);assert.equal((await query('select seller_id from qori_seller_commissions where order_id=$1',[o.id])).rows[0].seller_id,seller.id);
 });
 await t.test('supervisor distinguishes refunds and chargebacks without exposing payment payloads',async()=>{
  const ids={};
  for(const status of ['refunded','charged_back']) {
   ids[status]=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,status,payment_payload) values($1,'STARTER',0,'Supervisión QA',229000,$2,'CANCELLED',$3::jsonb) returning id",[paid.business.id,uid(),JSON.stringify({status,payer:{email:'private-payer@example.test'}})])).rows[0].id;
   const r=await api('/api/seller/admin/supervision?'+new URLSearchParams({view:'orders',business_id:paid.business.id,status:status.toUpperCase()}),admin);
   assert.equal(r.status,200);assert.equal(r.data.summary.total,1);assert.equal(Number(r.data.summary.approved_cop),0);
   assert.deepEqual(r.data.rows.map(o=>o.id),[ids[status]]);assert.equal(r.data.rows[0].provider_status,status);
   assert.equal(JSON.stringify(r.data).includes('private-payer'),false);assert.equal('payment_payload' in r.data.rows[0],false);
  }
  const cancelled=await api('/api/seller/admin/supervision?'+new URLSearchParams({view:'orders',business_id:paid.business.id,status:'CANCELLED'}),admin);
  assert.equal(cancelled.data.summary.total,2);assert.deepEqual(new Set(cancelled.data.rows.map(o=>o.id)),new Set(Object.values(ids)));
 });
 await t.test('self referral, inactive seller and failed provider cannot leave an attributed unpaid account',async()=>{
  const document=(await query('select document_key from qori_seller_applications where user_id=$1',[seller.id])).rows[0].document_key;
  const own=await api('/api/public/signup/portal',null,{...body(),nit:document});assert.equal(own.status,400,JSON.stringify(own));
  await query('update app_users set is_active=false where id=$1',[other.id]);assert.equal((await api('/api/public/signup/portal',null,{...body(),commercial_advisor_id:other.id})).status,400);
  const input=body();global.fetch=async(url,options)=>{if(String(url).startsWith('https://api.mercadopago.com/'))return new Response(JSON.stringify({message:'QA provider unavailable'}),{status:400});return actualFetch(url,options);};
  assert.notEqual((await api('/api/public/signup/portal',null,input)).status,201);
  assert.equal((await query('select id from app_users where email=$1',[input.email])).rowCount,0);
 });
});

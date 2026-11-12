const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHmac}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='prospect-referral-local-qa-secret';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
const {env}=require('../backend/src/config/env'),jwt=require('jsonwebtoken'),payments=require('../backend/src/services/mercadoPagoService');
const actualFetch=global.fetch,uid=randomUUID;let server,base,seller,other,admin,client=0,failProvider=false;
async function api(path,user,body,method=body?'POST':'GET') {
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.'+(++client),...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:0},env.jwtSecret)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};
}
async function person(role) {
 const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Prospecto QA',$2) returning *",[uid()+'@example.test',role])).rows[0];
 if(role==='QORI_SELLER')await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1','APPROVED','DOCUMENTS')",[u.id,uid()]);return u;
}
async function prospect(user=seller,email=uid()+'@example.test') {
 const r=await api('/api/admin/commercial/prospects',user,{business_name:'Negocio '+uid(),contact_name:'Contacto QA',email,phone:'3100000000',notes:'Conversación previa que debe conservarse',stage:'NEGOTIATING',next_contact_at:new Date(Date.now()+86400000).toISOString()});assert.equal(r.status,200,JSON.stringify(r));return r.data.prospect;
}
const path=id=>'/api/admin/commercial/prospects/'+id;
async function link(p,user=seller) {const r=await api(path(p.id)+'/referral',user);assert.equal(r.status,200,JSON.stringify(r));return new URL(r.data.plan_referral_url).searchParams.get('prospect_ref');}
function signup(p,token) {return {company_name:p?.business_name||'Enlace personal '+uid(),contact_name:'Contacto QA',email:p?.email||uid()+'@example.test',phone:'3100000000',nit:uid(),password:'LocalPrueba!2026',password_confirm:'LocalPrueba!2026',terms_accepted:true,privacy_accepted:true,plan_code:'STARTER',commercial_advisor_id:seller.id,...(token?{commercial_prospect_token:token}:{})};}
const current=async id=>(await query('select * from qori_sales_prospects where id=$1',[id])).rows[0];
async function approve(id) {return withTransaction(async db=>{const order=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[id])).rows[0];return payments.__testing.finalizeApprovedCreditPurchase(db,order,{id:uid(),status:'approved',transaction_amount:Number(order.price_cop),currency_id:'COP'});});}
after(async()=>{global.fetch=actualFetch;if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Prospect links cover signup, verified closure, isolation, rollback and reviewed historical repair',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 env.mercadoPagoAccessToken='TEST-local-only';env.mercadoPagoWebhookSecret='local-only';
 global.fetch=async(input,options)=>{if(String(input).startsWith('https://api.mercadopago.com/')){assert.ok(String(input).endsWith('/checkout/preferences'));return new Response(JSON.stringify(failProvider?{message:'QA provider failure'}:{id:uid(),init_point:'https://example.test/checkout'}),{status:failProvider?500:201});}assert.ok(String(input).startsWith(base),'No external requests in QA');return actualFetch(input,options);};
 admin=await person('QORI_SUPERADMIN');seller=await person('QORI_SELLER');other=await person('QORI_SELLER');
 await t.test('dashboard and CRM expose every public plan; checkout preserves plan, seller and exact prospect',async()=>{
  const dashboard=await api('/api/seller/dashboard',seller);assert.equal(dashboard.status,200);
  assert.deepEqual(dashboard.data.plan_referral_links.map(p=>p.code),['PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS','DESPEGA','STARTER','GROWTH','PRO']);
  for(const entry of dashboard.data.plan_referral_links){const url=new URL(entry.url);assert.equal(url.searchParams.get(entry.monthly_price_cop===0?'seller':'advisor'),seller.id);assert.equal(url.searchParams.has('prospect_ref'),false);if(entry.monthly_price_cop!==0)assert.equal(url.searchParams.get('plan'),entry.code);else assert.equal(url.searchParams.get('program'),entry.code);}
  for(const code of ['DESPEGA','STARTER','GROWTH','PRO']){
   const p=await prospect(),links=await api(path(p.id)+'/referral',seller),url=new URL(links.data.plan_referral_links.find(l=>l.code===code).url);
   assert.equal(url.searchParams.get('advisor'),seller.id);assert.equal(url.searchParams.get('plan'),code);
   const free=new URL(links.data.plan_referral_links[0].url);assert.equal(free.searchParams.get('prospect_ref'),url.searchParams.get('prospect_ref'));
   const result=await api('/api/public/signup/portal',null,{...signup(p,url.searchParams.get('prospect_ref')),plan_code:code});assert.equal(result.status,201,JSON.stringify(result));
   const order=(await query('select metadata,commission_seller_id from qr_credit_purchase_orders where id=$1',[result.data.order.id])).rows[0];
   assert.equal(order.commission_seller_id,seller.id);assert.equal(order.metadata.signup.plan_code,code);assert.equal((await current(p.id)).business_id,result.data.business.id);
  }
 });
 await t.test('signed link reuses exact contact and history; paid closure remains Admin-only and payment-driven',async()=>{
  const p=await prospect(),token=await link(p),payload=signup(p,token);
  assert.equal((await api(path(p.id)+'/referral',other)).status,403);assert.equal((await api(path(p.id)+'/referral',null)).status,401);
  const r=await api('/api/public/signup/portal',null,payload);assert.equal(r.status,201,JSON.stringify(r));const saved=await current(p.id);
  assert.equal(saved.business_id,r.data.business.id);assert.equal(saved.stage,'WON');assert.equal(saved.closed_at,null);assert.equal(saved.notes,p.notes);assert.equal(+saved.next_contact_at,+new Date(p.next_contact_at));assert.equal(saved.email,p.email);
  assert.equal((await query('select id from qori_sales_prospects where business_id=$1',[saved.business_id])).rowCount,1);
  assert.equal((await query('select commission_seller_id from qr_credit_purchase_orders where id=$1',[r.data.order.id])).rows[0].commission_seller_id,seller.id);
  assert.equal((await api(path(p.id)+'/closure',admin)).data.can_close,false);
  assert.equal((await api('/api/public/signup/portal',null,payload)).status,400);
  await approve(r.data.order.id);assert.equal((await api(path(p.id)+'/closure',admin)).data.can_close,true);
  const closure={payment_order_id:r.data.order.id,payment_verified:true,subscription_verified:true,reason:'Pago acreditado y suscripción vigente revisados en QA.'};
  assert.equal((await api(path(p.id)+'/closure',seller,closure)).status,403);assert.equal((await api(path(p.id)+'/closure',admin,closure)).status,200);
  assert.equal((await current(p.id)).closed_by,admin.id);assert.equal((await query('select id from qori_seller_commissions where order_id=$1',[r.data.order.id])).rowCount,1);
 });
 await t.test('free signup reuses prospect without creating a duplicate or a paid closure',async()=>{
  for(const code of ['PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS']){const p=await prospect(),token=await link(p),r=await api('/api/pense-en-ti/signup',null,{...signup(p,token),free_program:code});assert.equal(r.status,200,JSON.stringify(r));
  assert.equal((await current(p.id)).business_id,r.data.business_id);assert.equal((await query('select id from qori_sales_prospects where business_id=$1',[r.data.business_id])).rowCount,1);assert.equal((await api(path(p.id)+'/closure',admin)).data.can_close,false);}
 });
 await t.test('forged, expired, stale, other-seller, wrong-email and orphan tokens fail without provisioning',async()=>{
  const p=await prospect(),token=await link(p),original=signup(p,token),claims=jwt.decode(token);
  const key=createHmac('sha256',env.jwtSecret).update('qori-prospect-signup').digest('hex');
  const expired=jwt.sign({...claims,exp:1},key,{algorithm:'HS256'});
  for(const body of [{...original,commercial_prospect_token:token+'x'},{...original,commercial_prospect_token:expired},{...original,commercial_advisor_id:other.id},{...original,email:uid()+'@example.test'},{...original,commercial_advisor_id:null},{...original,commercial_prospect_token:jwt.sign(claims,env.jwtSecret)}]) {
   const r=await api('/api/public/signup/portal',null,body);assert.equal(r.status,400,JSON.stringify(r));assert.equal((await current(p.id)).business_id,null);
  }
  const login=await actualFetch(base+'/api/seller/me',{headers:{Authorization:'Bearer '+token}});assert.equal(login.status,401);
  await query('update qori_sales_prospects set email=$2 where id=$1',[p.id,uid()+'@example.test']);assert.equal((await api('/api/public/signup/portal',null,original)).status,400);
  await query('update qori_sales_prospects set email=$2,seller_id=$3 where id=$1',[p.id,p.email,other.id]);assert.equal((await api('/api/public/signup/portal',null,original)).status,400);
  assert.equal((await query('select id from app_users where email=$1',[original.email])).rowCount,0);
 });
 await t.test('provider failure rolls back prospect, account, user and order; same link can retry',async()=>{
  const p=await prospect(),token=await link(p),body=signup(p,token);failProvider=true;
  try{const r=await api('/api/public/signup/portal',null,body);assert.ok(r.status>=400);}finally{failProvider=false;}
  assert.equal((await current(p.id)).business_id,null);assert.equal((await current(p.id)).stage,'NEGOTIATING');assert.equal((await query('select id from app_users where email=$1',[body.email])).rowCount,0);
  assert.equal((await api('/api/public/signup/portal',null,body)).status,201);
 });
 await t.test('concurrent paid/free signup consumes one prospect only without deadlock or duplicate',async()=>{
  const p=await prospect(),token=await link(p),body=signup(p,token);
  const results=await Promise.all([api('/api/public/signup/portal',null,body),api('/api/pense-en-ti/signup',null,body)]);
  assert.equal(results.filter(r=>[200,201].includes(r.status)).length,1,JSON.stringify(results));assert.equal(results.filter(r=>r.status===400).length,1,JSON.stringify(results));assert.equal((await query('select id from qori_sales_prospects where business_id=$1',[(await current(p.id)).business_id])).rowCount,1);
 });
 await t.test('personal link creates a linked CRM record; Admin reconciles previous contact with audit and no ownership change',async()=>{
  const p=await prospect(),body=signup(p),r=await api('/api/public/signup/portal',null,body);assert.equal(r.status,201,JSON.stringify(r));const business=r.data.business.id;
  const automatic=(await query('select * from qori_sales_prospects where business_id=$1',[business])).rows[0];assert.ok(automatic);assert.notEqual(automatic.id,p.id);assert.equal((await current(p.id)).business_id,null);
  const candidates=await api(path(p.id)+'/linkable-businesses?search='+encodeURIComponent(body.email),admin);assert.ok(candidates.data.rows.some(b=>b.id===business));
  assert.equal((await api(path(p.id)+'/linkable-businesses',seller)).status,403);
  const payload={business_id:business,expected_linked_prospect_id:automatic.id,reason:'Cliente confirmó la cuenta y su seguimiento previo con Admin.'};
  assert.equal((await api(path(p.id)+'/business-link',seller,payload)).status,403);
  assert.equal((await api(path(p.id)+'/business-link',admin,{...payload,expected_linked_prospect_id:null})).status,400);
  const results=await Promise.all([api(path(p.id)+'/business-link',admin,payload),api(path(p.id)+'/business-link',admin,payload)]);assert.ok(results.every(r=>r.status===200),JSON.stringify(results));assert.equal(results.filter(r=>r.data.already_linked).length,1);
  assert.equal((await current(p.id)).business_id,business);assert.equal((await current(p.id)).notes,p.notes);assert.equal((await current(automatic.id)).stage,'LOST');assert.equal((await current(automatic.id)).business_id,null);
  assert.equal((await query("select id from qori_commercial_audit where entity_id=$1 and action='PROSPECT_BUSINESS_LINKED'",[p.id])).rowCount,1);
  assert.equal((await query('select seller_id from qori_sales_accounts where business_id=$1',[business])).rows[0].seller_id,seller.id);
 });
 await t.test('abandoned checkout recovers the same order without access or changes to attribution; approved payment stops repayment',async()=>{
  const p=await prospect(),token=await link(p),input=signup(p,token),created=await api('/api/public/signup/portal',null,input);assert.equal(created.status,201,JSON.stringify(created));
  const route='/api/public/signup/portal/recover',credentials={email:input.email,password:input.password};
  assert.equal((await api('/api/auth/login',null,credentials)).status,401,'Pending signup must not grant a portal session');
  assert.equal((await api(route,null,{...credentials,password:'wrong'})).status,401);
  assert.equal((await api(route,null,{...credentials,email:uid()+'@example.test'})).status,401);
  assert.equal((await api(route,null,{...credentials,commercial_advisor_id:other.id})).status,400);
  const recovered=await api(route,null,credentials);assert.equal(recovered.status,200,JSON.stringify(recovered));assert.equal(recovered.data.state,'PENDING_PAYMENT');assert.equal(recovered.data.order.id,created.data.order.id);assert.equal(recovered.data.token,undefined);assert.equal(recovered.data.order.payment_payload,undefined);
  assert.equal((await query('select id from qr_credit_purchase_orders where business_id=$1',[created.data.business.id])).rowCount,1);assert.equal((await current(p.id)).business_id,created.data.business.id);
  assert.equal((await query('select commission_seller_id from qr_credit_purchase_orders where id=$1',[created.data.order.id])).rows[0].commission_seller_id,seller.id);
  await query("update qr_credit_purchase_orders set status='REJECTED' where id=$1",[created.data.order.id]);assert.equal((await api(route,null,credentials)).status,200);
  await query("update qr_credit_purchase_orders set status='CANCELLED' where id=$1",[created.data.order.id]);assert.equal((await api(route,null,credentials)).status,400);
  await query("update qr_credit_purchase_orders set status='PENDING' where id=$1",[created.data.order.id]);await approve(created.data.order.id);
  const active=await api(route,null,credentials);assert.equal(active.status,200);assert.equal(active.data.state,'ACTIVE');assert.equal(active.data.order,undefined);
  await query("update businesses set subscription_status='SUSPENDED' where id=$1",[created.data.business.id]);assert.equal((await api(route,null,credentials)).status,400);
 });
 await t.test('credential throttles cannot be bypassed by rotating X-Forwarded-For or login entrypoint',async()=>{
  for(const kind of ['login','recovery']){
   const email=uid()+'@example.test';
   for(let attempt=0;attempt<9;attempt++){
    const route=kind==='recovery'?'/api/public/signup/portal/recover':attempt%2?'/api/auth/demo/login':'/api/auth/login';
    const response=await api(route,null,{email:attempt%2?email.toUpperCase():email,password:'IncorrectPassword!2026'});assert.equal(response.status,attempt<8?401:429,JSON.stringify(response));
   }
  }
 });
 await t.test('Admin repairs legacy missing link but cannot move another seller account or replace managed/closed contacts',async()=>{
  const p=await prospect(),otherP=await prospect(other),r=await api('/api/public/signup/portal',null,signup());assert.equal(r.status,201,JSON.stringify(r));const business=r.data.business.id,auto=(await query('select * from qori_sales_prospects where business_id=$1',[business])).rows[0];
  const payload={business_id:business,expected_linked_prospect_id:auto.id,reason:'Revisión administrativa del negocio de ejemplo histórico.'};
  assert.equal((await api(path(otherP.id)+'/business-link',admin,payload)).status,400);
  await query("update qori_commercial_audit set action='PROSPECT_CREATED' where entity_id=$1 and action='SIGNUP_PROSPECT_CREATED'",[auto.id]);assert.equal((await api(path(p.id)+'/business-link',admin,payload)).status,400);
  await query("update qori_sales_prospects set business_id=null,stage='LOST' where id=$1",[auto.id]);
  assert.equal((await api(path(p.id)+'/business-link',admin,{...payload,expected_linked_prospect_id:null})).status,200);assert.equal((await current(p.id)).business_id,business);
 });
});

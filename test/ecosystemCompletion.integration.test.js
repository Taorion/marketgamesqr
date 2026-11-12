const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID:uid}=require('node:crypto'),bcrypt=require('bcryptjs');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='ecosystem-completion-local-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),{env}=require('../backend/src/config/env'),sellerService=require('../backend/src/services/qoriSellerService');
let server,base,ip=0;const originalFetch=global.fetch,mails=[];
async function api(path,body){const r=await originalFetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Forwarded-For':'192.0.2.'+(++ip)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function seller(){const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Completion QA','QORI_SELLER') returning *",[uid()+'@example.test'])).rows[0];await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1','APPROVED')",[u.id,uid()]);return u;}
after(async()=>{global.fetch=originalFetch;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
test('complete ecosystem histories, pending owner recovery and real database readiness',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 env.resendApiKey='local-mock';global.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');mails.push(JSON.parse(options.body));return new Response(JSON.stringify({id:uid()}),{status:200});};
 const a=await seller(),foreign=await seller(),hash=await bcrypt.hash('OldPassword!2026',12);
 async function pending(){const b=(await query("insert into businesses(name,slug,plan_code,plan_type,is_active,subscription_status,settings) values('Pending reset QA',$1,'STARTER','premium_monthly',false,'PENDING_PAYMENT','{\"signup_type\":\"portal_subscription\"}') returning *",[uid()])).rows[0];
  const u=(await query("insert into app_users(email,password_hash,full_name,role,business_id,is_active) values($1,$2,'Owner QA','BUSINESS_OWNER',$3,false) returning *",[uid()+'@example.test',hash,b.id])).rows[0];
  await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$2)',[b.id,a.id]);
  const o=(await query("insert into qr_credit_purchase_orders(business_id,created_by_user_id,package_code,package_size,package_title,price_cop,external_reference,checkout_url,metadata) values($1,$2,'STARTER',0,'Plan QA',75000,$3,'https://example.test/original-checkout',$4::jsonb) returning *",[b.id,u.id,uid(),JSON.stringify({source:'public_portal_signup',signup:{user_id:u.id,type:'portal_monthly_subscription'}})])).rows[0];return {b,u,o};
 }
 const request=u=>api('/api/auth/password/request-reset',{email:u.email});
 const reset=token=>api('/api/auth/password/reset',{token,password:'NewPassword!2026',password_confirm:'NewPassword!2026'});
 await t.test('pending signup can reset once, remains inactive and resumes the same attributed order',async()=>{
  const {b,u,o}=await pending();const issued=await request(u);assert.equal(issued.status,200);assert.ok(issued.data.reset_token);assert.equal(mails.at(-1).to[0],u.email);
  const results=await Promise.all([reset(issued.data.reset_token),reset(issued.data.reset_token)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);assert.equal(results.find(r=>r.status===200).data.next_url,'/paquetes/#retomar');
  const saved=(await query('select is_active,password_version from app_users where id=$1',[u.id])).rows[0];assert.equal(saved.is_active,false);assert.ok(saved.password_version>u.password_version);
  assert.equal((await api('/api/auth/login',{email:u.email,password:'NewPassword!2026'})).status,401);
  assert.equal((await api('/api/public/signup/portal/recover',{email:u.email,password:'OldPassword!2026'})).status,401);
  const recovered=await api('/api/public/signup/portal/recover',{email:u.email,password:'NewPassword!2026'});assert.equal(recovered.status,200,JSON.stringify(recovered));assert.equal(recovered.data.order.id,o.id);
  assert.equal((await query('select seller_id from qori_sales_accounts where business_id=$1',[b.id])).rows[0].seller_id,a.id);
  const phase=(await sellerService.accounts(a,{business_ids:b.id})).accounts[0].lifecycle;assert.equal(phase.phase,'PAYMENT_PENDING');assert.equal(phase.access_allowed,false);
 });
 await t.test('suspension, administrative deactivation, wrong role and setup accounts never get inactive reset access',async()=>{
  const unknown=await request({email:uid()+'@example.test'});assert.equal(unknown.data.reset_token,undefined);
  for(const mode of ['suspended','deactivated','role','setup','noorder']){
   const {b,u,o}=await pending();
   if(mode==='suspended')await query("update businesses set portal_status='SUSPENDED' where id=$1",[b.id]);
   if(mode==='deactivated')await query('update app_users set deactivated_at=now() where id=$1',[u.id]);
   if(mode==='role')await query("update app_users set role='QORI_SELLER' where id=$1",[u.id]);
   if(mode==='setup')await query('update app_users set password_setup_required=true where id=$1',[u.id]);
   if(mode==='noorder')await query("update qr_credit_purchase_orders set status='CANCELLED' where id=$1",[o.id]);
   const count=mails.length,r=await request(u);assert.deepEqual(r.data,unknown.data,mode);assert.equal(mails.length,count);
  }
 });
 await t.test('state is rechecked on token consumption and expired/replaced tokens fail',async()=>{
  const {b,u}=await pending(),first=await request(u),second=await request(u);assert.equal((await reset(first.data.reset_token)).status,400);
  await query("update businesses set portal_status='SUSPENDED' where id=$1",[b.id]);assert.equal((await reset(second.data.reset_token)).status,400);
  const next=await pending(),issued=await request(next.u);await query("update password_reset_tokens set expires_at=now()-interval '1 second' where user_id=$1",[next.u.id]);assert.equal((await reset(issued.data.reset_token)).status,400);
 });
 await t.test('active accounts keep normal password recovery and previous sessions are revoked',async()=>{
  const {b,u}=await pending();await query("update businesses set is_active=true,subscription_status='ACTIVE' where id=$1",[b.id]);await query('update app_users set is_active=true where id=$1',[u.id]);
  const issued=await request(u),result=await reset(issued.data.reset_token);assert.equal(result.status,200);assert.equal(result.data.next_url,'/empresa/');assert.equal((await query('select password_version from app_users where id=$1',[u.id])).rows[0].password_version,Number(u.password_version)+1);
 });
 await t.test('all histories exceed previous caps, search the entire portfolio and isolate sellers',async()=>{
  const owner=await seller();
  const businesses=(await query("insert into businesses(name,slug,plan_code,plan_type,subscription_status) select 'History QA '||n,gen_random_uuid()::text,'PENSE_EN_TI','premium_monthly','ACTIVE' from generate_series(1,205) n returning id",[])).rows;
  const ids=businesses.map(b=>b.id);await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) select unnest($1::uuid[]),$2,$2',[ids,owner.id]);
  const orders=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference) select unnest($1::uuid[]),'QR50',50,'Tickets QA',10000,gen_random_uuid()::text returning id,business_id",[ids])).rows;
  await query("insert into qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,rate,amount_cop,due_on) select $1,unnest($2::uuid[]),unnest($3::uuid[]),'TICKETS',10000,0.10,1000,'2026-11-12'",[owner.id,orders.map(o=>o.business_id),orders.map(o=>o.id)]);
  await query("insert into qori_seller_payouts(seller_id,request_id,gross_cop,transfer_reference,paid_on,recorded_by) select $1,gen_random_uuid(),1000,$2||'-'||n,'2026-11-12',$1 from generate_series(1,105)n",[owner.id,uid()]);
  const dashboard=await sellerService.dashboard(owner);assert.equal(dashboard.totals.accounts_count,205);assert.equal(dashboard.totals.pending_cop,'205000.00');
  for(const [view,count] of [['accounts',205],['commissions',205],['payouts',105]]){
   const seen=new Set();let offset=0;
   do{const r=await sellerService.history(owner,{view,offset,seller_id:foreign.id});for(const row of r.rows){assert.equal(seen.has(row.id),false);seen.add(row.id);if(view!=='accounts')assert.equal(row.seller_id,owner.id);}offset=r.pagination.has_more?r.pagination.next_offset:null;}while(offset!==null);
   assert.equal(seen.size,count,view);assert.equal((await sellerService.history(foreign,{view})).rows.length,0);
  }
  const outside=ids.find(id=>!dashboard.accounts.some(b=>b.id===id));await query("update businesses set name='Unique older business QA' where id=$1",[outside]);
  assert.equal((await sellerService.history(owner,{view:'accounts',search:'Unique older'})).rows[0].id,outside);
  assert.equal((await sellerService.history(owner,{view:'commissions',search:'Unique older'})).rows[0].business_id,outside);
  assert.equal((await sellerService.accounts(owner,{business_ids:outside})).accounts[0].id,outside);
  assert.equal((await sellerService.accounts(foreign,{business_ids:outside})).accounts.length,0);
  await query('update businesses set is_active=false where id=any($1::uuid[])',[ids]);
  await query("with b as (insert into businesses(name,slug,plan_code,plan_type,subscription_status) select 'New free QA',gen_random_uuid()::text,'PENSE_EN_TI','premium_monthly','ACTIVE' from generate_series(1,501) returning id) insert into qori_sales_accounts(business_id,seller_id,assigned_by) select id,$1,$1 from b",[owner.id]);
  const firstFiltered=await sellerService.history(owner,{view:'accounts',phase:'SUSPENDED'});assert.equal(firstFiltered.rows.length,0);assert.equal(firstFiltered.pagination.has_more,true);
  const filteredIds=new Set();let offset=firstFiltered.pagination.next_offset;
  do{const page=await sellerService.history(owner,{view:'accounts',phase:'SUSPENDED',offset});for(const row of page.rows){assert.equal(row.lifecycle.phase,'SUSPENDED');assert.equal(filteredIds.has(row.id),false);filteredIds.add(row.id);}offset=page.pagination.has_more?page.pagination.next_offset:null;}while(offset!==null);
  assert.equal(filteredIds.size,205);
  await assert.rejects(()=>sellerService.history(owner,{offset:-1}),e=>e.status===400);
  assert.equal((await api('/api/seller/history')).status,401);
 });
 await t.test('readiness checks the actual database and reports no internal details',async()=>{
  const r=await api('/api/ready');assert.equal(r.status,200);assert.deepEqual(r.data,{ok:true,database:'ready'});
  const {createReadiness}=require('../backend/src/services/readinessService');let calls=0;
  const failed=createReadiness({query:async()=>{calls++;throw Error('private database error');}});
  assert.deepEqual(await failed.check(),{ok:false,database:'unavailable'});await failed.check();assert.equal(calls,1);
  assert.equal((await createReadiness({query:async()=>({rows:[{ready:false}]})}).check()).ok,false);
 });
});

const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='accounts-admin-qa-secret';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),auth=require('../backend/src/services/customerAuthService'),password=require('../backend/src/services/customerPasswordService');
const uuid=()=>crypto.randomUUID();let server,base,admin,seller,customer,business,owner;
const sign=u=>jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET);
async function api(path,user,body){const r=await fetch(base+path,{method:body?'PATCH':'GET',headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+(typeof user==='string'?user:sign(user))}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function account(role){return (await query("insert into app_users(email,full_name,role,password_hash) values($1,'Admin QA',$2,'qa') returning *",[uuid()+'@example.test',role])).rows[0];}
test('Account administration: authorization, all versions, sessions and audited updates',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 admin=await account('QORI_SUPERADMIN');seller=await account('QORI_SELLER');owner=await account('BUSINESS_OWNER');
 business=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Empresa admin QA',$1,'PENSE_EN_TI','ACTIVE','{}') returning *",['qa-admin-'+uuid()])).rows[0];await query('update app_users set business_id=$2 where id=$1',[owner.id,business.id]);
 customer=(await query("insert into customer_accounts(email,full_name,declared_document_key) values($1,'Customer admin QA',$2) returning *",[uuid()+'@example.test',uuid()])).rows[0];
 await t.test('only superadmin can list, view or change accounts',async()=>{
  for(const u of [null,seller,owner])for(const path of ['/bootstrap','/customers','/businesses','/sellers','/customers/'+customer.id])assert.equal((await api('/api/admin/accounts'+path,u)).status,u?403:401);
  assert.equal((await api('/api/admin/accounts/customers/'+customer.id,seller,{full_name:'Bad',is_active:false,expected_revision:0,reason:'Intento fuera de permiso'})).status,403);
  const both={...owner};await query("update app_users set platform_role='QORI_SUPERADMIN' where id=$1",[both.id]);assert.equal((await api('/api/admin/accounts/bootstrap',both)).status,200);await query('update app_users set platform_role=null where id=$1',[both.id]);
 });
 await t.test('catalog, filters, pagination and minimal Customer detail',async()=>{
  const r=await api('/api/admin/accounts/bootstrap',admin);assert.equal(r.status,200,JSON.stringify(r));assert.ok(r.data.versions.businesses.some(p=>p.code==='PENSE_EN_TI'));assert.deepEqual(r.data.versions.customers.map(p=>p.code),['CUSTOMER_FREE']);
  const rows=await api('/api/admin/accounts/customers?search='+encodeURIComponent(customer.email),admin);assert.equal(rows.data.total,1);assert.equal(rows.data.rows[0].id,customer.id);
  assert.equal((await api('/api/admin/accounts/customers?version=PAID',admin)).data.total,0);assert.equal((await api('/api/admin/accounts/customers?offset=-1',admin)).status,400);
  assert.equal((await api('/api/admin/accounts/customers?offset=1000000',admin)).data.rows.length,0);
  const byOwner=await api('/api/admin/accounts/businesses?search='+encodeURIComponent(owner.email),admin);assert.equal(byOwner.data.total,1);assert.equal(byOwner.data.rows[0].id,business.id);
  await query("insert into app_users(email,full_name,role,password_hash) select $1||n||'@example.test','Newer QA','BUSINESS_OWNER','qa' from generate_series(1,121) n",[uuid()]);
  const scoped=await api('/api/admin/users?business_id='+business.id,admin);assert.equal(scoped.status,200);assert.deepEqual(scoped.data.users.map(u=>u.id),[owner.id]);
  assert.equal((await api('/api/admin/users?business_id=invalid',admin)).status,400);
  for(const [kind,id] of [['businesses',business.id],['sellers',seller.id],['customers',customer.id]])assert.equal((await api('/api/admin/accounts/'+kind+'/'+id,admin)).status,200);
  const detail=(await api('/api/admin/accounts/customers/'+customer.id,admin)).data.record;assert.equal(detail.preferences,undefined);assert.equal(detail.password_hash,undefined);assert.equal(detail.entries,undefined);
 });
 await t.test('Customer suspension revokes sessions and blocks new login; reactivation needs a fresh session',async()=>{
  const login=await withTransaction(db=>auth.createSession(db,customer,'QA'));assert.equal((await api('/api/customer/me',login.token)).status,200);
  const body={full_name:customer.full_name,is_active:false,expected_revision:0,reason:'Suspensión de acceso en prueba'};
  assert.equal((await api('/api/admin/accounts/customers/'+customer.id,admin,body)).status,200);
  assert.equal((await api('/api/customer/me',login.token)).status,401);
  await assert.rejects(withTransaction(db=>auth.createSession(db,customer,'QA')),/suspendida/);
  const encoded=await password.hash('Password local seguro 2026');await query('insert into customer_password_credentials(customer_id,password_hash) values($1,$2)',[customer.id,encoded]);
  await assert.rejects(password.login(customer.email,'Password local seguro 2026','127.0.0.1'),/suspendida/);
  assert.equal((await api('/api/admin/accounts/customers/'+customer.id,admin,{...body,is_active:true})).status,400,'stale edit must fail');
  assert.equal((await api('/api/admin/accounts/customers/'+customer.id,admin,{...body,is_active:true,expected_revision:1})).status,200);
  assert.equal((await api('/api/customer/me',login.token)).status,401);const fresh=await withTransaction(db=>auth.createSession(db,customer,'QA'));assert.equal((await api('/api/customer/me',fresh.token)).status,200);
  assert.equal((await api('/api/admin/accounts/customers/'+customer.id,admin,{...body,is_active:true,revoke_sessions:true,expected_revision:2})).status,200);assert.equal((await api('/api/customer/me',fresh.token)).status,401);
  const result=(await api('/api/admin/accounts/customers/'+customer.id,admin)).data;assert.equal(result.history.length,3);assert.equal(result.record.declared_document_key,customer.declared_document_key);
 });
 await t.test('business updates are atomic and audited, preserve free credits, reject unknown plans and protected trials',async()=>{
  let current=(await api('/api/admin/accounts/businesses/'+business.id,admin)).data.record;
  const body={name:current.name,is_active:true,plan_code:'DESPEGA',subscription_status:'PENDING_PAYMENT',subscription_current_period_ends_at:null,expected_updated_at:current.updated_at,reason:'Ajuste administrativo de versión'};
  assert.equal((await api('/api/admin/accounts/businesses/'+business.id,admin,{...body,plan_code:'INVENTED'})).status,400);
  assert.equal((await api('/api/admin/accounts/businesses/'+business.id,admin,body)).status,200);
  assert.equal((await api('/api/admin/accounts/businesses/'+business.id,admin,body)).status,400);
  current=(await api('/api/admin/accounts/businesses/'+business.id,admin)).data.record;assert.equal(current.plan_code,'DESPEGA');
  assert.equal((await query('select count(*)::int n from qr_credit_purchase_orders where business_id=$1',[business.id])).rows[0].n,0);
  assert.equal((await api('/api/admin/accounts/businesses/'+business.id,admin,{...body,expected_updated_at:current.updated_at,plan_code:'DESCUBRE'})).status,400);
  assert.equal((await api('/api/admin/accounts/businesses/'+business.id,admin,{...body,expected_updated_at:current.updated_at,is_active:false})).status,200);
  assert.equal((await api('/api/business/profile',owner)).status,403);
  const history=(await api('/api/admin/accounts/businesses/'+business.id,admin)).data.history;assert.equal(history.length,2);assert.equal(history[0].detail.payment_recorded,false);
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-demo-isolated-test-secret';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs');
const id=()=>crypto.randomUUID(),password='SellerDemoLocal!2026';let server,base,seller,pending,normal,session,demoId;
const sign=u=>jwt.sign({sub:u.id,password_version:Number(u.password_version||0)},process.env.JWT_SECRET);
async function api(path,token,body,method=body?'POST':'GET'){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};
}
async function user(role,status){
 const u=(await query('insert into app_users(email,password_hash,full_name,role) values($1,$2,$3,$4) returning *',[id()+'@example.test',await bcrypt.hash(password,4),'Vendedor Demo QA',role])).rows[0];
 if(status)await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status) values($1,$2,'3100000000','Bogotá','4610',$3,$4)",[u.id,id(),require('../backend/src/services/qoriSellerPolicy').VERSION,status]);return u;
}
before(async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');seller=await user('QORI_SELLER','APPROVED');pending=await user('QORI_SELLER','DRAFT');normal=await user('ADMIN');
 demoId=(await query('select business_id from qori_seller_demo')).rows[0].business_id;
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
test('seed provides one fully unlocked Demo Qori, exact initial allocations and fictional portfolio',async()=>{
 const b=(await query('select * from businesses where id=$1',[demoId])).rows[0];assert.equal(b.name,'Demo Qori');assert.equal(b.is_seller_demo,true);
 const plan=require('../backend/src/services/subscriptionService').planFromBusiness(b);assert.equal(plan.portal_access_allowed,true);assert.ok(Object.values(plan.features).every(v=>v===true));assert.ok(Object.values(plan.limits).every(v=>v===null));
 const tickets=(await query('select qr_balance,qr_used_total from business_qr_credit_accounts where business_id=$1',[demoId])).rows[0];assert.equal(tickets.qr_balance+tickets.qr_used_total,10000);
 const gifts=(await query('select balance,used from qori_giftcard_credit_accounts where business_id=$1',[demoId])).rows[0];assert.equal(gifts.balance+gifts.used,1000);
 assert.equal((await query("select count(*)::int n from players where business_id=$1 and metadata->>'demo'='true'",[demoId])).rows[0].n,30);
 assert.equal((await query("select count(*)::int n from business_sales where business_id=$1 and metadata->>'demo'='true'",[demoId])).rows[0].n,20);
 assert.equal((await query('select count(*)::int n from business_inventory_products where business_id=$1',[demoId])).rows[0].n,6);
 assert.equal((await query('select 1 from qr_credit_purchase_orders where business_id=$1',[demoId])).rowCount,0);assert.equal((await query('select 1 from qori_seller_commissions where business_id=$1',[demoId])).rowCount,0);
});
test('same Seller credentials open Demo; normal Seller credentials and identity remain unchanged',async()=>{
 const original=await api('/api/auth/login',null,{email:seller.email,password});assert.equal(original.status,200);assert.equal(original.user.role,'QORI_SELLER');assert.equal(original.user.business_id,null);
 session=await api('/api/auth/demo/login',null,{email:seller.email,password});assert.equal(session.status,200,JSON.stringify(session));assert.equal(session.user.business_id,demoId);assert.equal(session.user.role,'BUSINESS_OWNER');assert.equal(session.user.demo_mode,true);assert.equal(session.user.email,seller.email);assert.notEqual(session.user.id,seller.id);
 assert.equal(jwt.decode(session.token).sub,seller.id);assert.equal(jwt.decode(session.token).demo_business_id,demoId);
 assert.equal((await query('select business_id from app_users where id=$1',[seller.id])).rows[0].business_id,null);
 const me=await api('/api/auth/me',session.token);assert.equal(me.status,200);assert.equal(me.user.demo_mode,true);assert.equal(me.user.subscription.plan.name,'Demo Qori · acceso completo');
 assert.equal((await api('/api/business/profile',original.token)).status,403);
});
test('approved Seller opens demo from Seller; concurrent sessions share one mapped actor and business',async()=>{
 const sessions=await Promise.all([api('/api/seller/demo/session',sign(seller),{}),api('/api/seller/demo/session',sign(seller),{})]);
 for(const d of sessions){assert.equal(d.status,200,JSON.stringify(d));assert.equal(d.user.id,session.user.id);assert.equal(d.user.business_id,demoId);}
 assert.equal((await query('select count(*)::int n from qori_seller_demo_members where seller_id=$1',[seller.id])).rows[0].n,1);
 const second=await user('QORI_SELLER','APPROVED'),d=await api('/api/seller/demo/session',sign(second),{});assert.equal(d.status,200);assert.equal(d.user.business_id,demoId);assert.notEqual(d.user.id,session.user.id);
});
test('pending, unapproved and non-Seller accounts cannot open demo; suspension revokes already-issued sessions',async()=>{
 for(const u of [pending,normal])assert.equal((await api('/api/auth/demo/login',null,{email:u.email,password})).status,403);
 assert.equal((await api('/api/seller/demo/session',sign(pending),{})).status,403);
 await query("update qori_seller_applications set status='SUSPENDED' where user_id=$1",[seller.id]);assert.equal((await api('/api/business/profile',session.token)).status,403);
 await query("update qori_seller_applications set status='APPROVED' where user_id=$1",[seller.id]);assert.equal((await api('/api/business/profile',session.token)).status,200);
 await query('update app_users set password_version=password_version+1 where id=$1',[seller.id]);assert.equal((await api('/api/business/profile',session.token)).status,401);
 await query('update app_users set password_version=password_version-1 where id=$1',[seller.id]);
});
test('demo workspace endpoints expose sample data and isolated balances',async()=>{
 for(const path of ['/api/dashboard/businesses/'+demoId,'/api/business/analytics/command-center','/api/business/campaigns','/api/qr/credits/me','/api/business/users','/api/business/access','/api/business/profile','/api/business/tickets/balance','/api/business/leads/crm?audience_type=CLIENT','/api/business/stamp-cards/context','/api/business/reward-passes/context','/api/portal/businesses/'+demoId+'/campaigns','/api/portal/businesses/'+demoId+'/affiliates']){
  const result=await api(path,session.token);assert.equal(result.status,200,path+' '+JSON.stringify(result).slice(0,200));
 }
 const clients=await api('/api/business/leads/crm?audience_type=CLIENT&search=Demo',session.token);assert.ok(clients.leads.length>=30);
 const gift=await api('/api/business/reward-passes/context',session.token);assert.ok(JSON.stringify(gift).includes('giftcard_balance'));
 const explore=require('../backend/src/services/customerExploreService');
 assert.equal((await explore.directory({search:'Demo Qori'})).businesses.some(b=>b.id===demoId),false);
 await assert.rejects(()=>explore.businessPage('demo-qori-seller'),e=>e.status===404);
});
test('demo tokens cannot reach Admin/Seller, another tenant, real checkout, sending or security settings',async()=>{
 for(const path of ['/api/admin/commercial/bootstrap','/api/seller/dashboard','/api/portal/businesses/'+id()+'/campaigns'])assert.equal((await api(path,session.token)).status,403,path);
 for(const path of ['/api/payments/tickets/checkout','/api/auth/password/change','/api/business/users','/api/business/communications/'+id()+'/send','/api/business/communications/email-connection'])assert.equal((await api(path,session.token,{})).status,403,path);
 const fake=jwt.sign({sub:seller.id,demo_business_id:id(),password_version:0},process.env.JWT_SECRET);assert.equal((await api('/api/business/profile',fake)).status,403);
 assert.equal((await api('/api/business/profile')).status,401);
});
test('demo Gift Card issuance uses its own pool, keeps tickets intact and remains idempotent',async()=>{
 const service=require('../backend/src/services/rewardPassService'),before=await service.getTicketContext(session.user),key=id();
 const p={buyer_name:'Comprador ficticio QA',beneficiary_name:'Destinatario ficticio QA',beneficiary_email:id()+'@demo-qori.invalid',initial_value_cop:50000,branch_authorization_scope:'ALL_BRANCHES',terms:'Demostración sin valor comercial.',idempotency_key:key};
 const first=await service.createRewardPass(session.user,p),again=await service.createRewardPass(session.user,p);assert.equal(first.id,again.id);
 const after=await service.getTicketContext(session.user);assert.equal(after.giftcard_balance,before.giftcard_balance-1);assert.equal(after.ticket_balance,before.ticket_balance);
});

test('demo benefits cannot be offered to Customer and protected training assets accept the independent demo cookie',async()=>{
 const delivery=require('../backend/src/services/customerBenefitDeliveryService');
 const member=(await query('select * from stamp_members where business_id=$1 limit 1',[demoId])).rows[0];
 const source=await delivery.source('STAMP',member.id);
 assert.equal(await delivery.available({declared_document_key:member.document_key,email:member.email},source,{query}),false);
 const r=await fetch(base+'/js/flipbook-turn.js',{headers:{Cookie:'qori_portal_access=expired; qori_demo_portal_access='+encodeURIComponent(session.token)},redirect:'manual'});
 assert.equal(r.status,200);
 assert.equal((await fetch(base+'/js/flipbook-turn.js')).status,401);
});

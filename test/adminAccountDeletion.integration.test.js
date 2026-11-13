const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),jwt=require('jsonwebtoken');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='admin-deletion-local-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
let server,base,admin,sandra;const uuid=()=>crypto.randomUUID();
const token=u=>jwt.sign({sub:u.id,password_version:u.password_version||0},process.env.JWT_SECRET);
async function api(path,user,body,method='GET'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+token(user)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function account(role='QORI_SELLER',business=null){return (await query("insert into app_users(email,password_hash,full_name,role,business_id) values($1,'qa','Embajador QA',$2,$3) returning *",[uuid()+'@example.test',role,business])).rows[0];}
async function business(){return (await query("insert into businesses(name,slug,plan_code,subscription_status) values('Negocio QA eliminación',$1,'PENSE_EN_TI','ACTIVE') returning *",['delete-qa-'+uuid()])).rows[0];}
const path=(kind,id)=>`/api/admin/accounts/${kind}/${id}`;
async function confirmation(kind,id,user=admin){const p=await api(path(kind,id)+'/deletion-preview',user);assert.equal(p.status,200,JSON.stringify(p));return {...p.data,confirmed:true,reason:'Eliminación solicitada para prueba aislada'};}
const body=p=>({token:p.token,confirmation:p.confirmation,confirmed:p.confirmed,reason:p.reason});
before(async()=>{assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');admin=await require('./helpers/adminIdentity').admin(query);sandra=await require('./helpers/adminIdentity').admin(query,'scasallas@gosqori.com');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

test('deletion requires authorized identity, bound fresh confirmation, exact text and reason',async()=>{
 const s=await account(),other=await account(),p=body(await confirmation('sellers',s.id));
 for(const u of [null,s]){assert.equal((await api(path('sellers',s.id)+'/deletion-preview',u)).status,u?403:401);assert.equal((await api(path('sellers',s.id),u,p,'DELETE')).status,u?403:401);}
 for(const invalid of [{...p,confirmed:false},{...p,confirmation:'wrong'},{...p,reason:'no'},{...p,token:'wrong'},{}])assert.equal((await api(path('sellers',s.id),admin,invalid,'DELETE')).status,400);
 assert.equal((await api(path('sellers',other.id),admin,p,'DELETE')).status,400);
 assert.equal((await api(path('sellers',s.id),sandra,p,'DELETE')).status,400);
 const claims=jwt.decode(p.token);delete claims.iat;delete claims.exp;
 assert.equal((await api(path('sellers',s.id),admin,{...p,token:jwt.sign(claims,process.env.JWT_SECRET,{expiresIn:-1})},'DELETE')).status,400);
 await query('update app_users set updated_at=now() where id=$1',[s.id]);
 assert.equal((await api(path('sellers',s.id),admin,p,'DELETE')).status,400);
 assert.equal((await query('select is_active from app_users where id=$1',[s.id])).rows[0].is_active,true);
 for(const u of [admin,sandra])assert.equal((await api(path('sellers',u.id)+'/deletion-preview',admin)).status,403);
 assert.equal((await api(path('customers',uuid())+'/deletion-preview',admin)).status,400);
});

test('ambassador deletion closes old sessions, consumes links and keeps canonical financial history; replay is rejected',async()=>{
 const s=await account(),b=await business();
 await query('insert into qori_sales_profiles(user_id,created_by) values($1,$2)',[s.id,admin.id]);
 await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)',[b.id,s.id,admin.id]);
 const order=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,commission_seller_id) values($1,'QA',10,'QA',10000,$2,$3) returning id",[b.id,uuid(),s.id])).rows[0];
 await query("insert into qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,amount_cop,due_on) values($1,$2,$3,'TICKETS',10000,1000,current_date)",[s.id,b.id,order.id]);
 await query("insert into qori_seller_activations(user_id,token_hash,expires_at,created_by) values($1,$2,now()+interval '7 days',$3)",[s.id,crypto.randomBytes(32).toString('hex'),admin.id]);
 const p=body(await confirmation('sellers',s.id));assert.equal((await api('/api/auth/me',s)).status,200);
 const results=await Promise.all([api(path('sellers',s.id),admin,p,'DELETE'),api(path('sellers',s.id),admin,p,'DELETE')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
 assert.equal((await api('/api/auth/me',s)).status,401);
 assert.equal((await api('/api/admin/accounts/sellers?search='+s.email,admin)).data.total,0);
 assert.equal((await api(path('sellers',s.id),admin)).status,404);
 assert.equal((await query('select amount_cop,status from qori_seller_commissions where order_id=$1',[order.id])).rows[0].status,'PENDING');
 assert.equal((await query('select commission_seller_id from qr_credit_purchase_orders where id=$1',[order.id])).rows[0].commission_seller_id,s.id);
 assert.equal((await query('select expires_at<=now() expired from qori_seller_activations where user_id=$1',[s.id])).rows[0].expired,true);
 assert.equal((await query("select count(*)::int n from qori_commercial_audit where entity_id=$1 and action='ACCOUNT_ADMIN_DELETED'",[s.id])).rows[0].n,1);
});

test('shared ambassador removal preserves business identity and legacy delete also requires reconfirmation',async()=>{
 const b=await business(),s=await account('BUSINESS_OWNER',b.id);await query("update app_users set platform_role='QORI_SELLER' where id=$1",[s.id]);
 assert.equal((await api('/api/admin/commercial/sellers/'+s.id,admin,{},'DELETE')).status,400);
 const p=body(await confirmation('sellers',s.id));assert.equal((await api('/api/admin/commercial/sellers/'+s.id,admin,p,'DELETE')).status,200);
 const fresh=(await query('select * from app_users where id=$1',[s.id])).rows[0];assert.equal(fresh.is_active,true);assert.equal(fresh.role,'BUSINESS_OWNER');assert.equal(fresh.platform_role,null);
 assert.equal((await api('/api/auth/me',s)).status,401);assert.equal((await api('/api/auth/me',fresh)).status,200);
});

test('business deletion revokes tenant access, hides lists, preserves sales and resists late payment reactivation',async()=>{
 const b=await business(),owner=await account('BUSINESS_OWNER',b.id),separate=await account();
 const sale=(await query('insert into business_sales(business_id,sale_amount) values($1,42000) returning id',[b.id])).rows[0];
 const p=body(await confirmation('businesses',b.id));assert.equal((await api(path('businesses',b.id),admin,p,'DELETE')).status,200);
 assert.equal((await api('/api/auth/me',owner)).status,401);
 const fresh=(await query('select * from app_users where id=$1',[owner.id])).rows[0];assert.equal((await api('/api/auth/me',fresh)).status,403);
 await query('update app_users set password_hash=$2 where id=$1',[owner.id,await require('bcryptjs').hash('LocalQA-Password!',4)]);assert.equal((await api('/api/auth/login',null,{email:owner.email,password:'LocalQA-Password!'},'POST')).status,403);
 assert.equal((await api('/api/auth/me',separate)).status,200);
 assert.equal((await api('/api/admin/accounts/businesses?search='+b.slug,admin)).data.total,0);
 assert.ok(!(await api('/api/admin/businesses',admin)).data.businesses.some(row=>row.id===b.id));
 assert.equal((await api(path('businesses',b.id),admin)).status,404);
 await query("update businesses set is_active=true,subscription_status='ACTIVE' where id=$1",[b.id]);
 assert.equal((await query('select is_active from businesses where id=$1',[b.id])).rows[0].is_active,false);
 assert.equal(Number((await query('select sale_amount from business_sales where id=$1',[sale.id])).rows[0].sale_amount),42000);
});

test('protected administrator companies and active recurring charges cannot be deleted',async()=>{
 const b=await business(),old=(await query('select business_id from app_users where id=$1',[admin.id])).rows[0].business_id;
 await query('update app_users set business_id=$2 where id=$1',[admin.id,b.id]);
 try{assert.equal((await api(path('businesses',b.id)+'/deletion-preview',admin)).status,403);}finally{await query('update app_users set business_id=$2 where id=$1',[admin.id,old]);}
 await query('update businesses set subscription_auto_renew_enabled=true where id=$1',[b.id]);
 assert.equal((await api(path('businesses',b.id)+'/deletion-preview',admin)).status,400);
 assert.equal((await query('select is_active from businesses where id=$1',[b.id])).rows[0].is_active,true);
});

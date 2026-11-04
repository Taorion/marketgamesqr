const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='purchase-local-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),finance=require('../backend/src/services/customerFinance'),jwt=require('jsonwebtoken');
let server,base,buyer,other,plan;
const today=()=>finance.dateKey(new Date(),'America/Bogota');
async function account(){
 const a=(await query("insert into customer_accounts(email,full_name,currency,timezone) values($1,'Compras QA','COP','America/Bogota') returning *",[crypto.randomUUID()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');
 await query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,'QA',now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};
}
async function api(url,user=buyer,body,method=body?'POST':'GET'){
 const r=await fetch(base+url,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {http_status:r.status,...await r.json()};
}
const purchase=(extra={})=>({request_id:crypto.randomUUID(),title:'Mercado semanal',category:'supermercado',currency:'COP',estimated_amount:'200',target_date:today(),note:'Solo lo necesario',...extra});
test('purchase planning connects budgets, obligations, benefits and real spending without duplicate sales',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;buyer=await account();other=await account();
 await t.test('plans are private, idempotent and do not create expenses',async()=>{
  const data=purchase(),r=await api('/api/customer/purchases',buyer,data);assert.equal(r.http_status,200,JSON.stringify(r));plan=r.plan;
  assert.equal((await api('/api/customer/purchases',buyer,data)).plan.id,plan.id);
  assert.equal((await api('/api/customer/purchases',other)).plans.length,0);
  assert.equal((await api('/api/customer/purchases/'+plan.id+'/candidates',other)).http_status,404);
  assert.equal((await api('/api/customer/dashboard')).total_minor,0);
  const withoutBudget=await api('/api/customer/purchases/overview');assert.equal(withoutBudget.projected_remaining_minor,null);
 });
 await t.test('monthly outlook subtracts registered spending, unpaid obligations and plans once per currency',async()=>{
  await api('/api/customer/budgets',buyer,{category:'ALL',period:'month',currency:'COP',amount:'1000',threshold:80});
  await api('/api/customer/recurring',buyer,{name:'Internet',amount:'100',currency:'COP',kind:'EXPENSE',category:'servicios',frequency:'month',next_date:today(),remind_days:3,reminders_enabled:true});
  await api('/api/customer/purchases',buyer,purchase({currency:'USD',estimated_amount:'999'}));
  const r=await api('/api/customer/purchases/overview?currency=COP');assert.equal(r.http_status,200,JSON.stringify(r));
  assert.equal(r.spent_minor,0);assert.equal(r.planned_minor,20000);assert.equal(r.obligations_minor,10000);assert.equal(r.projected_remaining_minor,70000);
 });
 await t.test('concurrent paid confirmation creates one expense and actual spending replaces the estimate',async()=>{
  const payload={revision:plan.revision,confirmed:true,amount:'150',paid_on:today(),merchant:'Supermercado QA'};
  const r=await Promise.all([api('/api/customer/purchases/'+plan.id+'/complete',buyer,payload),api('/api/customer/purchases/'+plan.id+'/complete',buyer,payload)]);
  for(const result of r)assert.equal(result.http_status,200,JSON.stringify(result));
  assert.equal(r[0].plan.entry_id,r[1].plan.entry_id);plan=r[0].plan;
  const overview=await api('/api/customer/purchases/overview?currency=COP'),paid=overview.plans.find(p=>p.id===plan.id);
  assert.equal(overview.spent_minor,15000);assert.equal(overview.planned_minor,0);assert.equal(overview.projected_remaining_minor,75000);assert.equal(paid.difference_minor,5000);
 });
 await t.test('reopening and cancellation never delete spending and a reopened plan cannot create the expense twice',async()=>{
  let r=await api('/api/customer/purchases/'+plan.id+'/state',buyer,{revision:plan.revision,action:'REOPEN'});assert.equal(r.http_status,200);plan=r.plan;
  assert.equal((await api('/api/customer/dashboard')).total_minor,15000);
  assert.equal((await api('/api/customer/purchases/'+plan.id+'/complete',buyer,{revision:plan.revision,confirmed:true,amount:'999',paid_on:today(),merchant:'Duplicate'})).http_status,400);
  const candidates=await api('/api/customer/purchases/'+plan.id+'/candidates');assert.equal(candidates.movements.length,1);
  r=await api('/api/customer/purchases/'+plan.id+'/complete',buyer,{revision:plan.revision,confirmed:true,entry_id:candidates.movements[0].entry_id});assert.equal(r.http_status,200);plan=r.plan;
  assert.equal((await api('/api/customer/dashboard')).total_minor,15000);
  const otherPlan=(await api('/api/customer/purchases',buyer,purchase())).plan;
  assert.equal((await api('/api/customer/purchases/'+otherPlan.id+'/complete',buyer,{revision:otherPlan.revision,confirmed:true,entry_id:plan.entry_id})).http_status,400);
 });
 await t.test('a voided or deleted movement requires review instead of reporting invented savings',async()=>{
  await query('update customer_entries set deleted_at=now() where id=$1 and customer_id=$2',[plan.entry_id,buyer.id]);
  const p=(await api('/api/customer/purchases')).plans.find(p=>p.id===plan.id);assert.equal(p.needs_review,true);assert.equal(p.actual,null);assert.equal(p.difference_minor,null);
  assert.equal((await api('/api/customer/dashboard')).total_minor,0);
 });
 await t.test('a canonical Empresa purchase is linked only by its recipient and is never counted twice',async()=>{
  const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Purchase QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
  const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Owner','BUSINESS_OWNER') returning *",[b.id,crypto.randomUUID()+'@example.test'])).rows[0],merchant={token:jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};
  const created=await api('/api/business/customer-acquisition-sales',merchant,{customer_name:'Compras QA',customer_document_id:'BUY-QA',sale_amount:80,currency:'COP',product_name:'Producto QA',payment_method:'CASH',acquisition_source:'STORE_WALK_IN',idempotency_key:crypto.randomUUID()});
  assert.equal(created.http_status,201,JSON.stringify(created));const sale=created.sale;
  const sent=await api('/api/business/customer/sale-deliveries',merchant,{sale_id:sale.id,public_id:buyer.public_id,request_id:crypto.randomUUID(),identity_checked:true});
  assert.equal(sent.http_status,200,JSON.stringify(sent));
  await api('/api/customer/invitations/'+sent.invitation.id+'/decision',buyer,{action:'ACCEPT',terms_accepted:true,auto_receive:true});
  const foreignPlan=(await api('/api/customer/purchases',other,purchase())).plan;
  assert.equal((await api('/api/customer/purchases/'+foreignPlan.id+'/complete',other,{revision:1,confirmed:true,sale_id:sale.id})).http_status,404);
  const ownPlan=(await api('/api/customer/purchases',buyer,purchase())).plan;
  const before=(await api('/api/customer/dashboard')).total_minor;
  const r=await api('/api/customer/purchases/'+ownPlan.id+'/complete',buyer,{revision:1,confirmed:true,sale_id:sale.id});assert.equal(r.http_status,200,JSON.stringify(r));
  assert.equal((await api('/api/customer/dashboard')).total_minor,before);assert.equal(before,8000);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[b.id])).rows[0].n,1);
 });
 await t.test('personal plans have RLS, no public grants, export and account deletion coverage',async()=>{
  assert.equal((await query("select relrowsecurity from pg_class where oid='public.customer_purchase_plans'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await query("select count(*)::int n from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a left join pg_roles r on r.oid=a.grantee where c.oid='public.customer_purchase_plans'::regclass and (a.grantee=0 or r.rolname in ('anon','authenticated'))")).rows[0].n,0);
  assert.ok((await api('/api/customer/export')).customer_purchase_plans.length);
  assert.equal((await api('/api/customer/me',other,{confirmation:'ELIMINAR MI CUENTA'},'DELETE')).http_status,200);
  assert.equal((await query('select count(*)::int n from customer_purchase_plans where customer_id=$1',[other.id])).rows[0].n,0);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

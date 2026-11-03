const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('node:fs/promises'),path=require('node:path');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='customer-finance-local-qa';process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),delivery=require('../backend/src/services/customerFinanceDeliveryService');
let server,base,buyer,other,merchant,foreign,sale,invite,manual,second;
async function api(url,token,body,method=body?'POST':'GET'){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
async function login(name){const c=await api('/api/customer/auth/code',null,{email:crypto.randomUUID()+'@example.test'}),mail=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-customer/mailbox',c.challenge_id+'.json'),'utf8')),r=await api('/api/customer/auth/verify',null,{challenge_id:c.challenge_id,code:mail.code});await query('update customer_accounts set full_name=$2 where id=$1',[r.account.id,name]);return r;}
async function business(){const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Finanzas QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0],u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Dueño QA','BUSINESS_OWNER') returning *",[b.id,crypto.randomUUID()+'@example.test'])).rows[0];return {b,u,token:jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};}
async function createSale(amount=12000){const r=await api('/api/business/customer-acquisition-sales',merchant.token,{customer_name:'Compradora Financiera',customer_document_id:'FIN-QA-123',sale_amount:amount,currency:'COP',product_name:'Compra de prueba',payment_method:'CASH',acquisition_source:'STORE_WALK_IN',idempotency_key:crypto.randomUUID()});assert.equal(r.status,201,JSON.stringify(r));return r.sale;}
const send=(s,publicId=buyer.account.public_id,token=merchant.token)=>api('/api/business/customer/sale-deliveries',token,{sale_id:s.id,public_id:publicId,request_id:crypto.randomUUID(),identity_checked:true});
const accept=(i,auto=true,token=buyer.token)=>api('/api/customer/invitations/'+i.id+'/decision',token,{action:'ACCEPT',terms_accepted:true,auto_receive:auto});
test('financial delivery preserves canonical sales, consent, automatic capture and personal expense controls',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await login('Andrea Finanzas');other=await login('Otra Cuenta');merchant=await business();foreign=await business();sale=await createSale();
 await t.test('a new buyer receives a private purchase invitation without another sale or expense',async()=>{
  assert.equal((await send(sale,buyer.account.public_id,foreign.token)).status,404);
  assert.equal((await api('/api/business/customer/sale-deliveries',buyer.token)).status,401);
  const r=await send(sale);assert.equal(r.status,200,JSON.stringify(r));invite=r.invitation;assert.equal(invite.state,'PENDING');
  assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,0);
  assert.equal((await api('/api/customer/sales/'+sale.id,buyer.token)).status,404);
  assert.equal((await api('/api/customer/invitations',other.token)).invitations.length,0);
  assert.equal((await send(sale)).invitation.id,invite.id);
  assert.equal((await send(sale,other.account.public_id)).status,400);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,1);
 });
 await t.test('only the recipient accepts; the seller and original sale stay unchanged',async()=>{
  assert.equal((await accept(invite,true,other.token)).status,404);
  assert.equal((await accept(invite)).status,200);
  const d=await api('/api/customer/dashboard',buyer.token);assert.equal(d.status,200,JSON.stringify(d));assert.equal(d.total_minor,1200000);
  assert.equal((await api('/api/customer/sales/'+sale.id,other.token)).status,404);
  assert.equal((await query('select seller_user_id from business_sales where id=$1',[sale.id])).rows[0].seller_user_id,merchant.u.id);
  assert.equal((await api('/api/customer/finance-connections',buyer.token)).connections[0].auto_receive,true);
 });
 await t.test('manual expenses merge with explicitly delivered sales once, preserving notes and receipts',async()=>{
  const r=await api('/api/customer/entries',buyer.token,{request_id:crypto.randomUUID(),amount:'12000',currency:'COP',occurred_at:new Date().toISOString(),merchant:'Finanzas QA',category:'alimentacion',priority:'FLEXIBLE',note:'Mi gasto anotado antes'});assert.equal(r.status,200);manual=r.entry;
  const receipt=await api('/api/customer/entries/'+manual.id+'/receipts',buyer.token,{filename:'compra-qa.pdf',mime_type:'application/pdf',base64:Buffer.from('%PDF-1.7\n%%EOF').toString('base64')});assert.equal(receipt.status,200);
  assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,2400000);
  assert.equal((await api('/api/customer/entries/'+manual.id+'/matches',buyer.token)).candidates[0].sale_id,sale.id);
  const payload={sale_id:sale.id,confirmed:true};
  await Promise.all([api('/api/customer/entries/'+manual.id+'/link',buyer.token,payload),api('/api/customer/entries/'+manual.id+'/link',buyer.token,payload)]);
  const d=await api('/api/customer/dashboard',buyer.token);assert.equal(d.total_minor,1200000);assert.equal(d.movements.length,1);assert.equal(d.movements[0].note,'Mi gasto anotado antes');
  assert.equal((await api('/api/customer/sales/'+sale.id,buyer.token)).receipts[0].id,receipt.receipt.id);
  assert.equal((await api('/api/customer/sales/'+sale.id+'/note',buyer.token,{category:'hogar',priority:'ESSENTIAL',note:'Privada'},'PATCH')).status,200);
  assert.equal((await query('select sale_amount from business_sales where id=$1',[sale.id])).rows[0].sale_amount,'12000.00');
 });
 await t.test('authorized automatic receipt captures future sent purchases and can be switched off',async()=>{
  second=await createSale(5000);const r=await send(second);assert.equal(r.invitation.state,'ACCEPTED');
  assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,1700000);
  assert.equal((await api('/api/customer/finance-connections/'+merchant.b.id,other.token,{auto_receive:false},'PUT')).status,404);
  assert.equal((await api('/api/customer/finance-connections/'+merchant.b.id,buyer.token,{auto_receive:false},'PUT')).status,200);
  const third=await createSale(3000),next=await send(third);assert.equal(next.invitation.state,'PENDING');
  assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,1700000);
  await api('/api/customer/invitations/'+next.invitation.id+'/decision',buyer.token,{action:'REJECT'});
  assert.equal((await api('/api/customer/sales/'+third.id,buyer.token)).status,404);
 });
 await t.test('canonical voids, budgets and purchase reports remain scoped to their owner',async()=>{
  await api('/api/customer/budgets',buyer.token,{category:'ALL',period:'month',currency:'COP',amount:'20000',threshold:80});
  let d=await api('/api/customer/dashboard',buyer.token);assert.equal(d.budgets[0].percent,85);assert.ok(d.insights.some(i=>i.id.includes('budget:')));
  const v=await api('/api/business/sales/'+sale.id+'/void',merchant.token,{reason:'Devolución QA',idempotency_key:crypto.randomUUID()});assert.equal(v.status,200,JSON.stringify(v));
  d=await api('/api/customer/dashboard',buyer.token);assert.equal(d.total_minor,500000);assert.equal(d.movements.filter(r=>r.entry_id===manual.id).length,0);
  assert.equal((await api('/api/customer/sales/'+second.id+'/report',buyer.token,{reason:'Revisar detalle de compra QA'})).status,200);
  assert.equal((await api('/api/business/customer/reports',foreign.token)).reports.length,0);
  assert.equal((await api('/api/business/customer/reports',merchant.token)).reports[0].sale_id,second.id);
 });
 await t.test('recurring schedules are not expenses until confirmed, and concurrent confirmations post once',async()=>{
  const date=require('../backend/src/services/customerFinance').dateKey(new Date(),'America/Bogota'),r=await api('/api/customer/recurring',buyer.token,{name:'Internet QA',currency:'COP',amount:'60000',kind:'EXPENSE',category:'servicios',next_date:date,frequency:'month'});
  assert.equal(r.status,200);assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,500000);
  const body={expected_date:date,paid_on:date,confirmed:true},url='/api/customer/recurring/'+r.recurring.id+'/record';
  assert.equal((await api(url,other.token,body)).status,404);
  const results=await Promise.all([api(url,buyer.token,body),api(url,buyer.token,body)]);for(const x of results)assert.equal(x.status,200,JSON.stringify(x));assert.equal(results[0].entry_id,results[1].entry_id);
  assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,6500000);
  assert.equal(delivery.nextDate('2028-01-31','month'),'2028-02-29');assert.equal(delivery.nextDate('2028-02-29','year'),'2029-02-28');
 });
 await t.test('new financial links have RLS and no PUBLIC grants; unrelated businesses cannot list purchases',async()=>{
  assert.equal((await api('/api/business/customer/sale-deliveries',foreign.token)).sales.length,0);
  const r=await query("select relrowsecurity from pg_class where relname in ('customer_sale_deliveries','customer_finance_connections','customer_recurring_posts')");
  assert.equal(r.rows.length,3);assert.ok(r.rows.every(r=>r.relrowsecurity));
  assert.equal((await query("select count(*)::int n from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.relname in ('customer_sale_deliveries','customer_finance_connections','customer_recurring_posts') and a.grantee=0")).rows[0].n,0);
 });
 await t.test('a verified connection without historical consent does not silently import older purchases',async()=>{
  const old=await createSale(2000);
  await query("update business_sales set created_at=now()-interval '2 days',paid_at=now()-interval '2 days' where id=$1",[old.id]);
  await query("insert into customer_relationships(customer_id,business_id,document_key,state,accepted_at,include_history) values($1,$2,'finqa123','ACCEPTED',now(),false)",[buyer.account.id,merchant.b.id]);
  assert.equal((await send(old)).invitation.state,'PENDING');
  assert.equal((await api('/api/customer/sales/'+old.id,buyer.token)).status,404);
 });
 await t.test('deleting the personal account removes financial access and schedules but retains original business sales',async()=>{
  const r=await api('/api/customer/me',buyer.token,{confirmation:'ELIMINAR MI CUENTA'},'DELETE');assert.equal(r.status,200,JSON.stringify(r));
  assert.equal((await api('/api/customer/dashboard',buyer.token)).status,401);
  assert.equal((await query('select count(*)::int n from customer_sale_deliveries where customer_id=$1',[buyer.account.id])).rows[0].n,0);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,4);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

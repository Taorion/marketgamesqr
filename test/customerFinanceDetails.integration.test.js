const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='details-local-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),finance=require('../backend/src/services/customerFinance');
let server,base,buyer,other,book,otherBook,grocery,completed,expense,loan;
const today=()=>finance.dateKey(new Date(),'America/Bogota'),uuid=()=>crypto.randomUUID();
async function account(){const a=(await query("insert into customer_accounts(email,full_name,currency,timezone) values($1,'Details QA','COP','America/Bogota') returning *",[uuid()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,'QA',now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function api(url,body,selected=book?.id,user=buyer,method=body?'POST':'GET'){const r=await fetch(base+(url.startsWith('/api/')?url:'/api/customer'+url),{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(selected?{'X-Qori-Book':selected}:{})},...(body?{body:JSON.stringify(body)}:{})});return {http_status:r.status,...await r.json()};}
const item=(name,quantity,price,extra={})=>({id:uuid(),name,unit:'unidad',quantity,estimated_price:price,in_cart:false,...extra});
test('market list lifecycle and detailed credit components',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await account();other=await account();book=(await api('/finance-books')).books[0];otherBook=(await api('/finance-books',{request_id:uuid(),name:'Ganado',currency:'COP'})).book;
 book=(await api('/finance-books/'+book.id,{name:'Casa',revision:1,opening_amount:'5000',opening_date:today()},book.id,buyer,'PUT')).book;
 await t.test('lists start as intentions, preserve unknown prices and stay scoped',async()=>{
  const body={request_id:uuid(),title:'Mercado semanal',items:[item('Arroz',2,'100'),item('Leche',1,'50'),item('Fruta',1,null)]};
  const r=await api('/groceries',body);assert.equal(r.http_status,200,JSON.stringify(r));grocery=r.list;assert.equal((await api('/groceries',body)).list.id,grocery.id);
  assert.equal((await api('/groceries/'+grocery.id,null,otherBook.id)).http_status,404);assert.equal((await api('/groceries/'+grocery.id,null,null,other)).http_status,404);
  const h=await api('/finance-home');assert.equal(h.grocery.estimated_minor,25000);assert.equal(h.grocery.unknown_prices,1);assert.equal(h.balance_minor,500000);assert.equal(h.projected_remaining_minor,475000);
  assert.equal((await api('/purchases/overview')).planned_minor,25000);
 });
 await t.test('saving real prices still does not record spending; revision protects concurrent editing',async()=>{
  const items=grocery.items.map((i,index)=>index===0?{...i,in_cart:true,actual_quantity:1,actual_price:'90'}:i);
  const r=await api('/groceries/'+grocery.id,{title:grocery.title,items,revision:grocery.revision},book.id,buyer,'PUT');assert.equal(r.http_status,200,JSON.stringify(r));grocery=r.list;
  assert.equal((await api('/finance-home')).spent_minor,0);
  assert.equal((await api('/groceries/'+grocery.id,{title:'Vieja',items,revision:1},book.id,buyer,'PUT')).http_status,400);
 });
 await t.test('concurrent completion creates one real expense and carries only unbought quantities forward',async()=>{
  const data={revision:grocery.revision,confirmed:true,carry_forward:true,merchant:'Supermercado QA',paid_on:today()};
  const results=await Promise.all([api('/groceries/'+grocery.id+'/complete',data),api('/groceries/'+grocery.id+'/complete',data)]);
  for(const r of results)assert.equal(r.http_status,200,JSON.stringify(r));assert.equal(results[0].list.entry_id,results[1].list.entry_id);
  completed=await api('/groceries/'+grocery.id);expense=completed.entry_id;
  assert.equal(completed.summary.selected_budget_minor,10000);assert.equal(completed.summary.difference_minor,1000);assert.equal(completed.actual.amount_minor,9000);assert.equal(completed.needs_review,false);
  const next=await api('/groceries/'+completed.next_list_id);assert.deepEqual(next.items.map(i=>i.quantity),[1,1,1]);assert.equal(next.summary.estimated_minor,15000);
  const h=await api('/finance-home');assert.equal(h.spent_minor,9000);assert.equal(h.planned_minor,15000);assert.equal(h.balance_minor,491000);assert.equal(h.projected_remaining_minor,476000);
 });
 await t.test('existing expense is reused, amount mismatches and duplicate list associations are rejected',async()=>{
  const r=await api('/entries',{request_id:uuid(),kind:'EXPENSE',amount:'40',currency:'COP',occurred_at:today(),merchant:'Recibo previo',category:'supermercado'});assert.equal(r.http_status,200,JSON.stringify(r));
  const g=(await api('/groceries',{request_id:uuid(),title:'Compra vinculada',items:[item('Pan',1,'35',{in_cart:true,actual_price:'40'})]})).list;
  const paid=await api('/groceries/'+g.id+'/complete',{revision:1,confirmed:true,carry_forward:false,entry_id:r.entry.id});assert.equal(paid.http_status,200,JSON.stringify(paid));
  const copy=(await api('/groceries',{request_id:uuid(),title:'Copia',items:g.items})).list;
  assert.equal((await api('/groceries/'+copy.id+'/complete',{revision:1,confirmed:true,carry_forward:false,entry_id:r.entry.id})).http_status,400);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[buyer.id])).rows[0].n,2);
 });
 await t.test('a corrected or deleted expense is flagged for comparison review',async()=>{
  await query('update customer_entries set deleted_at=now() where id=$1',[expense]);
  const g=await api('/groceries/'+grocery.id);assert.equal(g.needs_review,true);assert.equal(g.actual,null);assert.equal(g.summary.actual_minor,9000);
 });
 await t.test('named premiums persist, appear in forecasts, amortize with actual payments and restore on void',async()=>{
  const r=await api('/debts',{request_id:uuid(),name:'Crédito vehículo',credit_type:'VEHICLE',principal:'1000',rate_percent:0,rate_type:'EA',months:4,monthly_fee:'2',as_of:today(),next_due:today(),charges:[{id:'premium',name:'Seguro de vida',category:'INSURANCE',mode:'SPREAD',amount:'120',months:4,on_payoff:'DUE'}]});
  assert.equal(r.http_status,200,JSON.stringify(r));loan=r.debt;assert.equal(loan.credit_type,'VEHICLE');assert.equal(loan.charges.length,1);
  const detail=await api('/debts/'+loan.id);assert.equal(detail.plan.rows[0].insurance_minor,3000);assert.equal(detail.plan.payment_minor,28200);
  const data={request_id:uuid(),revision:1,kind:'INSTALLMENT',principal_paid:'250',interest_paid:'0',fees_paid:'32',charge_payments:[{id:'premium',amount:'30'}],paid_on:today(),strategy:'TERM',confirmed:true};
  assert.equal((await api('/debts/'+loan.id+'/payments',{...data,fees_paid:'20'})).http_status,400);
  const payment=await api('/debts/'+loan.id+'/payments',data);assert.equal(payment.http_status,200,JSON.stringify(payment));loan=payment.debt;
  assert.equal(loan.charges[0].amount,'90.00');assert.equal(loan.charges[0].months,3);assert.equal(payment.payment.charge_payments[0].category,'INSURANCE');
  assert.equal((await api('/debts/'+loan.id+'/payments',{...data,request_id:uuid(),revision:loan.revision,kind:'SETTLEMENT',principal_paid:'750',fees_paid:'0',charge_payments:[]})).http_status,400);
  assert.equal((await api('/debts/'+loan.id+'/payments/'+payment.payment.id+'/void',{revision:loan.revision,confirmed:true})).http_status,200);
  assert.equal((await api('/debts/'+loan.id)).debt.charges[0].amount,'120');
 });
await t.test('canonical Empresa receipts link privately without new sales and follow accounting reassignment',async()=>{
  const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Grocery QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[uuid(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
  const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Owner','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.test'])).rows[0],merchant={token:require('jsonwebtoken').sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};
  const created=await api('/api/business/customer-acquisition-sales',{customer_name:'Grocery QA',customer_document_id:'GROCERY-QA',sale_amount:80,currency:'COP',product_name:'Mercado',payment_method:'CASH',acquisition_source:'STORE_WALK_IN',idempotency_key:uuid()},null,merchant);assert.equal(created.http_status,201,JSON.stringify(created));
  const sent=await api('/api/business/customer/sale-deliveries',{sale_id:created.sale.id,public_id:buyer.public_id,request_id:uuid(),identity_checked:true},null,merchant);assert.equal(sent.http_status,200,JSON.stringify(sent));
  await api('/invitations/'+sent.invitation.id+'/decision',{action:'ACCEPT',terms_accepted:true,auto_receive:true});
  const own=(await api('/groceries',{request_id:uuid(),title:'Recibo de Empresa',items:[item('Mercado',1,'75',{in_cart:true,actual_price:'80'})]})).list;
  const foreign=(await api('/groceries',{request_id:uuid(),title:'Ajena',items:own.items},null,other)).list;
  assert.equal((await api('/groceries/'+foreign.id+'/complete',{revision:1,confirmed:true,carry_forward:false,sale_id:created.sale.id},null,other)).http_status,404);
  const before=(await query('select count(*)::int n from customer_entries where customer_id=$1',[buyer.id])).rows[0].n;
  const r=await api('/groceries/'+own.id+'/complete',{revision:1,confirmed:true,carry_forward:false,sale_id:created.sale.id});assert.equal(r.http_status,200,JSON.stringify(r));
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[buyer.id])).rows[0].n,before);
  const moved=await api('/finance-books/reassign',{kind:'SALE',id:created.sale.id,book_id:otherBook.id});assert.equal(moved.http_status,200,JSON.stringify(moved));
  assert.equal((await api('/groceries/'+own.id)).http_status,404);
  assert.equal((await api('/groceries/'+own.id,null,otherBook.id)).actual.amount_minor,8000);
 });
 await t.test('private grocery tables have RLS and export includes lists and credit detail',async()=>{
  assert.equal((await query("select relrowsecurity from pg_class where oid='public.customer_grocery_lists'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await query("select count(*)::int n from information_schema.role_table_grants where table_name='customer_grocery_lists' and grantee in('PUBLIC','anon','authenticated')")).rows[0].n,0);
  const exported=await api('/export');assert.equal(exported.http_status,200,JSON.stringify(exported));assert.equal(exported.customer_grocery_lists.length,5);assert.equal(exported.customer_debts[0].credit_type,'VEHICLE');
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(buyer)await query('delete from customer_accounts where id=any($1::uuid[])',[[buyer.id,other.id]]);await pool.end();});

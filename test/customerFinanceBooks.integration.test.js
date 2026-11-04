const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='books-local-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),finance=require('../backend/src/services/customerFinance');
let server,base,buyer,other,personal,cattle,expense;
const today=()=>finance.dateKey(new Date(),'America/Bogota');
async function account(){
 const a=(await query("insert into customer_accounts(email,full_name,currency,timezone) values($1,'Books QA','COP','America/Bogota') returning *",[crypto.randomUUID()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');
 await query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,'QA',now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};
}
async function api(url,body,book=personal?.id,user=buyer,method=body?'POST':'GET'){
 const r=await fetch(base+'/api/customer'+url,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(book?{'X-Qori-Book':book}:{})},...(body?{body:JSON.stringify(body)}:{})});return {http_status:r.status,...await r.json()};
}
const entry=(kind,amount)=>({request_id:crypto.randomUUID(),kind,amount,currency:'COP',occurred_at:today(),merchant:'QA movimiento',category:'otros'});
test('independent books, cash projection, obligations, transfers and ownership',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await account();other=await account();
 await t.test('default Personal is idempotent and missing opening balance is not zero',async()=>{
  const lists=await Promise.all([api('/finance-books'),api('/finance-books')]);
  for(const l of lists){assert.equal(l.http_status,200,JSON.stringify(l));assert.equal(l.books.length,1);}
  personal=lists[0].books[0];assert.equal(lists[1].books[0].id,personal.id);
  assert.equal((await api('/finance-home')).balance_minor,null);
  const bad=await api('/finance-home',null,'invalid');assert.equal(bad.http_status,400);
  assert.equal((await api('/finance-home',null,personal.id,other)).http_status,404);
 });
 await t.test('opening balances and manual money stay in their own book',async()=>{
  personal=(await api('/finance-books/'+personal.id,{name:'Personal',opening_amount:'1000',opening_date:today(),revision:1},personal.id,buyer,'PUT')).book;
  const data={request_id:crypto.randomUUID(),name:'Ganado',currency:'COP'};
  cattle=(await api('/finance-books',data)).book;assert.equal((await api('/finance-books',data)).book.id,cattle.id);
  cattle=(await api('/finance-books/'+cattle.id,{name:'Ganado',opening_amount:'5000',opening_date:today(),revision:1},cattle.id,buyer,'PUT')).book;
  expense=(await api('/entries',entry('EXPENSE','100'))).entry;await api('/entries',entry('INCOME','200'));
  await api('/entries',entry('EXPENSE','300'),cattle.id);await api('/entries',entry('INCOME','700'),cattle.id);
  assert.equal((await api('/finance-home')).balance_minor,110000);
  assert.equal((await api('/finance-home',null,cattle.id)).balance_minor,540000);
  assert.equal((await api('/entries/'+expense.id,null,cattle.id)).http_status,404);
  assert.equal((await api('/dashboard',null,cattle.id)).income_minor,70000);
  assert.equal((await api('/dashboard')).total_minor,10000);
 });
 await t.test('budgets and goals can repeat across books without mixing',async()=>{
  for(const book of [personal,cattle]){
   const b=await api('/budgets',{category:'ALL',period:'month',currency:'COP',amount:book===personal?'1200':'8000'},book.id);assert.equal(b.http_status,200,JSON.stringify(b));
   await api('/goals',{name:'Meta',currency:'COP',target:'1000'},book.id);
  }
  assert.equal((await api('/planning')).budgets.length,1);assert.equal((await api('/planning',null,cattle.id)).goals.length,1);
 });
 let obligation;
 await t.test('projection separates received income, expected income, essential bills and plans',async()=>{
  obligation=(await api('/recurring',{name:'Seguridad social',currency:'COP',amount:'200',kind:'EXPENSE',category:'servicios',next_date:today(),frequency:'month',priority:'ESSENTIAL'})).recurring;
  await api('/recurring',{name:'Ingreso esperado',currency:'COP',amount:'400',kind:'INCOME',category:'otros',next_date:today(),frequency:'month'});
  await api('/purchases',{request_id:crypto.randomUUID(),title:'Compra prevista',category:'otros',currency:'COP',estimated_amount:'50',target_date:today()});
  const h=await api('/finance-home');assert.equal(h.http_status,200,JSON.stringify(h));
  assert.equal(h.balance_minor,110000);assert.equal(h.expected_income_minor,40000);assert.equal(h.essential_minor,20000);
  assert.equal(h.projected_remaining_minor,125000);assert.equal(h.projected_expenses_minor,35000);assert.equal(h.available_after_commitments_minor,90000);
  const g=await api('/finance-home',null,cattle.id);assert.equal(g.pending_minor,0);assert.equal(g.planned_minor,0);
  assert.equal((await api('/payment-agenda',null,cattle.id)).rules.length,0);
 });
 let transfer;
 await t.test('concurrent transfer retry changes both balances exactly once without inflating earnings or expenses',async()=>{
  const data={request_id:crypto.randomUUID(),from_book_id:cattle.id,to_book_id:personal.id,amount:'150',occurred_on:today(),note:'Retiro personal',confirmed:true};
  const results=await Promise.all([api('/finance-transfers',data),api('/finance-transfers',data)]);transfer=results[0].transfer;
  assert.equal(results[0].http_status,200,JSON.stringify(results[0]));assert.equal(results[1].transfer.id,transfer.id);
  const p=await api('/finance-home'),g=await api('/finance-home',null,cattle.id);
  assert.equal(p.balance_minor,125000);assert.equal(g.balance_minor,525000);assert.equal(p.income_minor,20000);assert.equal(g.spent_minor,30000);
  assert.equal((await api('/finance-transfers',{...data,request_id:crypto.randomUUID()},null,other)).http_status,404);
 });
 await t.test('paying and correcting a commitment consumes the estimate once, in the correct book',async()=>{
  let h=await api('/finance-home'),i=h.commitments.find(i=>i.recurring_id===obligation.id);
  assert.equal((await api('/payment-agenda/'+i.id+'/payment',{action:'PAY',revision:i.revision,amount:'200',paid_on:today(),confirmed:true},cattle.id)).http_status,404);
  const paid=await api('/payment-agenda/'+i.id+'/payment',{action:'PAY',revision:i.revision,amount:'200',paid_on:today(),confirmed:true});assert.equal(paid.http_status,200,JSON.stringify(paid));
  h=await api('/finance-home');assert.equal(h.balance_minor,105000);assert.equal(h.projected_remaining_minor,140000);assert.equal(h.pending_minor,0);assert.equal(h.spent_minor,30000);
  assert.equal((await query('select book_id from customer_entries where id=$1',[paid.entry_id])).rows[0].book_id,personal.id);
  assert.equal((await api('/finance-books/reassign',{kind:'ENTRY',id:paid.entry_id,book_id:cattle.id})).http_status,400);
 });
 await t.test('moving historical records moves their accounting location without copying money',async()=>{
  const before=await query('select count(*)::int n from customer_entries where customer_id=$1',[buyer.id]);
  const r=await api('/finance-books/reassign',{kind:'ENTRY',id:expense.id,book_id:cattle.id});assert.equal(r.http_status,200,JSON.stringify(r));
  assert.equal((await api('/finance-home')).balance_minor,115000);assert.equal((await api('/finance-home',null,cattle.id)).balance_minor,515000);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[buyer.id])).rows[0].n,before.rows[0].n);
  assert.equal((await api('/finance-books/reassign',{kind:'ENTRY',id:expense.id,book_id:personal.id},null,other)).http_status,404);
  const moved=await api('/finance-books/reassign',{kind:'RECURRING',id:obligation.id,book_id:cattle.id});assert.equal(moved.http_status,200,JSON.stringify(moved));
  assert.equal((await api('/payment-agenda',null,cattle.id)).rules.length,1);
 });
 await t.test('voiding transfers and optimistic balance editing preserve audit history',async()=>{
  assert.equal((await api('/finance-transfers/'+transfer.id,null,null,buyer,'DELETE')).http_status,200);
  assert.equal((await api('/finance-transfers/'+transfer.id,null,null,buyer,'DELETE')).http_status,200);
  assert.ok((await api('/finance-home')).transfers.find(t=>t.id===transfer.id).voided_at);
  assert.equal((await api('/finance-books/'+personal.id,{name:'Stale',opening_amount:'99',opening_date:today(),revision:1},null,buyer,'PUT')).http_status,400);
 });
 await t.test('database prevents foreign-owner associations and denies public data access',async()=>{
  const foreign=(await api('/finance-books',null,null,other)).books[0];
  await assert.rejects(query('update customer_entries set book_id=$1 where id=$2',[foreign.id,expense.id]),e=>e.code==='23503');
  for(const table of ['customer_finance_books','customer_finance_allocations','customer_finance_transfers']){
   assert.equal((await query('select relrowsecurity from pg_class where oid=$1::regclass',['public.'+table])).rows[0].relrowsecurity,true);
  }
  const exported=await api('/export');assert.equal(exported.customer_finance_books.length,2);assert.equal(exported.customer_finance_transfers.length,1);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(buyer)await query('delete from customer_accounts where id=any($1::uuid[])',[[buyer.id,other.id]]);await pool.end();});

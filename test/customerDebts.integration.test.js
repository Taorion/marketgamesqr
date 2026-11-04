const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='debts-local-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),finance=require('../backend/src/services/customerFinance'),math=require('../customer-web/debt-math'),debtService=require('../backend/src/services/customerDebtService');
let server,base,buyer,other,personal,cattle,debt,payment,manual,linked,agendaItem;
const today=()=>finance.dateKey(new Date(),'America/Bogota');
async function account(){
 const a=(await query("insert into customer_accounts(email,full_name,currency,timezone) values($1,'Debt QA','COP','America/Bogota') returning *",[crypto.randomUUID()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');
 await query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,'QA',now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};
}
async function api(url,body,book=personal?.id,user=buyer,method=body?'POST':'GET'){
 const r=await fetch(base+'/api/customer'+url,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(book?{'X-Qori-Book':book}:{})},...(body?{body:JSON.stringify(body)}:{})});return {http_status:r.status,...await r.json()};
}
const input=()=>({request_id:crypto.randomUUID(),name:'Crédito del vehículo',lender:'Entidad QA',principal:'1000',rate_percent:12,rate_type:'NAMV',months:12,monthly_fee:'10',as_of:today(),next_due:today(),projection_mode:'AUTO',note:''});
const paymentInput=(d,capital='100')=>({request_id:crypto.randomUUID(),revision:d.revision,kind:'EXTRA',principal_paid:capital,interest_paid:'10',fees_paid:'5',paid_on:today(),strategy:'TERM',confirmed:true,note:''});
const count=async()=>Number((await query('select count(*) n from customer_entries where customer_id=$1 and deleted_at is null',[buyer.id])).rows[0].n);
test('debts, payments and projections preserve accounting ownership and real money',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await account();other=await account();personal=(await api('/finance-books')).books[0];
 personal=(await api('/finance-books/'+personal.id,{name:'Personal',opening_amount:'5000',opening_date:today(),revision:1},personal.id,buyer,'PUT')).book;
 cattle=(await api('/finance-books',{request_id:crypto.randomUUID(),name:'Ganado',currency:'COP'})).book;
 await t.test('creating a debt records a dated snapshot, never an expense or income',async()=>{
  const i=input(),r=await api('/debts',i);assert.equal(r.http_status,200,JSON.stringify(r));debt=r.debt;
  assert.equal(debt.installment,'88.85');assert.equal((await api('/debts',i)).debt.id,debt.id);assert.equal(await count(),0);
  assert.equal((await api('/debts')).debts.length,1);assert.equal((await api('/debts',null,cattle.id)).debts.length,0);
  assert.equal((await api('/debts/'+debt.id,null,cattle.id)).http_status,404);assert.equal((await api('/debts/'+debt.id,null,null,other)).http_status,404);
  assert.equal((await api('/debts',i,cattle.id)).http_status,400);
 });
 await t.test('simulation has no side effects and uses the same engine as the browser',async()=>{
  const i={...input(),lump_sum:'500'},r=await api('/debts/simulate',i);assert.equal(r.http_status,200,JSON.stringify(r));
  assert.equal(r.shorter.total_minor,math.compare(i).shorter.total_minor);assert.equal(await count(),0);
  assert.equal((await api('/debts/simulate',{...i,installment:'1'})).http_status,400);
 });
 await t.test('debt installments and fees appear once in home and buying outlook',async()=>{
  const h=await api('/finance-home');assert.equal(h.http_status,200,JSON.stringify(h));assert.equal(h.debt_due_minor,9885);assert.equal(h.balance_minor,500000);
  assert.equal(h.available_after_commitments_minor,490115);assert.equal(h.projected_remaining_minor,490115);assert.equal(h.projected_expenses_minor,9885);
  assert.equal((await api('/purchases/overview')).debt_due_minor,9885);assert.equal((await api('/finance-home',null,cattle.id)).debt_due_minor,0);
 });
 await t.test('saved scenarios are isolated, idempotent and do not mutate debts',async()=>{
  const data={request_id:crypto.randomUUID(),name:'Abono con prima',debt_id:debt.id,input:{...input(),lump_sum:'400'}},r=await api('/debts/scenarios',data);
  assert.equal(r.http_status,200,JSON.stringify(r));assert.equal((await api('/debts/scenarios',data)).scenario.id,r.scenario.id);
  assert.equal((await api('/debts/scenarios',null,cattle.id)).scenarios.length,0);
  assert.equal((await api('/debts/scenarios',{...data,debt_id:null},cattle.id)).http_status,400);
  assert.equal((await api('/debts/scenarios/'+r.scenario.id,null,cattle.id,buyer,'DELETE')).http_status,404);
  assert.equal((await api('/debts/'+debt.id)).debt.principal,'1000.00');assert.equal(await count(),0);
 });
 await t.test('concurrent retry creates exactly one expense, decreases principal and rejects stale updates',async()=>{
  const payload=paymentInput(debt),r=await Promise.all([api('/debts/'+debt.id+'/payments',payload),api('/debts/'+debt.id+'/payments',payload)]);
  for(const result of r)assert.equal(result.http_status,200,JSON.stringify(result));assert.equal(r[0].payment.id,r[1].payment.id);payment=r[0].payment;
  debt=(await api('/debts/'+debt.id)).debt;assert.equal(debt.principal,'900.00');assert.equal(await count(),1);
  const h=await api('/finance-home');assert.equal(h.balance_minor,488500);assert.equal(h.spent_minor,11500);
  const e=(await api('/entries/'+payment.entry_id)).entry;assert.equal(e.amount,'115.00');assert.equal(e.debt_id,debt.id);assert.equal(e.book_id,personal.id);
  assert.equal((await api('/debts/'+debt.id,{...input(),revision:1},personal.id,buyer,'PUT')).http_status,400);
  assert.equal((await api('/entries/'+e.id,null,personal.id,buyer,'DELETE')).http_status,400);
  assert.equal((await api('/finance-books/reassign',{kind:'ENTRY',id:e.id,book_id:cattle.id})).http_status,400);
  await assert.rejects(query('update customer_entries set amount=1 where id=$1',[e.id]),e=>e.code==='23514');
 });
 await t.test('void latest owned payment restores debt and removes only its generated expense',async()=>{
  assert.equal((await api('/debts/'+debt.id+'/payments/'+payment.id+'/void',{revision:debt.revision,confirmed:true})).http_status,200);
  debt=(await api('/debts/'+debt.id)).debt;assert.equal(debt.principal,'1000.00');assert.equal(await count(),0);
  assert.equal((await api('/finance-home')).balance_minor,500000);
 });
 await t.test('existing agenda expense can be linked once, with matching amount/date and preserved on unlink',async()=>{
  const rule=(await api('/recurring',{name:'Cuota ya agendada',currency:'COP',amount:'115',kind:'EXPENSE',category:'otros',next_date:today(),frequency:'month',priority:'ESSENTIAL'})).recurring;
  agendaItem=(await api('/payment-agenda')).items.find(i=>i.recurring_id===rule.id);
  const paid=await api('/payment-agenda/'+agendaItem.id+'/payment',{action:'PAY',revision:agendaItem.revision,amount:'115',paid_on:today(),confirmed:true});assert.equal(paid.http_status,200,JSON.stringify(paid));manual=paid.entry_id;
  let data={...paymentInput(debt),entry_id:manual};
  assert.equal((await api('/debts/'+debt.id+'/payments',{...data,principal_paid:'99'})).http_status,400);
  const r=await api('/debts/'+debt.id+'/payments',data);assert.equal(r.http_status,200,JSON.stringify(r));linked=r.payment;debt=r.debt;
  assert.equal(linked.owns_entry,false);assert.equal(await count(),1);
  agendaItem=(await api('/payment-agenda')).items.find(i=>i.id===agendaItem.id);
  assert.equal((await api('/payment-agenda/'+agendaItem.id+'/payment',{action:'CORRECT',revision:agendaItem.revision,amount:'120',paid_on:today(),confirmed:true})).http_status,400);
  assert.equal((await api('/finance-books/reassign',{kind:'RECURRING',id:rule.id,book_id:cattle.id})).http_status,400);
  assert.equal((await api('/debts/'+debt.id+'/payments/'+linked.id+'/void',{revision:debt.revision,confirmed:true})).http_status,200);
  debt=(await api('/debts/'+debt.id)).debt;assert.equal(debt.principal,'1000.00');assert.equal(await count(),1);
  assert.equal((await api('/entries/'+manual)).entry.amount,'115.00');
 });
 await t.test('external projections avoid repeating the agenda; settlement removes future debt dues',async()=>{
  let r=await api('/debts/'+debt.id,{...input(),projection_mode:'EXTERNAL',revision:debt.revision},personal.id,buyer,'PUT');assert.equal(r.http_status,200,JSON.stringify(r));debt=r.debt;
  assert.equal((await api('/finance-home')).debt_due_minor,0);
  r=await api('/debts/'+debt.id+'/payments',{...paymentInput(debt,'1000'),kind:'SETTLEMENT',interest_paid:'3',fees_paid:'0'});assert.equal(r.http_status,200,JSON.stringify(r));debt=r.debt;
  assert.equal(debt.status,'PAID');assert.equal(debt.months,0);assert.equal((await api('/finance-home')).debt.active_count,0);
  assert.equal((await api('/debts/'+debt.id+'/payments',paymentInput(debt))).http_status,400);
 });
 await t.test('installment advances anchored dates, lowered quota and archive preserve history',async()=>{
  let d=(await api('/debts',{...input(),next_due:'2026-01-31'})).debt;
  const r=await api('/debts/'+d.id+'/payments',{...paymentInput(d,'500'),kind:'INSTALLMENT',strategy:'INSTALLMENT'});assert.equal(r.http_status,200,JSON.stringify(r));d=r.debt;
  assert.equal(d.next_due,'2026-02-28');assert.equal(d.anchor_day,31);assert.equal(debtService.dueDate(d,1),'2026-03-31');assert.ok(Number(d.installment)<88.85);
  const archived=await api('/debts/'+d.id+'/state',{revision:d.revision,archived:true});assert.equal(archived.debt.status,'ARCHIVED');
  const detail=await api('/debts/'+d.id);assert.equal(detail.payments.length,1);assert.equal(detail.events.length,3);
 });
 await t.test('owner constraints, private tables and data export cover debt histories',async()=>{
  const foreign=(await api('/finance-books',null,null,other)).books[0];
  await assert.rejects(query('update customer_debts set book_id=$1 where id=$2',[foreign.id,debt.id]),e=>e.code==='23503');
  for(const table of ['customer_debts','customer_debt_payments','customer_debt_events','customer_debt_scenarios']){
   assert.equal((await query('select relrowsecurity from pg_class where oid=$1::regclass',['public.'+table])).rows[0].relrowsecurity,true);
   assert.equal((await query("select count(*)::int n from information_schema.role_table_grants where table_name=$1 and grantee in ('PUBLIC','anon','authenticated')",[table])).rows[0].n,0);
  }
  const exported=await api('/export');assert.equal(exported.http_status,200,JSON.stringify(exported));assert.equal(exported.customer_debts.length,2);assert.equal(exported.customer_debt_scenarios.length,1);assert.equal(exported.customer_debt_payments.length,4);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(buyer)await query('delete from customer_accounts where id=any($1::uuid[])',[[buyer.id,other.id]]);await pool.end();});

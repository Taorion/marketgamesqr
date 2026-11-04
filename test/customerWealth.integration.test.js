
const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='wealth-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),{cashflow}=require('../backend/src/services/customerWealthService');
let server,base,a,b,book;
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),start=day.slice(0,7)+'-01';
async function buyer(){const x=(await query('insert into customer_accounts(email) values($1) returning *',[crypto.randomUUID()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[x.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...x,token};}
async function api(url,body,method=body?'POST':'GET',scope=book?.id,user=a){const r=await fetch(base+'/api/customer'+url,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(scope?{'X-Qori-Book':scope}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
const item=(name='Vivienda',amount='2000')=>({request_id:crypto.randomUUID(),kind:'ASSET',category:'PROPERTY',name,amount,valued_on:day,note:''});
const entry=(kind,amount)=>({request_id:crypto.randomUUID(),kind,amount,currency:'COP',occurred_at:day,merchant:'Prueba flujo',category:'hogar'});
test('cashflow reconciles a mid-month opening, daily balances, transfers and unknown cash',()=>{
 const bk={id:'one',currency:'COP',opening_amount:'-100',opening_date:'2026-11-03'};
 const rows=[{date:'2026-11-01',status:'PAID',currency:'COP',kind:'INCOME',amount_minor:99900},{date:'2026-11-03',status:'PAID',currency:'COP',kind:'INCOME',amount_minor:5000},{date:'2026-11-04',status:'PAID',currency:'COP',kind:'EXPENSE',amount_minor:2000}];
 const transfers=[{from_book_id:'two',to_book_id:'one',amount:'10',occurred_on:'2026-11-04'},{from_book_id:'one',to_book_id:'two',amount:'500',occurred_on:'2026-11-04',voided_at:'yes'}];
 const r=cashflow(bk,rows,transfers,'2026-11-04');assert.equal(r.opening_minor,-10000);assert.equal(r.partial_month,true);assert.equal(r.income_minor,5000);assert.equal(r.net_minor,3000);assert.equal(r.transfers_in_minor,1000);assert.equal(r.closing_minor,-6000);assert.equal(r.days.at(-1).balance_minor,r.closing_minor);
 const unknown=cashflow({...bk,opening_amount:null,opening_date:null},rows,transfers,'2026-11-04');assert.equal(unknown.closing_minor,null);assert.ok(unknown.days.every(d=>d.balance_minor===null));
});
test('wealth aggregates assets and liabilities privately without creating cash movements',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;a=await buyer();b=await buyer();book=(await api('/finance-books')).books[0];
 let saved,debt,second;
 await t.test('missing opening cash leaves totals unknown, not zero',async()=>{
  const d=await api('/wealth');assert.equal(d.status,200,JSON.stringify(d));assert.equal(d.currencies[0].net_worth_minor,null);assert.deepEqual(d.currencies[0].missing_books,['Personal']);
 });
 await t.test('creates and updates assets idempotently; no income or expense created',async()=>{
  const data=item();const created=await api('/wealth/items',data);assert.equal(created.status,200,JSON.stringify(created));saved=created.item;
  const retry=await api('/wealth/items',data);assert.equal(retry.item.id,saved.id);
  assert.equal((await api('/finance-home')).income_minor,0);
  const edit=await api('/wealth/items/'+saved.id,{...data,amount:'2500',revision:saved.revision},'PUT');assert.equal(edit.status,200);saved=edit.item;
  assert.equal((await api('/wealth/items/'+saved.id,{...data,revision:1},'PUT')).status,400);
  assert.equal((await api('/wealth/items',{...item(),kind:'LIABILITY',category:'PROPERTY'})).status,400);
  assert.equal((await api('/wealth/items',{...item(),valued_on:'2100-01-01'})).status,400);
 });
 await t.test('cash, debt principal, spread charges and other payables reconcile',async()=>{
  assert.equal((await api('/finance-books/'+book.id,{name:book.name,revision:book.revision,opening_amount:'1000',opening_date:start},'PUT')).status,200);
  await api('/entries',entry('INCOME','100'));await api('/entries',entry('EXPENSE','50'));
  const dr=await api('/debts',{request_id:crypto.randomUUID(),name:'Crédito',principal:'500',rate_percent:12,rate_type:'EA',months:12,as_of:day,next_due:day,charges:[{id:'insurance',name:'Seguro repartido',category:'INSURANCE',mode:'SPREAD',amount:'60',months:12,on_payoff:'DUE'}]});assert.equal(dr.status,200,JSON.stringify(dr));debt=dr.debt;
  const other=await api('/wealth/items',{...item('Factura exigible','20'),kind:'LIABILITY',category:'PAYABLE'});assert.equal(other.status,200);
  const d=await api('/wealth'),local=d.books.find(x=>x.id===book.id);
  assert.equal(local.cash_minor,105000);assert.equal(local.non_cash_minor,250000);assert.equal(local.debt_minor,50000);assert.equal(local.debt_charges_minor,6000);assert.equal(local.liabilities_minor,58000);assert.equal(local.net_worth_minor,297000);
  const h=await api('/finance-home');assert.equal(h.cashflow.closing_minor,h.balance_minor);assert.equal(h.cashflow.net_minor,5000);
 });
 await t.test('principal payment reduces both cash and debt exactly once; void restores both',async()=>{
  const pay=await api('/debts/'+debt.id+'/payments',{request_id:crypto.randomUUID(),revision:debt.revision,kind:'EXTRA',principal_paid:'100',interest_paid:'0',fees_paid:'0',charge_payments:[],paid_on:day,strategy:'TERM',note:'',confirmed:true});assert.equal(pay.status,200,JSON.stringify(pay));
  let local=(await api('/wealth')).books[0];assert.equal(local.cash_minor,95000);assert.equal(local.debt_minor,40000);assert.equal(local.net_worth_minor,297000);
  const voided=await api('/debts/'+debt.id+'/payments/'+pay.payment.id+'/void',{revision:pay.debt.revision,confirmed:true});assert.equal(voided.status,200,JSON.stringify(voided));
  local=(await api('/wealth')).books[0];assert.equal(local.cash_minor,105000);assert.equal(local.debt_minor,50000);assert.equal(local.net_worth_minor,297000);
 });
 await t.test('transfers cancel in consolidated cash; currencies remain separate',async()=>{
  second=(await api('/finance-books',{request_id:crypto.randomUUID(),name:'Ganado',currency:'COP'})).book;
  await api('/finance-books/'+second.id,{name:second.name,revision:second.revision,opening_amount:'100',opening_date:start},'PUT');
  const before=(await api('/wealth')).currencies.find(g=>g.currency==='COP');
  await api('/finance-transfers',{request_id:crypto.randomUUID(),from_book_id:book.id,to_book_id:second.id,amount:'40',occurred_on:day,note:'',confirmed:true});
  const after=await api('/wealth');assert.equal(after.currencies[0].cash_minor,before.cash_minor);assert.equal(after.currencies[0].net_worth_minor,before.net_worth_minor);
  assert.equal(after.books.find(x=>x.id===second.id).flow.transfers_in_minor,4000);
  const usd=(await api('/finance-books',{request_id:crypto.randomUUID(),name:'Dólares',currency:'USD'})).book;
  await api('/finance-books/'+usd.id,{name:usd.name,revision:usd.revision,opening_amount:'10',opening_date:start},'PUT');
  const d=await api('/wealth');assert.equal(d.currencies.length,2);assert.equal(d.currencies.find(g=>g.currency==='USD').cash_minor,1000);assert.equal(d.currencies.find(g=>g.currency==='COP').cash_minor,before.cash_minor);
 });
 await t.test('negative cash counts once and archiving a debt does not erase its liability',async()=>{
  const currentDebt=(await api('/debts/'+debt.id)).debt;
  assert.equal((await api('/debts/'+debt.id+'/state',{revision:currentDebt.revision,archived:true})).status,200);
  const current=(await api('/finance-books')).books.find(x=>x.id===book.id);
  await api('/finance-books/'+book.id,{name:book.name,revision:current.revision,opening_amount:'-1000',opening_date:start},'PUT');
  const local=(await api('/wealth')).books.find(x=>x.id===book.id);assert.equal(local.cash_minor,-99000);assert.equal(local.overdraft_minor,99000);assert.equal(local.assets_minor,250000);assert.equal(local.liabilities_minor,157000);assert.equal(local.net_worth_minor,93000);
  assert.equal(local.debts[0].status,'ARCHIVED');
 });
 await t.test('other buyers and books cannot mutate a wealth item; delete retains audit',async()=>{
  const data={...item(),revision:saved.revision};
  assert.equal((await api('/wealth/items/'+saved.id,data,'PUT',second.id)).status,404);
  assert.equal((await api('/wealth/items/'+saved.id,data,'PUT',null,b)).status,404);
  assert.equal((await api('/wealth',null,'GET',null,b)).items.length,0);
  assert.equal((await api('/wealth/items/'+saved.id,{revision:saved.revision},'DELETE',second.id)).status,404);
  assert.equal((await api('/wealth/items/'+saved.id,{revision:saved.revision},'DELETE')).status,200);
  assert.equal((await api('/wealth')).items.some(i=>i.id===saved.id),false);
  assert.equal((await query('select count(*)::int n from customer_wealth_events where item_id=$1',[saved.id])).rows[0].n,3);
  assert.equal((await api('/finance-home')).income_minor,10000);
 });
 await t.test('canonical unpaid sales become liabilities, payment switches to cash outflow without duplication',async()=>{
  const merchant=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Wealth QA',$1,'PRO','ACTIVE','{}') returning *",[crypto.randomUUID()])).rows[0];
  await query("insert into customer_relationships(customer_id,business_id,document_key,state,accepted_at,include_history) values($1,$2,'wealthqa','ACCEPTED',now(),true)",[a.id,merchant.id]);
  const before=(await api('/wealth')).books.find(x=>x.id===book.id);
  const sale=(await query("insert into business_sales(business_id,customer_name,customer_document_id,sale_amount,currency,sale_status) values($1,'Wealth QA','WEALTH-QA',30,'COP','PENDING') returning *",[merchant.id])).rows[0];
  let r=(await api('/wealth')).books.find(x=>x.id===book.id);assert.equal(r.pending_sales_minor,3000);assert.equal(r.cash_minor,before.cash_minor);assert.equal(r.net_worth_minor,before.net_worth_minor-3000);
  const net=r.net_worth_minor;
  await query("update business_sales set sale_status='PAID',paid_at=now() where id=$1",[sale.id]);
  await query("insert into customer_entries(customer_id,book_id,request_id,kind,amount,currency,occurred_at,merchant,category,linked_sale_id) values($1,$2,$3,'EXPENSE',30,'COP',now(),'Duplicate receipt','hogar',$4)",[a.id,book.id,crypto.randomUUID(),sale.id]);
  r=(await api('/wealth')).books.find(x=>x.id===book.id);assert.equal(r.pending_sales_minor,0);assert.equal(r.cash_minor,before.cash_minor-3000);assert.equal(r.net_worth_minor,net);
  await query("update business_sales set sale_status='VOIDED' where id=$1",[sale.id]);
  r=(await api('/wealth')).books.find(x=>x.id===book.id);assert.equal(r.cash_minor,before.cash_minor);assert.equal(r.net_worth_minor,before.net_worth_minor);
 });
 await t.test('public database role has no read or write path to private wealth tables',async()=>{
  const db=await pool.connect(),role='wealth_qa_'+crypto.randomBytes(5).toString('hex');
  try{await db.query('begin');await db.query('create role '+role+' nologin');await db.query('grant usage on schema public to '+role);
   for(const table of ['customer_wealth_items','customer_wealth_events']){
    assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',[table])).rows[0].relrowsecurity,true);
    for(const statement of ['select * from '+table,"insert into "+table+" (id) values(gen_random_uuid())"]){
     await db.query('savepoint denied');await db.query('set local role '+role);await assert.rejects(()=>db.query(statement),e=>e.code==='42501');await db.query('rollback to savepoint denied');
    }
   }
  }finally{await db.query('rollback');db.release();}
 });


});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

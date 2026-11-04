const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='simple-money-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),agenda=require('../backend/src/services/customerPaymentAgendaService');
let server,base,account,book,other;
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function buyer(){const a=(await query('insert into customer_accounts(email) values($1) returning *',[crypto.randomUUID()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function api(url,body,method=body?'POST':'GET',scope=book?.id,user=account){const r=await fetch(base+'/api/customer'+url,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(scope?{'X-Qori-Book':scope}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
const entry=()=>({request_id:crypto.randomUUID(),kind:'EXPENSE',amount:'25',currency:'COP',occurred_at:day,merchant:'Compra de prueba',category:'hogar',priority:'ESSENTIAL',expense_pattern:'EVENTUAL'});
test('simple money keeps recurrence, necessity and payment independent',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;account=await buyer();other=await buyer();book=(await api('/finance-books')).books[0];
 const rule={name:'Suscripción eventual QA',currency:'COP',kind:'EXPENSE',category:'entretenimiento',amount:'100',next_date:day,frequency:'once',priority:'FLEXIBLE',reminder_day:null,remind_days:3,reminders_enabled:true};let item,paidId,recurring;
 await t.test('eventual plan generates exactly one obligation across months and no expense',async()=>{
  assert.deepEqual(agenda.dates(day,'once',agenda.cycleDate(day,'year',1)),[day]);
  assert.deepEqual(agenda.dates(day,'once',day,day),[]);
  const invalid=await api('/recurring',{...rule,reminder_day:5});assert.equal(invalid.status,400);
  const created=await api('/recurring',rule);assert.equal(created.status,200,JSON.stringify(created));recurring=created.recurring;
  for(const month of [day.slice(0,7),agenda.cycleDate(day,'month',1).slice(0,7),day.slice(0,7)]){const list=await api('/payment-agenda?month='+month);assert.equal(list.items.length,1);item=list.items[0];assert.equal(item.frequency,'once');}
  const home=await api('/finance-home');assert.equal(home.spent_minor,0);assert.equal(home.flexible_pending_minor,10000);assert.equal(home.essential_minor,0);assert.equal(home.balance_minor,null);
 });
 await t.test('payment retains flexible and eventual classification, retries do not duplicate it',async()=>{
  const body={action:'PAY',revision:item.revision,amount:'110',paid_on:day,confirmed:true},rs=await Promise.all([api('/payment-agenda/'+item.id+'/payment',body),api('/payment-agenda/'+item.id+'/payment',body)]);
  rs.forEach(r=>assert.equal(r.status,200,JSON.stringify(r)));assert.equal(rs[0].entry_id,rs[1].entry_id);paidId=rs[0].entry_id;
  const actual=(await api('/entries/'+paidId)).entry;assert.equal(actual.priority,'FLEXIBLE');assert.equal(actual.expense_pattern,'EVENTUAL');
  const home=await api('/finance-home');assert.equal(home.spent_minor,11000);assert.equal(home.expense_groups.flexible_minor,11000);assert.equal(home.flexible_pending_minor,0);
  const next=await api('/payment-agenda?month='+agenda.cycleDate(day,'month',1).slice(0,7));assert.equal(next.items.length,0);
 });
 await t.test('reopening restores one pending occurrence without regenerating later months',async()=>{
  item=(await api('/payment-agenda/'+item.id)).item;assert.equal((await api('/payment-agenda/'+item.id+'/payment',{action:'REOPEN',revision:item.revision,confirmed:true})).status,200);
  const list=await api('/payment-agenda?month='+agenda.cycleDate(day,'month',1).slice(0,7));assert.equal(list.items.length,1);assert.equal(list.items[0].id,item.id);
  assert.equal((await api('/finance-home')).spent_minor,0);
 });
 await t.test('manual classification survives updates from older clients and validates independent axes',async()=>{
  const data=entry(),r=await api('/entries',data);assert.equal(r.status,200,JSON.stringify(r));
  const legacy={...data,amount:'30'};delete legacy.expense_pattern;
  const updated=await api('/entries/'+r.entry.id,legacy,'PUT');assert.equal(updated.entry.expense_pattern,'EVENTUAL');
  assert.equal((await api('/entries',{...entry(),expense_pattern:'monthly'})).status,400);
  const home=await api('/finance-home');assert.equal(home.expense_groups.essential_minor,3000);assert.equal(home.spent_minor,Object.values(home.expense_groups).reduce((n,v)=>n+v,0));
  const movement=(await api('/dashboard')).movements.find(x=>x.entry_id===r.entry.id);assert.equal(movement.expense_pattern,'EVENTUAL');
 });
 await t.test('month forecast reconciles cash, income, bills, debt charges and shopping without double counting',async()=>{
  const b=(await api('/finance-books',{request_id:crypto.randomUUID(),name:'Proyección QA',currency:'COP'})).book;
  const call=(url,body,method)=>api(url,body,method,b.id);
  const opening=await call('/finance-books/'+b.id,{name:b.name,opening_amount:'1000',opening_date:day,revision:b.revision},'PUT');assert.equal(opening.status,200);
  for(const [kind,amount] of [['INCOME','100'],['EXPENSE','80']])assert.equal((await call('/entries',{...entry(),kind,amount})).status,200);
  let obligation;
  for(const [kind,amount,priority] of [['INCOME','500','ESSENTIAL'],['EXPENSE','200','ESSENTIAL'],['EXPENSE','40','FLEXIBLE']]){
   const r=await call('/recurring',{...rule,name:kind+amount,kind,amount,priority});assert.equal(r.status,200);if(amount==='200')obligation=r.recurring.id;
  }
  assert.equal((await call('/purchases',{request_id:crypto.randomUUID(),title:'Compra prevista',category:'hogar',currency:'COP',estimated_amount:'30',target_date:day})).status,200);
  const items=[{id:crypto.randomUUID(),name:'Alimento',unit:'unidad',quantity:1,estimated_price:'50',in_cart:false},{id:crypto.randomUUID(),name:'Por cotizar',unit:'unidad',quantity:1,estimated_price:null,in_cart:false}];
  assert.equal((await call('/groceries',{request_id:crypto.randomUUID(),title:'Mercado previsto',items})).status,200);
  const debt=await call('/debts',{request_id:crypto.randomUUID(),name:'Crédito prueba',principal:'1000',rate_percent:0,rate_type:'EA',months:4,monthly_fee:'2',as_of:day,next_due:day,charges:[{id:'life',name:'Seguro',category:'INSURANCE',mode:'FIXED',amount:'5'}]});assert.equal(debt.status,200,JSON.stringify(debt));
  let h=await call('/finance-home');
  assert.equal(h.balance_minor,102000);assert.equal(h.expected_income_minor,50000);assert.equal(h.pending_minor,24000);assert.equal(h.planned_minor,8000);assert.equal(h.debt_due_minor,25700);assert.equal(h.grocery.unknown_prices,1);
  assert.equal(h.projected_remaining_minor,94300);assert.equal(h.available_after_commitments_minor,52300);assert.equal(h.projected_expenses_minor,65700);
  const due=(await call('/payment-agenda')).items.find(i=>i.recurring_id===obligation);
  assert.equal((await call('/payment-agenda/'+due.id+'/payment',{revision:due.revision,action:'PAY',amount:'200',paid_on:day,confirmed:true})).status,200);
  h=await call('/finance-home');assert.equal(h.balance_minor,82000);assert.equal(h.pending_minor,4000);assert.equal(h.projected_remaining_minor,94300);assert.equal(h.projected_expenses_minor,65700);
  assert.equal((await call('/finance-books/'+b.id,{name:b.name,opening_amount:'-1000',opening_date:day,revision:opening.book.revision},'PUT')).status,200);
  assert.equal((await call('/finance-home')).projected_remaining_minor,-105700);
 });
 await t.test('recurring flexible payments stay recurring and private to their book',async()=>{
  const r=await api('/recurring',{...rule,name:'Suscripción mensual',frequency:'month'});assert.equal(r.status,200);
  const list=await api('/payment-agenda?month='+day.slice(0,7));const monthly=list.items.find(i=>i.recurring_id===r.recurring.id);
  const pay=await api('/payment-agenda/'+monthly.id+'/payment',{action:'PAY',revision:monthly.revision,amount:'100',paid_on:day,confirmed:true});
  const actual=(await api('/entries/'+pay.entry_id)).entry;assert.equal(actual.priority,'FLEXIBLE');assert.equal(actual.expense_pattern,'RECURRING');
  const second=(await api('/finance-books',{request_id:crypto.randomUUID(),name:'Otra contabilidad',currency:'COP'})).book;
  assert.equal((await api('/finance-home',null,'GET',second.id)).spent_minor,0);
  assert.equal((await api('/payment-agenda/'+item.id,null,'GET',second.id)).status,404);
  assert.equal((await api('/payment-agenda/'+item.id,null,'GET',null,other)).status,404);
  const next=await api('/payment-agenda?month='+agenda.cycleDate(day,'month',1).slice(0,7));assert.equal(next.items.filter(i=>i.recurring_id===recurring.id).length,1);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

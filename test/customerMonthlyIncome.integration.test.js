const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='income-months-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),{summarize}=require('../backend/src/services/customerMonthlyFinance');
let server,base,a,other,book;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),year=Number(today.slice(0,4))-1;
async function buyer(){const a=(await query('insert into customer_accounts(email) values($1) returning *',[crypto.randomUUID()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function api(url,body,method=body?'POST':'GET',scope=book?.id,user=a){const r=await fetch(base+'/api/customer'+url,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(scope?{'X-Qori-Book':scope}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
const entry=(kind,amount,date)=>({request_id:crypto.randomUUID(),kind,amount,currency:'COP',occurred_at:date,merchant:'Ingreso QA',category:'otros'});
test('monthly closures carry deficits, distinguish net flow from cash, exclude other currencies and current averages',()=>{
 const book={id:'b',currency:'COP',opening_amount:'100',opening_date:'2026-01-01'};
 const rows=[{kind:'EXPENSE',amount_minor:15000,date:'2026-01-15',status:'PAID',currency:'COP'},{kind:'INCOME',amount_minor:2000,date:'2026-02-03',status:'PAID',currency:'COP'},{kind:'INCOME',amount_minor:999999,date:'2026-01-15',status:'PAID',currency:'USD'}];
 const d=summarize(book,rows,[{from_book_id:'c',to_book_id:'b',amount:'10',occurred_on:'2026-02-04'}],2026,'2026-03-10');
 assert.equal(d.months[0].closing_minor,-5000);assert.equal(d.months[1].opening_minor,-5000);assert.equal(d.months[1].net_minor,2000);assert.equal(d.months[1].closing_minor,-2000);assert.equal(d.months[2].opening_minor,-2000);
 assert.equal(d.months[2].closed,false);assert.deepEqual(d.insights.sample_months,['2026-01','2026-02']);assert.equal(d.insights.average_income_minor,1000);assert.equal(d.insights.average_expense_minor,7500);
 const later=summarize({...book,opening_date:'2026-02-10'},rows,[],2026,'2026-03-10');assert.equal(later.months[0].closing_minor,null);assert.equal(later.months[1].partial_month,true);assert.equal(later.insights.sample_months.length,0);
});
test('income declarations, received money and monthly intelligence remain independent and private',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;a=await buyer();other=await buyer();
 await api('/finance-books');book=(await api('/finance-books',{request_id:crypto.randomUUID(),name:'Ingresos QA',currency:'COP',opening_amount:'100',opening_date:year+'-01-01'})).book;
 let salary,jan,rent;
 const report=()=>api('/income-months?year='+year);
 const rule=name=>({request_id:crypto.randomUUID(),name,amount:'20',currency:'COP',kind:'INCOME',category:'otros',frequency:'month',next_date:year+'-01-05',reminders_enabled:true,remind_days:3});
 await t.test('declaring salary and property rent is idempotent and creates no received income',async()=>{
  const data=rule('Salario');const result=await Promise.all([api('/recurring',data),api('/recurring',data)]);result.forEach(r=>assert.equal(r.status,200,JSON.stringify(r)));assert.equal(result[0].recurring.id,result[1].recurring.id);salary=result[0].recurring;
  rent=(await api('/recurring',{...rule('Arriendo de propiedad'),amount:'30'})).recurring;
  const d=await report();assert.equal(d.status,200,JSON.stringify(d));assert.equal(d.current.monthly_declared_minor,5000);assert.equal(d.current.received_minor,0);assert.equal(d.months[0].income_minor,0);assert.equal(d.months[0].closing_minor,10000);
  assert.equal((await api('/finance-home')).income_plan.monthly_minor,5000);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[a.id])).rows[0].n,0);
  jan=d.items.find(i=>i.recurring_id===salary.id&&i.scheduled_date===year+'-01-05');assert.ok(jan);
 });
 await t.test('late receipt goes to its real month once, then date correction recalculates following balances',async()=>{
  await api('/entries',entry('EXPENSE','150',year+'-01-15'));
  const data={action:'PAY',revision:jan.revision,amount:'20',paid_on:year+'-02-03',confirmed:true};
  const rs=await Promise.all([api('/payment-agenda/'+jan.id+'/payment',data),api('/payment-agenda/'+jan.id+'/payment',data)]);rs.forEach(r=>assert.equal(r.status,200));assert.equal(rs[0].entry_id,rs[1].entry_id);
  let d=await report();assert.equal(d.months[0].income_minor,0);assert.equal(d.months[0].closing_minor,-5000);assert.equal(d.months[1].opening_minor,-5000);assert.equal(d.months[1].income_minor,2000);assert.equal(d.months[1].closing_minor,-3000);
  jan=(await api('/payment-agenda/'+jan.id)).item;
  assert.equal((await api('/payment-agenda/'+jan.id+'/payment',{...data,action:'CORRECT',revision:jan.revision,amount:'25',paid_on:year+'-01-30'})).status,200);
  d=await report();assert.equal(d.months[0].income_minor,2500);assert.equal(d.months[0].closing_minor,-2500);assert.equal(d.months[1].opening_minor,-2500);assert.equal(d.months[1].income_minor,0);assert.equal(d.months[1].closing_minor,-2500);
 });
 await t.test('annulled receipt restores pending expectation and negative cash without phantom income',async()=>{
  jan=(await api('/payment-agenda/'+jan.id)).item;
  assert.equal((await api('/payment-agenda/'+jan.id+'/payment',{action:'REOPEN',revision:jan.revision,confirmed:true})).status,200);
  const d=await report();assert.equal(d.months[0].income_minor,0);assert.equal(d.months[0].closing_minor,-5000);assert.equal(d.months[1].closing_minor,-5000);assert.ok(d.items.some(i=>i.id===jan.id&&i.status==='PENDING'));
 });
 await t.test('active monthly base does not include paused, weekly or not-yet-started sources',async()=>{
  await api('/recurring',{...rule('Semanal'),frequency:'week'});
  const nextYear=Number(today.slice(0,4))+1;await api('/recurring',{...rule('Salario futuro'),next_date:nextYear+'-01-05',amount:'900'});
  await api('/recurring/'+rent.id,{name:rent.name,amount:'30',active:false,remind_days:3,reminders_enabled:false},'PUT');
  const d=await report();assert.equal(d.current.monthly_declared_minor,2000);assert.equal(d.current.monthly_sources,1);assert.equal(d.months[0].income_minor,0);
  assert.equal((await api('/finance-home')).income_plan.monthly_minor,2000);
 });
 await t.test('book ownership and selected currency are enforced and invalid years rejected',async()=>{
  const second=(await api('/finance-books',{request_id:crypto.randomUUID(),name:'Negocio',currency:'USD',opening_amount:'1000',opening_date:year+'-01-01'})).book;
  let d=await api('/income-months?year='+year,null,'GET',second.id);assert.equal(d.status,200);assert.equal(d.rules.length,0);assert.equal(d.months[0].closing_minor,100000);
  assert.equal((await api('/income-months?year='+year,null,'GET',book.id,other)).status,404);
  assert.equal((await api('/recurring',{...rule('Ajeno'),request_id:salary.id},'POST',second.id)).status,400);
  assert.equal((await api('/income-months?year=1999')).status,400);assert.equal((await api('/income-months?year=9999')).status,400);
  assert.equal((await api('/income-months?year=bad')).status,400);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

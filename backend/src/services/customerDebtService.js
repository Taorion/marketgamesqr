const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const math=require('../../../customer-web/debt-math'),finance=require('./customerFinance');
const projection='d.*,d.as_of::text as_of,d.next_due::text next_due';
const today=a=>finance.dateKey(new Date(),a.timezone||'America/Bogota');
const decimal=n=>(n/100).toFixed(2);
const sum=(rows,fn)=>rows.reduce((n,r)=>{const v=n+fn(r);if(!Number.isSafeInteger(v))throw badRequest('Total fuera del rango permitido.');return v;},0);
function calculate(input){try{return math.compare(input);}catch(e){if(e.code==='DEBT_INPUT')throw badRequest(e.message);throw e;}}
function input(d){return {principal:d.principal,rate_percent:Number(d.rate_percent),rate_type:d.rate_type,months:Math.max(1,d.months),installment:d.installment,monthly_fee:d.monthly_fee};}
function plan(d){return Number(d.principal)>0?calculate(input(d)).baseline:{rows:[],months:0,interest_minor:0,fees_minor:0,total_minor:0,payment_minor:0,principal_payment_minor:0};}
function dueDate(d,index){const [y,m]=d.next_due.split('-').map(Number),date=new Date(Date.UTC(y,m-1+index,1,12));date.setUTCDate(Math.min(d.anchor_day,new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0,12)).getUTCDate()));return date.toISOString().slice(0,10);}
async function own(account,id,db={query},lock=false){
 const r=(await db.query('select '+projection+' from customer_debts d where d.customer_id=$1 and d.book_id=$2 and d.id=$3'+(lock?' for update':''),[account.id,account.finance_book.id,id])).rows[0];
 if(!r)throw notFound('Deuda no encontrada en esta contabilidad.');return r;
}
async function event(db,a,id,action,before,after){await db.query('insert into customer_debt_events(customer_id,debt_id,action,before_value,after_value) values($1,$2,$3,$4::jsonb,$5::jsonb)',[a.id,id,action,JSON.stringify(before),JSON.stringify(after)]);}
async function list(account,db={query},full=false){
 const rows=(await db.query('select '+projection+" from customer_debts d where d.customer_id=$1 and d.book_id=$2 order by (d.status='ACTIVE') desc,d.next_due,d.created_at",[account.id,account.finance_book.id])).rows;
 return {debts:rows.map(d=>{const p=plan(d);return {...d,plan:{...p,rows:full?p.rows:[]}};})};
}
async function summary(account,end,db={query}){
 const {debts}=await list(account,db,true),active=debts.filter(d=>d.status==='ACTIVE'&&d.currency===account.finance_book.currency);
 const dues=active.filter(d=>d.projection_mode==='AUTO').flatMap(d=>d.plan.rows.map((r,i)=>({...r,date:dueDate(d,i),debt_id:d.id,name:d.name})).filter(r=>r.date<=end));
 return {principal_minor:sum(active,d=>math.minor(d.principal)),interest_minor:sum(active,d=>d.plan.interest_minor),due_minor:sum(dues,r=>r.payment_minor),active_count:active.length,dues,external_count:active.filter(d=>d.projection_mode==='EXTERNAL').length};
}
function validateDates(account,data){
 if(data.as_of>today(account)||data.as_of<'2000-01-01')throw badRequest('La fecha del saldo debe ser pasada o de hoy.');
 if(data.next_due<'2000-01-01'||data.next_due>'2100-12-31')throw badRequest('Revisa el próximo vencimiento.');
}
async function save(account,data,id){
 validateDates(account,data);
 const estimate=calculate(data),payment=decimal(estimate.baseline.principal_payment_minor);
 math.minor(payment); // A stored installment must also be valid when the debt is read again.
 return withTransaction(async db=>{
  let previous=null;
  if(id){previous=await own(account,id,db,true);if(previous.revision!==data.revision)throw badRequest('La deuda cambió. Actualiza antes de editar.');}
  else{
   await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
   const existing=(await db.query('select '+projection+' from customer_debts d where customer_id=$1 and request_id=$2',[account.id,data.request_id])).rows[0];
   if(existing){if(existing.book_id!==account.finance_book.id)throw badRequest('Esta deuda ya se guardó en otra contabilidad.');return {debt:existing};}
   if((await db.query('select count(*)::int n from customer_debts where customer_id=$1',[account.id])).rows[0].n>=200)throw badRequest('Puedes guardar hasta 200 deudas.');
  }
  const values=[account.id,account.finance_book.id,data.name,data.lender,account.finance_book.currency,data.principal,data.rate_percent,data.rate_type,estimate.baseline.months,payment,data.monthly_fee,data.as_of,data.next_due,Number(data.next_due.slice(8)),data.projection_mode,data.note];
  const debt=id?(await db.query(`update customer_debts set name=$3,lender=$4,currency=$5,principal=$6,rate_percent=$7,rate_type=$8,months=$9,installment=$10,monthly_fee=$11,as_of=$12,next_due=$13,anchor_day=$14,projection_mode=$15,note=$16,status='ACTIVE',revision=revision+1,updated_at=now() where customer_id=$1 and book_id=$2 and id=$17 returning *,as_of::text as_of,next_due::text next_due`,[...values,id])).rows[0]:
   (await db.query(`insert into customer_debts(customer_id,book_id,name,lender,currency,principal,rate_percent,rate_type,months,installment,monthly_fee,as_of,next_due,anchor_day,projection_mode,note,request_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning *,as_of::text as_of,next_due::text next_due`,[...values,data.request_id])).rows[0];
  await event(db,account,debt.id,id?'SNAPSHOT_UPDATED':'CREATED',previous,debt);return {debt};
 });
}
async function detail(account,id){
 const debt=await own(account,id),payments=(await query('select *,paid_on::text paid_on from customer_debt_payments where customer_id=$1 and debt_id=$2 order by created_at desc',[account.id,id])).rows;
 return {debt,plan:plan(debt),payments,events:(await query('select action,created_at,before_value,after_value from customer_debt_events where customer_id=$1 and debt_id=$2 order by created_at desc limit 100',[account.id,id])).rows};
}
async function archive(account,id,data){
 return withTransaction(async db=>{
  const old=await own(account,id,db,true);if(old.revision!==data.revision)throw badRequest('La deuda cambió. Actualiza la lista.');
  const debt=(await db.query('update customer_debts set status=$3,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *',[account.id,id,data.archived?'ARCHIVED':Number(old.principal)>0?'ACTIVE':'PAID'])).rows[0];
  await event(db,account,id,data.archived?'ARCHIVED':'RESTORED',old,debt);return {debt};
 });
}
async function pay(account,id,data){
 return withTransaction(async db=>{
  const old=await own(account,id,db,true);
  const existing=(await db.query('select * from customer_debt_payments where customer_id=$1 and request_id=$2',[account.id,data.request_id])).rows[0];
  if(existing){if(existing.debt_id!==id||existing.voided_at)throw badRequest('Esta solicitud ya se usó. Actualiza la deuda.');return {payment:existing,existing:true};}
  if(old.revision!==data.revision||old.status!=='ACTIVE')throw badRequest('La deuda cambió o ya no está activa. Actualiza antes de registrar el pago.');
  if(data.paid_on<old.as_of||data.paid_on>today(account))throw badRequest('La fecha debe estar entre la fecha del saldo y hoy.');
  const capital=math.minor(data.principal_paid),interest=math.minor(data.interest_paid),fees=math.minor(data.fees_paid),total=capital+interest+fees,balance=math.minor(old.principal)-capital;
  if(balance<0||total<=0)throw badRequest('Revisa el capital abonado y el importe total.');
  if(data.kind==='SETTLEMENT'&&balance!==0)throw badRequest('Para liquidar debes cubrir todo el capital pendiente.');
  let entryId=data.entry_id||null;
  if(entryId){
   const e=(await db.query('select *, (occurred_at at time zone $3)::date::text paid_date from customer_entries where customer_id=$1 and id=$2 for update',[account.id,entryId,account.timezone])).rows[0];
   if(!e||e.book_id!==old.book_id||e.currency!==old.currency||e.kind!=='EXPENSE'||e.deleted_at||e.linked_sale_id)throw badRequest('Selecciona un gasto manual de esta contabilidad y moneda.');
   if(math.minor(e.amount)!==total)throw badRequest('El gasto seleccionado no coincide con capital + interés + cargos.');
   if(e.paid_date!==data.paid_on)throw badRequest('La fecha debe coincidir con la del gasto seleccionado.');
   if((await db.query('select 1 from customer_debt_payments where entry_id=$1 and voided_at is null',[entryId])).rowCount)throw badRequest('Ese movimiento ya está vinculado a un pago de deuda.');
  }else{
   const saved=await db.query("insert into customer_entries(customer_id,book_id,request_id,kind,amount,currency,occurred_at,merchant,category,priority,note) values($1,$2,$3,'EXPENSE',$4,$5,$6::date::timestamp at time zone $7,$8,'otros','ESSENTIAL',$9) on conflict(customer_id,request_id) do nothing returning id",[account.id,old.book_id,data.request_id,decimal(total),old.currency,data.paid_on,account.timezone,old.lender||old.name,'Pago de deuda: '+old.name+'. '+data.note]);
   if(!saved.rowCount)throw badRequest('La identidad del pago ya fue usada. Actualiza y vuelve a intentar.');entryId=saved.rows[0].id;
  }
  const remaining=Math.max(1,old.months-(data.kind==='INSTALLMENT'?1:0)),newPayment=balance&&data.strategy==='INSTALLMENT'?math.quota(balance,math.rate(old.rate_percent,old.rate_type),remaining):math.minor(old.installment);
  const nextMonths=balance?calculate({...input(old),principal:decimal(balance),months:remaining,installment:decimal(newPayment)}).baseline.months:0;
  const nextDue=data.kind==='INSTALLMENT'?dueDate(old,1):old.next_due;
  const debt=(await db.query(`update customer_debts set principal=$3,installment=$4,months=$5,as_of=$6,next_due=$7,status=$8,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *,as_of::text as_of,next_due::text next_due`,[account.id,id,decimal(balance),decimal(newPayment),nextMonths,data.paid_on,nextDue,balance?'ACTIVE':'PAID'])).rows[0];
  const payment=(await db.query(`insert into customer_debt_payments(customer_id,debt_id,request_id,entry_id,owns_entry,kind,principal_paid,interest_paid,fees_paid,paid_on,note,before_value,after_revision) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13) returning *`,[account.id,id,data.request_id,entryId,!data.entry_id,data.kind,data.principal_paid,data.interest_paid,data.fees_paid,data.paid_on,data.note,JSON.stringify(old),debt.revision])).rows[0];
  await event(db,account,id,'PAYMENT_RECORDED',old,debt);return {debt,payment};
 });
}
async function voidPayment(account,id,paymentId,data){
 return withTransaction(async db=>{
  const debt=await own(account,id,db,true);
  const payment=(await db.query('select * from customer_debt_payments where customer_id=$1 and debt_id=$2 and id=$3 for update',[account.id,id,paymentId])).rows[0];
  if(!payment)throw notFound();if(payment.voided_at)return {ok:true,existing:true};
  if(debt.revision!==data.revision||payment.after_revision!==debt.revision)throw badRequest('Solo puedes anular el último pago si la deuda no cambió después. Revisa el historial o actualiza el saldo con tu extracto.');
  const old=payment.before_value;
  await db.query('update customer_debt_payments set voided_at=now() where id=$1',[paymentId]);
  if(payment.owns_entry)await db.query('update customer_entries set deleted_at=now(),updated_at=now() where id=$1 and customer_id=$2',[payment.entry_id,account.id]);
  const restored=(await db.query('update customer_debts set principal=$3,installment=$4,months=$5,as_of=$6,next_due=$7,status=$8,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *',[account.id,id,old.principal,old.installment,old.months,old.as_of,old.next_due,old.status])).rows[0];
  await event(db,account,id,'PAYMENT_VOIDED',debt,restored);return {debt:restored};
 });
}
async function candidates(account,id){
 const debt=await own(account,id);
 return {entries:(await query(`select e.id,e.amount,e.merchant,(e.occurred_at at time zone $4)::date::text date from customer_entries e where e.customer_id=$1 and e.book_id=$2 and e.currency=$3 and e.kind='EXPENSE' and e.deleted_at is null and e.linked_sale_id is null and not exists(select 1 from customer_debt_payments p where p.entry_id=e.id and p.voided_at is null) order by e.occurred_at desc limit 100`,[account.id,debt.book_id,debt.currency,account.timezone])).rows};
}
async function scenarios(account){return {scenarios:(await query('select * from customer_debt_scenarios where customer_id=$1 and book_id=$2 order by created_at desc limit 100',[account.id,account.finance_book.id])).rows};}
async function saveScenario(account,data){
 calculate(data.input);if(data.debt_id)await own(account,data.debt_id);
 const scenario=(await query('insert into customer_debt_scenarios(customer_id,book_id,debt_id,request_id,name,input) values($1,$2,$3,$4,$5,$6::jsonb) on conflict(customer_id,request_id) do update set request_id=excluded.request_id where customer_debt_scenarios.book_id=excluded.book_id returning *',[account.id,account.finance_book.id,data.debt_id||null,data.request_id,data.name,JSON.stringify(data.input)])).rows[0];
 if(!scenario)throw badRequest('Este escenario ya se guardó en otra contabilidad.');return {scenario};
}
async function deleteScenario(account,id){const r=await query('delete from customer_debt_scenarios where customer_id=$1 and book_id=$2 and id=$3 returning id',[account.id,account.finance_book.id,id]);if(!r.rowCount)throw notFound();return {ok:true};}
module.exports={calculate,input,plan,dueDate,own,list,summary,save,detail,archive,pay,voidPayment,candidates,scenarios,saveScenario,deleteScenario};

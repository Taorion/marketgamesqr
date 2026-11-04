const {withTransaction}=require('../config/db'),{badRequest}=require('../utils/http'),finance=require('./customerFinance'),agenda=require('./customerPaymentAgendaService'),{cashflow}=require('./customerWealthService');
const safe=n=>{if(!Number.isSafeInteger(n))throw badRequest('El total supera el rango permitido.');return n;},sum=(rows,fn)=>rows.reduce((n,r)=>safe(n+fn(r)),0);
const endOf=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0,12)).toISOString().slice(0,10);
function summarize(book,rows,transfers,year,today){
 const last=year===Number(today.slice(0,4))?Number(today.slice(5,7)):12;
 const months=Array.from({length:last},(_,i)=>{
  const month=year+'-'+String(i+1).padStart(2,'0'),end=endOf(month),to=end>today?today:end,closed=end<today;
  const historical=book.opening_date&&book.opening_date<=to?book:{...book,opening_amount:null,opening_date:null};
  const flow=cashflow(historical,rows,transfers,to);
  return {month,closed,...flow,days:undefined,complete:closed&&!flow.partial_month&&flow.closing_minor!=null};
 });
 const eligible=months.filter(m=>m.complete),recent=eligible.slice(-3);
 return {months,insights:{complete_months:eligible.length,negative_balance_months:eligible.filter(m=>m.closing_minor<0).map(m=>m.month),deficit_months:eligible.filter(m=>m.net_minor<0).map(m=>m.month),sample_months:recent.map(m=>m.month),average_income_minor:recent.length?Math.round(sum(recent,m=>m.income_minor)/recent.length):null,average_expense_minor:recent.length?Math.round(sum(recent,m=>m.expense_minor)/recent.length):null,average_result_minor:recent.length?Math.round(sum(recent,m=>m.net_minor)/recent.length):null}};
}
async function report(account,year){
 const today=finance.dateKey(new Date(),account.timezone||'America/Bogota'),currentYear=Number(today.slice(0,4)),book=account.finance_book;
 year=year||currentYear;if(year<2000||year>currentYear)throw badRequest('Elige un año entre 2000 y el actual.');
 const currentStart=today.slice(0,7)+'-01',next=agenda.cycleDate(currentStart,'month',1);
 // Generate expectations, never income entries. Snapshot values remain tied to each period.
 await withTransaction(db=>agenda.materialize(db,account,next));
 return withTransaction(async db=>{
  await db.query('set transaction isolation level repeatable read read only');
  const fresh=await require('./customerFinanceBooks').own(account,book.id,db);
  const from=[year+'-01-01',fresh.opening_date||today,currentStart].sort()[0];
  const rows=await require('./customerService').movements(account,from,today,db);
  const transfers=(await db.query('select *,occurred_on::text occurred_on from customer_finance_transfers where customer_id=$1 and (from_book_id=$2 or to_book_id=$2) and occurred_on<=$3',[account.id,book.id,today])).rows;
  const rules=(await db.query("select *,anchor_date::text anchor_date,next_date::text next_date from customer_recurring where customer_id=$1 and book_id=$2 and kind='INCOME' and currency=$3 order by active desc,name,id",[account.id,book.id,book.currency])).rows;
  const items=(await db.query(`select i.*,i.due_date::text due_date,i.scheduled_date::text scheduled_date,r.frequency,r.active,r.remind_days,r.reminder_day,r.reminders_enabled,r.book_id,e.amount actual_amount,(e.occurred_at at time zone $4)::date::text paid_on
   from customer_payment_items i join customer_recurring r on r.id=i.recurring_id left join customer_entries e on e.id=i.entry_id
   where i.customer_id=$1 and r.book_id=$2 and i.kind='INCOME' and i.currency=$3 and i.due_date<$6 and (i.due_date>=$5 or i.status='PENDING') order by i.due_date,i.name`,[account.id,book.id,book.currency,account.timezone,currentStart,next])).rows;
  const monthly=rules.filter(r=>r.active&&r.frequency==='month'&&(r.anchor_date||r.next_date)<next);
  const currentPaid=rows.filter(r=>r.status==='PAID'&&r.kind==='INCOME'&&r.currency===book.currency&&r.date>=currentStart&&r.date<=today);
  const pending=items.filter(i=>i.status==='PENDING'),amount=i=>finance.minor(i.billed_amount??i.estimated_amount);
  const output=summarize(fresh,rows,transfers,year,today);
  return {...output,book:fresh,year,today,currency:book.currency,rules,items,current:{month:today.slice(0,7),monthly_declared_minor:sum(monthly,r=>finance.minor(r.amount)),monthly_sources:monthly.length,received_minor:sum(currentPaid,r=>r.amount_minor),pending_minor:sum(pending,amount),overdue_minor:sum(pending.filter(i=>i.due_date<today),amount)},foreign_currency_count:rows.filter(r=>r.currency!==book.currency).length};
 });
}
module.exports={summarize,report};

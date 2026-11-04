const crypto=require('crypto');
const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const finance=require('./customerFinance');
const reminders=require('./customerPaymentReminderRules');
const books=require('./customerFinanceBooks');
const today=a=>finance.dateKey(new Date(),a.timezone||'America/Bogota');
function cycleDate(anchor,frequency,index){
 const [y,m,d]=anchor.split('-').map(Number);
 if(frequency==='week')return new Date(Date.UTC(y,m-1,d+7*index,12)).toISOString().slice(0,10);
 const date=new Date(Date.UTC(y+(frequency==='year'?index:0),m-1+(frequency==='month'?index:0),1,12));
 date.setUTCDate(Math.min(d,new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0,12)).getUTCDate()));
 return date.toISOString().slice(0,10);
}
function dates(anchor,frequency,until,after=''){
 if(frequency==='once')return anchor<=until&&anchor>after?[anchor]:[];
 const result=[];
 for(let i=0;i<6000;i++){const date=cycleDate(anchor,frequency,i);if(date>until)return result;if(date>after)result.push(date);}
 throw badRequest('La fecha inicial es demasiado antigua.');
}
async function materialize(db,account,until){
 const values=[account.id],filter=books.scope(account,'',values);
 const rules=(await db.query('select *,coalesce(anchor_date,(select min(due_date) from customer_recurring_posts p where p.recurring_id=customer_recurring.id),next_date)::text anchor,generated_until::text generated from customer_recurring where customer_id=$1 and active'+filter+' order by id for update',values)).rows;
 for(const r of rules){
  const due=dates(r.anchor,r.frequency,until,r.generated||'');if(!due.length)continue;
  await db.query(`insert into customer_payment_items(customer_id,recurring_id,scheduled_date,due_date,name,currency,kind,category,estimated_amount)
   select $1,$2,d,d,$3,$4,$5,$6,$7 from unnest($8::date[]) d on conflict(recurring_id,scheduled_date) do nothing`,
   [account.id,r.id,r.name,r.currency,r.kind,r.category,r.amount,due]);
  await db.query('update customer_recurring set generated_until=$2,anchor_date=$3 where id=$1',[r.id,until,r.anchor]);
 }
}
async function create(account,data){
 if(data.reminder_day!=null&&data.frequency!=='month')throw badRequest('El día fijo de aviso requiere una obligación mensual.');
 if(data.next_date<'2000-01-01'||data.next_date>cycleDate(today(account),'year',2))throw badRequest('Elige una fecha inicial entre el año 2000 y los próximos dos años.');
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  if((await db.query('select count(*)::int n from customer_recurring where customer_id=$1 and active',[account.id])).rows[0].n>=200)throw badRequest('Puedes mantener hasta 200 obligaciones activas.');
  const r=(await db.query(`insert into customer_recurring(customer_id,name,currency,amount,kind,category,next_date,anchor_date,frequency,remind_days,reminders_enabled,reminder_day,book_id,priority)
   values($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13) returning *,next_date::text next_date`,
   [account.id,data.name,data.currency,data.amount,data.kind,data.category,data.next_date,data.frequency,data.remind_days??3,data.reminders_enabled??true,data.reminder_day??null,account.finance_book?.id||null,data.priority||'ESSENTIAL'])).rows[0];
  return {recurring:r};
 });
}
async function updateRule(account,id,data){
 const current=(await query('select frequency from customer_recurring where id=$1 and customer_id=$2',[id,account.id])).rows[0];
 if(!current)throw notFound();
 if(data.reminder_day!=null&&current.frequency!=='month')throw badRequest('El día fijo de aviso requiere una obligación mensual.');
 const r=await query(`update customer_recurring set name=$3,amount=$4,remind_days=$5,reminders_enabled=$6,active=$7,
  reminder_day=case when $8 then $9::smallint else reminder_day end,priority=coalesce($10,priority)
  where id=$1 and customer_id=$2 returning *`,[id,account.id,data.name,data.amount,data.remind_days,data.reminders_enabled,data.active,data.reminder_day!==undefined,data.reminder_day??null,data.priority||null]);
 if(!r.rowCount)throw notFound();return {recurring:r.rows[0]};
}
async function archive(account,id){
 const r=await query('update customer_recurring set active=false,reminders_enabled=false where id=$1 and customer_id=$2 returning id',[id,account.id]);
 if(!r.rowCount)throw notFound();return {ok:true};
}
const projection=`i.*,i.scheduled_date::text scheduled_date,i.due_date::text due_date,
 e.amount actual_amount,(e.occurred_at at time zone $2)::date::text paid_on,r.remind_days,r.reminder_day,r.reminders_enabled,r.active,r.priority,r.book_id,r.frequency`;
async function list(account,{month=today(account).slice(0,7),currency=account.currency||'COP'}={}){
 const start=month+'-01',end=cycleDate(start,'month',1),limit=cycleDate(today(account),'year',2);
 if(start<'2000-01-01'||start>limit)throw badRequest('Consulta un mes entre el año 2000 y los próximos dos años.');
 await withTransaction(db=>materialize(db,account,end));
 const values=[account.id,account.timezone,currency,start,end],filter=books.scope(account,'r',values);
 const ruleValues=[account.id],ruleFilter=books.scope(account,'',ruleValues);
 const items=(await query(`select ${projection} from customer_payment_items i
  join customer_recurring r on r.id=i.recurring_id left join customer_entries e on e.id=i.entry_id
  where i.customer_id=$1 and i.currency=$3 and i.due_date<$5 and (i.due_date>=$4 or i.status='PENDING')
  ${filter} order by i.due_date,i.name,i.id`,values)).rows;
 const current=items.filter(i=>i.due_date>=start),expenses=current.filter(i=>i.kind==='EXPENSE'&&i.status!=='SKIPPED');
 const sum=(rows,fn)=>rows.reduce((n,r)=>{const total=n+finance.minor(fn(r));if(!Number.isSafeInteger(total))throw badRequest('El total supera el rango de cálculo permitido. Revisa los valores de tus obligaciones.');return total;},0);
 return {month,currency,today:today(account),items,rules:(await query('select *,anchor_date::text anchor_date,next_date::text next_date from customer_recurring where customer_id=$1'+ruleFilter+' order by active desc,name',ruleValues)).rows,
  summary:{estimated_minor:sum(expenses,i=>i.estimated_amount),paid_minor:sum(expenses.filter(i=>i.status==='PAID'),i=>i.actual_amount),
   pending_minor:sum(expenses.filter(i=>i.status==='PENDING'),i=>i.billed_amount||i.estimated_amount),
   overdue_minor:sum(items.filter(i=>i.kind==='EXPENSE'&&i.status==='PENDING'&&i.due_date<today(account)),i=>i.billed_amount||i.estimated_amount)},
  reminders:items.filter(i=>reminders.due(i,today(account))).map(i=>i.id)};
}
async function detail(account,id){
 const i=(await query(`select ${projection} from customer_payment_items i join customer_recurring r on r.id=i.recurring_id
  left join customer_entries e on e.id=i.entry_id where i.id=$1 and i.customer_id=$3`,[id,account.timezone,account.id])).rows[0];
 if(!i)throw notFound();
 return {item:i,changes:(await query('select action,before_value,after_value,created_at from customer_payment_changes where item_id=$1 and customer_id=$2 order by created_at desc limit 100',[id,account.id])).rows};
}
async function audit(db,a,i,action,after){
 await db.query('insert into customer_payment_changes(item_id,customer_id,action,before_value,after_value) values($1,$2,$3,$4::jsonb,$5::jsonb)',[i.id,a.id,action,JSON.stringify(i),JSON.stringify(after)]);
}
async function edit(account,id,data){
 return withTransaction(async db=>{
  const i=(await db.query('select * from customer_payment_items where id=$1 and customer_id=$2 for update',[id,account.id])).rows[0];if(!i)throw notFound();
  if(i.revision!==data.revision)throw badRequest('Esta factura cambió. Actualiza la agenda y vuelve a intentarlo.');
  if(data.due_date<'2000-01-01'||data.due_date>cycleDate(today(account),'year',2))throw badRequest('Revisa la fecha de vencimiento.');
  const r=(await db.query(`update customer_payment_items set due_date=$3,billed_amount=$4,note=$5,revision=revision+1,updated_at=now()
   where id=$1 and customer_id=$2 returning *`,[id,account.id,data.due_date,data.billed_amount,data.note])).rows[0];
  await audit(db,account,i,'BILL_UPDATED',r);return {item:r};
 });
}
async function payment(account,id,data){
 return withTransaction(async db=>{
  const owner=(await db.query('select recurring_id from customer_payment_items where id=$1 and customer_id=$2',[id,account.id])).rows[0];if(!owner)throw notFound();
  const classification=(await db.query('select priority,frequency from customer_recurring where id=$1 and customer_id=$2 for update',[owner.recurring_id,account.id])).rows[0];
  const i=(await db.query('select *,scheduled_date::text scheduled_date from customer_payment_items where id=$1 and customer_id=$2 for update',[id,account.id])).rows[0];if(!i)throw notFound();
  if(data.action==='PAY'&&i.status==='PAID')return {entry_id:i.entry_id,existing:true};
  if(i.revision!==data.revision)throw badRequest('Este pago cambió. Actualiza antes de continuar.');
  const oldEntry=i.entry_id?(await db.query('select * from customer_entries where id=$1 and customer_id=$2 for update',[i.entry_id,account.id])).rows[0]:null;
  if(oldEntry)await require('./customerService').assertNotDebtEntry(account.id,oldEntry.id,db);
  if(oldEntry?.linked_sale_id)throw badRequest('Este movimiento está asociado a una compra Qori. Revisa su historial.');
  let entryId=i.entry_id,status=i.status;
  if(['PAY','CORRECT'].includes(data.action)){
   if(!data.amount||!data.paid_on||data.paid_on>today(account)||data.paid_on<'2000-01-01')throw badRequest('Indica el valor real y una fecha de pago que no sea futura.');
   if(data.action==='PAY'&&i.status!=='PENDING'||data.action==='CORRECT'&&i.status!=='PAID')throw badRequest('El estado de esta obligación no permite esa acción.');
   if(oldEntry){
    await db.query(`update customer_entries set amount=$3,occurred_at=$4::date::timestamp at time zone $5,updated_at=now() where id=$1 and customer_id=$2`,
     [entryId,account.id,data.amount,data.paid_on,account.timezone]);
   }else{
    entryId=(await db.query(`insert into customer_entries(customer_id,request_id,kind,amount,currency,occurred_at,merchant,category,priority,note,book_id,expense_pattern)
     values($1,$2,$3,$4,$5,$6::date::timestamp at time zone $7,$8,$9,$12,$10,(select book_id from customer_recurring where id=$11),$13) returning id`,
     [account.id,crypto.randomUUID(),i.kind,data.amount,i.currency,data.paid_on,account.timezone,i.name,i.category,'Obligación de '+i.scheduled_date.slice(0,7)+'. '+i.note,i.recurring_id,classification.priority,classification.frequency==='once'?'EVENTUAL':'RECURRING'])).rows[0].id;
   }
   status='PAID';
   await db.query(`insert into customer_recurring_posts(recurring_id,due_date,entry_id) values($1,$2,$3)
    on conflict(recurring_id,due_date) do update set entry_id=excluded.entry_id`,[i.recurring_id,i.scheduled_date,entryId]);
  }else if(data.action==='REOPEN'){
   if(i.status!=='PAID')throw badRequest('Este pago no está confirmado.');
   await db.query('update customer_entries set deleted_at=now(),updated_at=now() where id=$1 and customer_id=$2',[entryId,account.id]);
   entryId=null;status='PENDING';
  }else if(data.action==='SKIP'){
   if(i.status!=='PENDING')throw badRequest('Solo puedes omitir una obligación pendiente.');status='SKIPPED';
  }else if(data.action==='RESTORE'){
   if(i.status!=='SKIPPED')throw badRequest('Esta obligación no está omitida.');status='PENDING';
  }
  const updated=(await db.query('update customer_payment_items set status=$3,entry_id=$4,revision=revision+1,updated_at=now() where id=$1 and customer_id=$2 returning *',[id,account.id,status,entryId])).rows[0];
  await audit(db,account,{...i,actual_amount:oldEntry?.amount,paid_at:oldEntry?.occurred_at},data.action,{...updated,actual_amount:data.amount,paid_on:data.paid_on});
  const pending=(await db.query("select scheduled_date::text date from customer_payment_items where recurring_id=$1 and status='PENDING' order by scheduled_date limit 1",[i.recurring_id])).rows[0];
  const rule=(await db.query('select anchor_date::text anchor,frequency from customer_recurring where id=$1',[i.recurring_id])).rows[0];
  let next=pending?.date||(rule.frequency==='once'?rule.anchor:null);if(!next){for(let n=0;n<6000;n++){const d=cycleDate(rule.anchor,rule.frequency,n);if(d>i.scheduled_date){next=d;break;}}}
  await db.query('update customer_recurring set next_date=$2 where id=$1',[i.recurring_id,next||i.scheduled_date]);
  return {item:updated,entry_id:entryId};
 });
}
async function legacyRecord(account,id,data){
 await withTransaction(db=>materialize(db,account,cycleDate(data.expected_date,'month',1)));
 const i=(await query('select * from customer_payment_items where recurring_id=$1 and customer_id=$2 and scheduled_date=$3',[id,account.id,data.expected_date])).rows[0];
 if(!i)throw notFound();
 return payment(account,i.id,{action:'PAY',revision:i.revision,amount:data.amount||i.billed_amount||i.estimated_amount,paid_on:data.paid_on});
}
module.exports={today,cycleDate,dates,materialize,create,updateRule,archive,list,detail,edit,payment,legacyRecord};

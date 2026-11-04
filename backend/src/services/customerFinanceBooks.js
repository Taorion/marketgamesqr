const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const finance=require('./customerFinance');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tables={entries:'customer_entries',recurring:'customer_recurring',purchases:'customer_purchase_plans',budgets:'customer_budgets',goals:'customer_goals'};
const today=a=>finance.dateKey(new Date(),a.timezone||'America/Bogota');
const sum=(rows,fn)=>rows.reduce((n,r)=>safe(n+fn(r)),0);
function safe(value){if(!Number.isSafeInteger(value))throw badRequest('El total supera el rango permitido.');return value;}
function scope(account,alias,values){if(!account.finance_book)return '';values.push(account.finance_book.id);return ' and '+(alias?alias+'.':'')+'book_id=$'+values.length;}
function allocationScope(account,kind,alias,values){
 if(!account.finance_book)return '';values.push(account.finance_book.id);
 return ` and coalesce((select fa.book_id from customer_finance_allocations fa where fa.customer_id=$1 and fa.kind='${kind}' and fa.source_id=${alias}.id),(select fb.id from customer_finance_books fb where fb.customer_id=$1 and fb.is_default))=$${values.length}`;
}
async function ensure(account,db={query}){
 await db.query("insert into customer_finance_books(customer_id,name,currency,is_default) values($1,'Personal',$2,true) on conflict(customer_id) where is_default do nothing",[account.id,account.currency||'COP']);
}
async function own(account,id,db={query},lock=false){
 const r=(await db.query('select *,opening_date::text opening_date from customer_finance_books where customer_id=$1 and id=$2'+(lock?' for update':''),[account.id,id])).rows[0];
 if(!r)throw notFound('Contabilidad no encontrada.');return r;
}
async function list(account){await ensure(account);return {books:(await query('select *,opening_date::text opening_date from customer_finance_books where customer_id=$1 order by is_default desc,created_at,id',[account.id])).rows};}
async function selected(account,id){
 await ensure(account);
 if(id){if(!uuid.test(id))throw badRequest('Contabilidad inválida.');return own(account,id);}
 return (await query('select *,opening_date::text opening_date from customer_finance_books where customer_id=$1 and is_default',[account.id])).rows[0];
}
async function create(account,data){
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  if((await db.query('select count(*)::int n from customer_finance_books where customer_id=$1',[account.id])).rows[0].n>=30)throw badRequest('Puedes crear hasta 30 contabilidades.');
  return {book:(await db.query('insert into customer_finance_books(customer_id,request_id,name,currency) values($1,$2,$3,$4) on conflict(customer_id,request_id) do update set request_id=excluded.request_id returning *',[account.id,data.request_id,data.name,data.currency])).rows[0]};
 });
}
async function update(account,id,data){
 if(data.opening_date>today(account)||data.opening_date<'2000-01-01')throw badRequest('La fecha del saldo inicial debe ser pasada o de hoy.');
 const r=await query('update customer_finance_books set name=$3,opening_amount=$4,opening_date=$5,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 and revision=$6 returning *,opening_date::text opening_date',[account.id,id,data.name,data.opening_amount,data.opening_date,data.revision]);
 if(!r.rowCount)throw badRequest('La contabilidad cambió. Actualiza y vuelve a intentar.');return {book:r.rows[0]};
}
async function sourceBook(account,kind,id,db={query}){
 const r=(await db.query('select coalesce((select book_id from customer_finance_allocations where customer_id=$1 and kind=$2 and source_id=$3),(select id from customer_finance_books where customer_id=$1 and is_default)) book_id',[account.id,kind,id])).rows[0];return r.book_id;
}
async function assertSource(account,kind,id,db={query}){
 if(account.finance_book&&(await sourceBook(account,kind,id,db))!==account.finance_book.id)throw notFound('El movimiento pertenece a otra contabilidad.');
}
async function guard(account,route,id){
 if(!uuid.test(id))throw badRequest('Identificador inválido.');
 let row;
 if(tables[route])row=(await query('select book_id from '+tables[route]+' where id=$1 and customer_id=$2',[id,account.id])).rows[0];
 else if(route==='payment-agenda')row=(await query('select r.book_id from customer_payment_items i join customer_recurring r on r.id=i.recurring_id where i.id=$1 and i.customer_id=$2',[id,account.id])).rows[0];
 else if(route==='sales'){await require('./customerService').ownSale(account.id,id);return assertSource(account,'SALE',id);}
 if(!row||row.book_id!==account.finance_book.id)throw notFound('No se encontró en esta contabilidad.');
}
async function middleware(req,_res,next){
 try{
  const parts=req.path.split('/').filter(Boolean),route=parts[0];
  if(!['dashboard','planning','entries','sales','budgets','goals','recurring','purchases','payment-agenda','finance-home'].includes(route))return next();
  if(route==='payment-agenda'&&['notifications','push'].includes(parts[1]))return next();
  req.customer={...req.customer,finance_book:await selected(req.customer,req.get('X-Qori-Book')||req.query.book_id)};
  if(parts[1]&&parts[1]!=='overview')await guard(req.customer,route,parts[1]);
  next();
 }catch(e){next(e);}
}
async function transfer(account,data){
 if(data.occurred_on>today(account)||data.occurred_on<'2000-01-01')throw badRequest('Registra una transferencia ya realizada.');
 if(data.from_book_id===data.to_book_id)throw badRequest('Elige dos contabilidades diferentes.');
 return withTransaction(async db=>{
  const books=(await db.query('select * from customer_finance_books where customer_id=$1 and id=any($2::uuid[]) order by id for update',[account.id,[data.from_book_id,data.to_book_id]])).rows;
  if(books.length!==2)throw notFound();
  if(books[0].currency!==books[1].currency)throw badRequest('Los traslados requieren la misma moneda en ambas contabilidades.');
  if(books.some(b=>b.opening_amount==null))throw badRequest('Configura el saldo inicial de ambas contabilidades antes de trasladar dinero.');
  return {transfer:(await db.query(`insert into customer_finance_transfers(customer_id,request_id,from_book_id,to_book_id,currency,amount,occurred_on,note)
   values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(customer_id,request_id) do update set request_id=excluded.request_id returning *`,[account.id,data.request_id,data.from_book_id,data.to_book_id,books[0].currency,data.amount,data.occurred_on,data.note])).rows[0]};
 });
}
async function voidTransfer(account,id){
 const r=await query('update customer_finance_transfers set voided_at=coalesce(voided_at,now()) where id=$1 and customer_id=$2 returning id',[id,account.id]);
 if(!r.rowCount)throw notFound();return {ok:true};
}
async function reassign(account,data){
 return withTransaction(async db=>{
  const target=await own(account,data.book_id,db,true),svc=require('./customerService');
  if(data.kind==='SALE'){
   const sale=await svc.ownSale(account.id,data.id,db);
   if(sale.currency!==target.currency)throw badRequest('La moneda del destino no coincide.');
   await db.query("insert into customer_finance_allocations(customer_id,kind,source_id,book_id) values($1,'SALE',$2,$3) on conflict(customer_id,kind,source_id) do update set book_id=excluded.book_id",[account.id,data.id,target.id]);
   await db.query('update customer_entries set book_id=$3 where customer_id=$1 and linked_sale_id=$2',[account.id,data.id,target.id]);
   await db.query('update customer_purchase_plans set book_id=$3 where customer_id=$1 and (sale_id=$2 or entry_id in(select id from customer_entries where customer_id=$1 and linked_sale_id=$2))',[account.id,data.id,target.id]);
  }else if(data.kind==='ENTRY'){
   const e=(await db.query('select * from customer_entries where customer_id=$1 and id=$2 and deleted_at is null for update',[account.id,data.id])).rows[0];
   if(!e)throw notFound();
   if(e.currency!==target.currency)throw badRequest('La moneda del destino no coincide.');
   if(e.linked_sale_id)throw badRequest('Cambia la contabilidad desde la compra Qori vinculada.');
   if((await db.query('select 1 from customer_payment_items where entry_id=$1',[e.id])).rowCount)throw badRequest('Cambia la contabilidad de la obligación completa desde la agenda.');
   await db.query('update customer_entries set book_id=$3 where customer_id=$1 and id=$2',[account.id,e.id,target.id]);
   await db.query('update customer_purchase_plans set book_id=$3 where customer_id=$1 and entry_id=$2',[account.id,e.id,target.id]);
  }else if(data.kind==='RECURRING'){
   const r=(await db.query('select * from customer_recurring where customer_id=$1 and id=$2 for update',[account.id,data.id])).rows[0];
   if(!r)throw notFound();if(r.currency!==target.currency)throw badRequest('La moneda del destino no coincide.');
   await db.query('update customer_recurring set book_id=$3 where customer_id=$1 and id=$2',[account.id,r.id,target.id]);
   await db.query('update customer_entries set book_id=$3 where customer_id=$1 and id in(select entry_id from customer_payment_items where customer_id=$1 and recurring_id=$2)',[account.id,r.id,target.id]);
   await db.query('update customer_purchase_plans set book_id=$3 where customer_id=$1 and entry_id in(select entry_id from customer_payment_items where customer_id=$1 and recurring_id=$2)',[account.id,r.id,target.id]);
  }else if(data.kind==='GIFT'){
   const gift=(await db.query("select id from customer_gift_orders where buyer_id=$1 and id=$2 and state='ISSUED'",[account.id,data.id])).rows[0];
   if(!gift)throw notFound();if(target.currency!=='COP')throw badRequest('La moneda del destino no coincide.');
   await db.query("insert into customer_finance_allocations(customer_id,kind,source_id,book_id) values($1,'GIFT',$2,$3) on conflict(customer_id,kind,source_id) do update set book_id=excluded.book_id",[account.id,data.id,target.id]);
  }
  return {ok:true};
 });
}
async function home(account){
 const book=account.finance_book,svc=require('./customerService'),agenda=require('./customerPaymentAgendaService'),purchases=require('./customerPurchaseService');
 const day=today(account),start=day.slice(0,7)+'-01',end=finance.periodRange({period:'month'},account.timezone).full_to;
 const [payments,plans]=await Promise.all([agenda.list(account,{currency:book.currency}),purchases.list(account)]);
 return withTransaction(async db=>{
  await db.query('set transaction isolation level repeatable read read only');
  const from=book.opening_date&&book.opening_date<start?book.opening_date:start;
  const rows=await svc.movements(account,from,day,db),paid=rows.filter(r=>r.status==='PAID'&&r.currency===book.currency);
  const pendingSales=sum((await svc.pendingSales(account,db)).filter(r=>r.currency===book.currency),r=>finance.minor(r.amount));
  const month=paid.filter(r=>r.date>=start),since=paid.filter(r=>book.opening_date&&r.date>=book.opening_date);
  const transfers=(await db.query(`select t.*,t.occurred_on::text occurred_on,f.name from_name,b.name to_name from customer_finance_transfers t
   join customer_finance_books f on f.id=t.from_book_id join customer_finance_books b on b.id=t.to_book_id
   where t.customer_id=$1 and (t.from_book_id=$2 or t.to_book_id=$2) and t.occurred_on<=$3 order by t.occurred_on desc,t.created_at desc`,[account.id,book.id,day])).rows;
  const netTransfers=sum(transfers.filter(t=>!t.voided_at&&book.opening_date&&t.occurred_on>=book.opening_date),t=>finance.minor(t.amount)*(t.to_book_id===book.id?1:-1));
  const balance=book.opening_amount==null?null:safe(finance.minor(book.opening_amount)+sum(since,r=>r.amount_minor*(r.kind==='INCOME'?1:-1))+netTransfers);
  const pending=payments.items.filter(i=>i.status==='PENDING'),amount=i=>finance.minor(i.billed_amount??i.estimated_amount);
  const obligations=sum(pending.filter(i=>i.kind==='EXPENSE'),amount),essential=sum(pending.filter(i=>i.kind==='EXPENSE'&&i.priority==='ESSENTIAL'),amount),expected=sum(pending.filter(i=>i.kind==='INCOME'),amount);
  const planned=sum(plans.plans.filter(p=>p.status==='PLANNED'&&p.currency===book.currency&&(!p.target_date||p.target_date<=end)),p=>p.estimated_minor);
  const spent=sum(month.filter(r=>r.kind==='EXPENSE'),r=>r.amount_minor),income=sum(month.filter(r=>r.kind==='INCOME'),r=>r.amount_minor);
  return {book,today:day,from:start,to:end,currency:book.currency,balance_minor:balance,income_minor:income,spent_minor:spent,
   pending_minor:obligations,essential_minor:essential,expected_income_minor:expected,planned_minor:planned,pending_sales_minor:pendingSales,
   projected_expenses_minor:safe(spent+obligations+planned+pendingSales),available_after_commitments_minor:balance==null?null:safe(balance-obligations-pendingSales),
   projected_remaining_minor:balance==null?null:safe(balance+expected-obligations-planned-pendingSales),
   commitments:pending,recurring_count:payments.rules.filter(r=>r.active).length,movements:month.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8),
   transfers:transfers.slice(0,30),foreign_currency_count:rows.filter(r=>r.currency!==book.currency).length};
 });
}
module.exports={scope,allocationScope,ensure,own,list,selected,create,update,sourceBook,assertSource,middleware,transfer,voidTransfer,reassign,home};

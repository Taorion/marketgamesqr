
const {query,withTransaction}=require('../config/db'),{badRequest,notFound}=require('../utils/http'),finance=require('./customerFinance');
const minor=finance.minor,safe=n=>{if(!Number.isSafeInteger(n))throw badRequest('El total supera el rango permitido.');return n;};
const sum=(rows,fn)=>rows.reduce((s,r)=>safe(s+fn(r)),0);
function cashflow(book,rows,transfers,day){
 const start=day.slice(0,7)+'-01',known=book.opening_amount!=null&&!!book.opening_date,from=known&&book.opening_date>start?book.opening_date:start;
 const paid=rows.filter(r=>r.status==='PAID'&&r.currency===book.currency&&r.date<=day);
 const moves=transfers.filter(t=>!t.voided_at&&t.occurred_on<=day&&(t.from_book_id===book.id||t.to_book_id===book.id));
 const direction=t=>minor(t.amount)*(t.to_book_id===book.id?1:-1),net=r=>r.amount_minor*(r.kind==='INCOME'?1:-1);
 const balance=known?safe(minor(book.opening_amount)+sum(paid.filter(r=>r.date>=book.opening_date),net)+sum(moves.filter(t=>t.occurred_on>=book.opening_date),direction)):null;
 const opening=known?safe(minor(book.opening_amount)+sum(paid.filter(r=>r.date>=book.opening_date&&r.date<from),net)+sum(moves.filter(t=>t.occurred_on>=book.opening_date&&t.occurred_on<from),direction)):null;
 const current=paid.filter(r=>r.date>=from),mt=moves.filter(t=>t.occurred_on>=from);
 let running=opening;
 const days=[];
 for(let date=from;date<=day;date=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10)){
  const incoming=sum(current.filter(r=>r.date===date&&r.kind==='INCOME'),r=>r.amount_minor),outgoing=sum(current.filter(r=>r.date===date&&r.kind==='EXPENSE'),r=>r.amount_minor);
  const transfer=sum(mt.filter(t=>t.occurred_on===date),direction);
  running=running==null?null:safe(running+incoming-outgoing+transfer);
  days.push({date,income_minor:incoming,expense_minor:outgoing,transfer_minor:transfer,balance_minor:running});
 }
 const income=sum(current.filter(r=>r.kind==='INCOME'),r=>r.amount_minor),expense=sum(current.filter(r=>r.kind==='EXPENSE'),r=>r.amount_minor);
 return {from,to:day,partial_month:from>start,opening_minor:opening,income_minor:income,expense_minor:expense,net_minor:safe(income-expense),transfers_in_minor:sum(mt.filter(t=>t.to_book_id===book.id),t=>minor(t.amount)),transfers_out_minor:sum(mt.filter(t=>t.from_book_id===book.id),t=>minor(t.amount)),closing_minor:balance,days};
}
async function overview(account){
 return withTransaction(async db=>{
  await db.query('set transaction isolation level repeatable read read only');
  const books=(await db.query('select *,opening_date::text opening_date from customer_finance_books where customer_id=$1 order by is_default desc,created_at,id',[account.id])).rows;
  const day=finance.dateKey(new Date(),account.timezone||'America/Bogota');
  if(!books.length)return {as_of:day,books:[],currencies:[],items:[]};
  const unscoped={...account,finance_book:null},defaultBook=books.find(b=>b.is_default)?.id;
  const from=books.reduce((d,b)=>b.opening_date&&b.opening_date<d?b.opening_date:d,day.slice(0,7)+'-01');
  const rows=await require('./customerService').movements(unscoped,from,day,db);
  const allocations=(await db.query('select kind,source_id,book_id from customer_finance_allocations where customer_id=$1',[account.id])).rows;
  const assigned=new Map(allocations.map(a=>[a.kind+':'+a.source_id,a.book_id]));
  const pendingSales=await require('./customerService').pendingSalesDetails(unscoped,db);
  const entries=new Map((await db.query('select id,book_id from customer_entries where customer_id=$1 and deleted_at is null',[account.id])).rows.map(e=>[e.id,e.book_id]));
  const bookFor=r=>r.entry_id?entries.get(r.entry_id):assigned.get((r.sale_id?'SALE:':'GIFT:')+(r.sale_id||r.gift_order_id))||defaultBook;
  const transfers=(await db.query('select *,occurred_on::text occurred_on from customer_finance_transfers where customer_id=$1 and voided_at is null and occurred_on<=$2',[account.id,day])).rows;
  const items=(await db.query('select *,valued_on::text valued_on from customer_wealth_items where customer_id=$1 and deleted_at is null order by kind,name,id',[account.id])).rows;
  const debts=(await db.query("select id,book_id,name,currency,principal,charges,status,as_of::text as_of from customer_debts where customer_id=$1 and status<>'PAID'",[account.id])).rows;
  const result=books.map(book=>{
   const flow=cashflow(book,rows.filter(r=>bookFor(r)===book.id),transfers,day),local=items.filter(i=>i.book_id===book.id);
   const credit=debts.filter(d=>d.book_id===book.id&&d.currency===book.currency);
   const excluded_currencies=[...new Set([...rows.filter(r=>bookFor(r)===book.id&&r.currency!==book.currency).map(r=>r.currency),...pendingSales.filter(s=>(assigned.get('SALE:'+s.id)||defaultBook)===book.id&&s.currency!==book.currency).map(s=>s.currency)])];
   const principal=sum(credit,d=>minor(d.principal)),charges=sum(credit,d=>sum((d.charges||[]).filter(c=>c.mode==='SPREAD'&&c.on_payoff==='DUE'),c=>minor(c.amount)));
   const assets=sum(local.filter(i=>i.kind==='ASSET'),i=>minor(i.amount)),other=sum(local.filter(i=>i.kind==='LIABILITY'),i=>minor(i.amount));
   const pending=sum(pendingSales.filter(s=>(assigned.get('SALE:'+s.id)||defaultBook)===book.id&&s.currency===book.currency),s=>minor(s.sale_amount));
   const cash=flow.closing_minor,overdraft=cash==null?null:Math.max(0,-cash),liabilities=safe(principal+charges+other+pending+(overdraft||0)),totalAssets=cash==null?null:safe(Math.max(0,cash)+assets);
   return {id:book.id,name:book.name,currency:book.currency,excluded_currencies,cash_minor:cash,non_cash_minor:assets,debt_minor:principal,debt_charges_minor:charges,other_liabilities_minor:other,pending_sales_minor:pending,overdraft_minor:overdraft,assets_minor:totalAssets,liabilities_minor:liabilities,net_worth_minor:totalAssets==null?null:safe(totalAssets-liabilities),flow,debts:credit,items:local,missing_cash:cash==null};
  });
  const currencies=[...new Set(books.map(b=>b.currency))].map(currency=>{
   const group=result.filter(b=>b.currency===currency),missing=group.filter(b=>b.missing_cash).map(b=>b.name);
   const aggregate=key=>sum(group,b=>b[key]||0);
   return {currency,excluded_currencies:[...new Set(group.flatMap(b=>b.excluded_currencies))],missing_books:missing,known_cash_minor:aggregate('cash_minor'),cash_minor:missing.length?null:aggregate('cash_minor'),non_cash_minor:aggregate('non_cash_minor'),assets_minor:missing.length?null:aggregate('assets_minor'),liabilities_minor:aggregate('liabilities_minor'),net_worth_minor:missing.length?null:aggregate('net_worth_minor')};
  });
  return {as_of:day,books:result,currencies,items};
 });
}
async function save(account,data,id){
 const day=finance.dateKey(new Date(),account.timezone||'America/Bogota');
 if(data.valued_on>day||data.valued_on<'2000-01-01')throw badRequest('La valoración debe tener fecha de hoy o anterior.');
 if((data.kind==='LIABILITY')!==(data.category==='PAYABLE'))throw badRequest('Revisa el tipo de activo o pasivo.');
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  let previous=null;
  if(id){
   previous=(await db.query('select * from customer_wealth_items where customer_id=$1 and book_id=$2 and id=$3 and deleted_at is null for update',[account.id,account.finance_book.id,id])).rows[0];
   if(!previous)throw notFound('Registro no encontrado en esta contabilidad.');
   if(previous.revision!==data.revision)throw badRequest('El registro cambió. Actualiza antes de guardar.');
  }else{
   const existing=(await db.query('select * from customer_wealth_items where customer_id=$1 and request_id=$2',[account.id,data.request_id])).rows[0];
   if(existing){if(existing.book_id!==account.finance_book.id||existing.deleted_at)throw badRequest('Esta solicitud ya fue utilizada.');return {item:existing};}
   if((await db.query('select count(*)::int n from customer_wealth_items where customer_id=$1 and deleted_at is null',[account.id])).rows[0].n>=500)throw badRequest('Puedes mantener hasta 500 registros de patrimonio.');
  }
  const values=[account.id,account.finance_book.id,data.kind,data.category,data.name,data.amount,data.valued_on,data.note];
  const item=(await db.query(id?
   'update customer_wealth_items set kind=$3,category=$4,name=$5,amount=$6,valued_on=$7,note=$8,revision=revision+1,updated_at=now() where customer_id=$1 and book_id=$2 and id=$9 returning *':
   'insert into customer_wealth_items(customer_id,book_id,kind,category,name,amount,valued_on,note,request_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[...values,id||data.request_id])).rows[0];
  await db.query('insert into customer_wealth_events(customer_id,item_id,before_value,after_value) values($1,$2,$3::jsonb,$4::jsonb)',[account.id,item.id,JSON.stringify(previous),JSON.stringify(item)]);
  return {item};
 });
}
async function remove(account,id,revision){
 return withTransaction(async db=>{
  const old=(await db.query('select * from customer_wealth_items where customer_id=$1 and book_id=$2 and id=$3 and deleted_at is null for update',[account.id,account.finance_book.id,id])).rows[0];
  if(!old)throw notFound();if(old.revision!==revision)throw badRequest('El registro cambió. Actualiza antes de retirarlo.');
  const item=(await db.query('update customer_wealth_items set deleted_at=now(),updated_at=now(),revision=revision+1 where id=$1 returning *',[id])).rows[0];
  await db.query('insert into customer_wealth_events(customer_id,item_id,before_value,after_value) values($1,$2,$3::jsonb,$4::jsonb)',[account.id,id,JSON.stringify(old),JSON.stringify(item)]);return {ok:true};
 });
}
module.exports={cashflow,overview,save,remove};

const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const finance=require('./customerFinance'),svc=require('./customerService'),agenda=require('./customerPaymentAgendaService');
const projection='*,target_date::text target_date';
const books=require('./customerFinanceBooks');
async function own(db,account,id,lock=false){
 const row=(await db.query('select '+projection+' from customer_purchase_plans where customer_id=$1 and id=$2'+(lock?' for update':''),[account.id,id])).rows[0];
 if(!row)throw notFound('Compra planeada no encontrada.');return row;
}
async function actual(account,plan,db={query}){
 if(!plan.entry_id&&!plan.sale_id)return null;
 let saleId=plan.sale_id;
 if(plan.entry_id){
  const entry=(await db.query("select * from customer_entries where id=$1 and customer_id=$2 and deleted_at is null and kind='EXPENSE'",[plan.entry_id,account.id])).rows[0];
  if(!entry)return null;
  if(!entry.linked_sale_id)return {amount_minor:finance.minor(entry.amount),currency:entry.currency,source:'MANUAL',id:entry.id};
  saleId=entry.linked_sale_id;
 }
 try{
  const sale=await svc.ownSale(account.id,saleId,db);
  if(sale.sale_status!=='PAID')return null;
  return {amount_minor:finance.minor(sale.sale_amount),currency:sale.currency,source:'QORI',id:sale.id};
 }catch(e){if(e.status===404)return null;throw e;}
}
async function list(account){
 const values=[account.id],filter=books.scope(account,'',values);
 const rows=(await query('select '+projection+' from customer_purchase_plans where customer_id=$1'+filter+' order by created_at desc,id',values)).rows;
 return {plans:await Promise.all(rows.map(async p=>{
  const paid=await actual(account,p);
  return {...p,estimated_minor:finance.minor(p.estimated_amount),actual:paid,needs_review:p.status==='PURCHASED'&&!paid,
   difference_minor:paid&&paid.currency===p.currency?finance.minor(p.estimated_amount)-paid.amount_minor:null};
 }))};
}
async function save(account,data,id){
 if(!id){
  const plan=(await query(`insert into customer_purchase_plans(customer_id,request_id,title,category,currency,estimated_amount,target_date,note,book_id)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(customer_id,request_id) do update set request_id=excluded.request_id returning ${projection}`,
   [account.id,data.request_id,data.title,data.category,data.currency,data.estimated_amount,data.target_date,data.note,account.finance_book?.id||null])).rows[0];
  if(account.finance_book&&plan.book_id!==account.finance_book.id)throw badRequest('La compra ya se registró en otra contabilidad.');return {plan};
 }
 return withTransaction(async db=>{
  const plan=await own(db,account,id,true);
  if(plan.status!=='PLANNED'||plan.revision!==data.revision)throw badRequest('Esta compra cambió. Actualiza la lista antes de editar.');
  return {plan:(await db.query(`update customer_purchase_plans set title=$3,category=$4,currency=$5,estimated_amount=$6,target_date=$7,note=$8,revision=revision+1,updated_at=now()
   where customer_id=$1 and id=$2 returning ${projection}`,[account.id,id,data.title,data.category,data.currency,data.estimated_amount,data.target_date,data.note])).rows[0]};
 });
}
async function change(account,id,data){
 return withTransaction(async db=>{
  const plan=await own(db,account,id,true);
  if(data.revision!==plan.revision)throw badRequest('Esta compra cambió. Actualiza la lista.');
  const status=data.action==='CANCEL'?'CANCELLED':'PLANNED';
  if(status==='CANCELLED'&&plan.status!=='PLANNED')throw badRequest('Solo puedes cancelar una compra pendiente.');
  // Reopening only detaches the plan. It never deletes the registered expense or sale.
  return {plan:(await db.query('update customer_purchase_plans set status=$3,entry_id=null,sale_id=null,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning '+projection,[account.id,id,status])).rows[0]};
 });
}
async function complete(account,id,data){
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['customer-purchase:'+account.id]);
  const plan=await own(db,account,id,true);
  if(plan.status==='PURCHASED')return {plan,already_completed:true};
  if(plan.status!=='PLANNED'||plan.revision!==data.revision)throw badRequest('Esta compra cambió. Actualiza la lista.');
  let entryId=null,saleId=null;
  if(data.entry_id){
   const entry=(await db.query("select * from customer_entries where id=$1 and customer_id=$2 and kind='EXPENSE' and deleted_at is null",[data.entry_id,account.id])).rows[0];
   if(!entry)throw notFound('Gasto no encontrado.');
   if(entry.book_id!==plan.book_id)throw badRequest('El gasto pertenece a otra contabilidad.');
   if(entry.currency!==plan.currency)throw badRequest('Selecciona una compra en la misma moneda.');
   if(entry.linked_sale_id)saleId=entry.linked_sale_id;else entryId=entry.id;
  }else if(data.sale_id)saleId=data.sale_id;
  else{
   if(data.paid_on>finance.dateKey(new Date(),account.timezone))throw badRequest('La fecha de una compra pagada no puede ser futura.');
   if((await db.query('select 1 from customer_entries where customer_id=$1 and request_id=$2',[account.id,plan.id])).rowCount)throw badRequest('Este plan ya generó un gasto. Vincula el movimiento existente o crea un nuevo plan para otra compra.');
   const saved=await svc.saveEntry(account.id,{book_id:plan.book_id,request_id:plan.id,kind:'EXPENSE',amount:data.amount,currency:plan.currency,occurred_at:data.paid_on,
    merchant:data.merchant,category:plan.category,priority:'UNSET',note:plan.note,payment_method:'',products:[],splits:[],tags:[]},undefined,db);
   if(saved.entry.deleted_at||saved.entry.linked_sale_id)throw badRequest('Esta compra ya tuvo un gasto. Vincula el movimiento existente para evitar duplicarlo.');
   entryId=saved.entry.id;
  }
  if(saleId){
   if(await books.sourceBook(account,'SALE',saleId,db)!==plan.book_id)throw badRequest('La venta pertenece a otra contabilidad.');
   const sale=await svc.ownSale(account.id,saleId,db);
   if(sale.sale_status!=='PAID'||sale.currency!==plan.currency)throw badRequest('Vincula una compra pagada en la misma moneda.');
  }
  const duplicate=(await db.query('select p.id from customer_purchase_plans p left join customer_entries e on e.id=p.entry_id and e.customer_id=p.customer_id where p.customer_id=$1 and p.id<>$2 and (p.entry_id=$3 or coalesce(p.sale_id,e.linked_sale_id)=$4)',[account.id,id,entryId,saleId])).rowCount;
  if(duplicate)throw badRequest('Este movimiento ya está asociado a otra compra planeada.');
  return {plan:(await db.query("update customer_purchase_plans set status='PURCHASED',entry_id=$3,sale_id=$4,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning "+projection,[account.id,id,entryId,saleId])).rows[0]};
 });
}
async function candidates(account,id){
 const plan=await own({query},account,id),end=finance.dateKey(new Date(),account.timezone);
 const start=new Date(Date.parse(end+'T12:00:00Z')-90*86400000).toISOString().slice(0,10);
 const movements=(await svc.movements(account,start,end)).filter(m=>m.kind==='EXPENSE'&&m.status==='PAID'&&m.currency===plan.currency&&(m.entry_id||m.sale_id));
 return {movements:movements.sort((a,b)=>b.date.localeCompare(a.date)),from:start,to:end};
}
async function overview(account,currency=account.currency||'COP'){
 const [dashboard,payments,purchases]=await Promise.all([svc.dashboard(account,{period:'month',currency}),agenda.list(account,{currency}),list(account)]);
 const budget=dashboard.budgets.find(b=>b.category==='ALL'&&b.period==='month');
 const pending=payments.items.filter(i=>i.status==='PENDING'&&i.kind==='EXPENSE');
 const plans=purchases.plans.filter(p=>p.status==='PLANNED'&&p.currency===currency&&(!p.target_date||p.target_date<=dashboard.range.full_to));
 const sum=(rows,value)=>rows.reduce((n,r)=>{const total=n+value(r);if(!Number.isSafeInteger(total))throw badRequest('El total supera el rango permitido.');return total;},0);
 const obligations=sum(pending,i=>finance.minor(i.billed_amount||i.estimated_amount)),planned=sum(plans,p=>p.estimated_minor);
 return {currency,range:dashboard.range,spent_minor:dashboard.total_minor,income_minor:dashboard.income_minor,
  budget_minor:budget?.amount_minor??null,budget_remaining_minor:budget?.remaining_minor??null,
  obligations_minor:obligations,planned_minor:planned,projected_remaining_minor:budget?budget.remaining_minor-obligations-planned:null,
  pending_payments:pending.length,planned_purchases:plans.length,insights:dashboard.insights,plans:purchases.plans};
}
module.exports={list,save,change,complete,candidates,overview};

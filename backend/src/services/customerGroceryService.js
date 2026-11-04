const {query,withTransaction}=require('../config/db'),{badRequest,notFound}=require('../utils/http'),finance=require('./customerFinance'),books=require('./customerFinanceBooks'),purchases=require('./customerPurchaseService'),M=require('../../../customer-web/grocery-math');
const projection='g.*,g.target_date::text target_date,g.paid_on::text paid_on',decimal=n=>(n/100).toFixed(2),today=a=>finance.dateKey(new Date(),a.timezone||'America/Bogota');
async function own(a,id,db={query},lock=false){const r=(await db.query('select '+projection+' from customer_grocery_lists g where g.customer_id=$1 and g.book_id=$2 and g.id=$3'+(lock?' for update':''),[a.id,a.finance_book.id,id])).rows[0];if(!r)throw notFound('Lista no encontrada en esta contabilidad.');return r;}
async function present(a,g){const summary=M.summary(g.items),actual=g.status==='PURCHASED'?await purchases.actual(a,g):null;const nextBook=g.next_list_id?(await query('select book_id from customer_grocery_lists where customer_id=$1 and id=$2',[a.id,g.next_list_id])).rows[0]?.book_id:null;return {...g,next_list_book_id:nextBook,summary,actual,needs_review:g.status==='PURCHASED'&&(!actual||actual.amount_minor!==summary.actual_minor)};}
async function list(a){const rows=(await query('select '+projection+' from customer_grocery_lists g where customer_id=$1 and book_id=$2 order by created_at desc',[a.id,a.finance_book.id])).rows;return {lists:await Promise.all(rows.map(g=>present(a,g)))};}
async function summary(a,end,db={query}){const rows=(await db.query("select items from customer_grocery_lists where customer_id=$1 and book_id=$2 and currency=$3 and status='PLANNED' and (target_date is null or target_date<=$4)",[a.id,a.finance_book.id,a.finance_book.currency,end])).rows;return rows.reduce((r,g)=>{const s=M.summary(g.items);r.estimated_minor+=s.estimated_minor;r.unknown_prices+=s.unknown_prices;r.lists++;return r;},{estimated_minor:0,unknown_prices:0,lists:0});}
async function save(a,data,id){
 const items=M.normalize(data.items);M.summary(items);
 if(data.target_date&&(data.target_date<'2000-01-01'||data.target_date>'2100-12-31'))throw badRequest('Revisa la fecha prevista.');
 return withTransaction(async db=>{
  if(id){const g=await own(a,id,db,true);if(g.status!=='PLANNED'||g.revision!==data.revision)throw badRequest('La lista cambió. Recarga antes de editar.');
   return {list:(await db.query('update customer_grocery_lists set title=$3,target_date=$4,note=$5,items=$6::jsonb,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *',[a.id,id,data.title,data.target_date,data.note,JSON.stringify(items)])).rows[0]};}
  await db.query('select id from customer_accounts where id=$1 for update',[a.id]);
  const existing=(await db.query('select * from customer_grocery_lists where customer_id=$1 and request_id=$2',[a.id,data.request_id])).rows[0];
  if(existing){if(existing.book_id!==a.finance_book.id)throw badRequest('La lista ya existe en otra contabilidad.');return {list:existing};}
  if((await db.query("select count(*)::int n from customer_grocery_lists where customer_id=$1 and status='PLANNED'",[a.id])).rows[0].n>=100)throw badRequest('Puedes tener hasta 100 listas pendientes.');
  return {list:(await db.query('insert into customer_grocery_lists(customer_id,book_id,request_id,title,currency,target_date,note,items) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb) returning *',[a.id,a.finance_book.id,data.request_id,data.title,a.finance_book.currency,data.target_date,data.note,JSON.stringify(items)])).rows[0]};
 });
}
async function candidates(a,id){const g=await own(a,id),end=today(a),start=new Date(Date.parse(end+'T12:00Z')-90*86400000).toISOString().slice(0,10);return {movements:(await require('./customerService').movements(a,start,end)).filter(m=>m.kind==='EXPENSE'&&m.status==='PAID'&&m.currency===g.currency)};}
async function complete(a,id,data){
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['customer-purchase:'+a.id]);
  const g=await own(a,id,db,true);if(g.status==='PURCHASED')return {list:g,existing:true};
  if(g.status!=='PLANNED'||g.revision!==data.revision)throw badRequest('La lista cambió. Recarga antes de completar.');
  const totals=M.summary(g.items);if(!totals.selected_count||totals.missing_actual||totals.actual_minor<=0)throw badRequest('Marca lo que compraste e indica cantidades y precios reales antes de confirmar.');
  let entryId=data.entry_id||null,saleId=data.sale_id||null;
  if(entryId){
   const e=(await db.query('select * from customer_entries where customer_id=$1 and id=$2 and deleted_at is null for update',[a.id,entryId])).rows[0];
   if(!e||e.book_id!==g.book_id||e.currency!==g.currency||e.kind!=='EXPENSE')throw badRequest('Selecciona un gasto de esta contabilidad y moneda.');
   if(e.linked_sale_id){saleId=e.linked_sale_id;entryId=null;}
   else if(finance.minor(e.amount)!==totals.actual_minor)throw badRequest('Los precios reales de la lista no suman el importe del gasto seleccionado.');
  }
  if(saleId){
   if(await books.sourceBook(a,'SALE',saleId,db)!==g.book_id)throw badRequest('La compra pertenece a otra contabilidad.');
   const sale=await require('./customerService').ownSale(a.id,saleId,db);
   if(sale.sale_status!=='PAID'||sale.currency!==g.currency||finance.minor(sale.sale_amount)!==totals.actual_minor)throw badRequest('La compra pagada debe coincidir en importe y moneda con la lista.');
  }
  if(entryId||saleId){
   if((await db.query('select 1 from customer_grocery_lists g left join customer_entries e on e.id=g.entry_id and e.customer_id=g.customer_id where g.customer_id=$1 and (g.entry_id=$2 or coalesce(g.sale_id,e.linked_sale_id)=$3)',[a.id,entryId,saleId])).rowCount)throw badRequest('Esta compra ya está asociada a otra lista.');
   if((await db.query('select 1 from customer_purchase_plans p left join customer_entries e on e.id=p.entry_id and e.customer_id=p.customer_id where p.customer_id=$1 and (p.entry_id=$2 or coalesce(p.sale_id,e.linked_sale_id)=$3)',[a.id,entryId,saleId])).rowCount)throw badRequest('Esta compra ya está asociada a un plan de compra.');
   if(entryId&&(await db.query('select 1 from customer_debt_payments where entry_id=$1 and voided_at is null',[entryId])).rowCount)throw badRequest('Este gasto es un pago de deuda.');
  }else{
   if(!data.paid_on||data.paid_on>today(a)||data.paid_on<'2000-01-01'||!data.merchant)throw badRequest('Indica el negocio y una fecha real de pago.');
   const products=totals.rows.filter(i=>i.in_cart).map(i=>({name:i.name,quantity:i.actual_quantity??i.quantity,amount:decimal(i.actual_minor)}));
   const saved=await db.query("insert into customer_entries(customer_id,book_id,request_id,kind,amount,currency,occurred_at,merchant,category,priority,note,products) values($1,$2,$3,'EXPENSE',$4,$5,$6::date::timestamp at time zone $7,$8,'supermercado','ESSENTIAL',$9,$10::jsonb) on conflict(customer_id,request_id) do nothing returning id",[a.id,g.book_id,g.id,decimal(totals.actual_minor),g.currency,data.paid_on,a.timezone,data.merchant,g.note,JSON.stringify(products)]);
   if(!saved.rowCount)throw badRequest('La lista ya generó un gasto. Vincula el registro existente.');entryId=saved.rows[0].id;
  }
  let next=null;const remaining=M.remaining(g.items);
  if(data.carry_forward&&remaining.length)next=(await db.query('insert into customer_grocery_lists(customer_id,book_id,request_id,title,currency,items) values($1,$2,$3,$4,$5,$6::jsonb) returning id',[a.id,g.book_id,g.id,'Pendientes · '+g.title.slice(0,145),g.currency,JSON.stringify(remaining)])).rows[0].id;
  return {list:(await db.query("update customer_grocery_lists set status='PURCHASED',entry_id=$3,sale_id=$4,paid_on=$5,next_list_id=$6,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *",[a.id,id,entryId,saleId,data.paid_on||null,next])).rows[0]};
 });
}
async function state(a,id,data){return withTransaction(async db=>{const g=await own(a,id,db,true);if(g.revision!==data.revision||g.status==='PURCHASED')throw badRequest('Esta lista cambió o ya tiene una compra. Conserva su historial y crea otra lista.');return {list:(await db.query('update customer_grocery_lists set status=$3,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *',[a.id,id,data.archived?'ARCHIVED':'PLANNED'])).rows[0]};});}
module.exports={own,present,list,summary,save,candidates,complete,state};

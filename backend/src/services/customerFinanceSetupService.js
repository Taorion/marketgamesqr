const {query,withTransaction}=require('../config/db');
const {badRequest,notFound,forbidden}=require('../utils/http');
const finance=require('./customerFinance'),books=require('./customerFinanceBooks');
const today=a=>finance.dateKey(new Date(),a.timezone||'America/Bogota');
async function status(account){
 const book=(await query('select *,opening_date::text opening_date from customer_finance_books where customer_id=$1 and is_default',[account.id])).rows[0];
 return {state:account.finance_setup_state,today:today(account),currency:book?.currency||account.currency||'COP',pocket_name:book?.name||'Personal'};
}
async function complete(account,data){
 return withTransaction(async db=>{
  const current=(await db.query('select * from customer_accounts where id=$1 and is_active for update',[account.id])).rows[0];
  if(!current)throw notFound('Cuenta no disponible.');
  if(!current.full_name?.trim()||!current.declared_document_key)throw forbidden('Completa primero tus datos de registro.');
  // A second tab, retry or later replay must never reset a confirmed balance.
  if(current.finance_setup_state!=='PENDING')return {account:current};
  const day=today(current);
  if(data.expected_date!==day)throw badRequest('Cambió el día. Actualiza la preparación para confirmar tu saldo actual.');
  await books.ensure(current,db);
  const book=(await db.query('select *,opening_date::text opening_date from customer_finance_books where customer_id=$1 and is_default for update',[account.id])).rows[0];
  if(data.currency!==book.currency)throw badRequest('La moneda cambió. Actualiza la preparación.');
  const scoped={...current,finance_book:book};
  // The declared amount is money available now, including any purchases imported today.
  const rows=await require('./customerService').movements(scoped,day,day,db);
  const transfers=(await db.query('select * from customer_finance_transfers where customer_id=$1 and (from_book_id=$2 or to_book_id=$2) and occurred_on=$3 and voided_at is null',[current.id,book.id,day])).rows;
  const net=rows.filter(r=>r.status==='PAID'&&r.currency===book.currency).reduce((n,r)=>n+r.amount_minor*(r.kind==='INCOME'?1:-1),0)+transfers.reduce((n,t)=>n+finance.minor(t.amount)*(t.to_book_id===book.id?1:-1),0);
  const declared=finance.minor(data.balance),opening=declared-net;
  if(!Number.isSafeInteger(opening)||Math.abs(opening)>99999999999999)throw badRequest('El saldo calculado supera el rango permitido.');
  const updated=(await db.query('update customer_finance_books set opening_amount=$3,opening_date=$4,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *,opening_date::text opening_date',[current.id,book.id,(opening/100).toFixed(2),day])).rows[0];
  const details={request_id:data.request_id,book_id:book.id,currency:book.currency,date:day,timezone:current.timezone,declared_balance_minor:declared,existing_net_minor:net,opening_minor:opening,previous_opening_amount:book.opening_amount,previous_opening_date:book.opening_date};
  const saved=(await db.query("update customer_accounts set finance_setup_state='COMPLETE',finance_setup_completed_at=now(),finance_setup_details=$2::jsonb where id=$1 returning *",[current.id,JSON.stringify(details)])).rows[0];
  return {account:saved,book:updated};
 });
}
module.exports={status,complete};

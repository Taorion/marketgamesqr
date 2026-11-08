const {withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const books=require('./customerFinanceBooks'),cash=require('./customerCashBoxService'),finance=require('./customerFinance');
const decimal=n=>(n<0?'-':'')+Math.floor(Math.abs(n)/100)+'.'+String(Math.abs(n)%100).padStart(2,'0');
async function select(a,boxId){
 return withTransaction(async db=>{
  await books.own(a,a.finance_book.id,db,true);
  const boxes=(await db.query('select * from customer_cash_boxes where customer_id=$1 and book_id=$2',[a.id,a.finance_book.id])).rows;
  const selected=boxes.find(b=>b.id===boxId),current=boxes.find(b=>b.is_wallet);
  if(!selected)throw notFound('Caja no encontrada en este bolsillo.');
  if(current&&current.id!==boxId)throw badRequest('Este bolsillo ya tiene una billetera de efectivo.');
  if(!current){await db.query('update customer_cash_boxes set is_wallet=true,revision=revision+1,updated_at=now() where id=$1',[boxId]);await db.query("insert into customer_cash_events(customer_id,book_id,action,detail) values($1,$2,'WALLET_SELECT',$3::jsonb)",[a.id,a.finance_book.id,JSON.stringify({box_id:boxId})]);}
  return {ok:true,box_id:boxId};
 });
}
async function prepare(a,d){
 return withTransaction(async db=>{
  const book=await books.own(a,a.finance_book.id,db,true);
  const old=(await db.query("select book_id,detail from customer_cash_events where customer_id=$1 and action='WALLET_PREPARE' and detail->>'request_id'=$2",[a.id,d.request_id])).rows[0];
  if(old){if(old.book_id!==book.id)throw badRequest('La solicitud pertenece a otro bolsillo.');return old.detail;}
  const state=await cash.overview({...a,finance_book:book},{},db),wallet=state.boxes.find(b=>b.is_wallet);
  if(!wallet)throw badRequest('Configura primero tu billetera de efectivo.');
  if(state.total_minor==null)throw badRequest('Define primero el saldo inicial del bolsillo y sus cajas.');
  if(wallet.balance_minor!==d.expected_balance_minor)throw badRequest('El saldo de la billetera cambió. Actualiza antes de preparar la salida.');
  if(d.source_box_id===wallet.id)throw badRequest('Elige otra caja para mover el efectivo.');
  const source=d.source_box_id?state.boxes.find(b=>b.id===d.source_box_id):null;
  if(d.source_box_id&&!source)throw notFound('Caja no encontrada en este bolsillo.');
  const target=finance.minor(d.amount),delta=target-wallet.balance_minor;
  if(delta>0&&(source?source.balance_minor:state.unassigned_minor)<delta)throw badRequest('La caja elegida no tiene saldo suficiente. Revisa tus registros o elige otra caja.');
  let transferId=null;
  if(delta){
   const move=(await db.query('insert into customer_cash_transfers(customer_id,book_id,request_id,from_box_id,to_box_id,amount,occurred_on,note) values($1,$2,$3,$4,$5,$6,$7,$8) returning id',[a.id,book.id,d.request_id,delta>0?d.source_box_id:wallet.id,delta>0?wallet.id:d.source_box_id,decimal(Math.abs(delta)),state.today,'Preparar billetera: efectivo que llevo conmigo'])).rows[0];transferId=move.id;
  }
  const result={request_id:d.request_id,box_id:wallet.id,before_minor:wallet.balance_minor,amount_minor:target,transfer_id:transferId,total_minor:state.total_minor};
  await db.query("insert into customer_cash_events(customer_id,book_id,action,detail) values($1,$2,'WALLET_PREPARE',$3::jsonb)",[a.id,book.id,JSON.stringify(result)]);
  return result;
 });
}
module.exports={select,prepare};

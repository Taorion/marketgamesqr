const crypto=require('crypto');
const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const finance=require('./customerFinance');
async function businessSales(user,{search='',offset=0}={}){
 const rows=(await query(`select s.id,s.product_name,s.sale_amount,s.currency,s.sale_status,s.customer_name,s.customer_document_id,s.created_at,s.paid_at,
   a.full_name recipient_name,i.state delivery_state,i.id invitation_id
   from business_sales s left join customer_sale_deliveries d on d.sale_id=s.id
   left join customer_accounts a on a.id=d.customer_id left join customer_invitations i on i.id=d.invitation_id
   where s.business_id=$1 and ($2='' or s.customer_name ilike '%'||$2||'%' or s.customer_document_id ilike '%'||$2||'%' or s.product_name ilike '%'||$2||'%' or s.id::text=$2)
   order by s.created_at desc,s.id limit 51 offset $3`,[user.business_id,search,offset])).rows;
 return {sales:rows.slice(0,50),next_offset:rows.length>50?offset+50:null};
}
async function send(user,data){
 return withTransaction(async db=>{
  const sale=(await db.query('select s.*,b.name business_name from business_sales s join businesses b on b.id=s.business_id where s.id=$1 and s.business_id=$2 for update of s',[data.sale_id,user.business_id])).rows[0];
  if(!sale)throw notFound('Venta no encontrada en este negocio.');
  const buyer=(await db.query('select id,public_id,full_name from customer_accounts where public_id=$1',[data.public_id])).rows[0];
  if(!buyer)throw notFound('Cuenta Customer no encontrada.');
  const existing=(await db.query('select d.customer_id,i.id,i.state from customer_sale_deliveries d join customer_invitations i on i.id=d.invitation_id where d.sale_id=$1',[sale.id])).rows[0];
  if(existing){
   if(existing.customer_id!==buyer.id)throw badRequest('Esta venta ya fue enviada a otra cuenta. No se puede reasignar desde aquí.');
   return {invitation:existing,existing:true};
  }
  if(sale.sale_status==='VOIDED')throw badRequest('La venta está anulada.');
  if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[buyer.id,user.business_id])).rowCount)throw badRequest('Esta cuenta no recibe solicitudes del negocio.');
  const links=(await db.query("select customer_id,include_history,accepted_at from customer_relationships where business_id=$1 and document_key=regexp_replace(lower($2::text),'[^a-z0-9]','','g') and state='ACCEPTED'",[user.business_id,sale.customer_document_id])).rows;
  const gift=(await db.query('select buyer_id from customer_product_gift_orders where sale_id=$1',[sale.id])).rows[0];
  if(links.some(r=>r.customer_id!==buyer.id)||(gift&&gift.buyer_id!==buyer.id))throw badRequest('La identidad de esta venta pertenece a otra cuenta Customer. Revisa la atribución original.');
  const auto=(await db.query('select auto_receive from customer_finance_connections where customer_id=$1 and business_id=$2 for share',[buyer.id,user.business_id])).rows[0]?.auto_receive;
  const alreadyVisible=links.some(r=>r.customer_id===buyer.id&&(r.include_history||new Date(sale.created_at)>=new Date(r.accepted_at)))||gift?.buyer_id===buyer.id;
  const state=auto||alreadyVisible?'ACCEPTED':'PENDING';
  // Canonical sale remains the only financial record. The invitation only grants its recipient access.
  const invitation=(await db.query(`insert into customer_invitations(business_id,customer_id,created_by,request_id,kind,resource_id,title,message,terms,payload,state,result_id,decided_at)
   values($1,$2,$3,$4,'SALE',$5,$6,$7,$8,$9::jsonb,$10,case when $10='ACCEPTED' then $5::uuid end,case when $10='ACCEPTED' then now() end) returning id,state`,
   [user.business_id,buyer.id,user.id,data.request_id,sale.id,'Compra en '+sale.business_name,sale.product_name||'Compra registrada',
    'Confirma que esta compra es tuya para incluirla en tu historial. Aceptar no realiza ningún cobro ni modifica el pago registrado por el negocio.',
    JSON.stringify({amount:sale.sale_amount,currency:sale.currency}),state])).rows[0];
  await db.query('insert into customer_sale_deliveries(sale_id,business_id,customer_id,invitation_id,sent_by) values($1,$2,$3,$4,$5)',[sale.id,user.business_id,buyer.id,invitation.id,user.id]);
  return {invitation};
 });
}
async function accept(db,account,invitation,data){
 const row=(await db.query('select 1 from customer_sale_deliveries d join business_sales s on s.id=d.sale_id and s.business_id=d.business_id where d.sale_id=$1 and d.business_id=$2 and d.customer_id=$3 and d.invitation_id=$4',[invitation.resource_id,invitation.business_id,account.id,invitation.id])).rows[0];
 if(!row)throw notFound('Compra no encontrada.');
 await db.query("update customer_invitations set state='ACCEPTED',decided_at=now(),result_id=resource_id where id=$1",[invitation.id]);
 await db.query('insert into customer_finance_connections(customer_id,business_id,auto_receive) values($1,$2,$3) on conflict(customer_id,business_id) do update set auto_receive=excluded.auto_receive,updated_at=now()',[account.id,invitation.business_id,!!data.auto_receive]);
 return {ok:true,result_id:invitation.resource_id};
}
async function connections(account){return {connections:(await query('select c.business_id,b.name,c.auto_receive,c.updated_at from customer_finance_connections c join businesses b on b.id=c.business_id where c.customer_id=$1 order by b.name',[account.id])).rows};}
async function connection(account,businessId,auto){
 const r=await query('update customer_finance_connections set auto_receive=$3,updated_at=now() where customer_id=$1 and business_id=$2 returning business_id',[account.id,businessId,auto]);
 if(!r.rowCount)throw notFound();return {ok:true};
}
function nextDate(day,frequency){
 const [y,m,d]=day.split('-').map(Number);
 if(frequency==='week')return new Date(Date.parse(day+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 const date=new Date(Date.UTC(y+(frequency==='year'?1:0),m-1+(frequency==='month'?1:0),1,12));
 date.setUTCDate(Math.min(d,new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0,12)).getUTCDate()));
 return date.toISOString().slice(0,10);
}
async function recordRecurring(account,id,data){
 return withTransaction(async db=>{
  const r=(await db.query('select *,next_date::text due from customer_recurring where id=$1 and customer_id=$2 for update',[id,account.id])).rows[0];
  if(!r)throw notFound();
  const existing=(await db.query('select entry_id from customer_recurring_posts where recurring_id=$1 and due_date=$2',[id,data.expected_date])).rows[0];
  if(existing)return {entry_id:existing.entry_id,existing:true};
  if(r.due!==data.expected_date)throw badRequest('Este vencimiento cambió. Actualiza antes de continuar.');
  if(data.paid_on>finance.dateKey(new Date(),account.timezone))throw badRequest('Un pago registrado no puede tener una fecha futura.');
  const e=(await db.query(`insert into customer_entries(customer_id,kind,amount,currency,occurred_at,merchant,category,note,request_id)
    values($1,$2,$3,$4,$5::date::timestamp at time zone $6,$7,$8,$9,$10) returning id`,[account.id,r.kind,r.amount,r.currency,data.paid_on,account.timezone,r.name,r.category,'Pago recurrente confirmado por ti.',crypto.randomUUID()])).rows[0];
  await db.query('insert into customer_recurring_posts(recurring_id,due_date,entry_id) values($1,$2,$3)',[id,r.due,e.id]);
  await db.query('update customer_recurring set next_date=$2 where id=$1',[id,nextDate(r.due,r.frequency)]);
  return {entry_id:e.id};
 });
}
module.exports={businessSales,send,accept,connections,connection,recordRecurring,nextDate};

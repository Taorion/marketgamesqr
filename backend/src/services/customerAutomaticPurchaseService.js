const {query}=require('../config/db'),books=require('./customerFinanceBooks'),{notFound,badRequest}=require('../utils/http');
async function configure(db,account,businessId,data,{initial=false,includeHistory=false}={}){
 const links=(await db.query("select * from customer_relationships where customer_id=$1 and business_id=$2 and state='ACCEPTED' for update",[account.id,businessId])).rows;
 if(!links.length)throw badRequest('Primero confirma la conexión de identidad con este negocio. Recibir una tarjeta o un regalo no autoriza compras.');
 if(data.enabled&&(await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[account.id,businessId])).rowCount)throw badRequest('Este negocio está bloqueado.');
 await books.ensure(account,db);
 const prior=(await db.query('select * from customer_finance_connections where customer_id=$1 and business_id=$2 for update',[account.id,businessId])).rows[0];
 const defaultBook=(await db.query('select id from customer_finance_books where customer_id=$1 and is_default',[account.id])).rows[0];
 const target=await books.own(account,data.book_id||prior?.book_id||defaultBook.id,db);
 // Preserve previously authorized history when changing the destination or stopping capture.
 // Never import the period in which automatic capture was explicitly disabled.
 if((!initial&&prior?.auto_capture==null)||(initial&&data.enabled&&includeHistory)){
  const oldBook=prior?.book_id||defaultBook.id;
  await db.query(`insert into customer_sale_captures(sale_id,customer_id,business_id,book_id)
   select s.id,$1,s.business_id,coalesce(fa.book_id,$3) from business_sales s
   join customer_relationships r on r.customer_id=$1 and r.business_id=s.business_id and r.state='ACCEPTED'
    and r.document_key=regexp_replace(lower(s.customer_document_id),'[^a-z0-9]','','g') and (r.include_history or s.created_at>=r.accepted_at)
   left join customer_finance_allocations fa on fa.customer_id=$1 and fa.kind='SALE' and fa.source_id=s.id
   where s.business_id=$2 and s.sale_status in ('PAID','VOIDED')
   and not exists(select 1 from customer_sale_deliveries d where d.sale_id=s.id and d.customer_id<>$1)
   and not exists(select 1 from customer_product_gift_orders g where g.sale_id=s.id and g.buyer_id<>$1)
   on conflict(sale_id) do nothing`,[account.id,businessId,initial?target.id:oldBook]);
  await db.query("insert into customer_finance_allocations(customer_id,kind,source_id,book_id) select customer_id,'SALE',sale_id,book_id from customer_sale_captures where customer_id=$1 and business_id=$2 on conflict do nothing",[account.id,businessId]);
 }
 await db.query(`insert into customer_finance_connections(customer_id,business_id,auto_capture,book_id,capture_consented_at)
  values($1,$2,$3,$4,case when $3 then now() end)
  on conflict(customer_id,business_id) do update set auto_capture=excluded.auto_capture,book_id=excluded.book_id,
   auto_receive=case when not excluded.auto_capture then false else customer_finance_connections.auto_receive end,
   capture_consented_at=case when excluded.auto_capture and customer_finance_connections.auto_capture is distinct from true then now() else customer_finance_connections.capture_consented_at end,updated_at=now()`,
 [account.id,businessId,data.enabled,target.id]);
 return {ok:true,enabled:data.enabled,book_id:target.id};
}
async function receipt(account,id){
 const sale=await require('./customerService').ownSale(account.id,id);
 return {receipt:{id:sale.id,business_id:sale.business_id,business_name:sale.business_name,paid_at:sale.paid_at,created_at:sale.created_at,
  status:sale.sale_status,currency:sale.currency,payment_method:sale.payment_method,amount:sale.sale_amount,
  payment_reference:sale.metadata?.payment_reference||null,products:require('./customerFinance').salesMovement(sale,account.timezone).products,
  automatic:(await query('select 1 from customer_sale_captures where customer_id=$1 and sale_id=$2',[account.id,id])).rowCount>0}};
}
module.exports={configure,receipt};

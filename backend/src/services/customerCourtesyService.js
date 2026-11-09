const crypto=require('crypto'),{query,withTransaction}=require('../config/db'),{badRequest,notFound}=require('../utils/http');
const finance=require('./customerFinance'),gifts=require('./customerProductGiftService'),delivery=require('./giftDeliveryService');
const {assertStandaloneBusinessFeature}=require('./subscriptionService');
const owner=a=>a.business_id?{column:'owner_business_id',id:a.business_id}:{column:'owner_customer_id',id:a.id};
const fingerprint=d=>crypto.createHash('sha256').update(JSON.stringify(d)).digest('hex');
const sql="select l.*,b.name merchant_name,(select count(*)::int from customer_product_gift_orders o where o.courtesy_lot_id=l.id) assigned from customer_courtesy_lots l join businesses b on b.id=l.merchant_id";
const view=l=>({...l,available:l.state==='READY'?l.quantity-l.assigned:0,total:(finance.minor(l.unit_price)*l.quantity/100).toFixed(2)});
async function access(a){if(a.business_id)await assertStandaloneBusinessFeature(a,a.business_id,'product_gifts');}
async function list(a){await access(a);const o=owner(a);return {lots:(await query(sql+' where l.'+o.column+'=$1 order by l.created_at desc limit 200',[o.id])).rows.map(view)};}
async function catalog(a,search=''){
 await access(a);
 const rows=(await query("select p.*,to_jsonb(b) business,b.name business_name,d.published directory_published,i.name product_name,i.status product_status,i.stock_quantity,i.currency,o.price,o.terms,o.valid_days,o.payment_instructions from customer_publications p join businesses b on b.id=p.business_id join customer_directory d on d.business_id=b.id join customer_product_offers o on o.publication_id=p.id join business_inventory_products i on i.id=p.resource_id and i.business_id=p.business_id where p.kind='PRODUCT' and p.status='PUBLISHED' and (p.title ilike $1 or b.name ilike $1 or i.name ilike $1) order by p.created_at desc limit 100",['%'+search+'%'])).rows;
 const offers=rows.filter(p=>gifts.available(p)&&p.business_id!==a.business_id).map(p=>({id:p.id,merchant_id:p.business_id,merchant_name:p.business_name,product_name:p.product_name,price:p.price,terms:p.terms,valid_days:p.valid_days,stock_quantity:p.stock_quantity,payment_instructions:p.payment_instructions}));
 return {offers,own_products:a.business_id?(await gifts.businessCatalog(a)).products:[]};
}
async function create(a,d){
 await access(a);if(d.source==='OWN'&&!a.business_id)throw badRequest('Las cortesías propias requieren una cuenta Empresa.');
 const o=owner(a),fp=fingerprint(d);
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['courtesy:'+o.column+':'+o.id+':'+d.request_id]);
  const prior=(await db.query(sql+' where l.'+o.column+'=$1 and l.request_id=$2',[o.id,d.request_id])).rows[0];
  if(prior){if(prior.fingerprint!==fp)throw badRequest('Esta solicitud ya tiene otros datos.');return {lot:view(prior)};}
  const sender=a.business_id?(await db.query('select name from businesses where id=$1',[a.business_id])).rows[0].name:a.full_name;
  let p,merchant,publication=null,price,terms,days,instructions='Cortesía financiada por tu negocio.';
  if(d.source==='OWN'){
   p=(await db.query("select * from business_inventory_products where id=$1 and business_id=$2 and status='ACTIVE' and currency='COP'",[d.product_id,a.business_id])).rows[0];
   if(!p)throw badRequest('Elige un producto activo de tu inventario.');merchant=a.business_id;price='0';terms=d.terms;days=d.valid_days;
  }else{
   const offer=await gifts.offer(d.publication_id,db);if(a.business_id===offer.business_id)throw badRequest('Para tus productos elige Cortesías propias.');
   p={id:offer.resource_id,name:offer.product_name,stock_quantity:offer.stock_quantity};merchant=offer.business_id;publication=offer.id;price=offer.price;terms=offer.terms;days=offer.valid_days;instructions=offer.payment_instructions;
   if(finance.minor(d.expected_unit_price)!==finance.minor(price))throw badRequest('El precio cambió. Actualiza las ofertas antes de comprar.');
  }
  if(Number(p.stock_quantity)<d.quantity)throw badRequest('No hay suficientes unidades disponibles.');
  const total=finance.minor(price)*d.quantity;if(!Number.isSafeInteger(total)||total>99999999999999)throw badRequest('El importe total supera el rango permitido.');
  const snapshot={source:'COURTESY',buyer_name:sender,buyer_email:a.email,product_name:p.name,terms,valid_days:days,payment_instructions:instructions};
  const l=(await db.query("insert into customer_courtesy_lots(merchant_id,owner_customer_id,owner_business_id,created_by,product_id,publication_id,request_id,fingerprint,source,quantity,unit_price,snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb) returning *",[merchant,a.business_id?null:a.id,a.business_id||null,a.business_id?a.id:null,p.id,publication,d.request_id,fp,d.source,d.quantity,price,JSON.stringify(snapshot)])).rows[0];
  if(d.source==='OWN')await activate(db,a,l,{payment_method:'COURTESY',payment_reference:'Cortesía propia',branch_id:d.branch_id});
  return {lot:view((await db.query(sql+' where l.id=$1',[l.id])).rows[0])};
 });
}
async function incoming(a){await access(a);return {orders:(await query(sql+" where l.merchant_id=$1 and l.source='PURCHASE' order by (l.state='PENDING_PAYMENT') desc,l.created_at desc limit 200",[a.business_id])).rows.map(view),branches:(await query('select id,name from branches where business_id=$1 and is_active',[a.business_id])).rows};}
async function activate(db,user,l,d){
 const product=(await db.query('select * from business_inventory_products where id=$1 and business_id=$2 for update',[l.product_id,l.merchant_id])).rows[0];
 if(!product||product.status!=='ACTIVE'||Number(product.stock_quantity)<l.quantity)throw badRequest('No hay existencias suficientes para reservar estas cortesías.');
 const branch=(await db.query('select id from branches where business_id=$1 and is_active and ($2::uuid is null or id=$2) order by created_at limit 1',[l.merchant_id,d.branch_id||user.branch_id||null])).rows[0];if(!branch)throw badRequest('Selecciona una sede activa.');
 const credits=require('./qrCreditService');await credits.ensureCreditAccount(db,l.merchant_id);await credits.consumeQrCredits(db,l.merchant_id,l.quantity,null,user.id,'Cortesías reservadas: '+l.id);
 const amount=(finance.minor(l.unit_price)*l.quantity/100).toFixed(2);
 const catalog=await require('./productCatalogService').syncSaleProductsWithCatalog(db,l.merchant_id,user.id,[{name:l.snapshot.product_name,inventory_product_id:product.id,quantity:l.quantity,unit_price:Number(l.unit_price),line_total:Number(amount),currency:'COP'}],{currency:'COP',sourceModule:'customer_product_gift',createMissingProducts:false,allowZero:l.source==='OWN',inventoryMovementKey:'courtesy:'+l.id,saleReference:'courtesy:'+l.id});
 if(l.source==='OWN')catalog.products=catalog.products.map(p=>({...p,unit_price:0,line_total:0}));
 const cost=Number(product.cost_price||0)*l.quantity;
 const sale=(await db.query("insert into business_sales(business_id,customer_name,customer_email,product_name,sale_amount,currency,sale_status,paid_at,payment_method,idempotency_key,inventory_product_id,quantity,unit_cost,product_cost_total,gross_profit,net_profit,created_by_user_id,seller_user_id,branch_id,metadata) values($1,$2,$3,$4,$5,'COP','PAID',now(),$6,$7,$8,$9,$10,$11,$5::numeric-$11::numeric,$5::numeric-$11::numeric,$12,$12,$13,$14::jsonb) returning id",[l.merchant_id,l.snapshot.buyer_name,l.snapshot.buyer_email,l.snapshot.product_name,amount,d.payment_method,'courtesy:'+l.id,product.id,l.quantity,product.cost_price||0,cost,user.id,branch.id,JSON.stringify({source:'COURTESY_PURCHASE',courtesy_lot_id:l.id,products:catalog.products,product_catalog_sync:true,payment_reference:d.payment_reference})])).rows[0];
 await db.query("update customer_courtesy_lots set state='READY',sale_id=$2,paid_at=now(),confirmed_by=$3,branch_id=$4,payment_reference=$5,payment_method=$6 where id=$1",[l.id,sale.id,user.id,branch.id,d.payment_reference,d.payment_method]);
}
async function confirm(a,id,d){
 await access(a);return withTransaction(async db=>{
  const l=(await db.query('select * from customer_courtesy_lots where id=$1 and merchant_id=$2 for update',[id,a.business_id])).rows[0];if(!l)throw notFound();
  if(l.state==='READY')return {ok:true,existing:true};if(l.state!=='PENDING_PAYMENT')throw badRequest('La solicitud no está pendiente.');
  if(d.payment_received!==true||finance.minor(d.amount)!==finance.minor(l.unit_price)*l.quantity)throw badRequest('Confirma el importe completo recibido.');
  await activate(db,a,l,d);return {ok:true};
 });
}
async function detail(a,id){
 await access(a);const o=owner(a),l=(await query(sql+' where l.id=$1 and l.'+o.column+'=$2',[id,o.id])).rows[0];if(!l)throw notFound();
 const rows=(await query("select o.id,o.recipient_name,o.message,o.state,o.created_at,o.receipt_token,i.state invitation_state,q.status ticket_status,q.expires_at from customer_product_gift_orders o left join customer_invitations i on i.id=o.invitation_id left join qr_codes q on q.id=o.qr_code_id where o.courtesy_lot_id=$1 order by o.created_at desc",[id])).rows;
 return {lot:view(l),deliveries:rows.map(r=>({...r,...delivery.links(r)}))};
}
async function send(a,id,d){
 await access(a);const o=owner(a);return withTransaction(async db=>{
  const l=(await db.query('select * from customer_courtesy_lots where id=$1 and '+o.column+'=$2 for update',[id,o.id])).rows[0];if(!l)throw notFound();
  const fp=fingerprint({recipient_email:d.recipient_email.toLowerCase(),recipient_name:d.recipient_name,message:d.message});
  const prior=(await db.query('select * from customer_product_gift_orders where courtesy_lot_id=$1 and request_id=$2',[id,d.request_id])).rows[0];
  if(prior){if(prior.snapshot.delivery_fingerprint!==fp)throw badRequest('Esta entrega ya está asignada a otra persona.');return {ok:true,order_id:prior.id,...delivery.links(prior)};}
  if(l.state!=='READY'||(await db.query('select 1 from business_sales where id=$1 and sale_status=\'PAID\'',[l.sale_id])).rowCount!==1)throw badRequest('Primero el negocio debe confirmar el pago.');
  const count=Number((await db.query('select count(*)::int n from customer_product_gift_orders where courtesy_lot_id=$1',[id])).rows[0].n);if(count>=l.quantity)throw badRequest('Ya entregaste todas las cortesías de este paquete.');
  const recipient=(await db.query('select id,full_name,email from customer_accounts where lower(email)=$1 and is_active',[d.recipient_email.toLowerCase()])).rows[0]||{id:null,full_name:d.recipient_name,email:d.recipient_email.toLowerCase()};
  if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[recipient.id,l.merchant_id])).rowCount)throw badRequest('El destinatario no recibe regalos de este negocio.');
  const snapshot={...l.snapshot,source:'BUSINESS',courtesy:true,recipient_email:recipient.email,delivery_fingerprint:fp,title:'Cortesía de '+l.snapshot.buyer_name};
  const order=(await db.query("insert into customer_product_gift_orders(business_id,publication_id,product_id,buyer_id,recipient_id,request_id,buyer_name,recipient_name,amount,message,snapshot,courtesy_lot_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12) returning *",[l.merchant_id,l.publication_id,l.product_id,l.owner_customer_id,recipient.id,d.request_id,l.snapshot.buyer_name,d.recipient_name,l.unit_price,d.message,JSON.stringify(snapshot),id])).rows[0];
  const result=await require('./strategicQrService').createPostSaleQr(l.merchant_id,{id:l.confirmed_by,business_id:l.merchant_id,branch_id:l.branch_id},{
   existing_sale_id:l.sale_id,customer_name:l.snapshot.buyer_name,customer_email:l.snapshot.buyer_email,product_name:l.snapshot.product_name,currency:'COP',sale_amount:Number(l.unit_price),branch_id:l.branch_id,expiration_days:l.snapshot.valid_days,
   benefit:{benefit_type:'FREE_GIFT',benefit_label:l.snapshot.product_name,benefit_value:{label:l.snapshot.product_name,purchase_required:false,quantity:1,conditions:l.snapshot.terms,product_scope:{mode:'gift_product',inventory_product_id:l.product_id,product_name:l.snapshot.product_name}}},
   metadata:{source:'CUSTOMER_PRODUCT_GIFT',customer_product_gift_order_id:order.id,courtesy_lot_id:l.id,customer_gift_sender:l.snapshot.buyer_name,customer_gift_message:d.message,qr_creation_context:'business_owner_generic_ticket',ticket_use_case:'product_gift',ticket_use_case_label:'Cortesía',origin_label:'Cortesía de '+l.snapshot.buyer_name}
  },{client:db,recipient:{},courtesyLotId:l.id});
  const saved=(await db.query("update customer_product_gift_orders set state='ISSUED',sale_id=$2,qr_code_id=$3,paid_at=$4,confirmed_by=$5,payment_reference=$6,payment_method=$7 where id=$1 returning *",[order.id,l.sale_id,result.qr_code.id,l.paid_at,l.confirmed_by,l.payment_reference,l.payment_method])).rows[0];
  if(recipient.id)await delivery.invitation(db,saved,recipient);
  await delivery.queue(db,saved,a.email,recipient.email);return {ok:true,order_id:saved.id,...delivery.links(saved)};
 });
}
async function cancel(a,id){await access(a);const o=owner(a);const r=await query("update customer_courtesy_lots set state='CANCELLED' where id=$1 and "+o.column+"=$2 and state='PENDING_PAYMENT' returning id",[id,o.id]);if(!r.rowCount)throw badRequest('Solo puedes cancelar una compra pendiente de pago.');return {ok:true};}
module.exports={catalog,list,create,incoming,confirm,detail,send,cancel};

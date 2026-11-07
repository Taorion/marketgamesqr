const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const {planFromBusiness,assertStandaloneBusinessFeature}=require('./subscriptionService');
const {createPostSaleQr}=require('./strategicQrService');
const {syncSaleProductsWithCatalog}=require('./productCatalogService');
const finance=require('./customerFinance');
const crypto=require('crypto');
const delivery=require('./giftDeliveryService');
async function businessCatalog(user){
 await assertStandaloneBusinessFeature(user,user.business_id,'product_gifts');
 const [products,branches]=await Promise.all([
  query("select id,name,unit_price,stock_quantity from business_inventory_products where business_id=$1 and status='ACTIVE' and currency='COP' and stock_quantity>=1 order by name,id",[user.business_id]),
  query('select id,name from branches where business_id=$1 and is_active order by name',[user.business_id])
 ]);
 return {products:products.rows,branches:branches.rows};
}
async function createFromBusiness(user,data){
 await assertStandaloneBusinessFeature(user,user.business_id,'product_gifts');
 const fingerprint=crypto.createHash('sha256').update(JSON.stringify({product:data.product_id,recipient:data.recipient_public_id||data.recipient_email?.toLowerCase(),recipient_name:data.recipient_name||null,buyer_email:data.buyer_email||null,buyer:data.buyer_public_id||null,buyer_name:data.buyer_name||'',amount:finance.minor(data.amount),terms:data.terms,message:data.message,valid_days:data.valid_days})).digest('hex');
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['business-product-gift:'+user.business_id+':'+data.request_id]);
  const prior=(await db.query(orderSql+" where o.business_id=$1 and o.request_id=$2 and o.snapshot->>'source'='BUSINESS'",[user.business_id,data.request_id])).rows[0];
  if(prior){if(prior.snapshot.fingerprint!==fingerprint)throw badRequest('Esta solicitud ya tiene otros datos. Abre un nuevo regalo para cambiarlos.');return {order:receipt(prior)};}
  let recipient=data.recipient_public_id?(await db.query('select id,full_name,email from customer_accounts where public_id=$1',[data.recipient_public_id])).rows[0]:null;
  if(data.recipient_public_id&&!recipient?.full_name)throw notFound('Cuenta destinataria no disponible.');
  if(!recipient)recipient={id:null,full_name:data.recipient_name,email:data.recipient_email.toLowerCase()};
  const buyer=data.buyer_public_id?(await db.query('select id,full_name from customer_accounts where public_id=$1',[data.buyer_public_id])).rows[0]:null;
  if(data.buyer_public_id&&(!buyer?.full_name||data.buyer_authorized!==true))throw badRequest('Encuentra al comprador y confirma su autorización para registrar esta compra en Customer.');
  if(buyer?.id===recipient.id)throw badRequest('El comprador y el destinatario del regalo deben ser personas distintas.');
  if(!buyer&&!String(data.buyer_name||'').trim())throw badRequest('Indica quién compra el regalo.');
  if((await db.query('select 1 from customer_business_blocks where business_id=$1 and customer_id=any($2::uuid[])',[user.business_id,[recipient.id,...(buyer?[buyer.id]:[])]] )).rowCount)throw badRequest('Una de estas cuentas no recibe solicitudes de este negocio.');
  const p=(await db.query("select id,name,stock_quantity from business_inventory_products where business_id=$1 and id=$2 and status='ACTIVE' and currency='COP'",[user.business_id,data.product_id])).rows[0];
  if(!p||Number(p.stock_quantity)<1)throw badRequest('Selecciona un producto disponible del inventario de este negocio.');
  const snapshot={source:'BUSINESS',fingerprint,guest_buyer:!buyer,recipient_email:recipient.email,buyer_email:data.buyer_email||null,title:'Regalo de '+(buyer?.full_name||data.buyer_name),product_name:p.name,terms:data.terms,payment_instructions:'Pago directo al negocio. El ticket se entrega cuando el negocio confirma el pago.',valid_days:data.valid_days};
  const row=(await db.query(`insert into customer_product_gift_orders(business_id,product_id,buyer_id,recipient_id,request_id,buyer_name,recipient_name,amount,message,snapshot)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) returning *`,[user.business_id,p.id,buyer?.id||null,recipient.id,data.request_id,buyer?.full_name||data.buyer_name,recipient.full_name,data.amount,data.message,JSON.stringify(snapshot)])).rows[0];
  return {order:receipt(row)};
 });
}
const offerSql="select pub.*,to_jsonb(b) business,b.name business_name,b.slug business_slug,d.published directory_published,ip.name product_name,ip.status product_status,ip.stock_quantity,ip.cost_price,ip.currency,po.price,po.terms,po.payment_instructions,po.valid_days from customer_publications pub join businesses b on b.id=pub.business_id join customer_directory d on d.business_id=b.id join customer_product_offers po on po.publication_id=pub.id join business_inventory_products ip on ip.id=pub.resource_id and ip.business_id=pub.business_id where pub.id=$1 and pub.kind='PRODUCT'";
function available(row){
 const plan=row&&planFromBusiness(row.business);
 return !!row&&row.business.is_active&&plan.portal_access_allowed&&plan.raw_status==='ACTIVE'&&!!plan.features.product_gifts&&row.directory_published&&row.status==='PUBLISHED'&&row.product_status==='ACTIVE'&&Number(row.stock_quantity)>=1&&row.currency==='COP';
}
async function offer(id,db={query}){const row=(await db.query(offerSql,[id])).rows[0];if(!available(row))throw badRequest('Este producto no está disponible para regalar.');return row;}
const orderSql="select o.*,b.name business_name,i.state invitation_state,q.status ticket_status,q.expires_at,s.sale_status from customer_product_gift_orders o join businesses b on b.id=o.business_id left join customer_invitations i on i.id=o.invitation_id left join qr_codes q on q.id=o.qr_code_id left join business_sales s on s.id=o.sale_id";
function receipt(o,buyer=true){return {...(buyer?delivery.links(o):{}),id:o.id,business_id:o.business_id,business_name:o.business_name,publication_id:o.publication_id,title:o.snapshot.title,product_name:o.snapshot.product_name,buyer_name:o.buyer_name,recipient_name:o.recipient_name,amount:o.amount,message:o.message,state:o.state,invitation_state:o.invitation_state,ticket_status:o.ticket_status,sale_status:o.sale_status,expires_at:o.expires_at,created_at:o.created_at,paid_at:o.paid_at,terms:o.snapshot.terms,payment_instructions:o.snapshot.payment_instructions};}
async function order(account,id){const row=(await query(orderSql+' where o.id=$1 and (o.buyer_id=$2 or (o.recipient_id=$2 and o.state=\'ISSUED\'))',[id,account.id])).rows[0];if(!row)throw notFound('Regalo no encontrado.');return {order:receipt(row,row.buyer_id===account.id)};}
async function list(account){
 const [sent,received]=await Promise.all([
  query(orderSql+' where o.buyer_id=$1 order by o.created_at desc limit 100',[account.id]),
  query(orderSql+" where o.recipient_id=$1 and o.state='ISSUED' order by o.paid_at desc limit 100",[account.id])
 ]);
 return {orders:sent.rows.map(o=>({...receipt(o),sale_id:o.sale_id})),received:received.rows.map(o=>({...receipt(o,false),invitation_id:o.invitation_id,ticket_id:o.invitation_state==='ACCEPTED'?o.qr_code_id:null}))};
}
async function create(account,id,data){
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['product-gift:'+account.id+':'+data.request_id]);
  const prior=(await db.query(orderSql+' where o.buyer_id=$1 and o.request_id=$2',[account.id,data.request_id])).rows[0];
  if(prior){if(prior.publication_id!==id)throw badRequest('Esta solicitud ya corresponde a otro producto.');return {order:receipt(prior)};}
  const p=await offer(id,db);
  if(!account.full_name)throw badRequest('Completa tu nombre antes de regalar.');
  const key=data.recipient.trim().toLowerCase();
  let recipient=(await db.query('select id,full_name,email from customer_accounts where lower(email)=$1 or public_id::text=$1',[key])).rows[0];
  if(!recipient){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)||!data.recipient_name)throw badRequest('Indica el correo y el nombre del destinatario para invitarlo a Customer gratis.');recipient={id:null,full_name:data.recipient_name,email:key};}
  if(!recipient.full_name)recipient.full_name=data.recipient_name;
  if(!recipient.full_name)throw badRequest('Indica el nombre de quien recibirá el regalo.');
  if(recipient.id===account.id)throw badRequest('Selecciona otra cuenta para enviar tu regalo.');
  if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[recipient.id,p.business_id])).rowCount)throw badRequest('Esta cuenta no recibe regalos de este negocio.');
  const recent=(await db.query("select count(*)::int n from customer_product_gift_orders where buyer_id=$1 and state='PENDING_PAYMENT' and created_at>now()-interval '1 day'",[account.id])).rows[0].n;
  if(recent>=20)throw badRequest('Ya tienes varias solicitudes pendientes. Revisa Mis regalos antes de crear otra.');
  const snapshot={recipient_email:recipient.email,buyer_email:account.email,title:p.title,product_name:p.product_name,terms:p.terms,payment_instructions:p.payment_instructions,valid_days:p.valid_days};
  const r=(await db.query("insert into customer_product_gift_orders(business_id,publication_id,product_id,buyer_id,recipient_id,request_id,buyer_name,recipient_name,amount,message,snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) returning *",[p.business_id,p.id,p.resource_id,account.id,recipient.id,data.request_id,account.full_name,recipient.full_name,p.price,data.message,JSON.stringify(snapshot)])).rows[0];
  return {order:receipt({...r,business_name:p.business_name})};
 });
}
async function cancel(account,id){const r=await query("update customer_product_gift_orders set state='CANCELLED' where id=$1 and buyer_id=$2 and state='PENDING_PAYMENT' returning id",[id,account.id]);if(!r.rowCount)throw badRequest('Solo puedes cancelar un regalo pendiente de pago.');return {ok:true};}
async function businessOrders(user){
 const [orders,branches]=await Promise.all([
  query(orderSql+" where o.business_id=$1 order by (o.state='PENDING_PAYMENT') desc,o.created_at desc limit 100",[user.business_id]),
  query('select id,name from branches where business_id=$1 and is_active order by name',[user.business_id])
 ]);
 return {orders:orders.rows.map(receipt),branches:branches.rows};
}
async function confirm(user,id,data){
 await assertStandaloneBusinessFeature(user,user.business_id,'product_gifts');
 if(data.payment_received!==true)throw badRequest('Confirma que recibiste el pago.');
 return withTransaction(async db=>{
  const o=(await db.query('select * from customer_product_gift_orders where id=$1 and business_id=$2 for update',[id,user.business_id])).rows[0];
  if(!o)throw notFound('Solicitud no encontrada.');
  if(o.state==='ISSUED')return {ok:true,existing:true,order_id:o.id,sale_id:o.sale_id,...delivery.links(o)};
  if(o.state!=='PENDING_PAYMENT')throw badRequest('La solicitud ya no está pendiente.');
  if(finance.minor(o.amount)!==finance.minor(data.amount))throw badRequest('El importe recibido debe coincidir con el precio de esta solicitud.');
  const buyer=o.buyer_id?(await db.query('select id,email from customer_accounts where id=$1',[o.buyer_id])).rows[0]:(o.snapshot.source==='BUSINESS'&&o.snapshot.guest_buyer?{email:o.snapshot.buyer_email||null}:null);
  const recipient=o.recipient_id?(await db.query('select id,email,full_name from customer_accounts where id=$1',[o.recipient_id])).rows[0]:{id:null,email:o.snapshot.recipient_email,full_name:o.recipient_name};
  if(!buyer||!recipient)throw badRequest('Una de las cuentas ya no está disponible. Resuelve el pago directamente con el comprador.');
  if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[recipient.id,user.business_id])).rowCount)throw badRequest('El destinatario no recibe regalos de este negocio. Resuelve el pago con el comprador.');
  const product=(await db.query("select * from business_inventory_products where id=$1 and business_id=$2 for update",[o.product_id,user.business_id])).rows[0];
  if(!product||product.status!=='ACTIVE'||Number(product.stock_quantity)<1)throw badRequest('No hay existencias disponibles para entregar este regalo.');
  const branch=(await db.query('select id from branches where business_id=$1 and is_active and ($2::uuid is null or id=$2) order by created_at limit 1',[user.business_id,data.branch_id||user.branch_id||null])).rows[0];
  if(!branch)throw badRequest('Selecciona una sede activa del negocio.');
  const catalog=await syncSaleProductsWithCatalog(db,user.business_id,user.id,[{name:o.snapshot.product_name,inventory_product_id:product.id,quantity:1,unit_price:Number(o.amount),line_total:Number(o.amount),currency:'COP'}],{currency:'COP',sourceModule:'customer_product_gift',createMissingProducts:false,inventoryMovementKey:'customer-gift:'+o.id,saleReference:'customer-gift:'+o.id});
  const result=await createPostSaleQr(user.business_id,user,{
   customer_name:o.buyer_name,customer_email:buyer.email,product_name:o.snapshot.product_name,sale_amount:Number(o.amount),currency:'COP',branch_id:branch.id,
   expiration_days:o.snapshot.valid_days,notes:'Producto de regalo pagado. Referencia: '+data.payment_reference,
   benefit:{benefit_type:'FREE_GIFT',benefit_label:o.snapshot.product_name,benefit_value:{label:o.snapshot.product_name,purchase_required:false,quantity:1,conditions:o.snapshot.terms,product_scope:{mode:'gift_product',inventory_product_id:product.id,product_name:o.snapshot.product_name}}},
   metadata:{source:'CUSTOMER_PRODUCT_GIFT',customer_product_gift_order_id:o.id,customer_gift_sender:o.buyer_name,customer_gift_message:o.message,
    qr_creation_context:'business_owner_generic_ticket',ticket_use_case:'product_gift',ticket_use_case_label:'Ticket de regalo pagado',
    origin_label:o.snapshot.source==='BUSINESS'?'Regalo creado en Qori Empresa':'Regalo comprado en Qori Customer',reward_label:o.snapshot.product_name,attribution_source:'MANUAL',attribution_subject:'Qori Customer · regalos',
    products:catalog.products,product_catalog_sync:true,payment_reference:data.payment_reference}
  },{client:db,recipient:{customer_name:recipient.full_name,customer_email:recipient.email}});
  await db.query("update business_sales set sale_status='PAID',paid_at=now(),payment_method=$2,idempotency_key=$3,inventory_product_id=$4,quantity=1,unit_cost=$5,product_cost_total=$5,gross_profit=sale_amount-$5,net_profit=sale_amount-$5,created_by_user_id=$6 where id=$1",[result.sale.id,data.payment_method,'customer-product-gift:'+o.id,product.id,product.cost_price||0,user.id]);
  const completed=(await db.query("update customer_product_gift_orders set state='ISSUED',sale_id=$2,qr_code_id=$3,paid_at=now(),confirmed_by=$4,payment_reference=$5,payment_method=$6 where id=$1 returning *",[id,result.sale.id,result.qr_code.id,user.id,data.payment_reference,data.payment_method])).rows[0];
  if(recipient.id)await delivery.invitation(db,completed,recipient);
  await delivery.queue(db,completed,buyer.email,recipient.email);
  if(o.buyer_id)await require('./customerBenefitNotificationService').insert(db,{customer_id:o.buyer_id,business_id:user.business_id,event_key:'gift-purchase:'+o.id,kind:'SALE',title:'Tu regalo fue pagado y enviado',body:'El ticket fue enviado a '+o.recipient_name+'. Tu comprobante quedó en tus compras.',resource_id:result.sale.id});
  return {ok:true,order_id:id,sale_id:result.sale.id,...delivery.links(completed)};
 });
}
async function validateGiftTicket(db,account,invitation){
 const row=(await db.query("select o.*,q.status ticket_status,q.expires_at,s.sale_status from customer_product_gift_orders o join qr_codes q on q.id=o.qr_code_id join business_sales s on s.id=o.sale_id where o.id=$1 and o.business_id=$2 and o.recipient_id=$3 and o.invitation_id=$4 and o.qr_code_id=$5 and o.state='ISSUED'",[invitation.payload.product_gift_order_id,invitation.business_id,account.id,invitation.id,invitation.resource_id])).rows[0];
 if(!row||row.ticket_status!=='ACTIVE'||row.sale_status!=='PAID'||new Date(row.expires_at)<=new Date())throw badRequest('Este regalo ya no está disponible. Consulta con el negocio.');
 return row;
}
module.exports={offer,available,create,order,list,cancel,businessOrders,confirm,validateGiftTicket,businessCatalog,createFromBusiness};

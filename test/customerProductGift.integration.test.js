const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('node:fs/promises'),path=require('node:path');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='customer-product-gift-qa';process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),qr=require('../backend/src/services/qrService');
let server,base,buyer,recipient,outsider,merchant,foreign,product,publication,orderId,issued;
async function api(url,token,body,method=body?'POST':'GET'){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
async function login(name){const email=crypto.randomUUID()+'@example.test',c=await api('/api/customer/auth/code',null,{email}),mail=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-customer/mailbox',c.challenge_id+'.json'),'utf8')),r=await api('/api/customer/auth/verify',null,{challenge_id:c.challenge_id,code:mail.code});await query('update customer_accounts set full_name=$2 where id=$1',[r.account.id,name]);r.account.full_name=name;return r;}
async function business(){
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Café regalos QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
 const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Dueño QA','BUSINESS_OWNER') returning *",[b.id,crypto.randomUUID()+'@example.test'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,50,50)',[b.id]);await query("insert into branches(business_id,name,slug) values($1,'Café principal','qa')",[b.id]);
 return {b,u,token:jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};
}
const orderBody=()=>({publication_id:publication.id,request_id:crypto.randomUUID(),recipient:recipient.account.email,message:'Un café para alegrarte el día.',terms_accepted:true});
const payment={amount:'8000',payment_reference:'LOCAL-QA-001',payment_method:'Efectivo QA',payment_received:true};
const confirm=(id,token=merchant.token,data=payment)=>api('/api/business/customer/product-gifts/'+id+'/confirm-payment',token,data);
test('a paid coffee gift uses Empresa tickets, one sale and the intended Customer inbox',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await login('Andrea Compradora');recipient=await login('Camilo Destinatario');outsider=await login('Otra Persona');merchant=await business();foreign=await business();
 product=(await query("insert into business_inventory_products(business_id,internal_id,name,status,stock_quantity,unit_price,cost_price,currency) values($1,'COFFEE-QA','Café americano','ACTIVE',10,8000,2000,'COP') returning *",[merchant.b.id])).rows[0];
 const pubBody={kind:'PRODUCT',resource_id:product.id,title:'Regala un café americano',description:'Un café ya pagado para otra persona.',product_price:'8000',product_terms:'Un café americano. Canje único sin compra adicional.',payment_instructions:'Paga directamente en caja e indica la referencia del pedido.',product_valid_days:30};
 await t.test('business publishes only its own giftable product and server controls price',async()=>{
  await api('/api/business/customer/directory',merchant.token,{published:true,category:'Café',city:'Bogotá',address:'QA',description:'Café de prueba'},'PUT');
  assert.equal((await api('/api/business/customer/publications',foreign.token,pubBody)).status,404);
  const r=await api('/api/business/customer/publications',merchant.token,pubBody);assert.equal(r.status,200,JSON.stringify(r));publication=r.publication;
  const feed=await api('/api/customer/explore?kind=PRODUCT',buyer.token);assert.ok(feed.publications.some(p=>p.id===publication.id));assert.equal(Number(publication.product_price),8000);
 });
 await t.test('unpaid order cannot deliver, mint a QR, spend inventory or charge the recipient',async()=>{
  const body={...orderBody(),amount:'1',recipient_id:outsider.account.id};
  const r=await api('/api/customer/product-gifts',buyer.token,body);assert.equal(r.status,200,JSON.stringify(r));orderId=r.order.id;assert.equal(Number(r.order.amount),8000);assert.equal(r.order.recipient_name,'Camilo Destinatario');
  assert.equal((await api('/api/customer/product-gifts',buyer.token,body)).order.id,orderId);
  assert.equal((await api('/api/customer/product-gifts/'+orderId,outsider.token)).status,404);
  assert.equal((await api('/api/customer/invitations',recipient.token)).invitations.length,0);
  assert.deepEqual((await api('/api/customer/product-gifts',recipient.token)).received,[]);
  const queue=await api('/api/business/customer/product-gifts',merchant.token);assert.equal(queue.orders[0].id,orderId);assert.equal(queue.branches.length,1);
  assert.equal((await api('/api/business/customer/product-gifts',foreign.token)).orders.length,0);
  assert.equal((await api('/api/customer/wallet/overview',recipient.token)).cards.length,0);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,0);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),10);
  assert.equal((await confirm(orderId,foreign.token)).status,404);
  assert.equal((await confirm(orderId,buyer.token)).status,401);
  assert.equal((await confirm(orderId,merchant.token,{...payment,amount:'1'})).status,400);
 });
 await t.test('confirmation is atomic under concurrent retries: one payment record, sale, ticket, invitation and stock deduction',async()=>{
  const responses=await Promise.all([confirm(orderId),confirm(orderId)]);
  for(const r of responses)assert.equal(r.status,200,JSON.stringify(r));assert.equal(responses[0].sale_id,responses[1].sale_id);
  issued=(await query('select * from customer_product_gift_orders where id=$1',[orderId])).rows[0];
  const sale=(await query('select * from business_sales where id=$1',[issued.sale_id])).rows[0];
  assert.equal(sale.customer_email,buyer.account.email);assert.equal(Number(sale.sale_amount),8000);assert.equal(sale.sale_status,'PAID');
  assert.equal(sale.seller_user_id,merchant.u.id);assert.equal(sale.qr_code_id,issued.qr_code_id);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,1);
  assert.equal((await query('select count(*)::int n from qr_codes where sale_id=$1',[sale.id])).rows[0].n,1);
  assert.equal((await query('select affiliate_id from qr_codes where sale_id=$1',[sale.id])).rows[0].affiliate_id,null);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),9);
  const dashboard=await api('/api/customer/dashboard',buyer.token);assert.equal(dashboard.total_minor,800000);
  assert.equal((await api('/api/customer/dashboard',recipient.token)).total_minor,0);
  assert.equal((await api('/api/customer/sales/'+sale.id,recipient.token)).status,404);
  assert.equal((await api('/api/customer/product-gifts/'+orderId,buyer.token)).order.qr_code_id,undefined);
  assert.equal((await api('/api/customer/product-gifts',buyer.token)).orders[0].sale_id,sale.id);
  const receipt=await api('/api/customer/purchase-receipts/'+sale.id,buyer.token);assert.equal(receipt.status,200);assert.equal(Number(receipt.receipt.amount),8000);assert.equal(receipt.receipt.products[0].name,'Café americano');assert.equal(receipt.receipt.qr_code_id,undefined);
  assert.equal((await api('/api/customer/purchase-receipts/'+sale.id,recipient.token)).status,404);
  assert.equal((await api('/api/customer/purchase-receipts/'+sale.id,outsider.token)).status,404);
  assert.equal((await api('/api/customer/notifications',buyer.token)).items.filter(n=>n.kind==='SALE'&&n.resource_id===sale.id).length,1);
 });
 await t.test('only the recipient accepts the gift and receives its usable existing ticket',async()=>{
  const inbox=await api('/api/customer/invitations',recipient.token);assert.equal(inbox.invitations.length,1);assert.match(inbox.invitations[0].message,/Andrea Compradora/);
  const pending=(await api('/api/customer/product-gifts',recipient.token)).received;assert.equal(pending.length,1);assert.equal(pending[0].invitation_id,issued.invitation_id);assert.equal(pending[0].ticket_id,null);
  assert.equal((await api('/api/customer/product-gifts',outsider.token)).received.length,0);
  assert.equal((await api('/api/customer/invitations/'+issued.invitation_id+'/decision',outsider.token,{action:'ACCEPT',terms_accepted:true})).status,404);
  assert.equal((await api('/api/customer/wallet/tickets/'+issued.qr_code_id,recipient.token)).status,404);
  assert.equal((await api('/api/customer/invitations/'+issued.invitation_id+'/decision',recipient.token,{action:'ACCEPT',terms_accepted:true})).status,200);
  const detail=await api('/api/customer/wallet/tickets/'+issued.qr_code_id,recipient.token);assert.equal(detail.status,200,JSON.stringify(detail));assert.ok(detail.card.qr_image);assert.equal(detail.card.sender_name,'Andrea Compradora');
  assert.equal((await api('/api/customer/product-gifts',recipient.token)).received[0].ticket_id,issued.qr_code_id);
  assert.equal((await api('/api/customer/product-gifts',buyer.token)).orders[0].ticket_id,undefined);
  assert.equal((await api('/api/customer/wallet/tickets/'+issued.qr_code_id,buyer.token)).status,404);
  assert.equal((await api('/api/customer/wallet/overview',recipient.token)).cards[0].kind,'TICKET');assert.equal((await api('/api/customer/wallet/overview',recipient.token)).cards[0].benefit_category,'USER_GIFT');
 });
 await t.test('Validator delivers the already-paid coffee once without another sale or inventory deduction',async()=>{
  const ticket=(await query('select token from qr_codes where id=$1',[issued.qr_code_id])).rows[0];
  const validation=await qr.getQrDetails(ticket.token,merchant.u);assert.equal(validation.allowed,true);assert.equal(validation.qr_code.customer_product_gift,true);
  const payload={mode:'STANDALONE',idempotency_key:crypto.randomUUID(),beneficiary:{name:recipient.account.full_name,email:recipient.account.email,data_use_confirmed:true}};
  await assert.rejects(qr.redeemQr(ticket.token,foreign.u,payload));
  await assert.rejects(qr.redeemQr(ticket.token,merchant.u,{...payload,mode:'PURCHASE'}),/ya está pagado/);
  await assert.rejects(qr.redeemQr(ticket.token,merchant.u,{...payload,beneficiary:{...payload.beneficiary,email:buyer.account.email}}),/destinatario/);
  const redeemed=await qr.redeemQr(ticket.token,merchant.u,payload);assert.equal(redeemed.status,'REDEEMED');
  assert.equal((await qr.redeemQr(ticket.token,merchant.u,payload)).idempotent_replay,true);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,1);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),9);
  assert.equal((await api('/api/customer/wallet/tickets/'+issued.qr_code_id,recipient.token)).card.qr_image,undefined);
  assert.equal((await api('/api/customer/product-gifts/'+orderId,buyer.token)).order.ticket_status,'REDEEMED');
 });
 await t.test('cancelled requests and insufficient credit never produce partial paid orders',async()=>{
  const cancel=await api('/api/customer/product-gifts',buyer.token,orderBody());
  await api('/api/customer/product-gifts/'+cancel.order.id+'/cancel',buyer.token,{});
  assert.equal((await confirm(cancel.order.id)).status,400);
  const r=await api('/api/customer/product-gifts',buyer.token,orderBody());await query('update business_qr_credit_accounts set qr_balance=0 where business_id=$1',[merchant.b.id]);
  assert.equal((await confirm(r.order.id)).status,400);
  const raw=(await query('select * from customer_product_gift_orders where id=$1',[r.order.id])).rows[0];assert.equal(raw.state,'PENDING_PAYMENT');assert.equal(raw.sale_id,null);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),9);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,1);
 });
 await t.test('price and terms are fixed at request time; stock is checked again before payment confirmation',async()=>{
  await query('update business_qr_credit_accounts set qr_balance=30 where business_id=$1',[merchant.b.id]);
  const r=await api('/api/customer/product-gifts',buyer.token,orderBody());assert.equal(r.status,200);
  await query("update customer_product_offers set price=12000,terms='Nuevas condiciones para pedidos nuevos' where publication_id=$1",[publication.id]);
  const saved=await api('/api/customer/product-gifts/'+r.order.id,buyer.token);assert.equal(Number(saved.order.amount),8000);assert.match(saved.order.terms,/Un café americano/);
  await query('update business_inventory_products set stock_quantity=0 where id=$1',[product.id]);
  assert.equal((await confirm(r.order.id)).status,400);
  assert.equal((await api('/api/customer/product-gifts',buyer.token,orderBody())).status,400);
  await query('update business_inventory_products set stock_quantity=9 where id=$1',[product.id]);
  assert.equal((await confirm(r.order.id)).status,200);
  const o=(await query('select * from customer_product_gift_orders where id=$1',[r.order.id])).rows[0];
  // Even an existing identity relationship must not bypass acceptance of a new paid gift.
  await query("update players set document_id='GIFT-RECIPIENT-QA' where id=(select player_id from qr_codes where id=$1)",[o.qr_code_id]);
  await query("insert into customer_relationships(customer_id,business_id,document_key,state,accepted_at,include_history) values($1,$2,'giftrecipientqa','ACCEPTED',now(),true)",[recipient.account.id,merchant.b.id]);
  assert.equal((await api('/api/customer/wallet/tickets/'+o.qr_code_id,recipient.token)).status,404);
  assert.equal((await api('/api/customer/invitations/'+o.invitation_id+'/decision',recipient.token,{action:'ACCEPT',terms_accepted:true})).status,200);
  await query("update business_sales set sale_status='VOIDED' where id=$1",[o.sale_id]);
  assert.equal((await api('/api/customer/wallet/tickets/'+o.qr_code_id,recipient.token)).card.qr_image,undefined);
  assert.equal((await api('/api/customer/wallet/overview',recipient.token)).cards.find(c=>c.id===o.qr_code_id).status,'ARCHIVED');
  const q=(await query('select token from qr_codes where id=$1',[o.qr_code_id])).rows[0];
  assert.equal((await qr.getQrDetails(q.token,merchant.u)).allowed,false);
  await assert.rejects(qr.redeemQr(q.token,merchant.u,{mode:'STANDALONE',idempotency_key:crypto.randomUUID(),beneficiary:{name:recipient.account.full_name,email:recipient.account.email,data_use_confirmed:true}}),/pagado/);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

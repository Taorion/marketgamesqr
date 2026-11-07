const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='business-gift-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),qr=require('../backend/src/services/qrService');
let server,base;
async function api(url,token,body,method=body?'POST':'GET'){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
async function account(name,document){const a=(await query('insert into customer_accounts(email,full_name,declared_document_key,document_locked_at) values($1,$2,$3,now()) returning *',[crypto.randomUUID()+'@example.test',name,document])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function business(){const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Regalos directos QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Dueño QA','BUSINESS_OWNER') returning *",[b.id,crypto.randomUUID()+'@example.test'])).rows[0];await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,50,50)',[b.id]);await query("insert into branches(business_id,name,slug) values($1,'Sede QA','qa')",[b.id]);return {b,u,token:jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};}
test('Empresa creates a paid gift from inventory and delivers it exclusively to its Customer recipient',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const document=String(Date.now()),recipient=await account('Beneficiaria QA',document),buyer=await account('Comprador QA',document+'1'),outsider=await account('Otra persona',document+'2'),merchant=await business(),foreign=await business();
 const product=(await query("insert into business_inventory_products(business_id,internal_id,name,status,stock_quantity,unit_price,cost_price,currency) values($1,'GIFT-QA','Café directo','ACTIVE',10,8000,2000,'COP') returning *",[merchant.b.id])).rows[0];
 const data={request_id:crypto.randomUUID(),product_id:product.id,recipient_public_id:recipient.public_id,buyer_public_id:buyer.public_id,buyer_authorized:true,amount:'8500.50',valid_days:30,terms:'Un café. Canje único sin pago adicional.',message:'Un detalle para ti'};
 const create=(body=data,token=merchant.token)=>api('/api/business/customer/product-gifts',token,body);
 const payment={amount:data.amount,payment_reference:'QA-CAJA-1',payment_method:'CASH',payment_received:true};
 const pay=(id,body=payment,token=merchant.token)=>api('/api/business/customer/product-gifts/'+id+'/confirm-payment',token,body);
 let order,issued;
 await t.test('exact document lookup refuses ambiguity and reveals no private financial data',async()=>{
  for(const term of [recipient.email,document]){const r=await api('/api/business/customer/lookup',merchant.token,{query:term});assert.equal(r.status,200);assert.deepEqual(Object.keys(r.buyer).sort(),['full_name','public_id','relationship_state']);assert.equal(r.buyer.public_id,recipient.public_id);}
  const duplicate=await account('Otra cuenta misma cédula',document);assert.equal((await api('/api/business/customer/lookup',merchant.token,{query:document})).status,400);
  await query('insert into customer_business_blocks(customer_id,business_id) values($1,$2)',[duplicate.id,merchant.b.id]);assert.equal((await api('/api/business/customer/lookup',merchant.token,{query:document})).status,400);await query('delete from customer_accounts where id=$1',[duplicate.id]);
  assert.equal((await api('/api/business/customer/lookup',merchant.token,{query:'Beneficiaria'})).status,400);
  await query('update customer_accounts set document_review_required=true where id=$1',[recipient.id]);assert.equal((await api('/api/business/customer/lookup',merchant.token,{query:document})).status,404);await query('update customer_accounts set document_review_required=false where id=$1',[recipient.id]);
 });
 await t.test('catalog, authorization, buyer consent, inventory and recipient blocks are enforced',async()=>{
  assert.equal((await api('/api/business/customer/product-gifts/catalog',merchant.token)).products[0].id,product.id);assert.equal((await api('/api/business/customer/product-gifts/catalog',foreign.token)).products.length,0);
  assert.equal((await create(data,buyer.token)).status,401);assert.equal((await create(data,null)).status,401);
  assert.equal((await create(data,foreign.token)).status,400);
  assert.equal((await create({...data,buyer_authorized:undefined})).status,400);
  assert.equal((await create({...data,recipient_public_id:buyer.public_id})).status,400);
  assert.equal((await create({...data,amount:'0'})).status,400);
  await query('insert into customer_business_blocks(customer_id,business_id) values($1,$2)',[recipient.id,merchant.b.id]);assert.equal((await create()).status,400);await query('delete from customer_business_blocks where customer_id=$1 and business_id=$2',[recipient.id,merchant.b.id]);
 });
 await t.test('concurrent creation is idempotent, pending and independent of public offers',async()=>{
  const [a,b]=await Promise.all([create(),create()]);assert.equal(a.status,200,JSON.stringify(a));assert.equal(b.status,200,JSON.stringify(b));assert.equal(a.order.id,b.order.id);order=a.order;
  const raw=(await query('select * from customer_product_gift_orders where id=$1',[order.id])).rows[0];assert.equal(raw.publication_id,null);assert.equal(raw.qr_code_id,null);assert.equal(raw.state,'PENDING_PAYMENT');
  assert.equal((await create({...data,amount:'1'})).status,400);
  assert.equal((await api('/api/customer/invitations',recipient.token)).invitations.length,0);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),10);
 });
 await t.test('payment rollback and concurrent confirmation produce one sale and one reserved product',async()=>{
  assert.equal((await pay(order.id,payment,foreign.token)).status,404);assert.equal((await pay(order.id,{...payment,amount:'8500'})).status,400);
  await query('update business_qr_credit_accounts set qr_balance=0 where business_id=$1',[merchant.b.id]);assert.equal((await pay(order.id)).status,400);assert.equal((await query('select state from customer_product_gift_orders where id=$1',[order.id])).rows[0].state,'PENDING_PAYMENT');await query('update business_qr_credit_accounts set qr_balance=50 where business_id=$1',[merchant.b.id]);
  const results=await Promise.all([pay(order.id),pay(order.id)]);for(const r of results)assert.equal(r.status,200,JSON.stringify(r));assert.equal(results[0].sale_id,results[1].sale_id);
  issued=(await query('select * from customer_product_gift_orders where id=$1',[order.id])).rows[0];assert.equal(issued.amount,'8500.50');
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,1);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),9);
  assert.equal((await api('/api/customer/purchase-receipts/'+issued.sale_id,buyer.token)).status,200);assert.equal((await api('/api/customer/purchase-receipts/'+issued.sale_id,recipient.token)).status,404);
  assert.equal((await query('select count(*)::int n from customer_benefit_notifications where customer_id=$1 and invitation_id=$2',[recipient.id,issued.invitation_id])).rows[0].n,1);
  assert.equal((await api('/api/customer/dashboard',recipient.token)).total_minor,0);assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,850050);
 });
 await t.test('only intended recipient can accept and redeem once; it never exposes buyer spending',async()=>{
  const url='/api/customer/invitations/'+issued.invitation_id+'/decision',body={action:'ACCEPT',terms_accepted:true};
  assert.equal((await api(url,outsider.token,body)).status,404);assert.equal((await api('/api/customer/wallet/tickets/'+issued.qr_code_id,recipient.token)).status,404);assert.equal((await api(url,recipient.token,body)).status,200);
  assert.equal((await api('/api/customer/wallet/tickets/'+issued.qr_code_id,buyer.token)).status,404);assert.equal((await api('/api/customer/wallet/tickets/'+issued.qr_code_id,recipient.token)).status,200);
  const ticket=(await query('select token from qr_codes where id=$1',[issued.qr_code_id])).rows[0],redeem={mode:'STANDALONE',idempotency_key:crypto.randomUUID(),beneficiary:{name:recipient.full_name,email:recipient.email,data_use_confirmed:true}};
  await assert.rejects(qr.redeemQr(ticket.token,foreign.u,redeem));assert.equal((await qr.redeemQr(ticket.token,merchant.u,redeem)).status,'REDEEMED');assert.equal((await qr.redeemQr(ticket.token,merchant.u,redeem)).idempotent_replay,true);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),9);
  await query('update business_sales set customer_document_id=$2 where id=$1',[issued.sale_id,document]);await query("insert into customer_relationships(customer_id,business_id,document_key,state,accepted_at,include_history) values($1,$2,$3,'ACCEPTED',now(),true)",[recipient.id,merchant.b.id,document]);
  assert.equal((await api('/api/customer/purchase-receipts/'+issued.sale_id,recipient.token)).status,404);assert.equal((await api('/api/customer/dashboard',recipient.token)).total_minor,0);
 });
 await t.test('a walk-in buyer needs no fake Customer account and cannot charge the recipient',async()=>{
  const guest={...data,request_id:crypto.randomUUID(),buyer_public_id:undefined,buyer_authorized:undefined,buyer_name:'Comprador en caja'};
  const r=await create(guest);assert.equal(r.status,200,JSON.stringify(r));assert.equal((await create(guest)).order.id,r.order.id);assert.equal((await pay(r.order.id)).status,200);
  const g=(await query('select * from customer_product_gift_orders where id=$1',[r.order.id])).rows[0];assert.equal(g.buyer_id,null);assert.equal((await api('/api/customer/purchase-receipts/'+g.sale_id,recipient.token)).status,404);assert.equal((await api('/api/customer/dashboard',recipient.token)).total_minor,0);
  assert.equal((await api('/api/business/customer/product-gifts',foreign.token)).orders.length,0);
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

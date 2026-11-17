const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID:uuid}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='giftcards-local-qa-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),{env}=require('../backend/src/config/env');
const catalog=require('../backend/src/services/packageCatalog'),payments=require('../backend/src/services/mercadoPagoService');
let server,base,user,business,signup,firstPass,n=0;const actualFetch=global.fetch;let mpCalls=0;const providerPayments=new Map();
async function api(path,body,method=body?'POST':'GET',actor=user){const r=await actualFetch(base+path,{method,headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.'+(++n),...(actor?{Authorization:'Bearer '+jwt.sign({sub:actor.id,password_version:0},env.jwtSecret)}:{})},...(body?{body:JSON.stringify(body)}:{})});const raw=await r.text();return {status:r.status,data:JSON.parse(raw)};}
const pass=()=>({buyer_name:'Comprador QA',beneficiary_name:'Beneficiaria QA',beneficiary_document:'DOC-'+uuid(),initial_value_cop:100000,idempotency_key:uuid(),branch_authorization_scope:'ALL_BRANCHES'});
async function balances(){return (await query('select * from qori_giftcard_credit_accounts where business_id=$1',[business.id])).rows[0];}
async function approve(id,overrides={}){return withTransaction(async db=>{const o=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[id])).rows[0];return payments.__testing.finalizeApprovedCreditPurchase(db,o,{id:'qa-'+id,status:'approved',currency_id:'COP',transaction_amount:Number(o.price_cop),...overrides});});}
after(async()=>{global.fetch=actualFetch;if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Un regalo personal: signup, issuance, packages, verified payment and tenant isolation',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 env.mercadoPagoAccessToken='TEST-local-only';env.mercadoPagoWebhookSecret='local-only';
 global.fetch=async(url,options)=>{assert.ok(String(url).startsWith('https://api.mercadopago.com/'));if(options.method==='GET')return new Response(JSON.stringify(providerPayments.get(String(url).split('/').pop())),{status:200});mpCalls++;const body=JSON.parse(options.body);assert.equal(body.items[0].currency_id,'COP');return new Response(JSON.stringify({id:uuid(),init_point:'https://example.test/checkout'}),{status:201});};
 await t.test('registration grants exactly five independent one-time emissions and adds the public program',async()=>{
  signup={free_program:'UN_REGALO_PERSONAL',company_name:'Regalo QA '+uuid(),contact_name:'Titular QA',email:uuid()+'@example.test',nit:uuid(),phone:'3100000000',city:'Bogotá',address:'Calle QA',password:'PruebaLocal!2026',password_confirm:'PruebaLocal!2026',terms_accepted:true,privacy_accepted:true};
  const r=await api('/api/pense-en-ti/signup',signup,'POST',null);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.portal_url,'/empresa/?view=reward-passes');
  business=(await query('select * from businesses where id=$1',[r.data.business_id])).rows[0];user=(await query('select * from app_users where business_id=$1',[business.id])).rows[0];
  assert.deepEqual((( {balance,welcome_granted,purchased,used})=>({balance,welcome_granted,purchased,used}))(await balances()),{balance:5,welcome_granted:5,purchased:0,used:0});
  assert.equal((await api('/api/pense-en-ti/balances')).data.balances.tickets,0);
  const plans=(await api('/api/public/subscription-plans')).data.free_plans;assert.equal(plans.length,4);assert.equal(plans.find(p=>p.code==='UN_REGALO_PERSONAL').features.gift_cards,true);
  const again=await api('/api/pense-en-ti/signup',{...signup,email:uuid()+'@example.test'},'POST',null);assert.equal(again.status,400);assert.equal((await balances()).balance,5);
 });
 await t.test('gift context and branches work; paid modules and other free programs remain denied',async()=>{
  for(const path of ['/api/business/reward-passes','/api/business/reward-passes/context','/api/business/branches','/api/pense-en-ti/giftcards/packages','/api/payments/qr-credits/offers'])assert.equal((await api(path)).status,200,path);
  for(const path of ['/api/business/contacts/feed','/api/business/stamp-cards/context','/api/business/interactive-activations','/api/business/customer/courtesies'])assert.equal((await api(path)).status,403,path);
  const context=(await api('/api/business/reward-passes/context')).data.context;assert.equal(context.giftcard_balance,5);assert.equal(context.reward_pass_ticket_cost,0);
 });
 await t.test('five concurrent emissions consume five credits, duplicate retries consume nothing, sixth is blocked',async()=>{
  const payloads=Array.from({length:5},pass),rs=await Promise.all(payloads.map(p=>api('/api/business/reward-passes',p)));
  assert.ok(rs.every(r=>r.status===201),JSON.stringify(rs));firstPass=rs[0].data.reward_pass;
  assert.equal((await balances()).balance,0);assert.equal((await balances()).used,5);
  const retry=await api('/api/business/reward-passes',payloads[0]);assert.equal(retry.status,201,JSON.stringify(retry));assert.equal(retry.data.reward_pass.id,firstPass.id);assert.equal((await balances()).used,5);
  const sixth=await api('/api/business/reward-passes',pass());assert.equal(sixth.status,400,JSON.stringify(sixth));assert.equal((await api('/api/pense-en-ti/balances')).data.balances.tickets,0);
  assert.equal((await query('select count(*)::int n from reward_passes where company_id=$1 and giftcard_credit_used',[business.id])).rows[0].n,5);
 });
 await t.test('four exact packages; duplicate checkout and callbacks; currency/amount checks; no ticket or commission credit',async()=>{
  assert.deepEqual(catalog.GIFTCARD_PACKAGE_OFFERS.map(p=>[p.package_size,p.price_cop]),[[10,25000],[25,62500],[50,125000],[100,250000]]);
  let total=0;
  for(const p of catalog.GIFTCARD_PACKAGE_OFFERS){
   const request={package_code:p.code,idempotency_key:uuid()},before=mpCalls;
   const r=await api('/api/pense-en-ti/giftcards/checkout',request);assert.equal(r.status,200,JSON.stringify(r));const o=r.data;
   const retry=await api('/api/pense-en-ti/giftcards/checkout',request);assert.equal(retry.data.id,o.id);assert.equal(mpCalls,before+1);assert.equal(o.price_cop,p.price_cop);assert.equal((await balances()).balance,total);
   const swapped=await api('/api/pense-en-ti/giftcards/checkout',{...request,package_code:p.code==='GF10'?'GF25':'GF10'});assert.equal(swapped.status,400);assert.equal(mpCalls,before+1);
   await assert.rejects(approve(o.id,{transaction_amount:1}),/valor de la orden/);await assert.rejects(approve(o.id,{currency_id:'USD'}),/moneda/);assert.equal((await balances()).balance,total);
   const rs=await Promise.all([approve(o.id),approve(o.id)]);assert.equal(rs.filter(r=>r.credited).length,1);total+=p.package_size;assert.equal((await balances()).balance,total);
   assert.equal((await query('select 1 from qori_seller_commissions where order_id=$1',[o.id])).rowCount,0);
  }
  assert.equal((await balances()).purchased,185);assert.equal((await balances()).welcome_granted,5);assert.equal((await api('/api/pense-en-ti/balances')).data.balances.tickets,0);
  assert.equal((await api('/api/pense-en-ti/giftcards/checkout',{package_code:'GF200',idempotency_key:uuid()})).status,400);
  assert.equal((await api('/api/payments/qr-credits/checkout',{package_code:'GF200',idempotency_key:uuid()})).status,400);
  const creditBefore=(await balances()).balance;const invalid=await api('/api/business/reward-passes',{...pass(),campaign_id:uuid()});assert.equal(invalid.status,400);assert.equal((await balances()).balance,creditBefore);
  assert.equal((await api('/api/business/reward-passes',pass())).status,201);assert.equal((await balances()).balance,184);
 });
 await t.test('ticket purchase stays independent and preserves the free program',async()=>{
  const r=await api('/api/payments/qr-credits/checkout',{package_code:'QR50',idempotency_key:uuid()});assert.equal(r.status,201,JSON.stringify(r));await approve(r.data.order.id);
  assert.equal((await api('/api/pense-en-ti/balances')).data.balances.tickets,50);assert.equal((await balances()).balance,184);assert.equal((await query('select plan_code from businesses where id=$1',[business.id])).rows[0].plan_code,'UN_REGALO_PERSONAL');
 });
 await t.test('gift publication config and readiness use issuing balance rather than requiring tickets',async()=>{
  await query('update business_qr_credit_accounts set qr_balance=0 where business_id=$1',[business.id]);
  const settings={gift_enabled:true,gift_min:'10000',gift_max:'1000000',gift_terms:'Redimible en este negocio durante la vigencia publicada.',gift_payment_instructions:'Paga directamente en caja y espera la confirmación del negocio.'};
  const r=await api('/api/business/customer/gift-settings',settings,'PUT');assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.checks.find(c=>c.key==='capacity').ok,true);
  assert.equal((await api('/api/business/customer/directory',{published:true,category:'Regalos',city:'Bogotá',address:'Calle QA',description:'Regalos QA'},'PUT')).status,200);
  const published=await api('/api/business/customer/publications',{kind:'GIFT',title:'Un regalo personal de QA',status:'PUBLISHED'});assert.equal(published.status,200,JSON.stringify(published));
  assert.equal((await api('/api/business/customer/publications',{kind:'AFFILIATION',title:'No autorizado',status:'DRAFT'})).status,403);
  const buyer=(await query("insert into customer_accounts(email,full_name) values($1,'Comprador QA') returning *",[uuid()+'@example.test'])).rows[0];
  const wallet=require('../backend/src/services/customerWalletService'),before=(await balances()).balance;
  const order=await wallet.createGiftOrder(buyer,{request_id:uuid(),business_id:business.id,buyer_name:'Comprador QA',recipient_name:'Destinataria QA',recipient_email:uuid()+'@example.test',amount:'50000',message:'Un regalo personal',terms_accepted:true},{publishedOffer:true});
  assert.equal(order.order.state,'PENDING_PAYMENT');assert.equal((await balances()).balance,before);
  const confirmation={amount:'50000',payment_reference:'QA-confirmado',payment_method:'CASH',payment_received:true};
  const rs=await Promise.all([api('/api/business/customer/gift-orders/'+order.order.id+'/confirm-payment',confirmation),api('/api/business/customer/gift-orders/'+order.order.id+'/confirm-payment',confirmation)]);
  assert.ok(rs.every(r=>r.status===200),JSON.stringify(rs));assert.equal(rs[0].data.reward_pass_id,rs[1].data.reward_pass_id);assert.equal((await balances()).balance,before-1);
 });
 await t.test('another tenant cannot read Gift Cards or enable purchases outside its program',async()=>{
  const b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Otro QA',$1,'PENSE_EN_TI','ACTIVE') returning *",[uuid()])).rows[0];
  const other=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Otra persona','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.test'])).rows[0];
  assert.equal((await api('/api/business/reward-passes/'+firstPass.id,null,'GET',other)).status,403);
  assert.equal((await api('/api/payments/qr-credits/checkout',{package_code:'GF10',idempotency_key:uuid()},'POST',other)).status,403);
  const orders=await api('/api/payments/qr-credits/orders',null,'GET',other);assert.equal(orders.data.orders.length,0);
 });
 await t.test('paid plan can use bought emissions without consuming its monthly allocation or QR tickets',async()=>{
  const b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Pago QA',$1,'STARTER','ACTIVE') returning *",[uuid()])).rows[0];
  const other=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Otra persona','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.test'])).rows[0];
  await withTransaction(db=>require('../backend/src/services/adminProvisioningService').ensureBaseBusinessRecords(db,b.id,b.name));
  const r=await api('/api/pense-en-ti/giftcards/checkout',{package_code:'GF10',idempotency_key:uuid()},'POST',other);assert.equal(r.status,200,JSON.stringify(r));await approve(r.data.id);
  const issued=await api('/api/business/reward-passes',pass(),'POST',other);assert.equal(issued.status,201,JSON.stringify(issued));
  const summary=(await require('../backend/src/services/adminBusinessBalances').businessBalances([b.id])).get(b.id);assert.equal(summary.giftcards.monthly_remaining,10);assert.equal(summary.giftcards.credit_balance,9);
 });
 await t.test('signed provider webhook leaves pending/rejected payments uncredited and credits approved payment once',async()=>{
  const r=await api('/api/pense-en-ti/giftcards/checkout',{package_code:'GF10',idempotency_key:uuid()});assert.equal(r.status,200);
  const o=(await query('select * from qr_credit_purchase_orders where id=$1',[r.data.id])).rows[0],id='qa-'+uuid(),before=(await balances()).balance;
  const payment={id,status:'pending',currency_id:'COP',transaction_amount:25000,external_reference:o.external_reference};providerPayments.set(id,payment);
  const reqId=uuid(),ts=String(Date.now()),hash=require('node:crypto').createHmac('sha256',env.mercadoPagoWebhookSecret).update(`id:${id};request-id:${reqId};ts:${ts};`).digest('hex');
  const webhook=()=>actualFetch(base+'/api/payments/mercadopago/webhook?type=payment&data.id='+id,{method:'POST',headers:{'Content-Type':'application/json','X-Request-Id':reqId,'X-Signature':`ts=${ts},v1=${hash}`},body:'{}'});
  assert.equal((await webhook()).status,200);assert.equal((await balances()).balance,before);
  payment.status='rejected';assert.equal((await webhook()).status,200);assert.equal((await balances()).balance,before);
  payment.status='approved';const replies=await Promise.all([webhook(),webhook()]);assert.ok(replies.every(r=>r.status===200));assert.equal((await balances()).balance,before+10);
  const unsigned=await api('/api/payments/mercadopago/webhook',{type:'payment',data:{id}},'POST',null);assert.equal(unsigned.status,403);assert.equal((await balances()).balance,before+10);
 });
 await t.test('existing legacy Gift Card orders still settle without returning to the sales catalog',async()=>{
  const before=(await balances()).balance,o=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference) values($1,'GF200',200,'Paquete anterior',500000,$2) returning *",[business.id,uuid()])).rows[0];
  assert.equal(catalog.findPackageOffer('GF200'),undefined);await approve(o.id);assert.equal((await balances()).balance,before+200);
 });
});

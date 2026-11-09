const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-launch-test-secret-32chars';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken');
const sellers=require('../backend/src/services/qoriSellerService'),credits=require('../backend/src/services/qrCreditService'),payments=require('../backend/src/services/mercadoPagoService'),{env}=require('../backend/src/config/env');
let server,base,seller,admin,merchant,product,gift,createdGift;
const unique=()=>crypto.randomUUID(),sign=u=>jwt.sign({sub:u.id,password_version:0},env.jwtSecret);
async function api(path,token,body,method=body?'POST':'GET'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
const registerData=()=>({full_name:'Embajador Prueba Segura',email:unique()+'@example.test',password:'LocalSoloPruebas!2026',password_confirm:'LocalSoloPruebas!2026',document_key:String(Date.now()).slice(-13),phone:'3105550000',city:'Bogotá',terms_accepted:true,privacy_accepted:true,adult_confirmed:true});
const signupData=()=>({company_name:'Café Pensé en Ti QA',contact_name:'Propietario Prueba',nit:unique().replaceAll('-','').slice(0,15),email:unique()+'@example.test',phone:'3105550000',city:'Bogotá',address:'Sede local QA',password:'SoloPruebas!2026',password_confirm:'SoloPruebas!2026',terms_accepted:true,privacy_accepted:true,commercial_advisor_id:seller.id});
async function customer(email){const a=(await query('insert into customer_accounts(email,full_name,declared_document_key,document_locked_at) values($1,$2,$3,now()) returning *',[email||unique()+'@example.test','Destinataria Prueba',String(Date.now())+Math.floor(Math.random()*1000)])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);await query("update customer_accounts set finance_setup_state='LEGACY' where id=$1",[a.id]);return {...a,token};}
async function purchase(code='QR50',amount=75000,metadata={}){return (await query('insert into qr_credit_purchase_orders(business_id,created_by_user_id,package_code,package_size,package_title,price_cop,external_reference,metadata) values($1,$2,$3,$4,$3,$5,$6,$7::jsonb) returning *',[merchant.business_id,merchant.id,code,code==='QR50'?50:code==='GF5'?5:0,amount,unique(),JSON.stringify(metadata)])).rows[0];}
async function approve(o){return withTransaction(async db=>{const order=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[o.id])).rows[0];return payments.__testing.finalizeApprovedCreditPurchase(db,order,{id:unique(),status:'approved',transaction_amount:Number(o.price_cop),currency_id:'COP'});});}
test('Seller launch: approval, privacy, free balances, payments, receipts and commissions',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 admin=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Superadmin QA','QORI_SUPERADMIN') returning *",[unique()+'@example.test'])).rows[0];admin.token=sign(admin);
 await t.test('pending applicants cannot enter CRM, create referrals or self-approve',async()=>{
  const terms=await api('/api/seller/terms');assert.equal(terms.ciiu_requirement.code,'4610');assert.equal(terms.ciiu_requirement.status,'DEFINED_BY_QORI');assert.equal(terms.enrollment_enabled,true);assert.equal(terms.contract_ready,true);
  assert.equal((await api('/api/seller/register',null,{...registerData(),ciiu:'7310'})).status,400);
  const d=registerData(),r=await api('/api/seller/register',null,d);assert.equal(r.status,200,JSON.stringify(r));seller=(await query('select * from app_users where email=$1',[d.email])).rows[0];seller.token=sign(seller);
  const login=await api('/api/auth/login',null,{email:d.email,password:d.password});assert.equal(login.status,200);assert.ok(login.token);
  for(const status of ['DRAFT','SUBMITTED','CHANGES_REQUESTED','REJECTED','SUSPENDED']){
   await query('update qori_seller_applications set status=$2 where user_id=$1',[seller.id,status]);
   assert.equal((await api('/api/seller/application',login.token)).access.approved,false);
   for(const path of ['/api/seller/dashboard','/api/seller/accounts','/api/admin/commercial/bootstrap','/api/admin/commercial/customers','/api/admin/commercial/prospects','/api/pense-en-ti/advisor/'+seller.id])assert.equal((await api(path,login.token)).status,403,path+' '+status);
   assert.equal((await api('/api/admin/commercial/prospects',login.token,{business_name:'No autorizado'})).status,403);
  }
  await query("update qori_seller_applications set status='DRAFT' where user_id=$1",[seller.id]);
  assert.equal((await api('/api/seller/application',seller.token)).application.ciiu,'4610');
  const contract=await fetch(base+'/api/seller/contract',{headers:{Authorization:'Bearer '+seller.token}});assert.equal(contract.status,200);assert.match(await contract.text(),/4610 — Comercio al por mayor a cambio de una retribución o por contrata/);
  assert.equal((await api('/api/seller/application',seller.token)).application.status,'DRAFT');
  assert.equal((await api('/api/admin/commercial/bootstrap',seller.token)).status,403);
  assert.equal((await api('/api/seller/dashboard',seller.token)).status,403);
  assert.equal((await api('/api/pense-en-ti/advisor/'+seller.id)).status,403);
  assert.equal((await api('/api/seller/admin/queue',seller.token)).status,403);
  assert.equal((await api('/api/seller/application/submit',seller.token,{signed_and_notarized:true,documents_truthful:true,ciiu_terms_accepted:true})).status,400);
 });
 await t.test('existing Seller opens an application with server-defined 4610',async()=>{
  const d=registerData(),u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa',$2,'QORI_SELLER') returning *",[d.email,d.full_name])).rows[0],token=sign(u);
  assert.equal((await api('/api/seller/application',token)).legacy,true);
  assert.equal((await api('/api/seller/application',token)).access.approved,false);
  for(const path of ['/api/seller/dashboard','/api/seller/accounts','/api/admin/commercial/bootstrap','/api/pense-en-ti/advisor/'+u.id])assert.equal((await api(path,token)).status,403,path);
  assert.equal((await api('/api/seller/admin/queue',admin.token)).status,200,'superadmin review remains available');
  const body={document_key:d.document_key,phone:d.phone,city:d.city,terms_accepted:true,privacy_accepted:true,adult_confirmed:true};
  assert.equal((await api('/api/seller/application',token,{...body,ciiu:'7310'})).status,400);
  assert.equal((await api('/api/seller/application',token,body)).status,200);
  const a=(await api('/api/seller/application',token)).application;assert.equal(a.ciiu,'4610');assert.equal(a.status,'DRAFT');assert.equal(a.terms_version,'2026-11-07-ciiu4610');
 });
 await t.test('four encrypted documents, private downloads, explicit review, read audits',async()=>{
  const {PDFDocument}=require('pdf-lib'),pdf=await PDFDocument.create();pdf.addPage().drawText('LOCAL QA DOCUMENT');const bytes=Buffer.from(await pdf.save());
  for(const k of ['IDENTITY','RUT','BANK','CONTRACT'])assert.equal((await api('/api/seller/documents/'+k,seller.token,{filename:k+'.pdf',content_base64:bytes.toString('base64')},'PUT')).status,200);
  const doc=(await query('select * from qori_seller_documents where user_id=$1 limit 1',[seller.id])).rows[0];assert.notEqual(doc.encrypted_content.subarray(0,5).toString(),'%PDF-');
  const outsider=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Otro vendedor','QORI_SELLER') returning *",[unique()+'@example.test'])).rows[0];
  assert.equal((await api('/api/seller/documents/'+doc.id,sign(outsider))).status,403);assert.equal((await api('/api/seller/documents/'+doc.id)).status,401);
  const downloaded=await fetch(base+'/api/seller/documents/'+doc.id,{headers:{Authorization:'Bearer '+admin.token}});assert.equal(downloaded.status,200);assert.ok(Buffer.from(await downloaded.arrayBuffer()).equals(bytes));assert.match(downloaded.headers.get('content-disposition'),/attachment/);
  assert.equal((await api('/api/seller/application/submit',seller.token,{signed_and_notarized:true,documents_truthful:true})).status,400);
  await query("update qori_seller_applications set ciiu='7310',terms_version='2026-11-07',status='SUBMITTED' where user_id=$1",[seller.id]);
  const oldApproval={status:'APPROVED',note:'Revisión de expediente anterior para prueba.',identity_checked:true,ciiu_checked:true,bank_ownership_checked:true,notarized_contract_checked:true,legal_terms_checked:true};
  assert.equal((await api('/api/seller/admin/applications/'+seller.id+'/review',admin.token,oldApproval)).status,400);
  assert.equal((await api('/api/seller/application',seller.token)).application.ciiu,'7310','Reading must preserve historical declarations');
  assert.equal((await api('/api/seller/admin/applications/'+seller.id+'/review',admin.token,{status:'CHANGES_REQUESTED',note:'Adjunta RUT con 4610 y contrato actualizado.'})).status,200);
  assert.equal((await api('/api/seller/application/submit',seller.token,{signed_and_notarized:true,documents_truthful:true,ciiu_terms_accepted:true})).status,200);
  const accepted=(await api('/api/seller/application',seller.token)).application;assert.equal(accepted.ciiu,'4610');assert.equal(accepted.terms_version,'2026-11-07-ciiu4610');
  const audit=(await query("select detail from qori_commercial_audit where entity_id=$1 and action='SELLER_APPLICATION_SUBMITTED' order by created_at desc limit 1",[seller.id])).rows[0];assert.equal(audit.detail.previous_ciiu,'7310');
  assert.equal((await api('/api/seller/documents/CONTRACT',seller.token,{filename:'x.pdf',content_base64:bytes.toString('base64')},'PUT')).status,403);
  const review={status:'APPROVED',note:'Documentos y condiciones revisados en QA.'};assert.equal((await api('/api/seller/admin/applications/'+seller.id+'/review',admin.token,review)).status,400);
  assert.equal((await api('/api/seller/admin/applications/'+seller.id+'/review',admin.token,{...review,identity_checked:true,ciiu_checked:true,bank_ownership_checked:true,notarized_contract_checked:true,legal_terms_checked:true})).status,200);
  assert.equal((await api('/api/admin/commercial/bootstrap',seller.token)).status,200);
  assert.ok((await query("select 1 from qori_commercial_audit where entity_id=$1 and action='SELLER_DOCUMENT_DOWNLOADED'",[seller.id])).rowCount);
 });
 await t.test('free signup grants once, attributes seller and locks five-product capacity concurrently',async()=>{
  const d=signupData(),r=await api('/api/pense-en-ti/signup',null,d);assert.equal(r.status,200,JSON.stringify(r));merchant=(await query('select * from app_users where business_id=$1',[r.business_id])).rows[0];merchant.token=sign(merchant);
  const balance=(await api('/api/pense-en-ti/balances',merchant.token)).balances;assert.equal(balance.tickets,20);assert.equal(balance.giftcards,20);assert.equal(balance.plan_code,'PENSE_EN_TI');
  assert.equal((await api('/api/pense-en-ti/signup',null,{...d,email:unique()+'@example.test'})).status,400);
  assert.equal((await query('select seller_id from qori_sales_accounts where business_id=$1',[r.business_id])).rows[0].seller_id,seller.id);
  const results=await Promise.allSettled(Array.from({length:6},(_,i)=>query("insert into business_inventory_products(business_id,internal_id,name,status,stock_quantity,unit_price,currency) values($1,$2,'Café','ACTIVE',20,8000,'COP') returning *",[r.business_id,'QA-'+i])));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,5);product=results.find(r=>r.status==='fulfilled').value.rows[0];
  const plan=require('../backend/src/services/subscriptionService').planFromBusiness((await query('select * from businesses where id=$1',[r.business_id])).rows[0]);assert.equal(plan.features.product_gifts,true);assert.equal(plan.features.qr_batch_generator,false);assert.equal(plan.portal_access_allowed,true);assert.equal(plan.limits.stamp_programs,1);
 });
 await t.test('twenty Gift Cards use a separate finite allowance, twenty-first fails, ticket balance is untouched',async()=>{
  const svc=require('../backend/src/services/rewardPassService');for(let i=0;i<20;i++)await svc.createRewardPass(merchant,{buyer_name:'Cliente QA',beneficiary_email:'recipient@example.test',initial_value_cop:10000,branch_authorization_scope:'ALL_BRANCHES',terms:'Canjeable en el local de pruebas.',idempotency_key:unique()});
  await assert.rejects(svc.createRewardPass(merchant,{buyer_name:'Cliente QA',initial_value_cop:10000,branch_authorization_scope:'ALL_BRANCHES'}),/Agotaste/);
  const b=(await api('/api/pense-en-ti/balances',merchant.token)).balances;assert.equal(b.giftcards,0);assert.equal(b.tickets,20);
 });
 await t.test('guest recipient registers later; paid gift is idempotent, reserved, privately receipted and account-bound',async()=>{
  const email=unique()+'@example.test',data={request_id:unique(),product_id:product.id,recipient_email:email,recipient_name:'Invitada nueva',buyer_name:'Comprador en caja',buyer_email:'buyer@example.test',amount:'8000',valid_days:30,terms:'Un café de regalo, sin compra adicional.',message:'Pensé en ti'};
  const r=await api('/api/business/customer/product-gifts',merchant.token,data);assert.equal(r.status,200,JSON.stringify(r));gift=r.order;
  assert.equal((await api('/api/pense-en-ti/receipts/'+gift.receipt_url.split('#')[1])).status,404);
  const p={amount:'8000',payment_reference:'PAGO-QA-CAFE',payment_method:'CASH',payment_received:true},paid=await Promise.all([api('/api/business/customer/product-gifts/'+gift.id+'/confirm-payment',merchant.token,p),api('/api/business/customer/product-gifts/'+gift.id+'/confirm-payment',merchant.token,p)]);for(const x of paid)assert.equal(x.status,200,JSON.stringify(x));assert.equal(paid[0].sale_id,paid[1].sale_id);
  assert.ok(paid[0].receipt_url);assert.equal((await query('select count(*)::int n from qori_gift_mail_outbox where order_id=$1',[gift.id])).rows[0].n,2);
  createdGift=(await query('select * from customer_product_gift_orders where id=$1',[gift.id])).rows[0];assert.equal(createdGift.recipient_id,null);assert.equal(createdGift.invitation_id,null);
  const outsider=await customer();assert.equal((await api('/api/customer/product-gifts/'+gift.id,outsider.token)).status,404);
  const recipient=await customer(email),inbox=await api('/api/customer/invitations',recipient.token);assert.equal(inbox.status,200,JSON.stringify(inbox));
  createdGift=(await query('select * from customer_product_gift_orders where id=$1',[gift.id])).rows[0];assert.equal(createdGift.recipient_id,recipient.id);assert.ok(createdGift.invitation_id);
  const ticket=(await query('select token from qr_codes where id=$1',[createdGift.qr_code_id])).rows[0];const qr=require('../backend/src/services/qrService');
  await assert.rejects(qr.redeemQr(ticket.token,merchant,{mode:'STANDALONE',idempotency_key:unique(),beneficiary:{name:recipient.full_name,email:recipient.email,data_use_confirmed:true}}));
  assert.equal((await api('/api/customer/invitations/'+createdGift.invitation_id+'/decision',recipient.token,{action:'ACCEPT',terms_accepted:true})).status,200);
  assert.equal((await api('/api/customer/wallet/tickets/'+createdGift.qr_code_id,recipient.token)).status,200);
  const receipt=await api('/api/pense-en-ti/receipts/'+createdGift.receipt_token);assert.equal(receipt.status,200);assert.equal(receipt.receipt.amount,'8000.00');assert.ok(!receipt.receipt.qr_code_id);
  assert.equal((await api('/api/public/claim/'+ticket.token)).status,401);assert.equal((await api('/api/public/claim/'+ticket.token,outsider.token)).status,403);
  assert.equal((await api('/api/customer/product-gifts/'+gift.id,recipient.token)).order.receipt_url,undefined);
  let sent=[];for(let n=0;n<25&&!sent.some(x=>x.order_id===gift.id);n++)await require('../backend/src/services/giftDeliveryService').processBatch(async job=>{sent.push(job);});assert.ok(sent.some(x=>x.order_id===gift.id&&x.body.includes('gratis')));
 });
 await t.test('public benefit pages require complete Customer, cookie writes resist CSRF and activations retain ownership',async()=>{
  const account=await customer(),other=await customer(),slug=unique();
  const a=(await query("insert into interactive_activations(company_id,user_id,title,category,activation_type,status,public_slug,terms,capture_config,reward_config) values($1,$2,'Actividad Customer QA','survey','FLEX_SURVEY','active',$3,'Condiciones de prueba.',$4::jsonb,$5::jsonb) returning *",[merchant.business_id,merchant.id,slug,JSON.stringify({collect_participant_data:true}),JSON.stringify({mode:'fixed',reward_type:'FREE_GIFT',reward_value:{label:'Café QA'},reward_label:'Café QA',expiration_days:30})])).rows[0];
  const url='/api/public/activations/'+slug;
  const page=await fetch(base+'/activacion/'+slug,{redirect:'manual'});assert.equal(page.status,303);assert.match(page.headers.get('location'),/customer\/\?continue=/);
  for(const path of ['/api/public/reward-passes/unknown','/api/public/stamp-cards/programs/'+unique(),url])assert.equal((await api(path)).status,401);
  const headers={'Content-Type':'application/json',Cookie:'qori_customer_session='+account.token,Origin:base};
  assert.equal((await fetch(base+url+'/participants',{method:'POST',headers,body:'{}'})).status,403);
  require('../backend/src/config/env').env.corsOrigins.push(base);
  await query("update businesses set plan_code='PRO' where id=$1",[merchant.business_id]);
  try{
   const start=await api(url+'/participants',account.token,{name:'Falsa identidad',email:other.email,document:other.declared_document_key,phone:'3105550000'});assert.equal(start.status,201,JSON.stringify(start));assert.equal(start.participant.email,account.email);assert.equal(start.participant.document,account.declared_document_key);
   assert.equal((await api(url+'/complete',other.token,{participant_id:start.participant.id})).status,403);
   const done=await api(url+'/complete',account.token,{participant_id:start.participant.id,game_session_token:start.game_session_token});assert.equal(done.status,201,JSON.stringify(done));assert.equal(done.credit_account,undefined);
   assert.equal((await query('select count(*)::int n from customer_activation_participations where activation_id=$1',[a.id])).rows[0].n,1);
   const again=await api(url+'/participants',account.token,{});assert.equal(again.participant.id,start.participant.id);
  }finally{await query("update businesses set plan_code='PENSE_EN_TI' where id=$1",[merchant.business_id]);}
 });
 await t.test('verified ticket purchase accrues exactly 10%, immutable seller, duplicate/refund safe; gift packs are separate',async()=>{
  const o=await purchase();await Promise.all([approve(o),approve(o)]);let c=(await query('select * from qori_seller_commissions where order_id=$1',[o.id])).rows;assert.equal(c.length,1);assert.equal(c[0].amount_cop,'7500.00');
  await assert.rejects(query('update qr_credit_purchase_orders set commission_seller_id=$2 where id=$1',[o.id,admin.id]));
  assert.equal((await query('select plan_code from businesses where id=$1',[merchant.business_id])).rows[0].plan_code,'PENSE_EN_TI');
  await query("update qr_credit_purchase_orders set status='CANCELLED' where id=$1",[o.id]);assert.equal((await query('select status from qori_seller_commissions where order_id=$1',[o.id])).rows[0].status,'VOID');
  const gf=await purchase('GF5',7500);await approve(gf);assert.equal((await api('/api/pense-en-ti/balances',merchant.token)).balances.giftcards,5);assert.equal((await query('select 1 from qori_seller_commissions where order_id=$1',[gf.id])).rowCount,0);
 });
 await t.test('free accounts buy canonical ticket and Gift Card packs without crediting unpaid checkouts',async()=>{
  const original=global.fetch,access=env.mercadoPagoAccessToken,secret=env.mercadoPagoWebhookSecret,requests=[];
  env.mercadoPagoAccessToken='QA-NO-REAL-PROVIDER';env.mercadoPagoWebhookSecret='qa-secret';
  global.fetch=async(url,opts)=>{assert.match(url,/^https:\/\/api.mercadopago.com\/checkout\/preferences$/);requests.push(JSON.parse(opts.body));return {ok:true,json:async()=>({id:unique(),init_point:'https://www.mercadopago.com.co/checkout/qa'})};};
  try{
   const before=(await require('../backend/src/services/penseEnTiService').balances(merchant)).balances;
   for(const code of ['QR50','GF50']){const key=unique(),o=await payments.createCreditCheckout(merchant,{package_code:code,idempotency_key:key});assert.equal(o.status,'PENDING');assert.equal(o.credited_at,null);assert.equal((await payments.createCreditCheckout(merchant,{package_code:code,idempotency_key:key})).id,o.id);assert.equal((await query('select 1 from qori_seller_commissions where order_id=$1',[o.id])).rowCount,0);}
   assert.equal(requests.length,2);assert.equal(requests[1].items[0].unit_price,125000);assert.equal(requests[1].items[0].title,'50 emisiones de Gift Card');
   assert.deepEqual((await require('../backend/src/services/penseEnTiService').balances(merchant)).balances,before);
  }finally{global.fetch=original;env.mercadoPagoAccessToken=access;env.mercadoPagoWebhookSecret=secret;}
 });
 await t.test('paid-period ticket replacement preserves purchased credits, recurring plans accrue 10%',async()=>{
  const before=(await query('select * from business_qr_credit_accounts where business_id=$1',[merchant.business_id])).rows[0],purchased=before.qr_balance-before.included_balance;
  const meta={signup:{type:'portal_monthly_subscription',plan_code:'DESPEGA',billing_cycle:'monthly'}},o=await purchase('DESPEGA',75000,meta);await approve(o);
  let c=(await query('select * from business_qr_credit_accounts where business_id=$1',[merchant.business_id])).rows[0];assert.equal(c.qr_balance,purchased+25);assert.equal(c.included_balance,25);
  await withTransaction(db=>credits.consumeQrCredits(db,merchant.business_id,3));const second=await purchase('DESPEGA',75000,meta);await approve(second);c=(await query('select * from business_qr_credit_accounts where business_id=$1',[merchant.business_id])).rows[0];assert.equal(c.qr_balance,purchased+25);assert.equal(c.included_balance,25);
  assert.equal((await query("select count(*)::int n from qori_seller_commissions where business_id=$1 and kind='SUBSCRIPTION'",[merchant.business_id])).rows[0].n,2);
 });
 await t.test('Thursday payout is explicit, scoped, idempotent and reversed with an adjustment after refund',async()=>{
  const latest=(await query("select * from qori_seller_commissions where seller_id=$1 and status='PENDING' order by created_at desc limit 1",[seller.id])).rows[0],day=new Date();while(day.getUTCDay()!==4)day.setUTCDate(day.getUTCDate()-1);const thursday=day.toISOString().slice(0,10);
  await query("update qori_seller_commissions set due_on=$2 where seller_id=$1 and status='PENDING'",[seller.id,thursday]);const amount=(await sellers.dashboard(seller)).totals.pending_cop;
  const body={seller_id:seller.id,request_id:unique(),transfer_reference:'LOCAL-QA-'+unique(),paid_on:thursday,expected_gross_cop:Number(amount),withholding_cop:0,transfer_verified:true,bank_ownership_checked:true};
  assert.equal((await api('/api/seller/admin/payouts',seller.token,body)).status,403);
  const r=await api('/api/seller/admin/payouts',admin.token,body);assert.equal(r.status,200,JSON.stringify(r));assert.equal((await api('/api/seller/admin/payouts',admin.token,body)).payout.id,r.payout.id);
  await query("update qr_credit_purchase_orders set status='CANCELLED' where id=$1",[latest.order_id]);const rows=(await query('select * from qori_seller_commissions where order_id=$1 order by created_at',[latest.order_id])).rows;assert.equal(rows.length,2);assert.equal(rows[0].status,'PAID');assert.equal(rows[1].kind,'REVERSAL');assert.equal(Number(rows[1].amount_cop),-Number(rows[0].amount_cop));
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

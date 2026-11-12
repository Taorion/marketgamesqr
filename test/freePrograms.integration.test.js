const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID:uuid}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='free-program-local-qa-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
const jwt=require('jsonwebtoken'),{env}=require('../backend/src/config/env');
const {programs}=require('../backend/src/services/freeProgramPolicy'),{planFromBusiness}=require('../backend/src/services/subscriptionService');
const stamps=require('../backend/src/services/stampCardService'),activations=require('../backend/src/services/interactiveActivationService');
let server,base,n=0;const accounts={};
async function api(path,user,body,method=body?'POST':'GET'){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.'+(++n),...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:0},env.jwtSecret)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};
}
const rules={name:'Visitas QA',stamps_required:2,benefit_type:'FREE_GIFT',benefit_value:{label:'Café de cortesía'},minimum_purchase:0,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:0,ticket_cost:1,terms:'QA',status:'ACTIVE'};
const activationBody=(status='active')=>({activation_type:'SEALED_LETTER',title:'Detalle QA '+uuid(),status,reward_mode:'fixed',reward_ticket_cost:1,reward_config:{reward_type:'FREE_GIFT',reward_label:'Café de cortesía'},capture_config:{collect_participant_data:false},game_config:{},interaction_config:{},visual_config:{}});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Free programs: actual registration, API isolation, concurrent quotas and purchased rewards',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 await t.test('three independent registrations have exact entitlements and initial balances',async()=>{
  for(const p of Object.values(programs)){
   const payload={free_program:p.code,company_name:'Programa QA '+uuid(),contact_name:'QA Responsable',email:uuid()+'@example.test',nit:uuid(),phone:'3100000000',city:'Bogotá',address:'Calle QA',password:'PruebaLocal!2026',password_confirm:'PruebaLocal!2026',terms_accepted:true,privacy_accepted:true};
   const r=await api('/api/pense-en-ti/signup',null,payload);assert.equal(r.status,200,JSON.stringify(r));
   const b=(await query('select * from businesses where id=$1',[r.data.business_id])).rows[0],u=(await query('select * from app_users where business_id=$1',[b.id])).rows[0];accounts[p.code]={b,u,payload};
   const plan=planFromBusiness(b);assert.equal(plan.code,p.code);assert.equal(plan.free_program,true);assert.equal(plan.portal_access_allowed,true);assert.equal(plan.features.stamp_cards,p.code==='SELLOS_GRATIS');assert.equal(plan.features.interactive_activations,p.code==='ACTIVACIONES_GRATIS');assert.equal(plan.features.product_gifts,p.code==='PENSE_EN_TI');assert.equal(plan.features.gift_cards,false);assert.equal(plan.limits.gift_inventory_products,5);
   assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,p.tickets);assert.equal((await query('select * from qori_giftcard_credit_accounts where business_id=$1',[b.id])).rowCount,0);
   assert.equal(r.data.portal_url,'/empresa/?view='+p.view);
  }
 });
 await t.test('document cannot claim another free program or refill allowance',async()=>{
  const a=accounts.PENSE_EN_TI;const r=await api('/api/pense-en-ti/signup',null,{...a.payload,email:uuid()+'@example.test',free_program:'SELLOS_GRATIS'});assert.equal(r.status,400,JSON.stringify(r));
  assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[a.b.id])).rows[0].qr_balance,20);
 });
 await t.test('portal essential endpoints work; all other modules and settings escalation are denied',async()=>{
  for(const {u,b} of Object.values(accounts)){
   for(const path of ['/api/auth/me','/api/business/access','/api/business/profile','/api/qr/credits/me','/api/payments/qr-credits/offers','/api/business/inventory/products']){
    const r=await api(path,u);assert.equal(r.status,200,path+JSON.stringify(r));if(path.endsWith('/offers'))assert.ok(r.data.packages.every(p=>p.kind!=='GIFTCARDS'));
   }
   for(const path of ['/api/business/sales','/api/business/contacts/feed','/api/business/customer/relationships','/api/business/qr/batches','/api/business/reward-passes','/api/business/quotes','/api/business/rms-machine'])assert.equal((await api(path,u)).status,403,path);
   for(const [code,path] of [['SELLOS_GRATIS','/api/business/stamp-cards/context'],['ACTIVACIONES_GRATIS','/api/business/interactive-activations'],['PENSE_EN_TI','/api/business/customer/courtesies']])assert.equal((await api(path,u)).status,code===b.plan_code?200:403,path+' '+b.plan_code);
   assert.equal((await api('/api/qr/generate',u,{})).status,403);
   assert.equal((await api('/api/business/customer/publications',u,{kind:'AFFILIATION'})).status,403);
   await api('/api/business/profile',u,{settings:{subscription:{lifetime_access:true},commercial_entitlements:{features:{rms_core:true}}},plan_code:'PRO'},'PATCH');
   const fresh=(await query('select * from businesses where id=$1',[b.id])).rows[0];assert.equal(fresh.plan_code,b.plan_code);assert.equal(planFromBusiness(fresh).features.rms_core,false);
  }
 });
 await t.test('database inventory cap holds under concurrent inserts and an atomic bulk import',async()=>{
  for(const {b} of Object.values(accounts)){
   const inserts=await Promise.allSettled(Array.from({length:7},()=>query("insert into business_inventory_products(business_id,name,internal_id,status,stock_quantity) values($1,$2,$2,'ACTIVE',10) returning id",[b.id,'Producto '+uuid()])));
   assert.equal(inserts.filter(r=>r.status==='fulfilled').length,5);assert.ok(inserts.filter(r=>r.status==='rejected').every(r=>r.reason.code==='P0001'));
   const id=inserts.find(r=>r.status==='fulfilled').value.rows[0].id;await query("update business_inventory_products set status='ARCHIVED' where id=$1",[id]);
   await assert.rejects(()=>query("insert into business_inventory_products(business_id,name,internal_id) values($1,'Extra','extra')",[b.id]),/máximo 5/);
   await query('delete from business_inventory_products where id=$1',[id]);
   await assert.rejects(()=>withTransaction(db=>db.query("insert into business_inventory_products(business_id,name,internal_id) values($1,'Importado A','a'),($1,'Importado B','b')",[b.id])),/máximo 5/);
   assert.equal((await query('select count(*)::int n from business_inventory_products where business_id=$1',[b.id])).rows[0].n,4);
  }
 });
 await t.test('one stamp program; rewards fail without tickets and debit purchased balance exactly once',async()=>{
  const {b,u}=accounts.SELLOS_GRATIS;const results=await Promise.allSettled([stamps.saveProgram(b.id,u.id,rules),stamps.saveProgram(b.id,u.id,rules)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const p=results.find(r=>r.status==='fulfilled').value;const {member}=await stamps.enroll(b.id,u.id,{program_id:p.id,name:'Cliente QA',document_id:uuid(),consent:true});
  await stamps.manualStamp(b.id,u.id,member.id,{reference:uuid(),note:'Visita verificada'});await stamps.manualStamp(b.id,u.id,member.id,{reference:uuid(),note:'Visita verificada'});
  const cycle=(await query('select * from stamp_cycles where member_id=$1',[member.id])).rows[0];await assert.rejects(()=>stamps.claim(member.public_token,cycle.id));
  await query('update business_qr_credit_accounts set qr_balance=2,qr_purchased_total=2 where business_id=$1',[b.id]);
  const claimed=await Promise.all([stamps.claim(member.public_token,cycle.id),stamps.claim(member.public_token,cycle.id)]);assert.equal(claimed[0].ticket_code,claimed[1].ticket_code);
  const balance=(await query('select * from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0];assert.equal(balance.qr_balance,1);assert.equal(balance.included_balance,0);
 });
 await t.test('two simultaneous active activations, drafts, pause and reactivation',async()=>{
  const {b,u}=accounts.ACTIVACIONES_GRATIS;
  const results=await Promise.all(Array.from({length:4},()=>api('/api/business/interactive-activations',u,activationBody())));
  assert.equal(results.filter(r=>r.status===201).length,2,JSON.stringify(results));assert.ok(results.filter(r=>r.status!==201).every(r=>r.status===403),JSON.stringify(results));
  const a=results.find(r=>r.status===201).data.activation;
  const draft=await api('/api/business/interactive-activations',u,activationBody('draft'));assert.equal(draft.status,201,JSON.stringify(draft));
  const path='/api/business/interactive-activations/';assert.equal((await api(path+draft.data.activation.id,u,{status:'active'},'PATCH')).status,403);
  assert.equal((await api(path+a.id,u,{status:'paused'},'PATCH')).status,200);
  assert.equal((await api(path+draft.data.activation.id,u,{status:'active'},'PATCH')).status,200);
  assert.equal((await api(path+a.id,u,{status:'active'},'PATCH')).status,403);
  assert.equal((await query("select count(*)::int n from interactive_activations where company_id=$1 and status='active'",[b.id])).rows[0].n,2);
 });
 await t.test('activation reward requires purchased tickets, retries debit once, and wrong free plan cannot run it',async()=>{
  const {b}=accounts.ACTIVACIONES_GRATIS;const a=(await query("select * from interactive_activations where company_id=$1 and status='active' limit 1",[b.id])).rows[0];
  const start=await activations.startInteractiveParticipant(a.public_slug,{}),body={participant_id:start.participant.id,game_session_token:start.game_session_token,answers:{}};
  await assert.rejects(()=>activations.completeInteractiveParticipant(a.public_slug,body),/tickets|saldo|credit|agotado/i);
  await query('update business_qr_credit_accounts set qr_balance=2,qr_purchased_total=2 where business_id=$1',[b.id]);
  const rewards=await Promise.allSettled([activations.completeInteractiveParticipant(a.public_slug,body),activations.completeInteractiveParticipant(a.public_slug,body)]);assert.equal(rewards.filter(r=>r.status==='fulfilled'&&r.value.rewarded).length,1);assert.match(rewards.find(r=>r.status==='rejected').reason.message,/ya fue cerrada/);
  assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,1);
  await query("update businesses set plan_code='PENSE_EN_TI' where id=$1",[b.id]);
  try{await assert.rejects(()=>activations.startInteractiveParticipant(a.public_slug,{}),/programa actual/);}finally{await query("update businesses set plan_code='ACTIVACIONES_GRATIS' where id=$1",[b.id]);}
 });
 await t.test('each free program publishes only its own benefits to Customer',async()=>{
  for(const [code,{b,u}] of Object.entries(accounts)){
   const directory=await api('/api/business/customer/directory',u,{published:true,category:'QA',city:'Bogotá',address:'Calle QA',description:'Negocio QA'},'PUT');assert.equal(directory.status,200,JSON.stringify(directory));
   const catalog=await api('/api/business/customer/publications',u);assert.equal(catalog.status,200,JSON.stringify(catalog));assert.equal((await api('/api/business/customer/program-requests',u)).status,200);
   const kind=code==='PENSE_EN_TI'?'PRODUCT':code==='SELLOS_GRATIS'?'STAMP':'ACTIVITY';
   const resource=kind==='PRODUCT'?catalog.data.products[0]:kind==='STAMP'?catalog.data.stamps[0]:catalog.data.activities[0];assert.ok(resource);
   const body={kind,resource_id:resource.id,title:'Beneficio de QA',status:'PUBLISHED',...(kind==='PRODUCT'?{product_price:'8000',product_terms:'Un producto de regalo sin costo adicional.',payment_instructions:'Paga directamente en caja.',product_valid_days:30}:{})};
   const published=await api('/api/business/customer/publications',u,body);assert.equal(published.status,200,JSON.stringify(published));
   assert.equal((await api('/api/business/customer/publications',u,{...body,kind:kind==='STAMP'?'ACTIVITY':'STAMP'})).status,403);
  }
 });
 await t.test('Pensé en ti courtesy consumes initial tickets and preserves stock ownership',async()=>{
  const {b,u}=accounts.PENSE_EN_TI,product=(await query("select * from business_inventory_products where business_id=$1 and status='ACTIVE' limit 1",[b.id])).rows[0];
  const payload={source:'OWN',product_id:product.id,request_id:uuid(),quantity:1,terms:'Cortesía personal de una unidad.',valid_days:30,confirmed:true};
  const r=await api('/api/business/customer/courtesies',u,payload);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.lot.state,'READY');
  assert.equal((await api('/api/business/customer/courtesies',u,payload)).status,200);
  assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance,19);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),9);
 });
 await t.test('buying tickets preserves all free program permissions after verified payment',async()=>{
  const actualFetch=global.fetch,old=env.mercadoPagoAccessToken;env.mercadoPagoAccessToken='TEST-local-only';env.mercadoPagoWebhookSecret='TEST-local-only';
  global.fetch=async(input,options)=>{if(String(input).startsWith('https://api.mercadopago.com/'))return new Response(JSON.stringify({id:uuid(),init_point:'https://example.test/checkout'}),{status:201});assert.ok(String(input).startsWith(base));return actualFetch(input,options);};
  try{for(const {b,u} of Object.values(accounts)){
   const offers=await api('/api/payments/qr-credits/offers',u),offer=offers.data.packages.find(p=>p.package_size>=200);assert.ok(offer);
   const r=await api('/api/payments/qr-credits/checkout',u,{package_code:offer.code,idempotency_key:uuid()});assert.equal(r.status,201,JSON.stringify(r));
   const order=r.data.order||r.data;
   await withTransaction(async db=>{const saved=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[order.id])).rows[0];assert.ok(saved);return require('../backend/src/services/mercadoPagoService').__testing.finalizeApprovedCreditPurchase(db,saved,{id:uuid(),status:'approved',transaction_amount:Number(saved.price_cop),currency_id:'COP'});});
   assert.equal((await query('select plan_code from businesses where id=$1',[b.id])).rows[0].plan_code,b.plan_code);assert.equal((await api('/api/business/qr/batches',u)).status,403);
  }}finally{global.fetch=actualFetch;env.mercadoPagoAccessToken=old;}
 });
 await t.test('Admin supervises all free accounts; business owners cannot inspect other accounts',async()=>{
  const admin=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Admin QA','QORI_SUPERADMIN') returning *",[uuid()+'@example.test'])).rows[0];
  for(const {b,u} of Object.values(accounts)){
   const r=await api('/api/admin/accounts/businesses/'+b.id,admin);assert.equal(r.status,200,JSON.stringify(r));assert.ok(JSON.stringify(r.data).includes(b.plan_code));
   assert.equal((await api('/api/admin/accounts/businesses/'+b.id,u)).status,403);
   const overridden=planFromBusiness({...b,settings:{subscription:{lifetime_access:true},commercial_entitlements:{features:{rms_core:true}}}});assert.equal(overridden.code,b.plan_code);assert.equal(overridden.features.rms_core,false);
   await assert.rejects(()=>require('../backend/src/services/qrService').generateQr({business_id:b.id},{type:'user',user:u}),/programa gratuito/);
   await query("update app_users set platform_role='QORI_SELLER' where id=$1",[u.id]);
   assert.equal((await api('/api/business/contacts/feed',u)).status,403,'Seller role does not expand own free business permissions');
   await query('update app_users set platform_role=null where id=$1',[u.id]);
  }
 });
});

const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='public-benefits-isolated-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
const gift=require('../backend/src/services/customerProductGiftService'),qr=require('../backend/src/services/qrService'),stamps=require('../backend/src/services/stampCardService'),passes=require('../backend/src/services/rewardPassService');
const uuid=()=>crypto.randomUUID();let server,base,user,product;
async function api(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {http:r.status,...await r.json()};}
const ok=(r,status=200)=>{assert.equal(r.http,status,JSON.stringify(r));return r;};
test('public benefits remain usable without creating or accepting a Customer account',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Beneficios públicos QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[uuid(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
 user=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'test','Dueño QA','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.test'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,100,100)',[b.id]);await query("insert into branches(business_id,name,slug) values($1,'Sede QA','qa')",[b.id]);
 product=(await query("insert into business_inventory_products(business_id,internal_id,name,status,stock_quantity,unit_price,cost_price,currency) values($1,'PUBLIC-COFFEE','Café de regalo','ACTIVE',20,8000,2000,'COP') returning *",[b.id])).rows[0];
 const email=uuid()+'@example.test';let order,ticket;
 await t.test('unpaid gift stays unavailable; issued and legacy links open the actual QR without a login',async()=>{
  order=(await gift.createFromBusiness(user,{request_id:uuid(),product_id:product.id,recipient_email:email,recipient_name:'Invitada sin cuenta',buyer_name:'Comprador QA',buyer_email:uuid()+'@example.test',amount:'8000',valid_days:30,terms:'Un café sin pago adicional.',message:'Para ti'})).order;
  assert.equal((await fetch(base+'/regalo/'+order.id,{redirect:'manual'})).status,404);
  const paid=await gift.confirm(user,order.id,{amount:'8000',payment_received:true,payment_method:'CASH',payment_reference:'PAGO-QA'});assert.match(paid.share_url,/\/regalo\//);
  ticket=(await query('select q.* from qr_codes q join customer_product_gift_orders o on o.qr_code_id=q.id where o.id=$1',[order.id])).rows[0];
  for(const path of ['/regalo/'+order.id,'/customer/?gift='+order.id,'/customer/index.html?gift='+order.id]){const r=await fetch(base+path,{redirect:'manual'});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/claim/'+ticket.token);}
  const publicCard=ok(await api('/api/public/claim/'+ticket.token));assert.equal(publicCard.final_ticket.status,'ACTIVE');assert.ok(publicCard.final_ticket.qr_image_data_url||publicCard.final_ticket.qr_image||publicCard.final_ticket.qr_data_url,JSON.stringify(publicCard.final_ticket));
  for(const path of ['/claim/'+ticket.token,'/rp/example','/sellos/','/sellos/inscripcion.html','/carnet-afiliado/example','/activacion/example','/trivia/example']){const r=await fetch(base+path,{redirect:'manual'});assert.equal(r.status,200,path);assert.match(await r.text(),/optional-benefits-20261109/);}
  assert.equal((await api('/api/customer/wallet')).http,401);
 });
 await t.test('merchant redeems a guest gift once without invitation acceptance or a Customer account',async()=>{
  const input={mode:'STANDALONE',idempotency_key:uuid(),beneficiary:{name:'Invitada sin cuenta',email,data_use_confirmed:true}};
  await assert.rejects(qr.redeemQr(ticket.token,user,{...input,beneficiary:{...input.beneficiary,email:'wrong@example.test'}}),/correo/);
  assert.equal((await qr.redeemQr(ticket.token,user,input)).status,'REDEEMED');assert.equal((await qr.redeemQr(ticket.token,user,input)).idempotent_replay,true);
  await assert.rejects(qr.redeemQr(ticket.token,user,{...input,idempotency_key:uuid()}));
  assert.equal((await query('select 1 from customer_accounts where email=$1',[email])).rowCount,0);
  assert.equal((await query('select invitation_id from customer_product_gift_orders where id=$1',[order.id])).rows[0].invitation_id,null);
  assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),19);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[b.id])).rows[0].n,1);
  assert.equal(ok(await api('/api/public/claim/'+ticket.token)).final_ticket.status,'REDEEMED');
 });
 await t.test('guest can enroll, collect stamps and claim one reward, while incomplete cards stay locked',async()=>{
  const p=await stamps.saveProgram(b.id,user.id,{name:'Tu café de siempre',stamps_required:2,benefit_type:'FREE_GIFT',benefit_value:{label:'Un café gratis'},minimum_purchase:0,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:2000,ticket_cost:1000,terms:'Beneficio personal.',status:'ACTIVE'});
  const key=crypto.randomBytes(32).toString('hex');const enrolled=ok(await api('/api/public/stamp-cards/programs/'+p.id+'/enroll',{name:'Visitante sin Customer',document_id:uuid(),phone:'3000000000',email:uuid()+'@example.test',consent:true,access_key:key}));
  const token=new URL(enrolled.url).hash.slice(1),path='/api/public/stamp-cards/'+token;
  let card=ok(await api(path));assert.ok(card.identification.qr_image);assert.equal((await api(path+'/claim',{cycle_id:card.cycles[0].id})).http,400);
  const m=(await query('select id from stamp_members where program_id=$1',[p.id])).rows[0];
  for(let i=0;i<2;i++)await stamps.manualStamp(b.id,user.id,m.id,{reference:uuid(),note:'Visita presencial QA'});
  card=ok(await api(path));assert.equal(card.cycles[0].stamps,2);
  const reward=ok(await api(path+'/claim',{cycle_id:card.cycles[0].id}));assert.ok(reward.qr_image);assert.ok(reward.ticket_code);
  assert.equal(ok(await api(path+'/claim',{cycle_id:card.cycles[0].id})).ticket_code,reward.ticket_code);
 });
 await t.test('giftcard activation and styled QR remain public, with its PIN and expiry enforced',async()=>{
  const pass=await passes.createRewardPass(user,{buyer_name:'Comprador QA',initial_value_cop:10000,branch_authorization_scope:'ALL_BRANCHES',terms:'Canjeable en el negocio.',idempotency_key:uuid()});
  const path='/api/public/reward-passes/'+pass.public_code;assert.equal(ok(await api(path)).reward_pass.claim_required,true);
  const claim={beneficiary_name:'Beneficiaria sin Customer',beneficiary_document:'QA'+Date.now(),beneficiary_email:uuid()+'@example.test',beneficiary_phone:'3000000000',security_pin:pass.security_pin};
  assert.equal((await api(path+'/claim',{...claim,security_pin:'000000'})).http,400);
  const active=ok(await api(path+'/claim',claim)).reward_pass;assert.equal(active.claim_required,false);assert.ok(active.qr_image_data_url);assert.equal(Number(active.current_balance_cop),10000);
  assert.equal((await query('select 1 from customer_accounts where email=$1',[claim.beneficiary_email])).rowCount,0);
  await query("update reward_passes set expires_at=now()-interval '1 day' where id=$1",[pass.id]);
  assert.equal(ok(await api(path)).reward_pass.status,'expired');
 });
 await t.test('public activities retain guest participation tokens and issue a benefit without Customer',async()=>{
  const slug=uuid();await query("insert into interactive_activations(company_id,user_id,title,category,activation_type,status,public_slug,terms,capture_config,reward_config) values($1,$2,'Actividad pública QA','survey','FLEX_SURVEY','active',$3,'Condiciones QA',$4::jsonb,$5::jsonb)",[b.id,user.id,slug,JSON.stringify({collect_participant_data:true}),JSON.stringify({mode:'fixed',reward_type:'FREE_GIFT',reward_value:{label:'Café QA'},reward_label:'Café QA',expiration_days:30})]);
  const path='/api/public/activations/'+slug,start=ok(await api(path+'/participants',{name:'Participante invitado',email:uuid()+'@example.test',document:'QA'+Date.now(),phone:'3100000001'}),201);assert.ok(start.game_session_token);assert.equal(start.credit_account,undefined);
  assert.equal((await api(path+'/complete',{participant_id:start.participant.id,game_session_token:uuid()})).http,403);
  const done=ok(await api(path+'/complete',{participant_id:start.participant.id,game_session_token:start.game_session_token}),201);assert.equal(done.credit_account,undefined);assert.ok(done.rewarded||done.reward,JSON.stringify(done));
  assert.equal((await api(path+'/participants',{name:start.participant.name,email:start.participant.email,document:start.participant.document,phone:start.participant.phone})).http,400,'identity alone cannot recover a private participation token');
  assert.equal((await api(path+'/complete',{participant_id:start.participant.id,game_session_token:start.game_session_token})).http,400,'a completed participation cannot issue a second benefit');
 });
 await t.test('an assigned courtesy with no player or Customer can be redeemed by its guest recipient',async()=>{
  const courtesy=require('../backend/src/services/customerCourtesyService');
  const lot=(await courtesy.create(user,{source:'OWN',request_id:uuid(),product_id:product.id,quantity:1,terms:'Café de cortesía.',valid_days:30,confirmed:true})).lot;
  const recipient=uuid()+'@example.test',delivery=await courtesy.send(user,lot.id,{request_id:uuid(),recipient_email:recipient,recipient_name:'Invitada cortesía',message:'Gracias por tu visita',confirmed:true});
  const q=(await query('select q.* from qr_codes q join customer_product_gift_orders o on o.qr_code_id=q.id where o.id=$1',[delivery.order_id])).rows[0];assert.equal(q.player_id,null);
  assert.ok(ok(await api('/api/public/claim/'+q.token)).final_ticket.qr_image_data_url);
  assert.equal((await qr.redeemQr(q.token,user,{mode:'STANDALONE',idempotency_key:uuid(),beneficiary:{name:'Invitada cortesía',email:recipient,data_use_confirmed:true}})).status,'REDEEMED');
  assert.equal((await query('select 1 from customer_accounts where email=$1',[recipient])).rowCount,0);
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

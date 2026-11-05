const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='benefit-delivery-local';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),stamps=require('../backend/src/services/stampCardService');
const notices=require('../backend/src/services/customerBenefitNotificationService'),uuid=()=>crypto.randomUUID();
let server,base,buyer,other,biz,user,first,second,invitation;
const doc='DELIVERY-'+uuid();
async function account(){const a=(await query("insert into customer_accounts(email,full_name) values($1,'Delivery QA') returning *",[uuid()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,'QA',now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function api(path,body,method=body?'POST':'GET',a=buyer){const r=await fetch(base+'/api/customer'+path,{method,headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {http:r.status,...await r.json()};}
async function program(){return stamps.saveProgram(biz.id,user.id,{name:'Tarjeta nueva',stamps_required:5,benefit_type:'FREE_GIFT',benefit_value:{label:'Café'},minimum_purchase:1,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:1000,ticket_cost:1000,terms:'Premio de prueba.',status:'ACTIVE'});}
async function drain(){for(let n=0;n<1000;n++)if(!await notices.processNext())return;throw Error('Queue did not drain');}
test('new benefits after one-time recovery reach Customer and generate owned persistent notices',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await account();other=await account();
 biz=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Delivery QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[uuid(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
 user=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Operador','BUSINESS_OWNER') returning *",[biz.id,uuid()+'@example.test'])).rows[0];
 await query('update customer_accounts set declared_document_key=$2,benefit_recovery_completed_at=now() where id=$1',[buyer.id,doc.toLowerCase().replace(/[^a-z0-9]/g,'')]);
 const p=await program();first=(await stamps.enroll(biz.id,user.id,{program_id:p.id,name:'Cliente',document_id:doc,consent:true})).member;
 await t.test('reassigning an existing card fills missing email only through the business and keeps its original id',async()=>{
  assert.equal((await api('/wallet/overview')).cards.length,0);
  const r=await stamps.enroll(biz.id,user.id,{program_id:p.id,name:'Cliente',document_id:doc,email:buyer.email,consent:true});assert.equal(r.member.id,first.id);assert.equal(r.member.email,buyer.email);
  const changed=await stamps.enroll(biz.id,user.id,{program_id:p.id,name:'Cliente',document_id:doc,email:other.email,consent:true});assert.equal(changed.member.email,buyer.email);
 });
 await t.test('an unconnected business appears as a pending invitation; no second recovery or financial relationship is created',async()=>{
  const wallet=await api('/wallet/overview');assert.equal(wallet.http,200,JSON.stringify(wallet));assert.equal(wallet.cards.length,0);assert.equal(wallet.pending_invitations,1);
  const inbox=await api('/invitations');invitation=inbox.invitations.find(i=>i.existing_benefit);assert.ok(invitation);assert.equal(invitation.state,'PENDING');
  assert.equal((await api('/notifications')).count,1);assert.equal((await api('/benefit-recovery',{request_id:uuid(),document_id:doc,consent:true})).http,400);
  assert.equal((await query('select count(*)::int n from customer_relationships where customer_id=$1',[buyer.id])).rows[0].n,0);
 });
 await t.test('accepting keeps stamps and canonical identity, and another account cannot accept or read it',async()=>{
  const body={action:'ACCEPT',terms_accepted:true,document_id:doc};
  assert.equal((await api('/invitations/'+invitation.id+'/decision',body,'POST',other)).http,404);
  const r=await api('/invitations/'+invitation.id+'/decision',body);assert.equal(r.http,200,JSON.stringify(r));assert.equal(r.result_id,first.id);
  assert.equal((await api('/wallet/overview')).cards[0].id,first.id);assert.equal((await api('/wallet/cards/'+first.id,null,'GET',other)).http,404);
 });
 await t.test('later cards of the same connected business arrive automatically with one notice per delivery',async()=>{
  const p2=await program();second=(await stamps.enroll(biz.id,user.id,{program_id:p2.id,name:'Cliente',document_id:doc,email:buyer.email,consent:true})).member;
  const [a,b]=await Promise.all([api('/wallet/overview'),api('/wallet/overview')]);assert.ok(a.cards.some(c=>c.id===second.id));assert.ok(b.cards.some(c=>c.id===second.id));
  await drain();const ns=(await api('/notifications')).items.filter(n=>n.resource_id===second.id);assert.equal(ns.length,1);assert.equal(ns[0].title,'Beneficio recibido');
 });
 await t.test('manual stamps and voids notify once each, including retries',async()=>{
  const reference=uuid();await stamps.manualStamp(biz.id,user.id,second.id,{reference,note:'Prueba'});await stamps.manualStamp(biz.id,user.id,second.id,{reference,note:'Prueba'});await drain();
  let ns=(await api('/notifications')).items;assert.equal(ns.filter(n=>n.title==='Recibiste un nuevo sello'&&n.resource_id===second.id).length,1);
  const event=(await query('select id from stamp_events where member_id=$1',[second.id])).rows[0];await query("update stamp_events set voided_at=now(),void_reason='QA' where id=$1",[event.id]);await drain();ns=(await api('/notifications')).items;assert.equal(ns.filter(n=>n.title==='Un sello fue anulado').length,1);
  const n=ns[0];assert.equal((await api('/notifications/'+n.id+'/read',{},'POST',other)).http,404);assert.equal((await api('/notifications/'+n.id+'/read',{})).http,200);assert.ok((await api('/notifications')).items.find(x=>x.id===n.id).read_at);
 });
 await t.test('giftcards, affiliations and activity invitations create notices without sales',async()=>{
  const affiliate=(await query("insert into affiliates(business_id,created_by_user_id,full_name,document_id,email,qr_token) values($1,$2,'QA',$3,$4,$5) returning id",[biz.id,user.id,doc,buyer.email,uuid()])).rows[0];
  await query('insert into affiliate_point_ledger(business_id,affiliate_id,points_awarded) values($1,$2,15)',[biz.id,affiliate.id]);
  const gift=(await query("insert into reward_passes(company_id,user_id,buyer_name,beneficiary_name,beneficiary_document,beneficiary_email,initial_value_cop,current_balance_cop,expires_at,qr_token,public_code,terms) values($1,$2,'QA','QA',$3,$4,1000,1000,now()+interval '1 year',$5,$6,'QA') returning id",[biz.id,user.id,doc,buyer.email,uuid(),uuid()])).rows[0];
  await query("insert into customer_invitations(business_id,customer_id,created_by,request_id,kind,title) values($1,$2,$3,$4,'ACTIVITY','Actividad QA')",[biz.id,buyer.id,user.id,uuid()]);
  await drain();const ns=await api('/notifications');assert.ok(ns.items.some(n=>n.kind==='AFFILIATION'));assert.ok(ns.items.some(n=>n.title==='Tus puntos se actualizaron'));assert.ok(ns.items.some(n=>n.kind==='GIFT'&&n.resource_id===gift.id));assert.ok(ns.items.some(n=>n.kind==='ACTIVITY'));
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[biz.id])).rows[0].n,0);
 });
 await t.test('push fanout is deduplicated, session scoped and revocation stops sending',async()=>{
  const session=(await query('select id from customer_sessions where customer_id=$1',[buyer.id])).rows[0];
  const sub=(await query("insert into customer_payment_push_subscriptions(customer_id,session_id,endpoint,p256dh,auth) values($1,$2,$3,'test','test') returning id",[buyer.id,session.id,'https://example.test/push/'+uuid()])).rows[0];
  await notices.enqueuePush();await notices.enqueuePush();const count=(await query('select count(*)::int n from customer_benefit_push_deliveries where subscription_id=$1',[sub.id])).rows[0].n;assert.ok(count>0);
  const sent=[];for(let n=0;n<100;n++)if(!await notices.processPush(async(s,p)=>sent.push(p)))break;
  assert.equal(sent.length,count);assert.ok(sent.every(p=>p.public_id===buyer.public_id&&p.type==='BENEFIT'));assert.equal(new Set(sent.map(p=>p.notification_id)).size,count);
  await notices.insert({query},{customer_id:buyer.id,business_id:biz.id,event_key:uuid(),kind:'GIFT',title:'Prueba',body:'Prueba'});await notices.enqueuePush();await query('update customer_sessions set expires_at=now() where id=$1',[session.id]);
  await notices.processPush(async()=>assert.fail('Revoked session received a push'));await query("update customer_sessions set expires_at=now()+interval '1 day' where id=$1",[session.id]);
 });
 await t.test('Empresa explicitly delivers existing benefits with tenant and master-document checks',async()=>{
  const service=require('../backend/src/services/customerBenefitDeliveryService'),p=await program();
  const m=(await stamps.enroll(biz.id,user.id,{program_id:p.id,name:'Cliente',document_id:doc,consent:true})).member;
  const catalog=await service.businessCatalog(user,buyer.public_id);assert.ok(catalog.benefits.some(b=>b.id===m.id));
  const body={public_id:buyer.public_id,resource_id:m.id,kind:'STAMP',document_id:doc,identity_checked:true};
  await assert.rejects(service.businessSend(user,{...body,document_id:'99999999'}),/cédula maestra/);
  await assert.rejects(service.businessSend({...user,business_id:uuid()},body),/no encontrado/);
  const r=await service.businessSend(user,body);assert.equal(r.delivery.state,'ACCEPTED');await service.businessSend(user,body);
  assert.equal((await query('select email from stamp_members where id=$1',[m.id])).rows[0].email,buyer.email);
  assert.equal((await api('/notifications')).items.filter(n=>n.resource_id===m.id).length,1);
 });
 await t.test('blocked businesses and wrong contact never create new deliveries',async()=>{
  await query('insert into customer_business_blocks(customer_id,business_id) values($1,$2)',[buyer.id,biz.id]);const p3=await program();const m=(await stamps.enroll(biz.id,user.id,{program_id:p3.id,name:'Cliente',document_id:doc,email:buyer.email,consent:true})).member;await drain();
  assert.equal((await api('/wallet/overview')).cards.some(c=>c.id===m.id),false);assert.equal((await api('/notifications')).count,0);
  assert.equal((await api('/notifications',null,'GET',other)).count,0);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));for(const a of [buyer,other])if(a)await query('delete from customer_accounts where id=$1',[a.id]);if(biz)await query('delete from businesses where id=$1',[biz.id]);await pool.end();});

const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('node:fs/promises'),path=require('node:path');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='customer-explore-local';process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),stamps=require('../backend/src/services/stampCardService'),explore=require('../backend/src/services/customerExploreService');
let server,base,buyer,other,merchant,foreign,program,publication,activity,activityPub;
async function api(url,token,body,method=body?'POST':'GET'){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
async function login(){const email=crypto.randomUUID()+'@example.test',c=await api('/api/customer/auth/code',null,{email}),mail=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-customer/mailbox',c.challenge_id+'.json'),'utf8')),r=await api('/api/customer/auth/verify',null,{challenge_id:c.challenge_id,code:mail.code});await query("update customer_accounts set full_name='Explorador Qori' where id=$1",[r.account.id]);r.account.full_name='Explorador Qori';return r;}
async function business(){
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Negocio Discovery',$1,'PRO','ACTIVE',$2::jsonb) returning *",[crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
 const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Operador','BUSINESS_OWNER') returning *",[b.id,crypto.randomUUID()+'@example.test'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,100,100)',[b.id]);await query("insert into branches(business_id,name,slug) values($1,'Sede QA','qa')",[b.id]);
 return {b,u,token:jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};
}
const publish=(kind,resource_id,title='Beneficio de prueba',extra={})=>api('/api/business/customer/publications',merchant.token,{kind,resource_id,title,description:'Beneficio publicado para QA.',...extra});
test('public ecosystem connects canonical programs and earned rewards to a verified buyer',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await login();other=await login();merchant=await business();foreign=await business();
 program=await stamps.saveProgram(merchant.b.id,merchant.u.id,{name:'Café cada tres visitas',stamps_required:3,benefit_type:'FREE_GIFT',benefit_value:{label:'Un café para ti'},minimum_purchase:1,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:1000,ticket_cost:1000,terms:'Completa tres visitas pagadas.',status:'ACTIVE'});
 await t.test('active Empresa businesses are searchable and followable before publishing a Customer profile',async()=>{
  const name='Rey del Sabór '+crypto.randomUUID();
  await query('update businesses set name=$2 where id=$1',[foreign.b.id,name]);
  const find=async()=>api('/api/customer/explore/directory?search='+encodeURIComponent('El '+name.replace('Sabór','Sabor')));
  let result=await find();assert.equal(result.status,200,JSON.stringify(result));
  assert.deepEqual(result.businesses.map(b=>b.id),[foreign.b.id]);
  assert.deepEqual(Object.keys(result.businesses[0]).sort(),['address','category','city','id','latitude','longitude','name','slug'].sort());
  const profile=await api('/api/customer/explore/businesses/'+foreign.b.slug);
  assert.equal(profile.status,200);assert.equal(profile.business.name,name);assert.deepEqual(profile.publications,[]);
  assert.equal(profile.business.settings,undefined);assert.equal(profile.business.email,undefined);
  assert.equal((await api('/api/customer/favorites/'+foreign.b.id,other.token,{})).status,200);
  assert.ok((await api('/api/customer/discovery/following',other.token)).businesses.some(b=>b.id===foreign.b.id));
  await api('/api/customer/favorites/'+foreign.b.id,other.token,null,'DELETE');
  await query("update businesses set settings=jsonb_set(settings,'{internal_account}','true') where id=$1",[foreign.b.id]);
  assert.deepEqual((await find()).businesses,[]);assert.equal((await api('/api/customer/explore/businesses/'+foreign.b.slug)).status,404);
  await query("update businesses set settings=settings-'internal_account',is_active=false where id=$1",[foreign.b.id]);
  assert.deepEqual((await find()).businesses,[]);assert.equal((await api('/api/customer/favorites/'+foreign.b.id,other.token,{})).status,404);
  await query('update businesses set is_active=true where id=$1',[foreign.b.id]);
  await query('insert into customer_directory(business_id,published) values($1,false)',[foreign.b.id]);
  assert.deepEqual((await find()).businesses,[]);assert.equal((await api('/api/customer/explore/businesses/'+foreign.b.slug)).status,404);
  assert.equal((await api('/api/customer/favorites/'+foreign.b.id,other.token,{})).status,404);
 });
 await t.test('one program can publish without requiring points or giftcards; drafts and tenants stay private',async()=>{
  assert.equal((await publish('STAMP',program.id)).status,400);
  const profile={published:true,category:'Café',city:'Bogotá',address:'Solo QA',description:'Nuestro negocio de pruebas'};
  assert.equal((await api('/api/business/customer/directory',merchant.token,profile,'PUT')).status,200);
  const draft=await publish('STAMP',program.id,'Café cada tres visitas',{status:'DRAFT'});assert.equal(draft.status,200,JSON.stringify(draft));
  assert.equal((await api('/api/customer/explore/publications/'+draft.publication.id)).status,404);
  const r=await publish('STAMP',program.id,'Café cada tres visitas');assert.equal(r.status,200,JSON.stringify(r));publication=r.publication;
  assert.equal((await api('/api/business/customer/publications',foreign.token,{kind:'STAMP',resource_id:program.id,title:'Robado'})).status,404);
  const feed=await api('/api/customer/explore?search=Caf%C3%A9%20cada%20tres&city=Bogot%C3%A1&kind=STAMP');assert.ok(feed.publications.some(p=>p.id===publication.id));assert.equal(feed.publications[0].business,undefined);assert.equal(feed.publications[0].settings,undefined);
  assert.equal((await api('/api/customer/explore/businesses/'+merchant.b.slug)).business.id,merchant.b.id);
 });
 await t.test('portal directory exposes public businesses without requiring every loyalty program and hides inactive or private profiles',async()=>{
  await query('update customer_directory set latitude=4.6,longitude=-74 where business_id=$1',[merchant.b.id]);
  const params='?search=Negocio%20Discovery&city=Bogot%C3%A1',find=async()=> (await api('/api/customer/explore/directory'+params)).businesses.find(b=>b.id===merchant.b.id);
  let row=await find();assert.ok(row);assert.equal(row.slug,merchant.b.slug);assert.equal(Number(row.latitude),4.6);
  assert.deepEqual(Object.keys(row).sort(),['address','category','city','id','latitude','longitude','name','slug'].sort());
  await query('update customer_directory set published=false where business_id=$1',[merchant.b.id]);assert.equal(await find(),undefined);
  await query('update customer_directory set published=true where business_id=$1',[merchant.b.id]);await query('update businesses set is_active=false where id=$1',[merchant.b.id]);assert.equal(await find(),undefined);
  await query('update businesses set is_active=true where id=$1',[merchant.b.id]);assert.ok(await find());
  assert.equal((await api('/api/customer/explore/directory?offset=-1')).status,400);
 });
 await t.test('save, QR resolution and analytics preserve ownership and do not create sales',async()=>{
  assert.equal((await api('/api/customer/explore/publications/'+publication.id+'/save',null,{saved:true},'PUT')).status,401);
  await api('/api/customer/explore/publications/'+publication.id+'/save',buyer.token,{saved:true},'PUT');
  assert.deepEqual((await api('/api/customer/discovery/me',buyer.token)).saved,[publication.id]);assert.deepEqual((await api('/api/customer/discovery/me',other.token)).saved,[]);
  await api('/api/customer/favorites/'+merchant.b.id,buyer.token,{});
  assert.equal((await api('/api/customer/discovery/following',buyer.token)).businesses[0].slug,merchant.b.slug);
  assert.equal((await api('/api/customer/discovery/following',other.token)).businesses.length,0);
  assert.equal((await api('/api/customer/explore/resolve',null,{url:publication.url})).hash,'#publication/'+publication.id);
  assert.equal((await api('/api/customer/explore/resolve',null,{url:'https://evil.example/customer/#publication/'+publication.id})).status,400);
  assert.equal((await api('/api/customer/explore/resolve',null,{url:'http://127.0.0.1:3051/sellos/inscripcion.html?programa='+program.id})).hash,'#publication/'+publication.id);
  assert.match((await api('/api/customer/explore/publications/'+publication.id+'/qr')).qr_image,/^data:image\/png/);
  await api('/api/customer/explore/publications/'+publication.id+'/events',buyer.token,{type:'SHARE'});await api('/api/customer/explore/publications/'+publication.id+'/events',buyer.token,{type:'SHARE'});
  const metrics=(await api('/api/business/customer/publications',merchant.token)).publications[0].metrics;assert.equal(metrics.SHARE,1);
 });
 await t.test('program request becomes a verified invitation and only acceptance creates the card',async()=>{
  const req=await api('/api/customer/explore/publications/'+publication.id+'/request',buyer.token,{document_id:'DISCOVERY-001',consent:true});assert.equal(req.status,200,JSON.stringify(req));
  assert.equal((await api('/api/customer/explore/publications/'+publication.id+'/request',buyer.token,{document_id:'DISCOVERY-001',consent:true})).request.id,req.request.id);
  assert.equal((await api('/api/business/customer/program-requests',foreign.token)).requests.length,0);
  assert.equal((await api('/api/business/customer/program-requests/'+req.request.id+'/decision',foreign.token,{action:'INVITE',identity_checked:true})).status,404);
  assert.equal((await api('/api/business/customer/program-requests/'+req.request.id+'/decision',merchant.token,{action:'INVITE'})).status,400);
  const r=await api('/api/business/customer/program-requests/'+req.request.id+'/decision',merchant.token,{action:'INVITE',identity_checked:true});assert.equal(r.status,200,JSON.stringify(r));
  assert.equal((await api('/api/customer/wallet/overview',buyer.token)).cards.length,0);
  const invitation=(await api('/api/customer/invitations',buyer.token)).invitations[0];assert.ok(invitation);
  assert.equal((await api('/api/customer/invitations/'+invitation.id+'/decision',buyer.token,{action:'ACCEPT',terms_accepted:true})).status,200);
  assert.equal((await api('/api/customer/wallet/overview',buyer.token)).cards.length,1);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,0);
 });
 await t.test('paused, expired and inactive merchant offerings disappear and cannot be acted upon',async()=>{
  assert.equal((await api('/api/business/customer/publications/'+publication.id,foreign.token,{status:'PAUSED'},'PATCH')).status,404);
  await api('/api/business/customer/publications/'+publication.id,merchant.token,{status:'PAUSED'},'PATCH');
  assert.equal((await api('/api/customer/explore/publications/'+publication.id)).status,404);
  assert.equal((await api('/api/customer/explore/publications/'+publication.id+'/request',other.token,{document_id:'OTHER-01',consent:true})).status,404);
  await publish('STAMP',program.id);await query('update businesses set is_active=false where id=$1',[merchant.b.id]);
  assert.equal((await api('/api/customer/explore/publications/'+publication.id)).status,404);await query('update businesses set is_active=true where id=$1',[merchant.b.id]);
 });
 await t.test('canonical activity participation is atomic, idempotent and account-owned',async()=>{
  activity=(await query("insert into interactive_activations(company_id,user_id,title,category,activation_type,status,public_slug,terms,capture_config,reward_config) values($1,$2,'Encuesta Qori','survey','FLEX_SURVEY','active',$3,'Participación de prueba.',$4::jsonb,$5::jsonb) returning *",[merchant.b.id,merchant.u.id,crypto.randomUUID(),JSON.stringify({collect_participant_data:false}),JSON.stringify({mode:'fixed',reward_type:'FREE_GIFT',reward_value:{label:'Café de prueba'},reward_label:'Café de prueba',expiration_days:30})])).rows[0];
  const pub=await publish('ACTIVITY',activity.id,'Encuesta y café');assert.equal(pub.status,200,JSON.stringify(pub));activityPub=pub.publication;
  assert.match((await api('/api/customer/explore/publications/'+activityPub.id+'/launch',buyer.token,{})).url,/customer_publication=/);
  const responses=await Promise.all([api('/api/customer/explore/publications/'+activityPub.id+'/complete',buyer.token,{}),api('/api/customer/explore/publications/'+activityPub.id+'/complete',buyer.token,{})]);
  for(const r of responses)assert.equal(r.status,200,JSON.stringify(r));
  assert.equal(responses[0].participant.id,responses[1].participant.id);assert.equal(responses[0].credit_account,undefined);
  assert.equal((await query('select count(*)::int n from customer_activation_participations where customer_id=$1 and activation_id=$2',[buyer.account.id,activity.id])).rows[0].n,1);
  assert.equal((await api('/api/customer/explore/publications/'+activityPub.id+'/complete',other.token,{participant_id:responses[0].participant.id})).status,403);
  const earned=await api('/api/customer/discovery/earned',buyer.token);assert.equal(earned.status,200,JSON.stringify(earned));assert.equal(earned.participations.length,1);
  if(responses[0].qr_code){
   const qrId=responses[0].qr_code.id;assert.ok((await api('/api/customer/wallet/overview',buyer.token)).cards.some(c=>c.id===qrId));assert.equal((await api('/api/customer/wallet/tickets/'+qrId,other.token)).status,404);
   await query("update qr_codes set status='REDEEMED' where id=$1",[qrId]);assert.equal((await api('/api/customer/wallet/tickets/'+qrId,buyer.token)).card.qr_image,undefined);
  }else assert.fail('Fixture must issue a canonical reward, not just record participation.');
  await query("update interactive_activations set ends_at=now()-interval '1 minute' where id=$1",[activity.id]);assert.equal((await api('/api/customer/explore/publications/'+activityPub.id)).status,404);
 });
 await t.test('an existing reward cannot be claimed merely by supplying the same document or phone',async()=>{
  await query("update interactive_activations set ends_at=null,capture_config=$2::jsonb where id=$1",[activity.id,JSON.stringify({collect_participant_data:true})]);
  const legacy=require('../backend/src/services/interactiveActivationService');
  const identity={name:'Cliente Anterior',email:'historic-'+crypto.randomUUID()+'@example.test',document:'HIST-'+crypto.randomUUID().slice(0,12),phone:'300'+String(Date.now()).slice(-7)};
  const old=await legacy.completeInteractiveParticipant(activity.public_slug,identity);
  const attempt=await api('/api/customer/explore/publications/'+activityPub.id+'/complete',other.token,identity);
  assert.ok([400,403].includes(attempt.status),JSON.stringify(attempt));
  assert.equal((await query('select count(*)::int n from customer_activation_participations where customer_id=$1 and participant_id=$2',[other.account.id,old.participant.id])).rows[0].n,0);
  assert.equal((await api('/api/customer/wallet/tickets/'+old.qr_code.id,other.token)).status,404);
 });
 await t.test('a gift-only offer creates a pending order and paid issuance stays canonical',async()=>{
  await query("insert into customer_business_programs(business_id,gift_enabled,gift_min,gift_max,gift_terms,gift_payment_instructions) values($1,true,10000,50000,'Regalo de prueba con condiciones.','Pago de prueba directo al negocio.')",[merchant.b.id]);
  const p=await publish('GIFT',null,'Regala un buen momento');assert.equal(p.status,200,JSON.stringify(p));
  assert.equal((await api('/api/business/customer/standard',merchant.token)).ready,false);
  const body={request_id:crypto.randomUUID(),buyer_name:'Comprador Qori',recipient_name:'Destinatario Qori',recipient_email:other.account.email,amount:'15000',message:'Para ti',terms_accepted:true};
  const order=await api('/api/customer/explore/publications/'+p.publication.id+'/gift-order',buyer.token,body);assert.equal(order.status,200,JSON.stringify(order));assert.equal(order.order.state,'PENDING_PAYMENT');
  assert.equal((await api('/api/customer/explore/publications/'+p.publication.id+'/gift-order',buyer.token,body)).order.id,order.order.id);
  assert.equal((await api('/api/customer/wallet/overview',other.token)).cards.some(c=>c.kind==='GIFT'),false);
  const paid=await api('/api/business/customer/gift-orders/'+order.order.id+'/confirm-payment',merchant.token,{amount:'15000',payment_reference:'LOCAL-QA-ONLY',payment_method:'Efectivo QA',payment_received:true});assert.equal(paid.status,200,JSON.stringify(paid));
  assert.ok((await api('/api/customer/wallet/overview',other.token)).cards.some(c=>c.id===paid.reward_pass_id));
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[merchant.b.id])).rows[0].n,0);
 });
 await t.test('PWA and scanner assets are served without caching private APIs',async()=>{
  const manifest=await (await fetch(base+'/customer/manifest.webmanifest')).json();assert.equal(manifest.scope,'/customer/');assert.equal(manifest.icons.length,2);
  for(const icon of manifest.icons){const response=await fetch(base+'/customer/'+icon.src);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());const size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
  assert.equal((await fetch(base+'/vendor/jsqr/jsQR.js')).status,200);
  assert.equal((await fetch(base+'/customer/offline.html')).status,200);
  const response=await fetch(base+'/api/customer/explore');assert.match(response.headers.get('cache-control'),/no-store/);
 });
 await t.test('publications retain RLS and deny public access to personal discovery tables',async()=>{
  const tables=await query("select relname,relrowsecurity from pg_class where relname in('customer_publications','customer_saved_publications','customer_program_requests','customer_publication_events','customer_activation_participations')");assert.equal(tables.rowCount,5);assert.ok(tables.rows.every(r=>r.relrowsecurity));
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

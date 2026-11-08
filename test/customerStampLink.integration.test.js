const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='stamp-link-local';process.env.PUBLIC_APP_URL='https://gosqori.com';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),auth=require('../backend/src/services/customerAuthService'),stamps=require('../backend/src/services/stampCardService');
let server,base,token;
const id=()=>crypto.randomUUID();
async function api(path,body,authenticated=true){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
test('Customer opens a valid enrollment QR without a Customer catalog publication',async t=>{
 assert.equal((await query('select current_database() name')).rows[0].name,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const account=(await query("insert into customer_accounts(email,full_name,declared_document_key) values($1,'Cliente Alipuntos QA',$2) returning *",[id()+'@example.test',id().replaceAll('-','')])).rows[0];token=(await withTransaction(db=>auth.createSession(db,account,'local-test'))).token;
 const business=(await query("insert into businesses(name,slug,plan_code,subscription_status,subscription_started_at,subscription_current_period_ends_at,settings) values('Rey del sabor QA',$1,'DESCUBRE','ACTIVE',now(),now()+interval '14 days','{}') returning *",[id()])).rows[0];
 const program=await stamps.saveProgram(business.id,null,{name:'ALIPUNTOS QA',stamps_required:5,benefit_type:'FREE_GIFT',benefit_value:{label:'Un premio QA'},minimum_purchase:1,one_per_day:true,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:1000,ticket_cost:1000,terms:'Condiciones locales de prueba.',status:'ACTIVE'});
 const path='/sellos/inscripcion.html?programa='+program.id,url='https://gosqori.com'+path;
 const resolve=value=>api('/api/customer/explore/resolve',{url:value});
 await t.test('unpublished program, www link and whitespace reach the canonical same-origin page',async()=>{
  assert.equal((await query('select count(*)::int n from customer_publications where resource_id=$1',[program.id])).rows[0].n,0);
  for(const link of [url,'  '+url+'  ',url.replace('gosqori.com','www.gosqori.com'),path+'&utm_source=whatsapp']){const r=await resolve(link);assert.equal(r.status,200,JSON.stringify(r));assert.deepEqual(r.data,{url:path});}
  assert.equal((await api('/api/customer/explore/resolve',{url},false)).status,401);
  const page=await fetch(base+path,{headers:{Authorization:'Bearer '+token}});assert.equal(page.status,200);assert.match(await page.text(),/registrationApp/);
  const preview=await api('/api/public/stamp-cards/programs/'+program.id);assert.equal(preview.status,200);assert.equal(preview.data.program.name,'ALIPUNTOS QA');assert.equal(preview.data.business.name,'Rey del sabor QA');
 });
 await t.test('malformed, missing and external links fail explicitly',async()=>{
  for(const link of ['https://evil.test'+path,'https://gosqori.com.evil.test'+path,'https://person@gosqori.com'+path,'https://gosqori.com/sellos/inscripcion.html','https://gosqori.com/sellos/inscripcion.html?programa=broken'])assert.equal((await resolve(link)).status,400,link);
  assert.equal((await resolve('https://gosqori.com/sellos/inscripcion.html?programa='+id())).status,404);
 });
 await t.test('paused, archived and inactive businesses are not opened',async()=>{
  for(const status of ['PAUSED','ARCHIVED']){await query('update stamp_programs set status=$2 where id=$1',[program.id,status]);assert.equal((await resolve(url)).status,404);}
  await query("update stamp_programs set status='ACTIVE' where id=$1",[program.id]);await query('update businesses set is_active=false where id=$1',[business.id]);assert.equal((await resolve(url)).status,404);await query('update businesses set is_active=true where id=$1',[business.id]);
  await query("update stamp_programs set status='ARCHIVED',deleted_at=now() where id=$1",[program.id]);assert.equal((await resolve(url)).status,404);await query("update stamp_programs set status='ACTIVE',deleted_at=null where id=$1",[program.id]);
 });
 await t.test('expired or suspended subscriptions retain the canonical enrollment restrictions',async()=>{
  await query("update businesses set subscription_status='SUSPENDED' where id=$1",[business.id]);assert.equal((await resolve(url)).status,403);
  await query("update businesses set subscription_status='ACTIVE',subscription_current_period_ends_at=now()-interval '100 days' where id=$1",[business.id]);assert.equal((await resolve(url)).status,403);
  await query("update businesses set subscription_current_period_ends_at=now()+interval '14 days' where id=$1",[business.id]);
 });
 await t.test('resolving does not create a member, catalog publication, sale or payment',async()=>{
  for(const table of ['stamp_members','customer_publications','business_sales','qr_credit_purchase_orders'])assert.equal((await query(`select count(*)::int n from ${table} where business_id=$1`,[business.id])).rows[0].n,0);
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

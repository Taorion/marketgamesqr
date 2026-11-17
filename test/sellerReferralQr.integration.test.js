const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID:uuid}=require('node:crypto'),sharp=require('sharp'),jsQR=require('jsqr');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-qr-local-test';process.env.PUBLIC_APP_URL='https://gosqori.com';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken');
let server,base,seller,other,n=0;
async function person(status='APPROVED'){const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Embajador QR QA','QORI_SELLER') returning *",[uuid()+'@example.test'])).rows[0];await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1',$3,'DOCUMENTS')",[u.id,uuid(),status]);return u;}
async function api(route,body,user=seller){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.'+(++n),...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:user.password_version||0},process.env.JWT_SECRET)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cache:r.headers.get('cache-control')};}
async function decode(data,width){const image=sharp(Buffer.from(data.split(',')[1],'base64'));if(width)image.resize(width,width,{kernel:'nearest'});const {data:rgba,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});const result=jsQR(new Uint8ClampedArray(rgba),info.width,info.height);assert.ok(result,'QR must decode at '+info.width+' px');return result.data;}
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Seller signup QR encodes current plan and preserves ambassador and prospect attribution',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');seller=await person();other=await person();server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const links=(await api('/api/seller/dashboard')).data.plan_referral_links;assert.equal(links.length,8);
 await t.test('all eight generated PNGs decode into their exact plan registration form',async()=>{
  for(const link of links){const r=await api('/api/seller/referral-qr',{url:link.url});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.cache,'private, no-store');
   assert.equal(r.data.plan_code,link.code);assert.equal(r.data.prospect_specific,false);assert.equal(r.data.url,link.url);
   assert.equal(await decode(r.data.qr_data_url),link.url);assert.equal(await decode(r.data.qr_data_url,288),link.url);
   const u=new URL(r.data.url);assert.equal(u.searchParams.get('seller')||u.searchParams.get('advisor'),seller.id);assert.equal(u.hash,link.monthly_price_cop?'#signupSection':'#freeForm');assert.match(r.data.filename,/\.png$/);
  }
 });
 await t.test('CRM QR preserves the exact signed token and rejects an edited or closed contact',async()=>{
  const p=(await query("insert into qori_sales_prospects(seller_id,business_name,contact_name,email,phone,stage) values($1,'Negocio QR','Cliente QR',$2,'3100000000','NEW') returning *",[seller.id,uuid()+'@example.test'])).rows[0];
  const referral=(await api('/api/seller/commercial/prospects/'+p.id+'/referral')).data;
  const shorts=[];
  for(const code of ['STARTER','UN_REGALO_PERSONAL']){
   const link=referral.plan_referral_links.find(p=>p.code===code),r=await api('/api/seller/referral-qr',{url:link.url});
   assert.equal(r.status,200);assert.equal(r.data.prospect_specific,true);assert.equal(await decode(r.data.qr_data_url,288),r.data.qr_url);
   assert.equal(new URL(r.data.url).searchParams.get('prospect_ref'),new URL(referral.plan_referral_url).searchParams.get('prospect_ref'));
   const shortPath=new URL(r.data.qr_url).pathname;shorts.push(shortPath);
   const opened=await fetch(base+shortPath,{redirect:'manual'});assert.equal(opened.status,302);assert.equal(opened.headers.get('location'),link.url);assert.match(opened.headers.get('cache-control'),/no-store/);
   const again=await api('/api/seller/referral-qr',{url:link.url});assert.equal(again.data.qr_url,r.data.qr_url);assert.equal(again.data.expires_at,r.data.expires_at);
  }
  const link=referral.plan_referral_links[0].url;
  assert.equal((await api('/api/seller/referral-qr',{url:link},other)).status,403);
  await query("update qori_sales_prospects set stage='LOST' where id=$1",[p.id]);assert.equal((await api('/api/seller/referral-qr',{url:link})).status,400);
  assert.equal((await fetch(base+shorts[0],{redirect:'manual'})).status,410);
  await query("update qori_sales_prospects set stage='NEW' where id=$1",[p.id]);
  await query("update qori_seller_signup_qr_links set expires_at=now()-interval '1 minute' where token=$1",[shorts[0].split('/').pop()]);
  assert.equal((await fetch(base+shorts[0],{redirect:'manual'})).status,410);
  await query('update app_users set is_active=false where id=$1',[seller.id]);assert.equal((await fetch(base+shorts[1],{redirect:'manual'})).status,410);
  await query('update app_users set is_active=true where id=$1',[seller.id]);
 });
 await t.test('QR service rejects external destinations, other sellers, duplicate parameters and unsupported plans',async()=>{
  const good=links.find(p=>p.code==='STARTER').url;
  for(const url of [good.replace('gosqori.com','attacker.test'),good.replace('/paquetes/','/admin/'),good.replace('STARTER','INTERNAL'),good.replace('#signupSection','&advisor='+seller.id),good.replace('#signupSection','&redirect=https://attacker.test'),good.replace('#signupSection','&prospect_ref=forged')])assert.equal((await api('/api/seller/referral-qr',{url})).status,400,url);
  assert.equal((await api('/api/seller/referral-qr',{url:good.replace(seller.id,other.id)})).status,403);
  assert.equal((await api('/api/seller/referral-qr',{url:good},null)).status,401);
  const pending=await person('DRAFT');assert.equal((await api('/api/seller/referral-qr',{url:good.replace(seller.id,pending.id)},pending)).status,403);
  assert.equal((await api('/api/seller/referral-qr',{url:good,other:'ignored'})).status,400);
 });
});
